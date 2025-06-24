// pb_hooks/utils.js
module.exports = {
  createDefaultTierSubscription: (siteId) => {
    $app.logger().error('Was trying to create the subscriptioN!')

    try {
      // Get default plan (fallback to Free plan if no default is set)
      let defaultPlan

      try {
        defaultPlan = $app.findFirstRecordByFilter(
          'subscription_plans',
          'is_default=true && is_active=true'
        )
      } catch (e) {
        // Fallback to Free plan if no default plan is found
        try {
          defaultPlan = $app.findFirstRecordByFilter(
            'subscription_plans',
            'name="free" && is_active=true'
          )
        } catch (e2) {
          $app.logger().error('No default or free plan found')
          return
        }
      }

      if (!defaultPlan) {
        $app.logger().error('No subscription plan available for new site')
        return
      }

      // Create subscription for new site
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      const subscriptionCollection = $app.findCollectionByNameOrId('site_subscriptions')
      const subscription = new Record(subscriptionCollection)

      subscription.set('site', siteId)
      subscription.set('subscription_plan', defaultPlan.get('id'))
      subscription.set('status', 'active')
      subscription.set('current_period_start', now.toISOString())
      subscription.set('current_period_end', periodEnd.toISOString())
      subscription.set('cancel_at_period_end', false)

      $app.save(subscription)

      $app.logger().info(`Created ${defaultPlan.get('name')} subscription for site ${siteId}`)

      // Initialize usage tracking for the new subscription
      initializeUsageTracking(siteId, now, periodEnd)
    } catch (err) {
      $app.logger().error(`Error creating subscription for site ${siteId}: ${err.message}`)
      // Don't throw - we don't want to fail site creation due to subscription issues
    }
  },

  createStandardItems: (siteId) => {
    const standardItems = [
      { name: 'Cement', unit: 'bag' },
      { name: 'River Sand', unit: 'ton' },
      { name: 'Aggregate', unit: 'ton' },
      { name: 'M-Sand', unit: 'ton' },
      { name: 'Rebar', unit: 'ton' }
    ]

    try {
      const itemsCollection = $app.findCollectionByNameOrId('items')

      standardItems.forEach(itemData => {
        const item = new Record(itemsCollection)
        item.set('name', itemData.name)
        item.set('unit', itemData.unit)
        item.set('description', `Standard construction material: ${itemData.name}`)
        item.set('site', siteId)

        $app.save(item)
        $app.logger().info(`Created standard item: ${itemData.name} (${itemData.unit}) for site ${siteId}`)
      })

      $app.logger().info(`Created ${standardItems.length} standard items for site ${siteId}`)
    } catch (err) {
      $app.logger().error(`Error creating standard items for site ${siteId}:`, err)
      // Don't throw - we don't want to fail site creation due to item creation issues
    }
  },

  createDefaultAccount: (siteId) => {
    try {
      const accountsCollection = $app.findCollectionByNameOrId('accounts')

      const cashAccount = new Record(accountsCollection)
      cashAccount.set('name', 'Cash')
      cashAccount.set('type', 'cash')
      cashAccount.set('description', 'Default cash account for petty expenses and cash transactions')
      cashAccount.set('is_active', true)
      cashAccount.set('opening_balance', 0)
      cashAccount.set('current_balance', 0)
      cashAccount.set('site', siteId)

      $app.save(cashAccount)
      $app.logger().info(`Created default Cash account for site ${siteId}`)
    } catch (err) {
      $app.logger().error(`Error creating default account for site ${siteId}:`, err)
      // Don't throw - we don't want to fail site creation due to account creation issues
    }
  },

  initializeUsageTracking(siteId, periodStart, periodEnd) {
    try {
      const usageCollection = $app.findCollectionByNameOrId('subscription_usage')
      const usage = new Record(usageCollection)

      usage.set('site', siteId)
      usage.set('period_start', periodStart.toISOString())
      usage.set('period_end', periodEnd.toISOString())
      usage.set('items_count', 0)
      usage.set('vendors_count', 0)
      usage.set('incoming_deliveries_count', 0)
      usage.set('service_bookings_count', 0)
      usage.set('payments_count', 0)

      $app.save(usage)

      $app.logger().info(`Initialized usage tracking for site ${siteId}`)
    } catch (err) {
      $app.logger().error(`Error initializing usage tracking for site ${siteId}: ${err.message}`)
    }
  }
}
