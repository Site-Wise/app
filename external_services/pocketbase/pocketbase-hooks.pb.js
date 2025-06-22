/**
 * PocketBase Hooks for Site Management and Usage Tracking
 * 
 * Place these hooks in your PocketBase pb_hooks directory.
 * These hooks handle:
 * - Automatic user assignment when sites are created
 * - Automatic subscription usage tracking when records are created/deleted
 * - Site deletion cleanup
 * 
 * Usage is tracked securely on the server side, preventing client manipulation.
 */

// Hook for Site creation - automatically assign creator as owner
onRecordAfterCreateSuccess((e) => {
  if (e.record.tableName() !== 'sites') return

  const site = e.record
  const siteId = site.get('id')
  const creatorId = site.get('admin_user')

  if (!creatorId) {
    e.app.logger().error('Cannot determine creator for site:', siteId)
    return
  }

  try {
    // Create site_user record to assign creator as owner
    const siteUserCollection = e.app.findCollectionByNameOrId('site_users')
    const siteUser = new Record(siteUserCollection)
    siteUser.set('site', siteId)
    siteUser.set('user', creatorId)
    siteUser.set('assigned_by', creatorId)
    siteUser.set('role', 'owner')
    siteUser.set('is_active', true)

    e.app.save(siteUser)
    e.app.logger().info(`Assigned user ${creatorId} as owner of site ${siteId}`)

    createFreeTierSubscription(siteId, e.app)
  } catch (err) {
    e.app.logger().error(`Error assigning owner to site ${siteId}:`, err)
  }

  e.next()
}, 'sites')

// Hook to automatically grant site permissions when an invitation is accepted
onRecordAfterUpdateSuccess((e) => {
  if (e.record.tableName() !== 'site_invitations') return

  const invitation = e.record
  const oldRecord = e.record.originalCopy()
  
  // Check if status changed from pending to accepted
  if (oldRecord.get('status') !== 'pending' || invitation.get('status') !== 'accepted') {
    return // Not an acceptance event
  }

  try {
    // Get the user who accepted the invitation
    const userEmail = invitation.get('email')
    const users = e.app.findRecordsByFilter('users', `email = "${userEmail}"`)
    
    if (!users || users.length === 0) {
      e.app.logger().error(`No user found with email ${userEmail} for invitation ${invitation.getId()}`)
      return
    }
    
    const user = users[0]
    
    // Check if user is already a member of this site
    let existingSiteUser
    try {
      existingSiteUser = e.app.findFirstRecordByFilter(
        'site_users',
        `site = "${invitation.get('site')}" && user = "${user.getId()}"`
      )
    } catch (err) {
      // No existing record found, which is expected
    }
    
    if (existingSiteUser) {
      e.app.logger().info(`User ${user.getId()} already has access to site ${invitation.get('site')}`)
      return
    }

    // Create site_user record to grant permissions
    const siteUserCollection = e.app.findCollectionByNameOrId('site_users')
    const siteUserRecord = new Record(siteUserCollection)
    siteUserRecord.set('site', invitation.get('site'))
    siteUserRecord.set('user', user.getId())
    siteUserRecord.set('role', invitation.get('role'))
    siteUserRecord.set('assigned_by', invitation.get('invited_by'))
    siteUserRecord.set('is_active', true)
    
    e.app.save(siteUserRecord)
    
    // Update the invitation with accepted_at timestamp
    invitation.set('accepted_at', new Date().toISOString())
    e.app.save(invitation)
    
    e.app.logger().info(`Granted ${invitation.get('role')} permissions to user ${user.getId()} for site ${invitation.get('site')}`)
    
  } catch (error) {
    e.app.logger().error(`Error processing accepted invitation ${invitation.getId()}:`, error)
    // Don't throw - we don't want to fail the invitation update
  }
  
  e.next()
}, 'site_invitations')

