# PocketBase Hooks

This directory contains PocketBase hooks that should be deployed to your PocketBase instance to ensure proper functionality of the Site-Wise application.

## Overview

These hooks provide server-side automation for critical operations that should not rely on client-side execution:

1. **Usage Tracking Hooks** (`pocketbase-hooks.pb.js`) - Tracks subscription usage for billing
2. **Usage Calculation Hook** (`usage-calculation-hook.js`) - Utilities for recalculating usage

## Installation

1. Copy these hook files to your PocketBase `pb_hooks` directory:
   ```bash
   cp pocketbase-hooks.pb.js /path/to/pocketbase/pb_hooks/
   cp usage-calculation-hook.js /path/to/pocketbase/pb_hooks/
   ```

2. Restart your PocketBase instance to load the hooks

## Hook Details


**Purpose**: Ensures atomicity when creating sites by automatically:
- Creating a `site_user` record with owner role for the creating user
- Setting up the default subscription plan
- Initializing usage tracking

**Why it's needed**: Previously, the client-side code would create the site first, then make a separate request to assign the user as owner. If the second request failed, the site would be orphaned without an owner.

**Hooks implemented**:
- `onRecordAfterCreateSuccess` (sites) - Creates site_user record and subscription
- `onRecordCreate` (sites) - Validates required fields
- `onRecordAfterDeleteSuccess` (sites) - Cleans up related records

### pocketbase-hooks.pb.js

**Purpose**: Tracks usage metrics for subscription billing by monitoring record creation/deletion in tracked collections.

**Tracked collections**:
- items
- vendors
- incoming_deliveries (incoming_items)
- service_bookings
- payments

**Hooks implemented**:
- `onRecordCreate` - Validates against subscription limits
- `onRecordAfterCreateSuccess` - Increments usage count
- `onRecordAfterDeleteSuccess` - Decrements usage count
- `onAfterUpdate` (site_subscriptions) - Creates new usage records for billing periods

### usage-calculation-hook.js

**Purpose**: Provides utilities for recalculating usage counts and fixing discrepancies.

**API Endpoints**:
- `POST /api/recalculate-usage` - Manually trigger usage recalculation
- `GET /api/usage-stats/:siteId` - Get current usage statistics

**Utility functions**:
- `recalculateUsageForPeriod()` - Recalculates actual usage from database
- `emergencyUsageFix()` - Fixes usage count discrepancies

## Testing

After installation, test the hooks:

1. **Test Site Creation**:
   ```javascript
   // Create a new site via API
   // Verify site_user record is created automatically
   // Verify subscription is created
   ```

2. **Test Usage Tracking**:
   ```javascript
   // Create items, vendors, etc.
   // Check usage is tracked in subscription_usage table
   ```

3. **Test Usage Limits**:
   ```javascript
   // Create records up to subscription limit
   // Verify creation is blocked when limit is reached
   ```

## Troubleshooting

### Site created but no owner assigned


### Usage counts incorrect

Use the recalculation endpoint to fix counts:
```bash
curl -X POST http://your-pocketbase/api/recalculate-usage \
  -H "Authorization: Admin AUTH_TOKEN" \
  -d '{"siteId": "SITE_ID"}'
```

### Hooks not loading

1. Ensure files are in the correct `pb_hooks` directory
2. Check file permissions (must be readable by PocketBase)
3. Look for syntax errors in PocketBase logs on startup

## Migration from Client-Side Assignment

If you have existing sites created before these hooks were installed:

1. Run a migration script to create missing site_user records
2. Use the usage recalculation endpoint to initialize usage tracking
3. Verify all sites have owners assigned

## Security Considerations

These hooks run with full database access, so they:
- Validate all inputs to prevent injection attacks
- Use proper error handling to avoid exposing sensitive data
- Log operations for audit trails
- Don't expose internal errors to clients

## Future Improvements

- Add hook for handling user invitations
- Implement soft delete for better data recovery
- Add webhook notifications for important events
- Implement rate limiting for API endpoints