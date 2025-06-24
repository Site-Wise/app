# PocketBase Hooks Structure

This directory contains the PocketBase hooks organized into logical modules for better maintainability and clarity.

## File Structure

```
external_services/pocketbase/
├── utils.js                      # Shared utility functions (required by all hooks)
├── site-management-hooks.pb.js   # Site lifecycle management (Note: may be named subscription-hooks.pb.js)
├── subscription-hooks.pb.js      # Subscription and billing management
├── usage-tracking-hooks.pb.js    # Usage counting and limit validation
├── invitation-hooks.pb.js        # Site invitation processing
├── usage-calculation-hook.js     # Legacy usage calculation (deprecated)
└── HOOKS_README.md               # This documentation
```

## Installation

1. Copy all files to your PocketBase `pb_hooks` directory
2. PocketBase automatically loads all `.pb.js` files on startup
3. Each hook file imports `utils.js` for shared functions using `require(\`${__hooks}/utils.js\`)`
4. Restart your PocketBase server

## Module Overview

### 1. **utils.js** - Shared Functions
Contains reusable utility functions used across all hook modules:

- `createDefaultTierSubscription(siteId)` - Create default subscription for new sites
- `createStandardItems(siteId)` - Create standard construction items
- `createDefaultAccount(siteId)` - Create default Cash account
- `initializeUsageTracking(siteId, periodStart, periodEnd)` - Initialize usage tracking
- `getCurrentUsage(siteId, app)` - Get current usage metrics for a site
- `updateUsageCount(siteId, metric, change, app)` - Update usage counters  
- `canCreateRecord(siteId, usageMetric, app)` - Check subscription limits
- `USAGE_MAPPING` - Constant mapping collections to usage metrics

**Note:** Utility functions use `$app` global when called without app parameter

### 2. **site-management-hooks.pb.js** - Site Lifecycle
Handles site creation, deletion, and ownership:

**Hooks:**
- `onRecordAfterCreateSuccess` on `sites` - Assigns creator as owner, creates subscription, items, and account
- `onRecordAfterDeleteSuccess` on `sites` - Cleans up all related records

**Features:**
- Automatic owner assignment on site creation
- Standard construction items creation (Cement, River Sand, Aggregate, M-Sand, Rebar)
- Default Cash account creation with 0 balance
- Free tier subscription creation for new sites
- Comprehensive cleanup on site deletion

### 3. **subscription-hooks.pb.js** - Subscription Management
Manages subscription lifecycle and billing periods:

**Hooks:**
- `onRecordBeforeUpdateRequest` on `site_subscriptions` - Validates subscription updates
- `onRecordAfterUpdateSuccess` on `site_subscriptions` - Handles period transitions and status changes

**Features:**
- Automatic usage record creation for new billing periods
- Subscription activation/deactivation handling
- Plan change tracking and logging
- Period rollover with usage tracking initialization
- Subscription end date management
- Proper error handling and logging using PocketBase logger

**Implementation Details:**
- Uses `utils.js` for shared functionality like `initializeUsageTracking`
- Imports utilities using `require(\`${__hooks}/utils.js\`)`
- Handles transitions when `current_period_end` is reached
- Creates new usage records for each billing period
- Maintains subscription continuity during plan changes

### 4. **usage-tracking-hooks.pb.js** - Usage Management
Tracks usage and enforces subscription limits:

**Hooks:**
- `onRecordCreate` on tracked collections - Validates creation limits
- `onRecordAfterCreateSuccess` on tracked collections - Increments usage
- `onRecordAfterDeleteSuccess` on tracked collections - Decrements usage
- `onRecordAfterCreateSuccess` on `usage_recalculation_requests` - Manual recalculation

**Tracked Collections:**
- `items` → `items_count`
- `vendors` → `vendors_count`
- `incoming_items` → `incoming_deliveries_count`
- `service_bookings` → `service_bookings_count`
- `payments` → `payments_count`

**Features:**
- Real-time usage tracking
- Subscription limit enforcement
- Usage recalculation for maintenance

### 5. **invitation-hooks.pb.js** - Invitation Management
Handles site invitations and user access:

**Hooks:**
- `onRecordAfterUpdateSuccess` on `site_invitations` - Processes acceptance
- `onRecordAfterUpdateSuccess` on `site_invitations` - Handles expiration/rejection
- `onRecordCreate` on `site_invitations` - Validates new invitations
- `onRecordAfterCreateSuccess` on `invitation_expiration_check` - Auto-expires invitations

**Features:**
- Automatic user access granting on invitation acceptance
- Role updates for existing users
- Invitation validation and expiration handling
- Automatic cleanup of expired invitations

## Usage Examples

### Getting Current Usage
```javascript
const usage = getCurrentUsage('site-123', app)
if (usage) {
  console.log(`Items: ${usage.items_count}`)
  console.log(`Vendors: ${usage.vendors_count}`)
}
```

### Checking Creation Limits
```javascript
const canCreate = canCreateRecord('site-123', 'items_count', app)
if (!canCreate) {
  throw new BadRequestError('Item limit exceeded')
}
```

