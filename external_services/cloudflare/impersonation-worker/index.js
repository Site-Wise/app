/**
 * Cloudflare Worker for Impersonation WebSocket Coordination
 *
 * This worker uses Durable Objects to manage real-time WebSocket connections
 * for the impersonation approval workflow.
 *
 * Required Environment Variables:
 * - POCKETBASE_URL: Your PocketBase URL
 * - POCKETBASE_ADMIN_EMAIL: PocketBase admin email
 * - POCKETBASE_ADMIN_PASSWORD: PocketBase admin password
 * - IMPERSONATION_SECRET: Secret for signing tokens
 *
 * Required Bindings:
 * - IMPERSONATION_COORDINATOR: Durable Object binding
 */

// ============================================
// Main Worker Entry Point
// ============================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response;

      // WebSocket upgrade for real-time communication
      if (path === '/ws' && request.headers.get('Upgrade') === 'websocket') {
        return handleWebSocket(request, env);
      }

      // REST API endpoints
      switch (path) {
        case '/api/impersonation/request':
          response = await handleCreateRequest(request, env);
          break;
        case '/api/impersonation/respond':
          response = await handleRespondToRequest(request, env);
          break;
        case '/api/impersonation/session/end':
          response = await handleEndSession(request, env);
          break;
        case '/api/impersonation/pending':
          response = await handleGetPendingRequests(request, env);
          break;
        case '/api/impersonation/sessions':
          response = await handleGetActiveSessions(request, env);
          break;
        case '/api/impersonation/verify':
          response = await handleVerifySession(request, env);
          break;
        default:
          response = new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
      }

      // Add CORS headers to response
      Object.keys(corsHeaders).forEach(key => {
        response.headers.set(key, corsHeaders[key]);
      });

      return response;
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// ============================================
// WebSocket Handler
// ============================================

async function handleWebSocket(request, env) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const token = url.searchParams.get('token');
  const role = url.searchParams.get('role'); // 'owner' or 'support'

  if (!userId || !token || !role) {
    return new Response('Missing required parameters', { status: 400 });
  }

  // Verify the token with PocketBase
  const isValid = await verifyUserToken(env, userId, token);
  if (!isValid) {
    return new Response('Invalid token', { status: 401 });
  }

  // Route to Durable Object based on user ID
  const id = env.IMPERSONATION_COORDINATOR.idFromName(`user:${userId}`);
  const stub = env.IMPERSONATION_COORDINATOR.get(id);

  return stub.fetch(request);
}

// ============================================
// REST API Handlers
// ============================================

