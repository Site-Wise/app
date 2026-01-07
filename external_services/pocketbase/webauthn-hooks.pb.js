/**
 * WebAuthn/Passkey Hooks for PocketBase
 *
 * Custom routes for passkey registration and authentication:
 * - POST /api/passkey/register/start - Start passkey registration
 * - POST /api/passkey/register/finish - Complete passkey registration
 * - POST /api/passkey/authenticate/start - Start passkey authentication
 * - POST /api/passkey/authenticate/finish - Complete passkey authentication
 * - GET /api/passkey/list - List user's passkeys
 * - DELETE /api/passkey/:id - Delete a passkey
 */

const utils = require(`${__hooks}/webauthn-utils.js`);

// ============================================================================
// REGISTRATION ROUTES
// ============================================================================

/**
 * POST /api/passkey/register/start
 * Start passkey registration (requires authentication)
 *
 * Response: PublicKeyCredentialCreationOptions
 */
routerAdd('POST', '/api/passkey/register/start', (e) => {
  const auth = e.auth;
  if (!auth) {
    throw new UnauthorizedError('Authentication required');
  }

  const clientIP = e.request.header.get('X-Real-IP') ||
                   e.request.header.get('X-Forwarded-For') || '';

  // Rate limiting: max 10 registration attempts per 5 minutes
  if (utils.isRateLimited(e.app, clientIP, 10, 5 * 60 * 1000)) {
    throw new TooManyRequestsError('Too many registration attempts. Please wait.');
  }

  // Get existing credentials to exclude
  const existingCredentials = utils.getUserCredentials(e.app, auth.id);

  // Generate challenge
  const challenge = utils.generateChallenge();
  utils.storeChallenge(e.app, challenge, 'registration', auth.id, clientIP);

  // Generate options
  const options = utils.generateRegistrationOptions(auth, challenge, existingCredentials);

  e.app.logger().info(`Passkey registration started for user ${auth.id}`);

  return e.json(200, {
    success: true,
    options: options
  });
}, $apis.requireAuth());


/**
 * POST /api/passkey/register/finish
 * Complete passkey registration
 *
 * Body: { response: RegistrationResponseJSON, deviceName?: string }
 */
