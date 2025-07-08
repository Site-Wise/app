/**
 * Site Management Hooks for PocketBase
 * 
 * This file handles all site-related operations:
 * - Site creation and automatic owner assignment
 * - Site deletion and cleanup of related records
 * - Site ownership management
 * - Creation of standard items and default account
 */

// Hook for Site creation - automatically assign creator as owner
onRecordAfterCreateSuccess((e) => {
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

    const utils = require(`${__hooks}/utils.js`)
    
    // Create free tier subscription for new site
    utils.createDefaultTierSubscription(siteId)

    // Create standard construction items and services
    utils.createStandardItems(siteId)
    utils.createStandardServices(siteId)
    
    // Create default Cash account
    utils.createDefaultAccount(siteId)
  } catch (err) {
    e.app.logger().error(`Error assigning owner to site ${siteId}:`, err)
  }

  e.next()
}, 'sites')

// Hook for Site deletion - cleanup related records
onRecordAfterDeleteSuccess((e) => {
  if (e.record.tableName() !== 'sites') return

  const siteId = e.record.get('id')

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

    // Clean up site_invitations
    const invitations = e.app.findRecordsByFilter('site_invitations', `site = "${siteId}"`)
    invitations.forEach(invitation => {
      e.app.deleteRecord(invitation)
    })

    // Clean up all site-related data
    const collections = [
      'items', 'vendors', 'incoming_items', 'service_bookings',
      'payments', 'accounts', 'services', 'quotations'
    ]

    collections.forEach(collectionName => {
      try {
        const records = e.app.findRecordsByFilter(collectionName, `site = "${siteId}"`)
        records.forEach(record => {
          e.app.deleteRecord(record)
        })
      } catch (err) {
        // Some collections might not exist or have different structures
        e.app.logger().warn(`Could not clean up ${collectionName} for site ${siteId}:`, err.message)
      }
    })

    e.app.logger().info(`Cleaned up all related records for deleted site ${siteId}`)

  } catch (err) {
    e.app.logger().error(`Error cleaning up records for deleted site ${siteId}:`, err)
  }

  e.next()
}, 'sites')