### Manual Usage Recalculation
To trigger a usage recalculation for a site, create a record in the `usage_recalculation_requests` collection:

```javascript
const recalcRequest = new Record(app.findCollectionByNameOrId('usage_recalculation_requests'))
recalcRequest.set('site', 'site-123')
recalcRequest.set('status', 'pending')
app.saveRecord(recalcRequest)
```

## How It Works

PocketBase automatically loads all `.pb.js` files in the `pb_hooks` directory on startup. Each hook file:

1. **Imports utilities**: `require(\`${__hooks}/utils.js\`)` loads shared functions
2. **Registers hooks**: Uses PocketBase hook functions like `onRecordAfterCreateSuccess`
3. **Operates independently**: Each module handles its specific domain

No main entry point is needed - PocketBase's automatic loading handles the orchestration.

**Import Pattern:**
```javascript
// At the beginning of a hook function or where needed
const utils = require(\`${__hooks}/utils.js\`)

// Then use the utility functions
utils.createDefaultTierSubscription(siteId)
utils.initializeUsageTracking(siteId, startDate, endDate)
```

## Logging Best Practices

All hook files use proper PocketBase logging instead of `console.log`. The correct syntax is:

### In Hook Functions (with event parameter)
```javascript
onRecordAfterCreateSuccess((e) => {
  // Use e.app.logger() for all logging
  e.app.logger().info('Record created successfully')
  e.app.logger().warn('Warning message')
  e.app.logger().error('Error occurred:', err)
  e.app.logger().debug('Debug information')
})
```

### In Utility Functions (with app parameter)
```javascript
function myUtility(siteId, app) {
  // Use app.logger() when app is passed as parameter
  app.logger().info(`Processing site ${siteId}`)
  app.logger().error('Error in utility:', err)
}
```

### In Standalone Functions (with $app global)
```javascript
function standaloneFunction() {
  // Use $app.logger() in standalone functions
  $app.logger().info('Standalone function executed')
  $app.logger().error('Error:', err)
}
```

**❌ Never use:**
- `console.log()`
- `console.error()`
- `console.warn()`
- `console.info()`

**✅ Always use:**
- `e.app.logger().info()` / `.warn()` / `.error()` / `.debug()` in hooks
- `app.logger().info()` / `.warn()` / `.error()` / `.debug()` in utilities
- `$app.logger().info()` / `.warn()` / `.error()` / `.debug()` in standalone functions

## Configuration

### Environment Variables
No additional environment variables are required. The hooks use PocketBase's built-in configuration.

### Database Collections Required
- `sites` - Site records
- `site_users` - Site user permissions
- `site_subscriptions` - Site subscriptions
- `subscription_plans` - Available plans
- `subscription_usage` - Usage tracking records
- `site_invitations` - Site invitations
- `users` - User accounts
- Tracked collections: `items`, `vendors`, `incoming_items`, `service_bookings`, `payments`

### Optional Collections
- `usage_recalculation_requests` - For manual usage recalculation
- `invitation_expiration_check` - For triggering automatic invitation expiration

## Error Handling

All hooks include comprehensive error handling:
- Errors are logged but don't prevent record operations
- Failed operations are logged with detailed error messages
- Critical errors may block operations (e.g., subscription limit exceeded)

## Performance Considerations

- Usage tracking is optimized for real-time updates
- Bulk operations should use the recalculation feature
- Database queries are filtered and indexed appropriately
- Error conditions are handled gracefully to prevent cascading failures

## Migration from Single File

If you're migrating from the original single `pocketbase-hooks.pb.js` file:

1. **Backup your existing file**
2. **Deploy all new files** to your `pb_hooks` directory:
   - `utils.js` (shared functions)
   - `subscription-hooks.pb.js` (currently contains site management - needs proper subscription logic)
   - `usage-tracking-hooks.pb.js`
   - `invitation-hooks.pb.js`
3. **Remove or rename the old file** to prevent conflicts
4. **Restart PocketBase** to automatically load all `.pb.js` files
5. **Test functionality** to ensure everything works correctly
6. **Note**: Ensure subscription-hooks.pb.js contains subscription lifecycle management code, not site management code

## Troubleshooting

### Common Issues

1. **Hooks not loading**: Check file permissions and PocketBase logs
2. **Function not found errors**: Ensure `utils.js` exists and is properly imported with `require(\`${__hooks}/utils.js\`)`
3. **Database errors**: Verify all required collections exist
4. **Permission issues**: Check collection access rules

### Debug Logging

The hooks include detailed logging. Check your PocketBase logs for:
- Hook initialization messages
- Usage tracking updates
- Error conditions
- Subscription changes

### Testing

To test the hooks:
1. Create a new site (should auto-assign owner and subscription)
2. Create records in tracked collections (should increment usage)
3. Delete records (should decrement usage)
4. Try exceeding subscription limits (should be blocked)
5. Process site invitations (should grant access)

## Contributing

When adding new functionality:
1. Choose the appropriate module or create a new one
2. Follow the existing error handling patterns
3. Add comprehensive logging
4. Update this documentation
5. Test thoroughly in a development environment

## License

These hooks are part of the SiteWise project and follow the same license terms.