/**
 * PocketBase Hook for Usage Calculation and Correction
 * 
 * This hook provides utilities to calculate and correct usage counts
 * based on actual database records. Useful for:
 * - Initial setup of usage tracking
 * - Correcting usage counts after data migration
 * - Periodic usage audits
 */

/**
 * Recalculates usage for a specific site and period
 * @param {string} siteId - The site ID
 * @param {Date} periodStart - Start of the billing period  
 * @param {Date} periodEnd - End of the billing period
 * @returns {Object} - Usage counts object
 */
function recalculateUsageForPeriod(siteId, periodStart, periodEnd) {
  const usage = {
    items_count: 0,
    vendors_count: 0,
    incoming_deliveries_count: 0,
    service_bookings_count: 0,
    payments_count: 0
  };
  
  try {
    // Count items created in this period
    const itemsFilter = `site = "${siteId}" && created >= "${periodStart.toISOString()}" && created < "${periodEnd.toISOString()}"`;
    const itemsCount = $app.dao().findRecordsByFilter('items', itemsFilter, '', 0, 0).length;
    usage.items_count = itemsCount;
    
    // Count vendors created in this period
    const vendorsFilter = `site = "${siteId}" && created >= "${periodStart.toISOString()}" && created < "${periodEnd.toISOString()}"`;
    const vendorsCount = $app.dao().findRecordsByFilter('vendors', vendorsFilter, '', 0, 0).length;
    usage.vendors_count = vendorsCount;
    
    // Count incoming deliveries created in this period
    const deliveriesFilter = `site = "${siteId}" && created >= "${periodStart.toISOString()}" && created < "${periodEnd.toISOString()}"`;
    const deliveriesCount = $app.dao().findRecordsByFilter('incoming_deliveries', deliveriesFilter, '', 0, 0).length;
    usage.incoming_deliveries_count = deliveriesCount;
    
    // Count service bookings created in this period
    const bookingsFilter = `site = "${siteId}" && created >= "${periodStart.toISOString()}" && created < "${periodEnd.toISOString()}"`;
    const bookingsCount = $app.dao().findRecordsByFilter('service_bookings', bookingsFilter, '', 0, 0).length;
    usage.service_bookings_count = bookingsCount;
    
    // Count payments created in this period
    const paymentsFilter = `site = "${siteId}" && created >= "${periodStart.toISOString()}" && created < "${periodEnd.toISOString()}"`;
    const paymentsCount = $app.dao().findRecordsByFilter('payments', paymentsFilter, '', 0, 0).length;
    usage.payments_count = paymentsCount;
    
    console.log(`Recalculated usage for site ${siteId} (${periodStart.toISOString()} - ${periodEnd.toISOString()}):`, usage);
    
    return usage;
  } catch (err) {
    console.error(`Error recalculating usage for site ${siteId}:`, err);
    return usage;
  }
}

/**
 * Updates or creates usage record with calculated values
 * @param {string} siteId - The site ID
 * @param {Date} periodStart - Start of the billing period
 * @param {Date} periodEnd - End of the billing period
 * @param {Object} usage - Usage counts object
 */
function updateUsageRecord(siteId, periodStart, periodEnd, usage) {
  try {
    let usageRecord;
    
    // Try to find existing usage record
    try {
      usageRecord = $app.dao().findFirstRecordByFilter(
        'subscription_usage',
        `site = "${siteId}" && period_start = "${periodStart.toISOString()}" && period_end = "${periodEnd.toISOString()}"`
      );
    } catch (e) {
      // Create new usage record if it doesn't exist
      const usageCollection = $app.dao().findCollectionByNameOrId('subscription_usage');
      usageRecord = new Record(usageCollection);
      usageRecord.set('site', siteId);
      usageRecord.set('period_start', periodStart.toISOString());
      usageRecord.set('period_end', periodEnd.toISOString());
    }
    
    // Update usage counts
    usageRecord.set('items_count', usage.items_count);
    usageRecord.set('vendors_count', usage.vendors_count);
    usageRecord.set('incoming_deliveries_count', usage.incoming_deliveries_count);
    usageRecord.set('service_bookings_count', usage.service_bookings_count);
    usageRecord.set('payments_count', usage.payments_count);
    
    // Save the record
    $app.dao().saveRecord(usageRecord);
    
    console.log(`Updated usage record for site ${siteId}`);
  } catch (err) {
    console.error(`Error updating usage record for site ${siteId}:`, err);
  }
}

/**
 * Recalculates usage for all active subscriptions
 * Useful for initial setup or periodic audits
 */
function recalculateAllUsage() {
  try {
    const activeSubscriptions = $app.dao().findRecordsByFilter(
      'site_subscriptions',
      'status = "active"',
      '',
      0,
      0
    );
    
    console.log(`Found ${activeSubscriptions.length} active subscriptions to recalculate`);
    
    activeSubscriptions.forEach(subscription => {
      const siteId = subscription.get('site');
      const periodStart = new Date(subscription.get('current_period_start'));
      const periodEnd = new Date(subscription.get('current_period_end'));
      
      const usage = recalculateUsageForPeriod(siteId, periodStart, periodEnd);
      updateUsageRecord(siteId, periodStart, periodEnd, usage);
    });
    
    console.log('Finished recalculating usage for all active subscriptions');
  } catch (err) {
    console.error('Error recalculating all usage:', err);
  }
}

/**
 * Hook to trigger usage recalculation via API endpoint
 * You can call this endpoint to manually trigger usage recalculation
 */