async function handleCreateRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json();
  const { supportUserId, targetUserId, targetSiteId, reason, sessionDurationMinutes, token } = body;

  // Validate required fields
  if (!supportUserId || !targetUserId || !targetSiteId || !reason || !token) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify support user token and permissions
  const isValid = await verifyUserToken(env, supportUserId, token);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if support user has permission
  const supportSettings = await getSupportUserSettings(env, supportUserId);
  if (!supportSettings || !supportSettings.is_support_agent) {
    return new Response(JSON.stringify({ error: 'User is not authorized for support access' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get site owner(s) to notify
  const siteOwners = await getSiteOwners(env, targetSiteId);
  if (siteOwners.length === 0) {
    return new Response(JSON.stringify({ error: 'No site owners found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create the impersonation request in PocketBase
  const requestId = await createImpersonationRequest(env, {
    supportUserId,
    targetUserId,
    targetSiteId,
    reason,
    sessionDurationMinutes: Math.min(sessionDurationMinutes || 30, supportSettings.max_session_duration || 60)
  });

  // Notify all site owners via WebSocket
  for (const owner of siteOwners) {
    await notifyUser(env, owner.user, {
      type: 'impersonation_request',
      requestId,
      supportUserId,
      targetUserId,
      targetSiteId,
      reason,
      sessionDurationMinutes,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minute expiry
    });
  }

  // Log the audit event
  await logAuditEvent(env, {
    action: 'impersonation_requested',
    actorUser: supportUserId,
    site: targetSiteId,
    details: { requestId, targetUserId, reason }
  });

  return new Response(JSON.stringify({
    success: true,
    requestId,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleRespondToRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json();
  const { requestId, ownerId, approved, deniedReason, token } = body;

  if (!requestId || !ownerId || approved === undefined || !token) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify owner token
  const isValid = await verifyUserToken(env, ownerId, token);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get the request and verify owner has permission
  const impersonationRequest = await getImpersonationRequest(env, requestId);
  if (!impersonationRequest) {
    return new Response(JSON.stringify({ error: 'Request not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if request has expired
  if (new Date(impersonationRequest.expires_at) < new Date()) {
    await updateImpersonationRequestStatus(env, requestId, 'expired');
    return new Response(JSON.stringify({ error: 'Request has expired' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify owner is actually an owner of the site
  const isOwner = await verifyUserIsSiteOwner(env, ownerId, impersonationRequest.target_site);
  if (!isOwner) {
    return new Response(JSON.stringify({ error: 'User is not an owner of this site' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let sessionId = null;

  if (approved) {
    // Create the impersonation session
    sessionId = await createImpersonationSession(env, {
      requestId,
      supportUserId: impersonationRequest.support_user,
      targetUserId: impersonationRequest.target_user,
      targetSiteId: impersonationRequest.target_site,
      durationMinutes: impersonationRequest.session_duration_minutes
    });

    await updateImpersonationRequestStatus(env, requestId, 'approved');

    // Log approval
    await logAuditEvent(env, {
      action: 'impersonation_approved',
      actorUser: ownerId,
      site: impersonationRequest.target_site,
      impersonationSession: sessionId,
      details: { requestId, approvedBy: ownerId }
    });
  } else {
    await updateImpersonationRequestStatus(env, requestId, 'denied', deniedReason);

    // Log denial
    await logAuditEvent(env, {
      action: 'impersonation_denied',
      actorUser: ownerId,
      site: impersonationRequest.target_site,
      details: { requestId, deniedBy: ownerId, reason: deniedReason }
    });
  }

  // Notify the support user of the response
  await notifyUser(env, impersonationRequest.support_user, {
    type: approved ? 'impersonation_approved' : 'impersonation_denied',
    requestId,
    sessionId,
    deniedReason: approved ? null : deniedReason
  });

  return new Response(JSON.stringify({
    success: true,
    approved,
    sessionId
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleEndSession(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json();
  const { sessionId, userId, reason, token } = body;

  if (!sessionId || !userId || !token) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify user token
  const isValid = await verifyUserToken(env, userId, token);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get and validate session
  const session = await getImpersonationSession(env, sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Only the support user or site owner can end the session
  const isOwner = await verifyUserIsSiteOwner(env, userId, session.target_site);
  const isSupportUser = session.support_user === userId;

  if (!isOwner && !isSupportUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized to end this session' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // End the session
  await endImpersonationSession(env, sessionId, userId, isOwner ? 'revoked' : 'manual');

  // Log the event
  await logAuditEvent(env, {
    action: isOwner ? 'impersonation_revoked' : 'impersonation_ended',
    actorUser: userId,
    site: session.target_site,
    impersonationSession: sessionId,
    details: { endedBy: userId, reason: reason || (isOwner ? 'Owner revoked session' : 'Session ended by support') }
  });

  // Notify relevant parties
  if (isOwner) {
    // Notify support user their session was revoked
    await notifyUser(env, session.support_user, {
      type: 'impersonation_revoked',
      sessionId,
      revokedBy: userId
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGetPendingRequests(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const token = url.searchParams.get('token');
  const siteId = url.searchParams.get('siteId');

  if (!userId || !token) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const isValid = await verifyUserToken(env, userId, token);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const requests = await getPendingRequestsForOwner(env, userId, siteId);

  return new Response(JSON.stringify({ requests }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGetActiveSessions(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const token = url.searchParams.get('token');
  const type = url.searchParams.get('type'); // 'support' or 'owner'

  if (!userId || !token) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const isValid = await verifyUserToken(env, userId, token);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const sessions = await getActiveSessionsForUser(env, userId, type);

  return new Response(JSON.stringify({ sessions }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleVerifySession(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const userId = url.searchParams.get('userId');
  const token = url.searchParams.get('token');

  if (!sessionId || !userId || !token) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const isValid = await verifyUserToken(env, userId, token);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const session = await getImpersonationSession(env, sessionId);
  if (!session || session.support_user !== userId || !session.is_active) {
    return new Response(JSON.stringify({ valid: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    await endImpersonationSession(env, sessionId, null, 'expired');
    return new Response(JSON.stringify({ valid: false, reason: 'expired' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    valid: true,
    session: {
      id: session.id,
      targetUser: session.target_user,
      targetSite: session.target_site,
      effectiveRole: session.effective_role,
      expiresAt: session.expires_at
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============================================
// PocketBase API Helpers
// ============================================

async function getPocketBaseAdminToken(env) {
  const response = await fetch(`${env.POCKETBASE_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: env.POCKETBASE_ADMIN_EMAIL,
      password: env.POCKETBASE_ADMIN_PASSWORD
    })
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with PocketBase admin');
  }

  const data = await response.json();
  return data.token;
}

async function verifyUserToken(env, userId, token) {
  try {
    const response = await fetch(`${env.POCKETBASE_URL}/api/collections/users/records/${userId}`, {
      headers: { 'Authorization': token }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function getSupportUserSettings(env, userId) {
  try {
    const adminToken = await getPocketBaseAdminToken(env);
    const response = await fetch(
      `${env.POCKETBASE_URL}/api/collections/support_user_settings/records?filter=(user="${userId}")`,
      { headers: { 'Authorization': adminToken } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.items?.[0] || null;
  } catch {
    return null;
  }
}

async function getSiteOwners(env, siteId) {
  try {
    const adminToken = await getPocketBaseAdminToken(env);
    const response = await fetch(
      `${env.POCKETBASE_URL}/api/collections/site_users/records?filter=(site="${siteId}" && role="owner" && is_active=true)`,
      { headers: { 'Authorization': adminToken } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.items || [];
  } catch {
    return [];
  }
}

async function verifyUserIsSiteOwner(env, userId, siteId) {
  try {
    const adminToken = await getPocketBaseAdminToken(env);
    const response = await fetch(
      `${env.POCKETBASE_URL}/api/collections/site_users/records?filter=(site="${siteId}" && user="${userId}" && role="owner" && is_active=true)`,
      { headers: { 'Authorization': adminToken } }
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data.items?.length > 0;
  } catch {
    return false;
  }
}

async function createImpersonationRequest(env, data) {
  const adminToken = await getPocketBaseAdminToken(env);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes to respond

  const response = await fetch(
    `${env.POCKETBASE_URL}/api/collections/impersonation_requests/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        support_user: data.supportUserId,
        target_user: data.targetUserId,
        target_site: data.targetSiteId,
        reason: data.reason,
        status: 'pending',
        requested_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        session_duration_minutes: data.sessionDurationMinutes
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create impersonation request');
  }

  const record = await response.json();
  return record.id;
}

async function getImpersonationRequest(env, requestId) {
  try {
    const adminToken = await getPocketBaseAdminToken(env);
    const response = await fetch(
      `${env.POCKETBASE_URL}/api/collections/impersonation_requests/records/${requestId}`,
      { headers: { 'Authorization': adminToken } }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

async function updateImpersonationRequestStatus(env, requestId, status, deniedReason = null) {
  const adminToken = await getPocketBaseAdminToken(env);
  const updateData = {
    status,
    responded_at: new Date().toISOString()
  };

  if (deniedReason) {
    updateData.denied_reason = deniedReason;
  }

  await fetch(
    `${env.POCKETBASE_URL}/api/collections/impersonation_requests/records/${requestId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    }
  );
}

async function createImpersonationSession(env, data) {
  const adminToken = await getPocketBaseAdminToken(env);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + data.durationMinutes * 60 * 1000);

  const response = await fetch(
    `${env.POCKETBASE_URL}/api/collections/impersonation_sessions/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        request: data.requestId,
        support_user: data.supportUserId,
        target_user: data.targetUserId,
        target_site: data.targetSiteId,
        effective_role: 'supervisor', // Max role during impersonation - never owner
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create impersonation session');
  }

  const record = await response.json();
  return record.id;
}

async function getImpersonationSession(env, sessionId) {
  try {
    const adminToken = await getPocketBaseAdminToken(env);
    const response = await fetch(
      `${env.POCKETBASE_URL}/api/collections/impersonation_sessions/records/${sessionId}`,
      { headers: { 'Authorization': adminToken } }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

async function endImpersonationSession(env, sessionId, endedBy, endReason) {
  const adminToken = await getPocketBaseAdminToken(env);

  await fetch(
    `${env.POCKETBASE_URL}/api/collections/impersonation_sessions/records/${sessionId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_active: false,
        ended_at: new Date().toISOString(),
        ended_by: endedBy,
        end_reason: endReason
      })
    }
  );
}

async function getPendingRequestsForOwner(env, userId, siteId) {
  try {
    const adminToken = await getPocketBaseAdminToken(env);

    // First get all sites where user is owner
    let siteFilter = '';
    if (siteId) {
      siteFilter = `target_site="${siteId}"`;
    } else {
      const sitesResponse = await fetch(
        `${env.POCKETBASE_URL}/api/collections/site_users/records?filter=(user="${userId}" && role="owner" && is_active=true)`,
        { headers: { 'Authorization': adminToken } }
      );

      if (!sitesResponse.ok) return [];

      const sitesData = await sitesResponse.json();
      const siteIds = sitesData.items?.map(s => s.site) || [];
      if (siteIds.length === 0) return [];

      siteFilter = siteIds.map(id => `target_site="${id}"`).join(' || ');
    }

    const response = await fetch(
      `${env.POCKETBASE_URL}/api/collections/impersonation_requests/records?filter=(status="pending" && (${siteFilter}))&expand=support_user,target_user,target_site&sort=-created`,
      { headers: { 'Authorization': adminToken } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.items || [];
  } catch {
    return [];
  }
}

async function getActiveSessionsForUser(env, userId, type) {
  try {
    const adminToken = await getPocketBaseAdminToken(env);

    let filter;
    if (type === 'support') {
      filter = `support_user="${userId}" && is_active=true`;
    } else {
      // Owner - get all active sessions for sites they own
      const sitesResponse = await fetch(
        `${env.POCKETBASE_URL}/api/collections/site_users/records?filter=(user="${userId}" && role="owner" && is_active=true)`,
        { headers: { 'Authorization': adminToken } }
      );

      if (!sitesResponse.ok) return [];

      const sitesData = await sitesResponse.json();
      const siteIds = sitesData.items?.map(s => s.site) || [];
      if (siteIds.length === 0) return [];

      const siteFilter = siteIds.map(id => `target_site="${id}"`).join(' || ');
      filter = `is_active=true && (${siteFilter})`;
    }

    const response = await fetch(
      `${env.POCKETBASE_URL}/api/collections/impersonation_sessions/records?filter=(${filter})&expand=support_user,target_user,target_site&sort=-created`,
      { headers: { 'Authorization': adminToken } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.items || [];
  } catch {
    return [];
  }
}

async function logAuditEvent(env, data) {
  try {
    const adminToken = await getPocketBaseAdminToken(env);

    await fetch(
      `${env.POCKETBASE_URL}/api/collections/audit_logs/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': adminToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: data.action,
          actor_user: data.actorUser,
          impersonated_user: data.impersonatedUser,
          impersonation_session: data.impersonationSession,
          site: data.site,
          resource_type: data.resourceType,
          resource_id: data.resourceId,
          details: data.details || {}
        })
      }
    );
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

async function notifyUser(env, userId, message) {
  try {
    const id = env.IMPERSONATION_COORDINATOR.idFromName(`user:${userId}`);
    const stub = env.IMPERSONATION_COORDINATOR.get(id);

    await stub.fetch('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify(message)
    });
  } catch (error) {
    console.error('Failed to notify user:', error);
  }
}

// ============================================
// Durable Object for WebSocket State
// ============================================

export class ImpersonationCoordinator {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Handle internal broadcast messages
    if (url.pathname === '/broadcast') {
      const message = await request.json();
      this.broadcast(JSON.stringify(message));
      return new Response('OK');
    }

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleSession(server);

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  handleSession(webSocket) {
    webSocket.accept();
    this.connections.add(webSocket);

    webSocket.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle different message types
        switch (message.type) {
          case 'ping':
            webSocket.send(JSON.stringify({ type: 'pong' }));
            break;
          case 'subscribe':
            // Client wants to subscribe to updates
            webSocket.send(JSON.stringify({ type: 'subscribed' }));
            break;
          default:
            // Echo unknown messages for debugging
            webSocket.send(JSON.stringify({ type: 'echo', original: message }));
        }
      } catch (error) {
        webSocket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    webSocket.addEventListener('close', () => {
      this.connections.delete(webSocket);
    });

    webSocket.addEventListener('error', () => {
      this.connections.delete(webSocket);
    });
  }

  broadcast(message) {
    for (const ws of this.connections) {
      try {
        ws.send(message);
      } catch {
        this.connections.delete(ws);
      }
    }
  }
}