// Hook for Site deletion - cleanup related records
onRecordAfterDeleteSuccess((e) => {
  if (e.record.tableName() !== 'sites') return

  const siteId = e.record.getId()

  try {
    // Clean up site_users
    const siteUsers = e.app.findRecordsByFilter('site_users', `site = "${siteId}"`)
    siteUsers.forEach(siteUser => {
      e.app.deleteRecord(siteUser)
    })

    // Clean up site_subscriptions
    const subscriptions = e.app.findRecordsByFilter('site_subscriptions', `site = "${siteId}"`)
    subscriptions.forEach(subscription => {
      e.app.deleteRecord(subscription)
    })

    // Clean up subscription_usage
    const usageRecords = e.app.findRecordsByFilter('subscription_usage', `site = "${siteId}"`)
    usageRecords.forEach(usage => {
      e.app.deleteRecord(usage)
    })

    e.app.logger().info(`Cleaned up related records for deleted site ${siteId}`)

  } catch (err) {
    e.app.logger().error(`Error cleaning up records for deleted site ${siteId}:`, err)
  }

  e.next()
}, 'sites')

// Hook for Items collection
onRecordAfterCreateSuccess((e) => {
  const usageMapping = {
    'items': 'items_count',
    'vendors': 'vendors_count',
    'incoming_deliveries': 'incoming_deliveries_count',
    'service_bookings': 'service_bookings_count',
    'payments': 'payments_count'
  }

  const record = e.record
  const tableName = e.record.tableName()
  const siteId = record.get('site')

  updateUsageCount(siteId, usageMapping[tableName], 1, e.app)

  e.next()
}, 'items', 'vendors', 'incoming_deliveries', 'service_bookings', 'payments')

onRecordAfterDeleteSuccess((e) => {
  const usageMapping = {
    'items': 'items_count',
    'vendors': 'vendors_count',
    'incoming_deliveries': 'incoming_deliveries_count',
    'service_bookings': 'service_bookings_count',
    'payments': 'payments_count'
  }

  const record = e.record
  const tableName = e.record.tableName()
  const siteId = record.get('site')

  updateUsageCount(siteId, usageMapping[tableName], -1, e.app)

  e.next()
}, 'items', 'vendors', 'incoming_deliveries', 'service_bookings', 'payments')

/**
 * Hook to validate creation limits before allowing new records
 * This runs before the record is created, allowing us to block creation if limits are exceeded
 */
onRecordCreate((e) => {
  // Map table names to usage metrics
  const usageMapping = {
    'items': 'items_count',
    'vendors': 'vendors_count',
    'incoming_deliveries': 'incoming_deliveries_count',
    'service_bookings': 'service_bookings_count',
    'payments': 'payments_count'
  }

  const record = e.record
  const tableName = record.tableName()
  const usageMetric = usageMapping[tableName]

  const siteId = record.get('site')
  if (!siteId) return // No site association

  // Check if creation is allowed
  if (!canCreateRecord(siteId, usageMetric, e.app)) {
    throw new BadRequestError(`Subscription limit exceeded for ${tableName}. Please upgrade your plan.`)
  }

  e.next()
}, 'items', 'vendors', 'incoming_deliveries', 'service_bookings', 'payments')

/**
 * Hook to handle subscription period transitions
 * This creates new usage records when a subscription period changes
 */
onRecordAfterUpdateSuccess((e) => {
  if (e.record.tableName() !== 'site_subscriptions') return

  const record = e.record
  const oldRecord = e.record.originalCopy()

  // Check if period_end has changed (new billing cycle)
  const oldPeriodEnd = oldRecord.get('current_period_end')
  const newPeriodEnd = record.get('current_period_end')

  if (oldPeriodEnd !== newPeriodEnd) {
    const siteId = record.get('site')
    const periodStart = new Date(record.get('current_period_start'))
    const periodEnd = new Date(newPeriodEnd)

    // Create new usage record for the new period
    try {
      const usageCollection = e.app.findCollectionByNameOrId('subscription_usage')
      const usage = new Record(usageCollection)
      usage.set('site', siteId)
      usage.set('period_start', periodStart.toISOString())
      usage.set('period_end', periodEnd.toISOString())
      usage.set('items_count', 0)
      usage.set('vendors_count', 0)
      usage.set('incoming_deliveries_count', 0)
      usage.set('service_bookings_count', 0)
      usage.set('payments_count', 0)

      e.app.saveRecord(usage)
      e.app.logger().info(`Created new usage record for site ${siteId} for period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`)
    } catch (err) {
      e.app.logger().error(`Error creating new usage record for site ${siteId}:`, err)
    }
  }

  e.next()
}, 'site_subscriptions')