routerAdd('POST', '/api/recalculate-usage', (c) => {
  // Require admin authentication
  const admin = c.get('admin');
  if (!admin) {
    return c.json(400, { error: 'Admin authentication required' });
  }
  
  const data = $apis.requestInfo(c).data;
  const siteId = data.siteId;
  
  if (siteId) {
    // Recalculate for specific site
    try {
      const subscription = $app.dao().findFirstRecordByFilter(
        'site_subscriptions',
        `site = "${siteId}" && status = "active"`
      );
      
      if (!subscription) {
        return c.json(404, { error: 'No active subscription found for site' });
      }
      
      const periodStart = new Date(subscription.get('current_period_start'));
      const periodEnd = new Date(subscription.get('current_period_end'));
      
      const usage = recalculateUsageForPeriod(siteId, periodStart, periodEnd);
      updateUsageRecord(siteId, periodStart, periodEnd, usage);
      
      return c.json(200, { 
        message: 'Usage recalculated successfully',
        siteId: siteId,
        usage: usage
      });
    } catch (err) {
      return c.json(500, { error: err.message });
    }
  } else {
    // Recalculate for all sites
    try {
      recalculateAllUsage();
      return c.json(200, { message: 'Usage recalculated for all active subscriptions' });
    } catch (err) {
      return c.json(500, { error: err.message });
    }
  }
});

/**
 * Hook to provide usage statistics via API
 */
routerAdd('GET', '/api/usage-stats/:siteId', (c) => {
  const siteId = c.pathParam('siteId');
  
  try {
    const subscription = $app.dao().findFirstRecordByFilter(
      'site_subscriptions',
      `site = "${siteId}" && status = "active"`
    );
    
    if (!subscription) {
      return c.json(404, { error: 'No active subscription found for site' });
    }
    
    const periodStart = new Date(subscription.get('current_period_start'));
    const periodEnd = new Date(subscription.get('current_period_end'));
    
    // Get current usage record
    let usage;
    try {
      usage = $app.dao().findFirstRecordByFilter(
        'subscription_usage',
        `site = "${siteId}" && period_start = "${periodStart.toISOString()}" && period_end = "${periodEnd.toISOString()}"`
      );
    } catch (e) {
      // If no usage record exists, recalculate it
      const calculatedUsage = recalculateUsageForPeriod(siteId, periodStart, periodEnd);
      updateUsageRecord(siteId, periodStart, periodEnd, calculatedUsage);
      
      usage = $app.dao().findFirstRecordByFilter(
        'subscription_usage',
        `site = "${siteId}" && period_start = "${periodStart.toISOString()}" && period_end = "${periodEnd.toISOString()}"`
      );
    }
    
    // Get subscription plan for limits
    const planId = subscription.get('subscription_plan');
    const plan = $app.dao().findRecordById('subscription_plans', planId);
    const features = plan.get('features') || {};
    
    const response = {
      siteId: siteId,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      },
      usage: {
        items_count: usage.get('items_count') || 0,
        vendors_count: usage.get('vendors_count') || 0,
        incoming_deliveries_count: usage.get('incoming_deliveries_count') || 0,
        service_bookings_count: usage.get('service_bookings_count') || 0,
        payments_count: usage.get('payments_count') || 0
      },
      limits: {
        max_items: features.max_items || -1,
        max_vendors: features.max_vendors || -1,
        max_incoming_deliveries: features.max_incoming_deliveries || -1,
        max_service_bookings: features.max_service_bookings || -1,
        max_payments: features.max_payments || -1
      },
      plan: {
        id: plan.getId(),
        name: plan.get('name')
      }
    };
    
    return c.json(200, response);
  } catch (err) {
    return c.json(500, { error: err.message });
  }
});

/**
 * Emergency function to fix usage counts if they get out of sync
 * Call this if you suspect usage counts are incorrect
 */
function emergencyUsageFix() {
  console.log('Starting emergency usage fix...');
  
  try {
    // Get all usage records
    const allUsage = $app.dao().findRecordsByFilter('subscription_usage', '', '', 0, 0);
    
    allUsage.forEach(usageRecord => {
      const siteId = usageRecord.get('site');
      const periodStart = new Date(usageRecord.get('period_start'));
      const periodEnd = new Date(usageRecord.get('period_end'));
      
      // Recalculate actual usage
      const actualUsage = recalculateUsageForPeriod(siteId, periodStart, periodEnd);
      
      // Compare with stored usage
      const storedUsage = {
        items_count: usageRecord.get('items_count') || 0,
        vendors_count: usageRecord.get('vendors_count') || 0,
        incoming_deliveries_count: usageRecord.get('incoming_deliveries_count') || 0,
        service_bookings_count: usageRecord.get('service_bookings_count') || 0,
        payments_count: usageRecord.get('payments_count') || 0
      };
      
      // Check if any counts differ
      let needsUpdate = false;
      for (const key in actualUsage) {
        if (actualUsage[key] !== storedUsage[key]) {
          needsUpdate = true;
          console.log(`Mismatch for site ${siteId} ${key}: stored=${storedUsage[key]}, actual=${actualUsage[key]}`);
        }
      }
      
      if (needsUpdate) {
        updateUsageRecord(siteId, periodStart, periodEnd, actualUsage);
        console.log(`Fixed usage for site ${siteId}`);
      }
    });
    
    console.log('Emergency usage fix completed');
  } catch (err) {
    console.error('Error during emergency usage fix:', err);
  }
}

// Uncomment the line below to run emergency fix on startup (be careful!)
// emergencyUsageFix();