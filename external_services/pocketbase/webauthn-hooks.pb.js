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
  const utils = require(`${__hooks}/webauthn-utils.js`);

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
  const utils = require(`${__hooks}/webauthn-utils.js`);

  const auth = e.auth;
  if (!auth) {
    throw new UnauthorizedError('Authentication required');
  }

  const body = e.requestInfo().body;
  const clientIP = e.request.header.get('X-Real-IP') ||
                   e.request.header.get('X-Forwarded-For') || '';

  if (!body.response) {
    throw new BadRequestError('Missing registration response');
  }

  // Validate device name for security (XSS prevention)
  const deviceNameValidation = utils.validateDeviceName(body.deviceName);
  if (!deviceNameValidation.valid) {
    throw new BadRequestError(deviceNameValidation.error);
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

  // CRITICAL: Delete challenge immediately to prevent replay attacks
  const challengeRecordId = challengeRecord.id;
  utils.deleteChallenge(e.app, challengeRecordId);

  // Check if credential already exists
  if (body.response.id) {
    const existing = utils.findCredentialById(e.app, body.response.id);
    if (existing) {
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
    e.app.logger().error(`Passkey registration verification failed: ${err.message}`);
    throw new BadRequestError(`Verification failed: ${err.message}`);
  }

  if (!verificationResult.success) {
    throw new BadRequestError(verificationResult.error || 'Verification failed');
  }

  // Sanitize device name before storage
  const sanitizedDeviceName = utils.sanitizeDeviceName(body.deviceName);

  // Store the credential
  const credential = utils.storeCredential(
    e.app,
    auth.id,
    verificationResult.data,
    sanitizedDeviceName
  );

  // Security audit log
  e.app.logger().info(JSON.stringify({
    event: 'passkey_registered',
    userId: auth.id,
    userEmail: auth.email,
    credentialId: credential.id,
    deviceName: sanitizedDeviceName,
    clientIP: clientIP,
    userAgent: e.request.header.get('User-Agent'),
    timestamp: new Date().toISOString()
  }));

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
  const utils = require(`${__hooks}/webauthn-utils.js`);

  const body = e.requestInfo().body;
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
  const utils = require(`${__hooks}/webauthn-utils.js`);

  const body = e.requestInfo().body;
  const clientIP = e.request.header.get('X-Real-IP') ||
                   e.request.header.get('X-Forwarded-For') || '';
  const userAgent = e.request.header.get('User-Agent') || '';

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
    // Security audit: Unknown credential attempt
    e.app.logger().warn(JSON.stringify({
      event: 'passkey_auth_unknown_credential',
      credentialId: credentialId,
      clientIP: clientIP,
      userAgent: userAgent,
      timestamp: new Date().toISOString()
    }));
    throw new BadRequestError('Unknown credential');
  }

  // Check if credential is flagged
  if (credential.get('flagged')) {
    e.app.logger().warn(JSON.stringify({
      event: 'passkey_auth_flagged_credential',
      credentialId: credentialId,
      userId: credential.get('user'),
      clientIP: clientIP,
      timestamp: new Date().toISOString()
    }));
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

  // CRITICAL: Delete challenge immediately to prevent replay attacks
  const challengeRecordId = challengeRecord.id;
  utils.deleteChallenge(e.app, challengeRecordId);

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
      e.app.logger().error(JSON.stringify({
        event: 'passkey_counter_anomaly',
        credentialId: credential.id,
        userId: credential.get('user'),
        storedCounter: credential.get('counter'),
        clientIP: clientIP,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      }));
    }

    // Security audit: Failed authentication
    e.app.logger().warn(JSON.stringify({
      event: 'passkey_auth_failed',
      credentialId: credentialId,
      userId: credential.get('user'),
      error: err.message,
      clientIP: clientIP,
      userAgent: userAgent,
      timestamp: new Date().toISOString()
    }));

    throw new BadRequestError(`Verification failed: ${err.message}`);
  }

  if (!verificationResult.success) {
    e.app.logger().warn(JSON.stringify({
      event: 'passkey_auth_verification_failed',
      credentialId: credentialId,
      userId: credential.get('user'),
      error: verificationResult.error,
      clientIP: clientIP,
      timestamp: new Date().toISOString()
    }));
    throw new BadRequestError(verificationResult.error || 'Verification failed');
  }

  // Update credential counter
  utils.updateCredentialAfterAuth(e.app, credential, verificationResult.data.newCounter);

  // Get user and generate auth token
  const userId = credential.get('user');
  const user = e.app.findRecordById('users', userId);
  if (!user) {
    throw new BadRequestError('User not found');
  }

  // Generate auth token
  const token = user.newAuthToken();

  // Security audit: Successful authentication
  e.app.logger().info(JSON.stringify({
    event: 'passkey_auth_success',
    userId: userId,
    userEmail: user.get('email'),
    credentialId: credentialId,
    clientIP: clientIP,
    userAgent: userAgent,
    timestamp: new Date().toISOString()
  }));

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
  const utils = require(`${__hooks}/webauthn-utils.js`);

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
 *
 * Security: Prevents account lockout by checking if user has password
 * when deleting their last passkey
 */
