/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase Hooks for Impersonation System
 *
 * These hooks handle:
 * - Automatic session expiration
 * - Request expiration cleanup
 * - Audit log creation for impersonation events (using PR 145's audit_logs schema)
 * - Session validation
 *
 * NOTE: Uses the same audit_logs collection as PR 145's general audit system.
 * Impersonation events are tracked as entity CRUD operations on impersonation_requests
 * and impersonation_sessions collections.
 */

// Helper to get user info from record or context
function getUserInfo(app, userId) {
  if (!userId) return { userId: '', userEmail: '', userRole: '' };

  try {
    const user = app.findRecordById('users', userId);
    return {
      userId: userId,
      userEmail: user.get('email') || '',
      userRole: '' // Role is site-specific, handled separately
    };
  } catch (err) {
    return { userId: userId, userEmail: '', userRole: '' };
  }
}

// Helper to create audit log entry (compatible with PR 145's schema)
function createAuditLog(app, action, entityType, entityId, entityName, siteId, userId, userEmail, userRole, changes = null) {
  try {
    const auditCollection = app.findCollectionByNameOrId('audit_logs');
    if (!auditCollection) {
      app.logger().warn('audit_logs collection not found - skipping audit');
      return;
    }

    const auditLog = new Record(auditCollection);
    auditLog.set('site', siteId || '');
    auditLog.set('user_id', userId || '');
    auditLog.set('user_email', userEmail || '');
    auditLog.set('user_role', userRole || '');
    auditLog.set('action', action);
    auditLog.set('entity_type', entityType);
    auditLog.set('entity_id', entityId);
    auditLog.set('entity_name', entityName);
    auditLog.set('timestamp', new Date().toISOString());

    if (changes) {
      auditLog.set('changes', changes);
    }

    app.save(auditLog);
  } catch (err) {
    app.logger().error(`Failed to create audit log for ${entityType}:`, err);
  }
}

// ============================================
// Scheduled Jobs for Cleanup
// ============================================

// Run every minute to expire old requests and sessions
cronAdd("expire_impersonation_items", "* * * * *", (app) => {
  const now = new Date().toISOString();

  // Expire pending requests that have passed their expiration time
  try {
    const expiredRequests = app.findRecordsByFilter(
      "impersonation_requests",
      `status = "pending" && expires_at < "${now}"`,
      "-created",
      100,
      0
    );

    for (const request of expiredRequests) {
      const oldStatus = request.get("status");
      request.set("status", "expired");
      app.save(request);

      // Log using PR 145's audit schema
      const userInfo = getUserInfo(app, request.get("support_user"));
      createAuditLog(
        app,
        'UPDATE',
        'impersonation_request',
        request.id,
        `Request ${request.id.substring(0, 8)}...`,
        request.get("target_site"),
        userInfo.userId,
        userInfo.userEmail,
        '',
        {
          status: { old: oldStatus, new: 'expired' },
          _impersonation_event: 'request_expired',
          reason: 'Request expired without response'
        }
      );
    }
  } catch (err) {
    app.logger().error("Failed to expire requests", "error", err.toString());
  }

  // End active sessions that have passed their expiration time
  try {
    const expiredSessions = app.findRecordsByFilter(
      "impersonation_sessions",
      `is_active = true && expires_at < "${now}"`,
      "-created",
      100,
      0
    );

    for (const session of expiredSessions) {
      session.set("is_active", false);
      session.set("ended_at", now);
      session.set("end_reason", "expired");
      app.save(session);

      // Log using PR 145's audit schema
      const userInfo = getUserInfo(app, session.get("support_user"));
      createAuditLog(
        app,
        'UPDATE',
        'impersonation_session',
        session.id,
        `Session ${session.id.substring(0, 8)}...`,
        session.get("target_site"),
        userInfo.userId,
        userInfo.userEmail,
        '',
        {
          is_active: { old: true, new: false },
          end_reason: { old: null, new: 'expired' },
          _impersonation_event: 'session_expired'
        }
      );
    }
  } catch (err) {
    app.logger().error("Failed to expire sessions", "error", err.toString());
  }
});

// ============================================
// Record Hooks for Impersonation Requests
// ============================================

onRecordAfterCreateSuccess((e) => {
  // Log when a new impersonation request is created
  try {
    const userInfo = getUserInfo(e.app, e.record.get("support_user"));
    createAuditLog(
      e.app,
      'CREATE',
      'impersonation_request',
      e.record.id,
      `Impersonation request by ${userInfo.userEmail || 'support'}`,
      e.record.get("target_site"),
      userInfo.userId,
      userInfo.userEmail,
      '',
      {
        target_user: { old: null, new: e.record.get("target_user") },
        reason: { old: null, new: e.record.get("reason") },
        session_duration_minutes: { old: null, new: e.record.get("session_duration_minutes") },
        _impersonation_event: 'request_created'
      }
    );
  } catch (err) {
    e.app.logger().error("Failed to log impersonation request", "error", err.toString());
  }

  e.next();
}, "impersonation_requests");

onRecordAfterUpdateSuccess((e) => {
  const oldRecord = e.record.original();
  const oldStatus = oldRecord.get("status");
  const newStatus = e.record.get("status");

  // Only log status changes
  if (oldStatus !== newStatus) {
    try {
      let eventType = '';
      if (newStatus === "approved") {
        eventType = 'request_approved';
      } else if (newStatus === "denied") {
        eventType = 'request_denied';
      } else if (newStatus === "cancelled") {
        eventType = 'request_cancelled';
      }

      if (eventType) {
        const userInfo = getUserInfo(e.app, e.record.get("support_user"));
        const changes = {
          status: { old: oldStatus, new: newStatus },
          _impersonation_event: eventType
        };

        if (e.record.get("denied_reason")) {
          changes.denied_reason = { old: null, new: e.record.get("denied_reason") };
        }

        createAuditLog(
          e.app,
          'UPDATE',
          'impersonation_request',
          e.record.id,
          `Request ${newStatus}`,
          e.record.get("target_site"),
          userInfo.userId,
          userInfo.userEmail,
          '',
          changes
        );
      }
    } catch (err) {
      e.app.logger().error("Failed to log impersonation status change", "error", err.toString());
    }
  }

  e.next();
}, "impersonation_requests");

// ============================================
// Record Hooks for Impersonation Sessions
// ============================================

onRecordAfterCreateSuccess((e) => {
  // Log when a new impersonation session starts
  try {
    const userInfo = getUserInfo(e.app, e.record.get("support_user"));
    createAuditLog(
      e.app,
      'CREATE',
      'impersonation_session',
      e.record.id,
      `Impersonation session started`,
      e.record.get("target_site"),
      userInfo.userId,
      userInfo.userEmail,
      '',
      {
        target_user: { old: null, new: e.record.get("target_user") },
        effective_role: { old: null, new: e.record.get("effective_role") },
        expires_at: { old: null, new: e.record.get("expires_at") },
        request_id: { old: null, new: e.record.get("request") },
        _impersonation_event: 'session_started'
      }
    );
  } catch (err) {
    e.app.logger().error("Failed to log impersonation session start", "error", err.toString());
  }

  e.next();
}, "impersonation_sessions");

onRecordAfterUpdateSuccess((e) => {
  const oldRecord = e.record.original();
  const wasActive = oldRecord.get("is_active");
  const isActive = e.record.get("is_active");

  // Log when session ends
  if (wasActive && !isActive) {
    try {
      const endReason = e.record.get("end_reason");
      const eventType = endReason === "revoked" ? 'session_revoked' : 'session_ended';
      const userInfo = getUserInfo(e.app, e.record.get("ended_by") || e.record.get("support_user"));

      createAuditLog(
        e.app,
        'UPDATE',
        'impersonation_session',
        e.record.id,
        `Session ${endReason || 'ended'}`,
        e.record.get("target_site"),
        userInfo.userId,
        userInfo.userEmail,
        '',
        {
          is_active: { old: true, new: false },
          end_reason: { old: null, new: endReason },
          ended_at: { old: null, new: e.record.get("ended_at") },
          ended_by: { old: null, new: e.record.get("ended_by") },
          _impersonation_event: eventType
        }
      );
    } catch (err) {
      e.app.logger().error("Failed to log impersonation session end", "error", err.toString());
    }
  }

  e.next();
}, "impersonation_sessions");

// ============================================
// Validation Hooks
// ============================================

onRecordCreate((e) => {
  // Validate that the support user is actually a support agent
  const supportUserId = e.record.get("support_user");

  try {
    const supportSettings = e.app.findFirstRecordByFilter(
      "support_user_settings",
      `user = "${supportUserId}" && is_support_agent = true`
    );

    if (!supportSettings) {
      throw new BadRequestError("User is not authorized as a support agent");
    }

    // Validate session duration doesn't exceed max allowed
    const requestedDuration = e.record.get("session_duration_minutes");
    const maxDuration = supportSettings.get("max_session_duration");

    if (requestedDuration > maxDuration) {
      e.record.set("session_duration_minutes", maxDuration);
    }
  } catch (err) {
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadRequestError("Failed to validate support user");
  }

  e.next();
}, "impersonation_requests");

onRecordCreate((e) => {
  // Validate that there isn't already an active session for this combination
  const supportUser = e.record.get("support_user");
  const targetSite = e.record.get("target_site");

  try {
    const existingSession = e.app.findFirstRecordByFilter(
      "impersonation_sessions",
      `support_user = "${supportUser}" && target_site = "${targetSite}" && is_active = true`
    );

    if (existingSession) {
      throw new BadRequestError("An active impersonation session already exists for this site");
    }
  } catch (err) {
    if (err instanceof BadRequestError) {
      throw err;
    }
    // No existing session found, which is fine
  }

  e.next();
}, "impersonation_sessions");
