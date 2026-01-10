/**
 * Audit Logging Hooks for PocketBase
 *
 * Automatically logs all create, update, and delete operations
 * for site-scoped collections. Designed for minimal overhead:
 * - Only logs essential fields (no full record snapshots)
 * - Uses async save to avoid blocking main operations
 * - Skips audit_logs collection to prevent recursion
 */

// Collections to audit (all site-scoped data collections)
const AUDITED_COLLECTIONS = [
  'items',
  'services',
  'vendors',
  'accounts',
  'deliveries',
  'delivery_items',
  'payments',
  'payment_allocations',
  'service_bookings',
  'quotations',
  'tags',
  'vendor_returns',
  'vendor_return_items',
  'vendor_refunds',
  'vendor_credit_notes',
  'credit_note_usages',
  'account_transactions'
];

// Helper to get display name for a record
function getEntityName(record, collectionName) {
  // Try common name fields
  const nameFields = ['name', 'reference', 'invoice_number', 'booking_reference'];
  for (const field of nameFields) {
    const value = record.get(field);
    if (value) return value;
  }
  // Fallback to ID
  return record.get('id');
}

// Helper to extract changed fields (for updates)
function getChangedFields(originalRecord, newRecord, collectionName) {
  const changes = {};
  const skipFields = ['id', 'created', 'updated', 'site', 'collectionId', 'collectionName'];

  // Get all field names from the new record
  const fields = Object.keys(newRecord.publicExport());

  for (const field of fields) {
    if (skipFields.includes(field)) continue;

    const oldValue = originalRecord.get(field);
    const newValue = newRecord.get(field);

    // Simple comparison (handles primitives and stringified objects)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[field] = {
        old: oldValue,
        new: newValue
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

// Helper to create audit log entry
function createAuditLog(app, action, record, collectionName, userId, userEmail, userRole, changes = null) {
  try {
    const siteId = record.get('site');
    if (!siteId) {
      // Skip records without site (shouldn't happen for audited collections)
      return;
    }

    const auditCollection = app.findCollectionByNameOrId('audit_logs');
    if (!auditCollection) {
      app.logger().warn('audit_logs collection not found - skipping audit');
      return;
    }

    const auditLog = new Record(auditCollection);
    auditLog.set('site', siteId);
    auditLog.set('user_id', userId || '');
    auditLog.set('user_email', userEmail || '');
    auditLog.set('user_role', userRole || '');
    auditLog.set('action', action);
    auditLog.set('entity_type', collectionName);
    auditLog.set('entity_id', record.get('id'));
    auditLog.set('entity_name', getEntityName(record, collectionName));
    auditLog.set('timestamp', new Date().toISOString());

    if (changes) {
      auditLog.set('changes', changes);
    }

    // Save asynchronously to minimize overhead
    app.save(auditLog);
  } catch (err) {
    // Log error but don't fail the main operation
    app.logger().error(`Failed to create audit log for ${collectionName}:`, err);
  }
}

// Helper to get user info from request context
function getUserFromContext(e) {
  let userId = '';
  let userEmail = '';
  let userRole = '';

  try {
    // Try to get user from auth record
    if (e.auth) {
      userId = e.auth.id || '';
      userEmail = e.auth.get('email') || '';
    }

    // Try to get role from site_users if we have a site and user
    if (userId && e.record) {
      const siteId = e.record.get('site');
      if (siteId) {
        try {
          const siteUser = e.app.findFirstRecordByFilter(
            'site_users',
            `site = "${siteId}" && user = "${userId}" && is_active = true`
          );
          if (siteUser) {
            userRole = siteUser.get('role') || '';
          }
        } catch (err) {
          // Ignore - role lookup is optional
        }
      }
    }
  } catch (err) {
    e.app.logger().warn('Could not extract user info for audit log:', err);
  }

  return { userId, userEmail, userRole };
}

// Hook for CREATE operations
onRecordAfterCreateSuccess((e) => {
  const collectionName = e.record.tableName();

  // Skip non-audited collections
  if (!AUDITED_COLLECTIONS.includes(collectionName)) {
    return;
  }

  const { userId, userEmail, userRole } = getUserFromContext(e);
  createAuditLog(e.app, 'CREATE', e.record, collectionName, userId, userEmail, userRole);
});

// Hook for UPDATE operations
onRecordAfterUpdateSuccess((e) => {
  const collectionName = e.record.tableName();

  // Skip non-audited collections
  if (!AUDITED_COLLECTIONS.includes(collectionName)) {
    return;
  }

  const { userId, userEmail, userRole } = getUserFromContext(e);

  // Get changed fields if we have the original record
  let changes = null;
  if (e.originalRecord) {
    changes = getChangedFields(e.originalRecord, e.record, collectionName);
  }

  // Only log if there were actual changes
  if (changes || !e.originalRecord) {
    createAuditLog(e.app, 'UPDATE', e.record, collectionName, userId, userEmail, userRole, changes);
  }
});

// Hook for DELETE operations
onRecordAfterDeleteSuccess((e) => {
  const collectionName = e.record.tableName();

  // Skip non-audited collections
  if (!AUDITED_COLLECTIONS.includes(collectionName)) {
    return;
  }

  const { userId, userEmail, userRole } = getUserFromContext(e);
  createAuditLog(e.app, 'DELETE', e.record, collectionName, userId, userEmail, userRole);
});