routerAdd('DELETE', '/api/passkey/{id}', (e) => {
  const utils = require(`${__hooks}/webauthn-utils.js`);

  const auth = e.auth;
  if (!auth) {
    throw new UnauthorizedError('Authentication required');
  }

  const clientIP = e.request.header.get('X-Real-IP') ||
                   e.request.header.get('X-Forwarded-For') || '';

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
    // SECURITY: Check if user has a password set before allowing deletion
    const user = e.app.findRecordById('users', auth.id);

    // Check if user has password authentication method available
    // PocketBase stores a hash if password is set
    const hasPassword = user.get('passwordHash') !== '';

    if (!hasPassword) {
      // Security audit: Blocked dangerous deletion
      e.app.logger().warn(JSON.stringify({
        event: 'passkey_delete_blocked_no_password',
        userId: auth.id,
        passkeyId: passkeyId,
        clientIP: clientIP,
        timestamp: new Date().toISOString()
      }));

      throw new BadRequestError(
        'Cannot delete your last passkey without a password set. ' +
        'Please set a password in Settings > Profile first to prevent account lockout.'
      );
    }

    // Security audit: Last passkey deletion with password backup
    e.app.logger().warn(JSON.stringify({
      event: 'passkey_last_deleted',
      userId: auth.id,
      userEmail: auth.email,
      passkeyId: passkeyId,
      hasPassword: true,
      clientIP: clientIP,
      timestamp: new Date().toISOString()
    }));
  }

  // Delete the credential
  e.app.delete(credential);

  // Security audit log
  e.app.logger().info(JSON.stringify({
    event: 'passkey_deleted',
    userId: auth.id,
    passkeyId: passkeyId,
    deviceName: credential.get('device_name'),
    remainingPasskeys: allCredentials.length - 1,
    clientIP: clientIP,
    timestamp: new Date().toISOString()
  }));

  return e.json(200, {
    success: true,
    message: 'Passkey deleted successfully'
  });
}, $apis.requireAuth());


/**
 * PATCH /api/passkey/:id
 * Update a passkey (rename)
 *
 * Security: Validates device name input to prevent XSS
 */
routerAdd('PATCH', '/api/passkey/{id}', (e) => {
  const utils = require(`${__hooks}/webauthn-utils.js`);

  const auth = e.auth;
  if (!auth) {
    throw new UnauthorizedError('Authentication required');
  }

  const passkeyId = e.request.pathValue('id');
  const body = e.requestInfo().body;

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
    // Validate device name for security (XSS prevention)
    const validation = utils.validateDeviceName(body.deviceName);
    if (!validation.valid) {
      throw new BadRequestError(validation.error);
    }

    // Sanitize before storage
    const sanitizedName = utils.sanitizeDeviceName(body.deviceName);
    credential.set('device_name', sanitizedName);
    e.app.save(credential);

    // Security audit log
    e.app.logger().info(JSON.stringify({
      event: 'passkey_renamed',
      userId: auth.id,
      passkeyId: passkeyId,
      newDeviceName: sanitizedName,
      timestamp: new Date().toISOString()
    }));
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
 */
onBootstrap((e) => {
  // IMPORTANT: Call e.next() first to let the app fully initialize
  e.next();

  const utils = require(`${__hooks}/webauthn-utils.js`);

  // Clean up expired challenges on startup (collection may not exist yet)
  try {
    utils.cleanupExpiredChallenges(e.app);
  } catch (err) {
    // Collection may not exist yet - ignore
  }
  e.app.logger().info('WebAuthn hooks initialized');
});