/**
 * Utility function to get current usage for a site and period
 * This can be called from anywhere in your PocketBase hooks
 * @param {string} siteId
 * @param {core.App} app
 */
function getCurrentUsage(siteId, app) {
  try {
    const subscription = app.findFirstRecordByFilter(
      'site_subscriptions',
      `site = "${siteId}" && status = "active"`
    )

    if (!subscription) return null

    const periodStart = new Date(subscription.get('current_period_start'))
    const periodEnd = new Date(subscription.get('current_period_end'))

    const usage = app.findFirstRecordByFilter(
      'subscription_usage',
      `site = "${siteId}" && period_start = "${periodStart.toISOString()}" && period_end = "${periodEnd.toISOString()}"`
    )

    return {
      items_count: usage.get('items_count') || 0,
      vendors_count: usage.get('vendors_count') || 0,
      incoming_deliveries_count: usage.get('incoming_deliveries_count') || 0,
      service_bookings_count: usage.get('service_bookings_count') || 0,
      payments_count: usage.get('payments_count') || 0
    }
  } catch (err) {
    e.app.logger().error(`Error getting current usage for site ${siteId}:`, err)
    return null
  }
}

/**
 * Creates a free tier subscription for a new site
 * @param {string} siteId - The site ID
 * @param {core.App} app
 */
function createFreeTierSubscription(siteId, app) {
  try {
    // Get default plan (fallback to Free plan if no default is set)
    let defaultPlan

    try {
      defaultPlan = app.findFirstRecordByFilter(
        'subscription_plans',
        'is_default=true && is_active=true'
      )
    } catch (e) {
      // Fallback to Free plan if no default plan is found
      try {
        defaultPlan = app.findFirstRecordByFilter(
          'subscription_plans',
          'name="Free" && is_active=true'
        )
      } catch (e2) {
        e.app.logger().error('No default or Free plan found')
        return
      }
    }

    if (!defaultPlan) {
      e.app.logger().error('No subscription plan available for new site')
      return
    }

    // Create subscription for new site
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const subscriptionCollection = app.findCollectionByNameOrId('site_subscriptions')
    const subscription = new Record(subscriptionCollection)

    subscription.set('site', siteId)
    subscription.set('subscription_plan', defaultPlan.getId())
    subscription.set('status', 'active')
    subscription.set('current_period_start', now.toISOString())
    subscription.set('current_period_end', periodEnd.toISOString())
    subscription.set('cancel_at_period_end', false)

    app.saveRecord(subscription)

    e.app.logger().info(`Created ${defaultPlan.get('name')} subscription for site ${siteId}`)

    // Initialize usage tracking for the new subscription
    // initializeUsageTracking(siteId, now, periodEnd, app)
  } catch (err) {
    e.app.logger().error(`Error creating subscription for site ${siteId}: ${err.message}`)
    // Don't throw - we don't want to fail site creation due to subscription issues
  }
}

/**
 * Initializes usage tracking for a new subscription
 * @param {string} siteId - The site ID
 * @param {Date} periodStart - Start of the billing period
 * @param {Date} periodEnd - End of the billing period
 * @param {core.App} app
 */
function initializeUsageTracking(siteId, periodStart, periodEnd, app) {
  try {
    const usageCollection = app.findCollectionByNameOrId('subscription_usage')
    const usage = new Record(usageCollection)

    usage.set('site', siteId)
    usage.set('period_start', periodStart.toISOString())
    usage.set('period_end', periodEnd.toISOString())
    usage.set('items_count', 0)
    usage.set('vendors_count', 0)
    usage.set('incoming_deliveries_count', 0)
    usage.set('service_bookings_count', 0)
    usage.set('payments_count', 0)

    app.save(usage)

    e.app.logger().info(`Initialized usage tracking for site ${siteId}`)
  } catch (err) {
    e.app.logger().error(`Error initializing usage tracking for site ${siteId}: ${err.message}`)
  }
}

/**
 * Checks if a new record can be created based on subscription limits
 * @param {string} siteId - The site ID
 * @param {string} usageMetric - The usage metric to check
 * @param {core.App} app
 * @returns {boolean} - True if creation is allowed, false otherwise
 */
