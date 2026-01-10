/**
 * WebAuthn Utilities for PocketBase
 * Shared functions for passkey registration and authentication
 */

// Configuration - set these via environment variables
// Note: PocketBase uses $os.getenv() instead of process.env
const WEBAUTHN_VERIFIER_URL = $os.getenv('WEBAUTHN_VERIFIER_URL') || 'http://localhost:8787';
const WEBAUTHN_VERIFIER_API_KEY = $os.getenv('WEBAUTHN_VERIFIER_API_KEY') || '';
const RP_ID = $os.getenv('WEBAUTHN_RP_ID') || 'http://localhost:8090';
const RP_NAME = $os.getenv('WEBAUTHN_RP_NAME') || 'Site-Wise';

// Allowed origins for WebAuthn
const ALLOWED_ORIGINS = ($os.getenv('WEBAUTHN_ALLOWED_ORIGINS') || 'http://127.0.0.1:5173,https://app.sitewise.com')
  .split(',')
  .map(o => o.trim());

// Challenge expiration time (5 minutes)
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * Generate a cryptographically secure challenge
 * @returns {string} Base64URL encoded challenge
 */
function generateChallenge() {
  return $security.randomString(43); // ~32 bytes in base64url
}

/**
 * Store a challenge for later verification
 * @param {object} app - PocketBase app instance
 * @param {string} challenge - The challenge to store
 * @param {string} type - 'registration' or 'authentication'
 * @param {string} userId - Optional user ID (for registration)
 * @param {string} ipAddress - Client IP address
 * @returns {object} The created challenge record
 */
function storeChallenge(app, challenge, type, userId, ipAddress) {
  const collection = app.findCollectionByNameOrId('passkey_challenges');
  const record = new Record(collection);

  const challengeHash = $security.sha256(challenge);
  const encryptedChallenge = $security.encrypt(challenge, getEncryptionKey());

  record.set('challenge_hash', challengeHash);
  record.set('challenge', encryptedChallenge);
  record.set('type', type);
  record.set('user_id', userId || '');
  record.set('ip_address', ipAddress || '');
  record.set('expires_at', new Date(Date.now() + CHALLENGE_TTL_MS).toISOString());

  app.save(record);
  return record;
}

/**
 * Retrieve and validate a stored challenge
 * @param {object} app - PocketBase app instance
 * @param {string} challenge - The challenge to verify
 * @param {string} type - Expected type ('registration' or 'authentication')
 * @returns {object|null} The challenge record if valid, null otherwise
 */
function retrieveChallenge(app, challenge, type) {
  const challengeHash = $security.sha256(challenge);

  try {
    const records = app.findRecordsByFilter(
      'passkey_challenges',
      'challenge_hash = {:hash} && type = {:type} && expires_at > {:now}',
      '-created',
      1,
      0,
      { hash: challengeHash, type: type, now: new Date().toISOString() }
    );

    if (records.length === 0) {
      return null;
    }

    const record = records[0];

    // Decrypt and verify the challenge matches
    const storedChallenge = $security.decrypt(record.get('challenge'), getEncryptionKey());
    if (storedChallenge !== challenge) {
      return null;
    }

    return record;
  } catch (e) {
    return null;
  }
}

/**
 * Delete a used challenge
 * @param {object} app - PocketBase app instance
 * @param {string} recordId - Challenge record ID to delete
 */
function deleteChallenge(app, recordId) {
  try {
    const record = app.findRecordById('passkey_challenges', recordId);
    app.delete(record);
  } catch (e) {
    // Ignore if already deleted
  }
}

/**
 * Clean up expired challenges
 * @param {object} app - PocketBase app instance
 */
function cleanupExpiredChallenges(app) {
  try {
    const expiredRecords = app.findRecordsByFilter(
      'passkey_challenges',
      'expires_at < {:now}',
      '',
      100,
      0,
      { now: new Date().toISOString() }
    );

    for (const record of expiredRecords) {
      app.delete(record);
    }
  } catch (e) {
    // Ignore errors during cleanup
  }
}

/**
 * Call the WebAuthn verification service
 * @param {string} endpoint - '/verify/registration' or '/verify/authentication'
 * @param {object} data - Request body
 * @returns {object} Response from verifier
 */
function callVerifier(endpoint, data) {
  const resp = $http.send({
    url: WEBAUTHN_VERIFIER_URL + endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': WEBAUTHN_VERIFIER_API_KEY
    },
    body: JSON.stringify(data),
    timeout: 10 // 10 seconds
  });

  if (resp.statusCode !== 200) {
    const error = resp.json;
    throw new Error(error?.error || `Verifier returned ${resp.statusCode}`);
  }

  return resp.json;
}

/**
 * Generate PublicKeyCredentialCreationOptions for registration
 * @param {object} user - User record
 * @param {string} challenge - Base64URL challenge
 * @param {array} excludeCredentials - Existing credential IDs to exclude
 * @returns {object} Options for navigator.credentials.create()
 */