routerAdd('POST', '/api/passkey/register/finish', (e) => {
  const auth = e.auth;
  if (!auth) {
    throw new UnauthorizedError('Authentication required');
  }

  const body = $apis.requestInfo(e).body;

  if (!body.response) {
    throw new BadRequestError('Missing registration response');
  }

  // Extract challenge from clientDataJSON
  const clientDataJSON = body.response.clientDataJSON;
  if (!clientDataJSON) {
    throw new BadRequestError('Missing clientDataJSON');
  }

  // Decode clientDataJSON to get challenge
  let clientData;
  try {
    const decoded = atob(clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'));
    clientData = JSON.parse(decoded);
  } catch (err) {
    throw new BadRequestError('Invalid clientDataJSON');
  }

  const challenge = clientData.challenge;
  if (!challenge) {
    throw new BadRequestError('Missing challenge in clientDataJSON');
  }

  // Verify challenge exists and is valid
  const challengeRecord = utils.retrieveChallenge(e.app, challenge, 'registration');
  if (!challengeRecord) {
    throw new BadRequestError('Invalid or expired challenge');
  }

  // Verify challenge belongs to this user
  if (challengeRecord.get('user_id') !== auth.id) {
    throw new BadRequestError('Challenge does not match user');
  }

  // Check if credential already exists
  if (body.response.id) {
    const existing = utils.findCredentialById(e.app, body.response.id);
    if (existing) {
      utils.deleteChallenge(e.app, challengeRecord.id);
      throw new BadRequestError('Credential already registered');
    }
  }

  // Call verification service
  let verificationResult;
  try {
    verificationResult = utils.callVerifier('/verify/registration', {
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: utils.getAllowedOrigins(),
      expectedRPID: utils.getRpId()
    });
  } catch (err) {
    utils.deleteChallenge(e.app, challengeRecord.id);
    e.app.logger().error(`Passkey registration verification failed: ${err.message}`);
    throw new BadRequestError(`Verification failed: ${err.message}`);
  }

  if (!verificationResult.success) {
    utils.deleteChallenge(e.app, challengeRecord.id);
    throw new BadRequestError(verificationResult.error || 'Verification failed');
  }

  // Store the credential
  const credential = utils.storeCredential(
    e.app,
    auth.id,
    verificationResult.data,
    body.deviceName || 'Unknown Device'
  );

  // Delete used challenge
  utils.deleteChallenge(e.app, challengeRecord.id);

  e.app.logger().info(`Passkey registered for user ${auth.id}: ${credential.id}`);

  return e.json(200, {
    success: true,
    credential: {
      id: credential.id,
      deviceName: credential.get('device_name'),
      createdAt: credential.get('created')
    }
  });
}, $apis.requireAuth());


// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * POST /api/passkey/authenticate/start
 * Start passkey authentication (no auth required)
 *
 * Body: { email?: string } - Optional email for user-specific flow
 * Response: PublicKeyCredentialRequestOptions
 */
routerAdd('POST', '/api/passkey/authenticate/start', (e) => {
  const body = $apis.requestInfo(e).body;
  const clientIP = e.request.header.get('X-Real-IP') ||
                   e.request.header.get('X-Forwarded-For') || '';

  // Rate limiting: max 20 auth attempts per 5 minutes
  if (utils.isRateLimited(e.app, clientIP, 20, 5 * 60 * 1000)) {
    throw new TooManyRequestsError('Too many authentication attempts. Please wait.');
  }

  let allowCredentials = [];
  let userId = null;

  // If email provided, find user's credentials
  if (body.email) {
    try {
      const user = e.app.findAuthRecordByEmail('users', body.email);
      if (user) {
        userId = user.id;
        const credentials = utils.getUserCredentials(e.app, user.id);
        allowCredentials = credentials.map(c => ({
          credential_id: c.get('credential_id'),
          transports: c.get('transports') || ['internal']
        }));
      }
    } catch (err) {
      // User not found - continue with discoverable credentials
    }
  }

  // Generate challenge
  const challenge = utils.generateChallenge();
  utils.storeChallenge(e.app, challenge, 'authentication', userId, clientIP);

  // Generate options
  const options = utils.generateAuthenticationOptions(challenge, allowCredentials);

  return e.json(200, {
    success: true,
    options: options
  });
}, $apis.requireGuestOnly());


/**
 * POST /api/passkey/authenticate/finish
 * Complete passkey authentication
 *
 * Body: { response: AuthenticationResponseJSON }
 * Response: { token: string, record: User }
 */
routerAdd('POST', '/api/passkey/authenticate/finish', (e) => {
  const body = $apis.requestInfo(e).body;

  if (!body.response) {
    throw new BadRequestError('Missing authentication response');
  }

  // Extract credential ID from response
  const credentialId = body.response.id;
  if (!credentialId) {
    throw new BadRequestError('Missing credential ID');
  }

  // Find the credential
  const credential = utils.findCredentialById(e.app, credentialId);
  if (!credential) {
    throw new BadRequestError('Unknown credential');
  }

  // Check if credential is flagged
  if (credential.get('flagged')) {
    throw new BadRequestError('Credential has been flagged for security review');
  }

  // Extract challenge from clientDataJSON
  const clientDataJSON = body.response.clientDataJSON;
  if (!clientDataJSON) {
    throw new BadRequestError('Missing clientDataJSON');
  }

  let clientData;
  try {
    const decoded = atob(clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'));
    clientData = JSON.parse(decoded);
  } catch (err) {
    throw new BadRequestError('Invalid clientDataJSON');
  }

  const challenge = clientData.challenge;
  if (!challenge) {
    throw new BadRequestError('Missing challenge in clientDataJSON');
  }

  // Verify challenge exists and is valid
  const challengeRecord = utils.retrieveChallenge(e.app, challenge, 'authentication');
  if (!challengeRecord) {
    throw new BadRequestError('Invalid or expired challenge');
  }

  // Call verification service
  let verificationResult;
  try {
    verificationResult = utils.callVerifier('/verify/authentication', {
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: utils.getAllowedOrigins(),
      expectedRPID: utils.getRpId(),
      credential: {
        id: credentialId,
        publicKey: credential.get('public_key'),
        counter: credential.get('counter')
      }
    });
  } catch (err) {
    // Check for counter error (possible cloned credential)
    if (err.message && err.message.includes('counter')) {
      utils.flagCredential(e.app, credential);
      e.app.logger().warn(`Credential flagged for counter anomaly: ${credential.id}`);
    }
    utils.deleteChallenge(e.app, challengeRecord.id);
    e.app.logger().error(`Passkey authentication verification failed: ${err.message}`);
    throw new BadRequestError(`Verification failed: ${err.message}`);
  }

  if (!verificationResult.success) {
    utils.deleteChallenge(e.app, challengeRecord.id);
    throw new BadRequestError(verificationResult.error || 'Verification failed');
  }

  // Update credential counter
  utils.updateCredentialAfterAuth(e.app, credential, verificationResult.data.newCounter);

  // Delete used challenge
  utils.deleteChallenge(e.app, challengeRecord.id);

  // Get user and generate auth token
  const userId = credential.get('user');
  const user = e.app.findRecordById('users', userId);
  if (!user) {
    throw new BadRequestError('User not found');
  }

  // Generate auth token
  const token = user.newAuthToken();

  e.app.logger().info(`Passkey authentication successful for user ${userId}`);

  return e.json(200, {
    success: true,
    token: token,
    record: {
      id: user.id,
      email: user.get('email'),
      name: user.get('name'),
      avatar: user.get('avatar'),
      sites: user.get('sites') || [],
      created: user.get('created'),
      updated: user.get('updated')
    }
  });
}, $apis.requireGuestOnly());


// ============================================================================
// MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/passkey/list
 * List user's registered passkeys
 */
routerAdd('GET', '/api/passkey/list', (e) => {
  const auth = e.auth;
  if (!auth) {
    throw new UnauthorizedError('Authentication required');
  }

  const credentials = utils.getUserCredentials(e.app, auth.id);

  const passkeys = credentials.map(c => ({
    id: c.id,
    deviceName: c.get('device_name'),
    deviceType: c.get('device_type'),
    backedUp: c.get('backed_up'),
    lastUsed: c.get('last_used'),
    createdAt: c.get('created'),
    flagged: c.get('flagged')
  }));

  return e.json(200, {
    success: true,
    passkeys: passkeys
  });
}, $apis.requireAuth());


/**
 * DELETE /api/passkey/:id
 * Delete a passkey
 */
routerAdd('DELETE', '/api/passkey/{id}', (e) => {
  const auth = e.auth;
  if (!auth) {
    throw new UnauthorizedError('Authentication required');
  }

  const passkeyId = e.request.pathValue('id');
  if (!passkeyId) {
    throw new BadRequestError('Missing passkey ID');
  }

  // Find the credential
  let credential;
  try {
    credential = e.app.findRecordById('passkey_credentials', passkeyId);
  } catch (err) {
    throw new NotFoundError('Passkey not found');
  }

  // Verify ownership
  if (credential.get('user') !== auth.id) {
    throw new ForbiddenError('Cannot delete passkey belonging to another user');
  }

  // Check if this is the user's last passkey
  const allCredentials = utils.getUserCredentials(e.app, auth.id);
  if (allCredentials.length <= 1) {
    // Allow deletion but warn - user will need password to login
    e.app.logger().warn(`User ${auth.id} deleted their last passkey`);
  }

  // Delete the credential
  e.app.delete(credential);

  e.app.logger().info(`Passkey deleted for user ${auth.id}: ${passkeyId}`);

  return e.json(200, {
    success: true,
    message: 'Passkey deleted successfully'
  });
}, $apis.requireAuth());


/**
 * PATCH /api/passkey/:id
 * Update a passkey (rename)
 */
routerAdd('PATCH', '/api/passkey/{id}', (e) => {
  const auth = e.auth;
  if (!auth) {
    throw new UnauthorizedError('Authentication required');
  }

  const passkeyId = e.request.pathValue('id');
  const body = $apis.requestInfo(e).body;

  if (!passkeyId) {
    throw new BadRequestError('Missing passkey ID');
  }

  // Find the credential
  let credential;
  try {
    credential = e.app.findRecordById('passkey_credentials', passkeyId);
  } catch (err) {
    throw new NotFoundError('Passkey not found');
  }

  // Verify ownership
  if (credential.get('user') !== auth.id) {
    throw new ForbiddenError('Cannot modify passkey belonging to another user');
  }

  // Update device name if provided
  if (body.deviceName) {
    credential.set('device_name', body.deviceName);
    e.app.save(credential);
  }

  return e.json(200, {
    success: true,
    passkey: {
      id: credential.id,
      deviceName: credential.get('device_name'),
      deviceType: credential.get('device_type'),
      backedUp: credential.get('backed_up'),
      lastUsed: credential.get('last_used'),
      createdAt: credential.get('created')
    }
  });
}, $apis.requireAuth());


// ============================================================================
// CLEANUP CRON
// ============================================================================

/**
 * Clean up expired challenges periodically
 * This runs on every request - you may want to use a scheduled job instead
 */
onBootstrap((e) => {
  // Clean up expired challenges on startup
  utils.cleanupExpiredChallenges(e.app);
  e.app.logger().info('WebAuthn hooks initialized');
  e.next();
});
