import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSubscriptionStore } from '../../stores/subscription'

// Mock PocketBase
const mockSubscriptionData = {
  id: 'sub-1',
  site: 'site-1',
  subscription_plan: 'plan-free',
  status: 'active',
  auto_renew: false,
  expand: {
    subscription_plan: {
      id: 'plan-free',
      name: 'Free',
      price: 0,
      currency: 'INR',
      features: {
        max_items: 10,
        max_vendors: 5,
        max_deliveries: 20,
        max_service_bookings: 10,
        max_payments: 30,
        max_accounts: 2,
        max_vendor_returns: 5,
        max_services: 3,
        max_sites: 1
      },
      is_active: true,
      is_default: true
    }
  }
}

const mockUsageData = {
  id: 'usage-1',
  site: 'site-1',
  items_count: 5,
  vendors_count: 2,
  deliveries_count: 10,
  service_bookings_count: 5,
  payments_count: 15,
  accounts_count: 1,
  vendor_returns_count: 2,
  services_count: 1
}

vi.mock('../../services/pocketbase', () => ({
  pb: {
    collection: vi.fn((name: string) => {
      if (name === 'site_subscriptions') {
        return {
          getFirstListItem: vi.fn().mockResolvedValue(mockSubscriptionData)
        }
      } else if (name === 'subscription_usage') {
        return {
          getFirstListItem: vi.fn().mockResolvedValue(mockUsageData)
        }
      }
      return {
        getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found'))
      }
    })
  },
  getCurrentSiteId: vi.fn(() => 'site-1')
}))

describe('useSubscriptionStore', () => {
  let store: ReturnType<typeof useSubscriptionStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useSubscriptionStore()
  })

  it('should load subscription data successfully', async () => {
    await store.loadSubscription()

    expect(store.currentSubscription).toEqual(mockSubscriptionData)
    expect(store.currentUsage).toEqual(mockUsageData)
    expect(store.isLoading).toBe(false)
  })

  it('should compute usage limits correctly', async () => {
    await store.loadSubscription()

    const limits = store.usageLimits
    expect(limits).toBeTruthy()
    expect(limits?.items).toEqual({
      current: 5,
      max: 10,
      unlimited: false,
      disabled: false,
      exceeded: false
    })
  })

  it('should check create limits correctly', async () => {
    await store.loadSubscription()

    // Should allow creation when under limit
    expect(store.checkCreateLimit('items')).toBe(true)
    expect(store.checkCreateLimit('vendors')).toBe(true)

    // Test when at limit (mock usage shows 5 items, limit is 10)
    store.currentUsage!.items_count = 10
    expect(store.checkCreateLimit('items')).toBe(false)
  })
})