function canCreateRecord(siteId, usageMetric, app) {
  try {
    // Get current subscription for the site
    const subscription = app.findFirstRecordByFilter(
      'site_subscriptions',
      `site = "${siteId}" && status = "active"`
    )

    if (!subscription) {
      app.logger().error(`No active subscription found for site: ${siteId}`)
      return false // No subscription = no creation allowed
    }

    // Get subscription plan
    const planId = subscription.get('subscription_plan')
    const plan = app.findRecordById('subscription_plans', planId)

    if (!plan) {
      app.logger().error(`No plan found for subscription: ${subscription.getId()}`)
      return false
    }

    // Get plan features
    const features = plan.get('features')
    if (!features) return true // No features defined = unlimited

    // Map usage metric to plan feature
    const featureMapping = {
      'items_count': 'max_items',
      'vendors_count': 'max_vendors',
      'incoming_deliveries_count': 'max_incoming_deliveries',
      'service_bookings_count': 'max_service_bookings',
      'payments_count': 'max_payments'
    }

    const featureKey = featureMapping[usageMetric]
    if (!featureKey) return true

    const maxAllowed = features[featureKey]

    // Check if unlimited (-1) or disabled (0)
    if (maxAllowed === -1) {
      return true // Unlimited
    }

    if (maxAllowed === 0) {
      return false // Disabled feature
    }

    // Get current usage
    const periodStart = new Date(subscription.get('current_period_start'))
    const periodEnd = new Date(subscription.get('current_period_end'))

    let usage
    try {
      usage = app.findFirstRecordByFilter(
        'subscription_usage',
        `site = "${siteId}" && period_start = "${periodStart.toISOString()}" && period_end = "${periodEnd.toISOString()}"`
      )
    } catch (e) {
      // No usage record yet = allow creation
      return true
    }

    const currentCount = usage.get(usageMetric) || 0

    // Allow creation if under limit
    return currentCount < maxAllowed

  } catch (err) {
    e.app.logger().error(`Error checking creation limits for site ${siteId}:`, err)
    return false // Error = block creation for safety
  }
}

/**
 * Updates usage count for a specific site and metric
 * @param {string} siteId - The site ID
 * @param {string} metric - The usage metric to update (e.g., 'items_count')
 * @param {number} change - The change amount (+1 for create, -1 for delete)
 * @param {core.App} app
*/
function updateUsageCount(siteId, metric, change, app) {
  try {
    // Get current subscription for the site
    const subscription = app.findFirstRecordByFilter(
      'site_subscriptions',
      `site = "${siteId}" && status = "active"`
    )

    if (!subscription) {
      app.logger().error(`No active subscription found for site: ${siteId}`)
      return
    }

    // Calculate current billing period
    const periodStart = new Date(subscription.get('current_period_start'))
    const periodEnd = new Date(subscription.get('current_period_end'))

    // Find or create usage record for current period
    let usage
    try {
      usage = app.findFirstRecordByFilter(
        'subscription_usage',
        `site = "${siteId}" && period_start = "${periodStart.toISOString()}" && period_end = "${periodEnd.toISOString()}"`
      )
    } catch (e) {
      // Create new usage record if it doesn't exist
      const usageCollection = app.findCollectionByNameOrId('subscription_usage')
      usage = new Record(usageCollection)
      usage.set('site', siteId)
      usage.set('period_start', periodStart.toISOString())
      usage.set('period_end', periodEnd.toISOString())
      usage.set('items_count', 0)
      usage.set('vendors_count', 0)
      usage.set('incoming_deliveries_count', 0)
      usage.set('service_bookings_count', 0)
      usage.set('payments_count', 0)
    }

    // Update the specific metric
    const currentCount = usage.get(metric) || 0
    const newCount = Math.max(0, currentCount + change) // Ensure count doesn't go below 0
    usage.set(metric, newCount)

    // Save the usage record
    app.saveRecord(usage)

    e.app.logger().info(`Updated ${metric} for site ${siteId}: ${currentCount} -> ${newCount}`)

  } catch (err) {
    e.app.logger().error(`Error updating usage count for site ${siteId}:`, err)
  }
}