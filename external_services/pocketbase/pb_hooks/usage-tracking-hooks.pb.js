/**
 * Usage Tracking Hooks for PocketBase
 *
 * Automatically increments/decrements subscription_usage counters
 * when records are created or deleted in tracked collections.
 *
 * Tracked collections and their corresponding usage fields:
 * - items → items_count
 * - vendors → vendors_count
 * - deliveries → deliveries_count
 * - service_bookings → service_bookings_count
 * - payments → payments_count
 * - accounts → accounts_count
 * - services → services_count
 */

// Map collection names to their usage counter field
const COLLECTION_TO_USAGE_FIELD = {
  'items': 'items_count',
  'vendors': 'vendors_count',
  'deliveries': 'deliveries_count',
  'service_bookings': 'service_bookings_count',
  'payments': 'payments_count',
  'accounts': 'accounts_count',
  'services': 'services_count',
  'vendor_returns': 'vendor_returns_count'
}

/**
 * Gets the current billing period boundaries (1st of current month to last day of current month)
 */
function getCurrentPeriod() {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { periodStart, periodEnd }
}

/**
 * Counts existing records for a site in a given collection.
 * Used when initializing a new usage record to backfill accurate counts.
 */
function countExistingRecords(app, collectionName, siteId) {
  try {
    const records = app.findRecordsByFilter(collectionName, `site = "${siteId}"`)
    return records.length
  } catch (e) {
    // Collection might not exist or have no records
    return 0
  }
}

/**
 * Finds the current period's usage record for a site, or creates one with
 * accurate counts based on existing records.
 */
function getOrCreateUsageRecord(app, siteId) {
  const { periodStart, periodEnd } = getCurrentPeriod()
  const periodStartISO = periodStart.toISOString()
  const periodEndISO = periodEnd.toISOString()

  // Try to find existing usage record for current period
  try {
    const usage = app.findFirstRecordByFilter(
      'subscription_usage',
      `site = "${siteId}" && period_start = "${periodStartISO}" && period_end = "${periodEndISO}"`
    )
    return usage
  } catch (e) {
    // No record found for current period - create one with actual counts
  }

  try {
    const usageCollection = app.findCollectionByNameOrId('subscription_usage')
    const usage = new Record(usageCollection)

    usage.set('site', siteId)
    usage.set('period_start', periodStartISO)
    usage.set('period_end', periodEndISO)

    // Backfill with actual counts from existing records
    usage.set('items_count', countExistingRecords(app, 'items', siteId))
    usage.set('vendors_count', countExistingRecords(app, 'vendors', siteId))
    usage.set('deliveries_count', countExistingRecords(app, 'deliveries', siteId))
    usage.set('service_bookings_count', countExistingRecords(app, 'service_bookings', siteId))
    usage.set('payments_count', countExistingRecords(app, 'payments', siteId))
    usage.set('accounts_count', countExistingRecords(app, 'accounts', siteId))
    usage.set('services_count', countExistingRecords(app, 'services', siteId))
    usage.set('vendor_returns_count', countExistingRecords(app, 'vendor_returns', siteId))

    app.save(usage)
    app.logger().info(`Created usage record for site ${siteId} with backfilled counts`)

    return usage
  } catch (err) {
    app.logger().error(`Error creating usage record for site ${siteId}: ${err.message}`)
    return null
  }
}

/**
 * Updates the usage counter for a site when a record is created or deleted.
 * @param {object} app - PocketBase app instance
 * @param {string} siteId - The site ID
 * @param {string} field - The usage field to update (e.g., 'items_count')
 * @param {number} delta - The change amount (+1 for create, -1 for delete)
 */
function updateUsageCounter(app, siteId, field, delta) {
  if (!siteId) {
    app.logger().warn(`Cannot update usage: no site ID provided for field ${field}`)
    return
  }

  const usage = getOrCreateUsageRecord(app, siteId)
  if (!usage) return

  const currentValue = usage.get(field) || 0
  const newValue = Math.max(0, currentValue + delta) // Never go below 0

  usage.set(field, newValue)

  try {
    app.save(usage)
    app.logger().info(`Updated ${field} for site ${siteId}: ${currentValue} → ${newValue}`)
  } catch (err) {
    app.logger().error(`Error updating ${field} for site ${siteId}: ${err.message}`)
  }
}

// Register create hooks for all tracked collections
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const collectionName = record.tableName()
  const field = COLLECTION_TO_USAGE_FIELD[collectionName]

  if (!field) return

  const siteId = record.get('site')
  updateUsageCounter(e.app, siteId, field, +1)

  e.next()
}, 'items', 'vendors', 'deliveries', 'service_bookings', 'payments', 'accounts', 'services', 'vendor_returns')

// Register delete hooks for all tracked collections
onRecordAfterDeleteSuccess((e) => {
  const record = e.record
  const collectionName = record.tableName()
  const field = COLLECTION_TO_USAGE_FIELD[collectionName]

  if (!field) return

  const siteId = record.get('site')
  updateUsageCounter(e.app, siteId, field, -1)

  e.next()
}, 'items', 'vendors', 'deliveries', 'service_bookings', 'payments', 'accounts', 'services', 'vendor_returns')
