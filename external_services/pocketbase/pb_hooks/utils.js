// pb_hooks/utils.js

// Maximum age (ms) accepted for a native app-attestation token. Kept short to
// limit replay; covers normal request latency + minor client/server clock skew.
const APP_TOKEN_MAX_AGE_MS = 120000

module.exports = {
  // ---------------------------------------------------------------------------
  // Bot-protection helpers (login + signup)
  // ---------------------------------------------------------------------------

  /**
   * Verify a Cloudflare Turnstile token (web clients). Throws on any failure.
   */
  verifyTurnstile: (turnstileToken, remoteIP) => {
    const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY

    if (!turnstileToken) {
      throw new Error("Turnstile token is missing.")
    }
    if (!turnstileSecretKey) {
      throw new Error("TURNSTILE_SECRET_KEY environment variable is not set.")
    }

    const formData = new FormData()
    formData.append("secret", turnstileSecretKey)
    formData.append("response", turnstileToken)
    formData.append("remoteip", remoteIP)

    const resp = $http.send({
      url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      method: "POST",
      body: formData,
      headers: { "content-type": "application/json" },
    })

    if (resp.statusCode != 200) {
      throw new Error("Turnstile verification failed: " + resp.statusCode)
    }

    const data = resp.json
    if (!data.success) {
      throw new Error("Invalid Turnstile token: " + JSON.stringify(data["error-codes"]))
    }
  },

  /**
   * Verify a native app-attestation token (Tauri clients), which replaces
   * Turnstile where the widget cannot render. Returns `true` only for a
   * well-formed, fresh, correctly-signed token for the expected purpose.
   *
   * Token format: `v1.<purpose>.<timestampMs>.<hexHmacSha256>`
   * Signed message: `<purpose>.<timestampMs>` (HMAC-SHA256, hex).
   */
  verifyAppToken: (token, expectedPurpose) => {
    const secret = process.env.APP_ATTEST_SECRET
    if (!secret) {
      throw new Error("APP_ATTEST_SECRET environment variable is not set.")
    }
    if (!token || typeof token !== "string") return false

    const parts = token.split(".")
    if (parts.length !== 4) return false

    const [version, purpose, timestamp, signature] = parts
    if (version !== "v1") return false
    if (purpose !== expectedPurpose) return false

    const ts = parseInt(timestamp, 10)
    if (!ts || isNaN(ts)) return false
    if (Math.abs(Date.now() - ts) > APP_TOKEN_MAX_AGE_MS) return false

    const expected = $security.hs256(`${purpose}.${timestamp}`, secret)
    return $security.equal(expected, signature)
  },

  /**
   * Unified gate for auth endpoints: accept either a valid Turnstile token
   * (web) OR a valid app-attestation token (native). Throws if neither passes.
   */
  verifyAuthChallenge: (turnstileToken, appToken, remoteIP, purpose) => {
    if (appToken) {
      if (!module.exports.verifyAppToken(appToken, purpose)) {
        throw new Error("Invalid or expired app attestation token.")
      }
      return
    }
    module.exports.verifyTurnstile(turnstileToken, remoteIP)
  },

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
    const standardItems = require("./items.json")

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
