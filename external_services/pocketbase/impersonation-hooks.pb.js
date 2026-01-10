/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase Hooks for Impersonation System
 *
 * These hooks handle:
 * - Automatic session expiration
 * - Request expiration cleanup
 * - Audit log creation for impersonation events
 * - Session validation
 */

// ============================================
// Scheduled Jobs for Cleanup
// ============================================

// Run every minute to expire old requests and sessions
cronAdd("expire_impersonation_items", "* * * * *", () => {
  const now = new Date().toISOString();

  // Expire pending requests that have passed their expiration time
  try {
    const expiredRequests = $app.dao().findRecordsByFilter(
      "impersonation_requests",
      `status = "pending" && expires_at < "${now}"`,
      "-created",
      100,
      0
    );

    for (const request of expiredRequests) {
      request.set("status", "expired");
      $app.dao().saveRecord(request);

      // Log the expiration
      const auditLog = new Record($app.dao().findCollectionByNameOrId("audit_logs"));
      auditLog.set("action", "impersonation_expired");
      auditLog.set("actor_user", request.get("support_user"));
      auditLog.set("site", request.get("target_site"));
      auditLog.set("details", { requestId: request.id, reason: "Request expired without response" });
      $app.dao().saveRecord(auditLog);
    }
  } catch (err) {
    $app.logger().error("Failed to expire requests", "error", err.toString());
  }

  // End active sessions that have passed their expiration time
  try {
    const expiredSessions = $app.dao().findRecordsByFilter(
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
      $app.dao().saveRecord(session);

      // Log the expiration
      const auditLog = new Record($app.dao().findCollectionByNameOrId("audit_logs"));
      auditLog.set("action", "impersonation_ended");
      auditLog.set("actor_user", session.get("support_user"));
      auditLog.set("impersonation_session", session.id);
      auditLog.set("site", session.get("target_site"));
      auditLog.set("details", { sessionId: session.id, reason: "Session expired" });
      $app.dao().saveRecord(auditLog);
    }
  } catch (err) {
    $app.logger().error("Failed to expire sessions", "error", err.toString());
  }
});

// ============================================
// Record Hooks for Impersonation Requests
// ============================================

onRecordAfterCreateRequest((e) => {
  // Log when a new impersonation request is created
  try {
    const auditLog = new Record($app.dao().findCollectionByNameOrId("audit_logs"));
    auditLog.set("action", "impersonation_requested");
    auditLog.set("actor_user", e.record.get("support_user"));
    auditLog.set("site", e.record.get("target_site"));
    auditLog.set("details", {
      requestId: e.record.id,
      targetUser: e.record.get("target_user"),
      reason: e.record.get("reason"),
      sessionDuration: e.record.get("session_duration_minutes")
    });
    $app.dao().saveRecord(auditLog);
  } catch (err) {
    $app.logger().error("Failed to log impersonation request", "error", err.toString());
  }
}, "impersonation_requests");

onRecordAfterUpdateRequest((e) => {
  const oldStatus = e.record.originalCopy().get("status");
  const newStatus = e.record.get("status");

  // Only log status changes
  if (oldStatus !== newStatus) {
    try {
      let action = "";
      if (newStatus === "approved") {
        action = "impersonation_approved";
      } else if (newStatus === "denied") {
        action = "impersonation_denied";
      } else if (newStatus === "cancelled") {
        action = "impersonation_cancelled";
      }

      if (action) {
        const auditLog = new Record($app.dao().findCollectionByNameOrId("audit_logs"));
        auditLog.set("action", action);
        // For approval/denial, the actor is the owner who responded
        auditLog.set("actor_user", e.httpContext?.get("auth")?.id || e.record.get("support_user"));
        auditLog.set("site", e.record.get("target_site"));
        auditLog.set("details", {
          requestId: e.record.id,
          previousStatus: oldStatus,
          newStatus: newStatus,
          deniedReason: e.record.get("denied_reason")
        });
        $app.dao().saveRecord(auditLog);
      }
    } catch (err) {
      $app.logger().error("Failed to log impersonation status change", "error", err.toString());
    }
  }
}, "impersonation_requests");

// ============================================
// Record Hooks for Impersonation Sessions
// ============================================

onRecordAfterCreateRequest((e) => {
  // Log when a new impersonation session starts
  try {
    const auditLog = new Record($app.dao().findCollectionByNameOrId("audit_logs"));
    auditLog.set("action", "impersonation_started");
    auditLog.set("actor_user", e.record.get("support_user"));
    auditLog.set("impersonation_session", e.record.id);
    auditLog.set("impersonated_user", e.record.get("target_user"));
    auditLog.set("site", e.record.get("target_site"));
    auditLog.set("details", {
      sessionId: e.record.id,
      requestId: e.record.get("request"),
      effectiveRole: e.record.get("effective_role"),
      expiresAt: e.record.get("expires_at")
    });
    $app.dao().saveRecord(auditLog);
  } catch (err) {
    $app.logger().error("Failed to log impersonation session start", "error", err.toString());
  }
}, "impersonation_sessions");

onRecordAfterUpdateRequest((e) => {
  const wasActive = e.record.originalCopy().get("is_active");
  const isActive = e.record.get("is_active");

  // Log when session ends
  if (wasActive && !isActive) {
    try {
      const endReason = e.record.get("end_reason");
      const action = endReason === "revoked" ? "impersonation_revoked" : "impersonation_ended";

      const auditLog = new Record($app.dao().findCollectionByNameOrId("audit_logs"));
      auditLog.set("action", action);
      auditLog.set("actor_user", e.record.get("ended_by") || e.record.get("support_user"));
      auditLog.set("impersonation_session", e.record.id);
      auditLog.set("impersonated_user", e.record.get("target_user"));
      auditLog.set("site", e.record.get("target_site"));
      auditLog.set("details", {
        sessionId: e.record.id,
        endReason: endReason,
        endedBy: e.record.get("ended_by"),
        endedAt: e.record.get("ended_at")
      });
      $app.dao().saveRecord(auditLog);
    } catch (err) {
      $app.logger().error("Failed to log impersonation session end", "error", err.toString());
    }
  }
}, "impersonation_sessions");

// ============================================
// Validation Hooks
// ============================================

onRecordBeforeCreateRequest((e) => {
  // Validate that the support user is actually a support agent
  const supportUserId = e.record.get("support_user");

  try {
    const supportSettings = $app.dao().findFirstRecordByFilter(
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
}, "impersonation_requests");

onRecordBeforeCreateRequest((e) => {
  // Validate that there isn't already an active session for this combination
  const supportUser = e.record.get("support_user");
  const targetSite = e.record.get("target_site");

  try {
    const existingSession = $app.dao().findFirstRecordByFilter(
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
}, "impersonation_sessions");

// ============================================
// API Rules Helper
// ============================================

/**
 * Helper function to check if a user is a site owner
 */
function isUserSiteOwner(userId, siteId) {
  try {
    const siteUser = $app.dao().findFirstRecordByFilter(
      "site_users",
      `user = "${userId}" && site = "${siteId}" && role = "owner" && is_active = true`
    );
    return !!siteUser;
  } catch {
    return false;
  }
}

$app.logger().info("Impersonation hooks loaded successfully");
