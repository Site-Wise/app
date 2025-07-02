import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pb, getCurrentSiteId } from '../services/pocketbase'

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  features: {
    max_items: number
    max_vendors: number
    max_deliveries: number
    max_service_bookings: number
    max_payments: number
    max_accounts: number
    max_vendor_returns: number
    max_services: number
    max_sites: number
  }
  is_active: boolean
  is_default: boolean
  description?: string
  created: string
  updated: string
}

export interface SiteSubscription {
  id: string
  site: string
  subscription_plan: string
  status: 'active' | 'cancelled' | 'expired' | 'trial'
  trial_start_date?: string
  trial_end_date?: string
  billing_start_date?: string
  next_billing_date?: string
  auto_renew: boolean
  cancelled_at?: string
  razorpay_subscription_id?: string
  expand?: {
    subscription_plan?: SubscriptionPlan
    site?: any
  }
  created: string
  updated: string
}

export interface SubscriptionUsage {
  id: string
  site: string
  period_start: string
  period_end: string
  items_count: number
  vendors_count: number
  deliveries_count: number
  service_bookings_count: number
  payments_count: number
  accounts_count?: number
  vendor_returns_count?: number
  services_count?: number
  created: string
  updated: string
}

export const useSubscriptionStore = defineStore('subscription', () => {
  // State
  const currentSubscription = ref<SiteSubscription | null>(null)
  const currentUsage = ref<SubscriptionUsage | null>(null)
  const allPlans = ref<SubscriptionPlan[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentSiteId = ref<string | null>(null)

  // Request deduplication: prevent multiple simultaneous loadSubscription calls
  let loadSubscriptionPromise: Promise<void> | null = null

  // Computed properties
  const currentPlan = computed(() => {
    return currentSubscription.value?.expand?.subscription_plan || null
  })

  const isSubscriptionActive = computed(() => {
    if (!currentSubscription.value) return false
    return currentSubscription.value.status === 'active' || currentSubscription.value.status === 'trial'
  })

  const isSubscriptionCancelled = computed(() => {
    return currentSubscription.value?.status === 'cancelled'
  })

  const canReactivateSubscription = computed(() => {
    return isSubscriptionCancelled.value && currentSubscription.value?.razorpay_subscription_id
  })

  const subscriptionStatus = computed(() => {
    if (!currentSubscription.value) return 'none'
    return currentSubscription.value.status
  })

  const isUnlimited = (limit: number): boolean => {
    return limit === -1
  }

  const isDisabled = (limit: number): boolean => {
    return limit === 0
  }

  const isLimited = (limit: number): boolean => {
    return limit > 0
  }

  const usageLimits = computed(() => {
    if (!currentPlan.value || !currentPlan.value.features) return null

    const plan = currentPlan.value
    const usage = currentUsage.value || {
      items_count: 0,
      vendors_count: 0,
      deliveries_count: 0,
      service_bookings_count: 0,
      payments_count: 0,
      accounts_count: 0,
      vendor_returns_count: 0,
      services_count: 0
    }

    return {
      items: {
        current: usage.items_count,
        max: plan.features.max_items,
        unlimited: isUnlimited(plan.features.max_items),
        disabled: isDisabled(plan.features.max_items),
        exceeded: isLimited(plan.features.max_items) && usage.items_count >= plan.features.max_items
      },
      vendors: {
        current: usage.vendors_count,
        max: plan.features.max_vendors,
        unlimited: isUnlimited(plan.features.max_vendors),
        disabled: isDisabled(plan.features.max_vendors),
        exceeded: isLimited(plan.features.max_vendors) && usage.vendors_count >= plan.features.max_vendors
      },
      deliveries: {
        current: usage.deliveries_count,
        max: plan.features.max_deliveries,
        unlimited: isUnlimited(plan.features.max_deliveries),
        disabled: isDisabled(plan.features.max_deliveries),
        exceeded: isLimited(plan.features.max_deliveries) && usage.deliveries_count >= plan.features.max_deliveries
      },
      service_bookings: {
        current: usage.service_bookings_count,
        max: plan.features.max_service_bookings,
        unlimited: isUnlimited(plan.features.max_service_bookings),
        disabled: isDisabled(plan.features.max_service_bookings),
        exceeded: isLimited(plan.features.max_service_bookings) && usage.service_bookings_count >= plan.features.max_service_bookings
      },
      payments: {
        current: usage.payments_count,
        max: plan.features.max_payments,
        unlimited: isUnlimited(plan.features.max_payments),
        disabled: isDisabled(plan.features.max_payments),
        exceeded: isLimited(plan.features.max_payments) && usage.payments_count >= plan.features.max_payments
      },
      accounts: {
        current: usage.accounts_count || 0,
        max: plan.features.max_accounts,
        unlimited: isUnlimited(plan.features.max_accounts),
        disabled: isDisabled(plan.features.max_accounts),
        exceeded: isLimited(plan.features.max_accounts) && (usage.accounts_count || 0) >= plan.features.max_accounts
      },
      vendor_returns: {
        current: usage.vendor_returns_count || 0,
        max: plan.features.max_vendor_returns,
        unlimited: isUnlimited(plan.features.max_vendor_returns),
        disabled: isDisabled(plan.features.max_vendor_returns),
        exceeded: isLimited(plan.features.max_vendor_returns) && (usage.vendor_returns_count || 0) >= plan.features.max_vendor_returns
      },
      services: {
        current: usage.services_count || 0,
        max: plan.features.max_services,
        unlimited: isUnlimited(plan.features.max_services),
        disabled: isDisabled(plan.features.max_services),
        exceeded: isLimited(plan.features.max_services) && (usage.services_count || 0) >= plan.features.max_services
      }
    }
  })

  const isReadOnly = computed(() => {
    if (!isSubscriptionActive.value) return true
    if (!usageLimits.value) return false
    
    const limits = usageLimits.value
    return limits.items.exceeded || 
           limits.vendors.exceeded || 
           limits.deliveries.exceeded || 
           limits.service_bookings.exceeded || 
           limits.payments.exceeded ||
           limits.accounts.exceeded ||
           limits.vendor_returns.exceeded ||
           limits.services.exceeded
  })

  // Actions
  async function loadSubscription(siteId?: string) {
    const targetSiteId = siteId || getCurrentSiteId()
    
    if (!targetSiteId) {
      currentSubscription.value = null
      currentUsage.value = null
      error.value = null
      return
    }

    // If there's already a request in progress for the same site, return that promise
    if (loadSubscriptionPromise && currentSiteId.value === targetSiteId) {
      return loadSubscriptionPromise
    }

    // Create and store the promise for this request
    loadSubscriptionPromise = loadSubscriptionInternal(targetSiteId)
    currentSiteId.value = targetSiteId
    
    try {
      await loadSubscriptionPromise
    } finally {
      // Clear the promise when done (success or failure)
      loadSubscriptionPromise = null
    }
  }

  async function loadSubscriptionInternal(siteId: string) {
    try {
      isLoading.value = true
      error.value = null

      // Load subscription with plan details
      const subscription = await pb.collection('site_subscriptions').getFirstListItem(
        `site="${siteId}"`,
        { expand: 'subscription_plan,site' }
      )

      currentSubscription.value = subscription as unknown as SiteSubscription

      // Calculate current billing period
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      // Try to get existing usage record for current period
      try {
        const usage = await pb.collection('subscription_usage').getFirstListItem(
          `site="${siteId}" && period_start="${periodStart.toISOString()}" && period_end="${periodEnd.toISOString()}"`
        )
        currentUsage.value = usage as unknown as SubscriptionUsage
      } catch {
        // Usage record will be created by PocketBase hooks when needed
        currentUsage.value = null
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load subscription'
      console.error('Error loading subscription:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadAllPlans() {
    try {
      const plans = await pb.collection('subscription_plans').getFullList({
        filter: 'is_active=true',
        sort: 'price'
      })
      allPlans.value = plans as unknown as SubscriptionPlan[]
      return plans
    } catch (err) {
      console.error('Error loading subscription plans:', err)
      throw err
    }
  }

  function checkCreateLimit(type: 'items' | 'vendors' | 'deliveries' | 'service_bookings' | 'payments' | 'accounts' | 'vendor_returns' | 'services'): boolean {
    if (!currentSubscription.value) return false
    
    const plan = currentSubscription.value.expand?.subscription_plan
    if (!plan || !plan.features) return false

    // If no usage data exists yet, treat current usage as 0 for all types
    const usage = currentUsage.value || {
      items_count: 0,
      vendors_count: 0,
      deliveries_count: 0,
      service_bookings_count: 0,
      payments_count: 0,
      accounts_count: 0,
      vendor_returns_count: 0,
      services_count: 0
    }
    
    switch (type) {
      case 'items':
        if (isDisabled(plan.features.max_items)) return false
        return isUnlimited(plan.features.max_items) || usage.items_count < plan.features.max_items
      case 'vendors':
        if (isDisabled(plan.features.max_vendors)) return false
        return isUnlimited(plan.features.max_vendors) || usage.vendors_count < plan.features.max_vendors
      case 'deliveries':
        if (isDisabled(plan.features.max_deliveries)) return false
        return isUnlimited(plan.features.max_deliveries) || usage.deliveries_count < plan.features.max_deliveries
      case 'service_bookings':
        if (isDisabled(plan.features.max_service_bookings)) return false
        return isUnlimited(plan.features.max_service_bookings) || usage.service_bookings_count < plan.features.max_service_bookings
      case 'payments':
        if (isDisabled(plan.features.max_payments)) return false
        return isUnlimited(plan.features.max_payments) || usage.payments_count < plan.features.max_payments
      case 'accounts':
        if (isDisabled(plan.features.max_accounts)) return false
        return isUnlimited(plan.features.max_accounts) || (usage.accounts_count || 0) < plan.features.max_accounts
      case 'vendor_returns':
        if (isDisabled(plan.features.max_vendor_returns)) return false
        return isUnlimited(plan.features.max_vendor_returns) || (usage.vendor_returns_count || 0) < plan.features.max_vendor_returns
      case 'services':
        if (isDisabled(plan.features.max_services)) return false
        return isUnlimited(plan.features.max_services) || (usage.services_count || 0) < plan.features.max_services
      default:
        return false
    }
  }

  async function createDefaultSubscription(siteId: string): Promise<void> {
    try {
      // Get default plan (fallback to Free plan if no default is set)
      let defaultPlan
      try {
        defaultPlan = await pb.collection('subscription_plans').getFirstListItem(
          'is_default=true && is_active=true'
        )
      } catch {
        // Fallback to Free plan if no default plan is found
        defaultPlan = await pb.collection('subscription_plans').getFirstListItem(
          'name="Free" && is_active=true'
        )
      }

      await pb.collection('site_subscriptions').create({
        site: siteId,
        subscription_plan: defaultPlan.id,
        status: 'active',
        auto_renew: false
      })

      // Reload subscription data
      await loadSubscription(siteId)
    } catch (err) {
      console.error('Error creating default subscription:', err)
      throw err
    }
  }

  function clearSubscriptionData() {
    currentSubscription.value = null
    currentUsage.value = null
    error.value = null
    currentSiteId.value = null
  }

  return {
    // State
    currentSubscription: computed(() => currentSubscription.value),
    currentUsage: computed(() => currentUsage.value),
    currentPlan,
    allPlans: computed(() => allPlans.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    
    // Computed
    usageLimits,
    isReadOnly,
    isSubscriptionActive,
    isSubscriptionCancelled,
    canReactivateSubscription,
    subscriptionStatus,
    
    // Actions
    loadSubscription,
    loadAllPlans,
    checkCreateLimit,
    createDefaultSubscription,
    clearSubscriptionData,
    
    // Helper functions
    isUnlimited,
    isDisabled,
    isLimited
  }
})