function generateRegistrationOptions(user, challenge, excludeCredentials) {
  // Convert user ID to base64url for WebAuthn
  const userIdBytes = new TextEncoder().encode(user.id);
  const userIdBase64 = btoa(String.fromCharCode(...userIdBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return {
    challenge: challenge,
    rp: {
      name: RP_NAME,
      id: RP_ID
    },
    user: {
      id: userIdBase64,
      name: user.email,
      displayName: user.name || user.email
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256 (recommended)
      { alg: -257, type: 'public-key' }  // RS256 (fallback)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',      // Use device biometrics
      userVerification: 'required',             // Require biometric/PIN
      residentKey: 'preferred',                 // Enable discoverable credentials
      requireResidentKey: false
    },
    timeout: 60000,
    attestation: 'none',  // Don't need attestation for our use case
    excludeCredentials: excludeCredentials.map(cred => ({
      id: cred.credential_id,
      type: 'public-key',
      transports: cred.transports || ['internal']
    }))
  };
}

/**
 * Generate PublicKeyCredentialRequestOptions for authentication
 * @param {string} challenge - Base64URL challenge
 * @param {array} allowCredentials - Credentials to allow (optional for discoverable)
 * @returns {object} Options for navigator.credentials.get()
 */
function generateAuthenticationOptions(challenge, allowCredentials) {
  const options = {
    challenge: challenge,
    rpId: RP_ID,
    userVerification: 'required',
    timeout: 60000
  };

  // If specific credentials provided, limit to those
  if (allowCredentials && allowCredentials.length > 0) {
    options.allowCredentials = allowCredentials.map(cred => ({
      id: cred.credential_id,
      type: 'public-key',
      transports: cred.transports || ['internal']
    }));
  }

  return options;
}

/**
 * Store a new passkey credential
 * @param {object} app - PocketBase app instance
 * @param {string} userId - User ID
 * @param {object} credentialData - Credential data from verifier
 * @param {string} deviceName - Friendly device name
 * @returns {object} Created credential record
 */
function storeCredential(app, userId, credentialData, deviceName) {
  const collection = app.findCollectionByNameOrId('passkey_credentials');
  const record = new Record(collection);

  record.set('user', userId);
  record.set('credential_id', credentialData.credentialId);
  record.set('public_key', credentialData.publicKey);
  record.set('counter', credentialData.counter);
  record.set('device_name', deviceName || 'Unknown Device');
  record.set('device_type', credentialData.credentialDeviceType === 'multiDevice' ? 'cross-platform' : 'platform');
  record.set('transports', ['internal']);
  record.set('backed_up', credentialData.credentialBackedUp || false);
  record.set('aaguid', credentialData.aaguid || '');
  record.set('last_used', new Date().toISOString());
  record.set('flagged', false);

  app.save(record);
  return record;
}

/**
 * Find credential by credential ID
 * @param {object} app - PocketBase app instance
 * @param {string} credentialId - The credential ID to find
 * @returns {object|null} Credential record or null
 */
function findCredentialById(app, credentialId) {
  try {
    const records = app.findRecordsByFilter(
      'passkey_credentials',
      'credential_id = {:id}',
      '',
      1,
      0,
      { id: credentialId }
    );
    return records.length > 0 ? records[0] : null;
  } catch (e) {
    return null;
  }
}

/**
 * Get all credentials for a user
 * @param {object} app - PocketBase app instance
 * @param {string} userId - User ID
 * @returns {array} Array of credential records
 */
function getUserCredentials(app, userId) {
  try {
    return app.findRecordsByFilter(
      'passkey_credentials',
      'user = {:userId}',
      '-last_used',
      100,
      0,
      { userId: userId }
    );
  } catch (e) {
    return [];
  }
}

/**
 * Update credential after successful authentication
 * @param {object} app - PocketBase app instance
 * @param {object} credential - Credential record
 * @param {number} newCounter - New counter value
 */
function updateCredentialAfterAuth(app, credential, newCounter) {
  credential.set('counter', newCounter);
  credential.set('last_used', new Date().toISOString());
  app.save(credential);
}

/**
 * Flag a credential for review (counter anomaly)
 * @param {object} app - PocketBase app instance
 * @param {object} credential - Credential record
 */
function flagCredential(app, credential) {
  credential.set('flagged', true);
  app.save(credential);
}

/**
 * Check rate limiting for IP address
 * @param {object} app - PocketBase app instance
 * @param {string} ipAddress - Client IP
 * @param {number} maxAttempts - Max attempts in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} True if rate limited
 */
function isRateLimited(app, ipAddress, maxAttempts, windowMs) {
  if (!ipAddress) return false;

  const threshold = new Date(Date.now() - windowMs).toISOString();

  try {
    const recentChallenges = app.findRecordsByFilter(
      'passkey_challenges',
      'ip_address = {:ip} && created > {:threshold}',
      '',
      maxAttempts + 1,
      0,
      { ip: ipAddress, threshold: threshold }
    );

    return recentChallenges.length > maxAttempts;
  } catch (e) {
    return false;
  }
}

/**
 * Get encryption key for challenge storage
 * Uses PocketBase's encryption key or a derived one
 */
function getEncryptionKey() {
  // Use environment variable or derive from a secret
  const key = $os.getenv('WEBAUTHN_ENCRYPTION_KEY') || '';
  if (key.length === 32) {
    return key;
  }
  // If not 32 chars, hash it to get consistent 32-char key
  return $security.sha256(key || 'default-key-change-me').substring(0, 32);
}

/**
 * Get allowed origins for verification
 */
function getAllowedOrigins() {
  return ALLOWED_ORIGINS;
}

/**
 * Get the RP ID
 */
function getRpId() {
  return RP_ID;
}

// Export all utilities
module.exports = {
  generateChallenge,
  storeChallenge,
  retrieveChallenge,
  deleteChallenge,
  cleanupExpiredChallenges,
  callVerifier,
  generateRegistrationOptions,
  generateAuthenticationOptions,
  storeCredential,
  findCredentialById,
  getUserCredentials,
  updateCredentialAfterAuth,
  flagCredential,
  isRateLimited,
  getAllowedOrigins,
  getRpId,
  CHALLENGE_TTL_MS
};
