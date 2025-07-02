import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSubscriptionStore } from '../../stores/subscription'
import { useSubscription } from '../../composables/useSubscription'

// Mock data
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
        max_items: 100,
        max_vendors: 25,
        max_deliveries: 100,
        max_service_bookings: 50,
        max_payments: 200,
        max_accounts: 2,
        max_vendor_returns: 10,
        max_services: 10,
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
  items_count: 50,
  vendors_count: 10,
  deliveries_count: 20,
  service_bookings_count: 15,
  payments_count: 100,
  accounts_count: 1,
  vendor_returns_count: 5,
  services_count: 5
}

const mockProPlan = {
  id: 'plan-pro',
  name: 'Pro',
  price: 999,
  currency: 'INR',
  features: {
    max_items: -1, // Unlimited
    max_vendors: -1,
    max_deliveries: -1,
    max_service_bookings: -1,
    max_payments: -1,
    max_accounts: -1,
    max_vendor_returns: -1,
    max_services: -1,
    max_sites: 5
  },
  is_active: true,
  is_default: false
}

const mockDisabledPlan = {
  id: 'plan-disabled',
  name: 'Disabled Plan',
  price: 0,
  currency: 'INR',
  features: {
    max_items: 100,
    max_vendors: 25,
    max_deliveries: 0, // Disabled
    max_service_bookings: 0, // Disabled
    max_payments: 200,
    max_accounts: 2,
    max_vendor_returns: 10,
    max_services: 0, // Disabled
    max_sites: 1
  },
  is_active: true,
  is_default: false
}

// Mock PocketBase
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
      } else if (name === 'subscription_plans') {
        return {
          getFirstListItem: vi.fn().mockResolvedValue(mockSubscriptionData.expand.subscription_plan),
          getFullList: vi.fn().mockResolvedValue([mockSubscriptionData.expand.subscription_plan, mockProPlan])
        }
      }
      return {
        getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found'))
      }
    })
  },
  getCurrentSiteId: vi.fn(() => 'site-1')
}))

describe('useSubscription', () => {
  let store: ReturnType<typeof useSubscriptionStore>
  let pbCollectionMock: any
  let getCurrentSiteIdMock: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useSubscriptionStore()
    
    // Get mock references
    const pocketbaseMocks = await import('../../services/pocketbase')
    pbCollectionMock = vi.mocked(pocketbaseMocks.pb.collection)
    getCurrentSiteIdMock = vi.mocked(pocketbaseMocks.getCurrentSiteId)
    
    getCurrentSiteIdMock.mockReturnValue('site-1')
  })

  describe('store integration', () => {
    it('should load subscription data successfully through store', async () => {
      await store.loadSubscription()

      expect(store.currentSubscription).toEqual(mockSubscriptionData)
      expect(store.currentUsage).toEqual(mockUsageData)
      expect(store.isLoading).toBe(false)
    })

    it('should handle missing usage record gracefully', async () => {
      // Mock subscription success but usage failure
      pbCollectionMock.mockImplementation((name: string) => {
        if (name === 'site_subscriptions') {
          return { getFirstListItem: vi.fn().mockResolvedValue(mockSubscriptionData) }
        } else if (name === 'subscription_usage') {
          return { getFirstListItem: vi.fn().mockRejectedValue(new Error('No usage record')) }
        }
        return { getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')) }
      })

      await store.loadSubscription()
      
      expect(store.currentSubscription).toEqual(mockSubscriptionData)
      expect(store.currentUsage).toBeNull()
      expect(store.error).toBeNull() // No error for missing usage
    })

    it('should handle errors gracefully', async () => {
      // Mock API error
      pbCollectionMock.mockImplementation(() => ({
        getFirstListItem: vi.fn().mockRejectedValue(new Error('Network error'))
      }))

      await store.loadSubscription()
      
      expect(store.error).toBe('Network error')
      expect(store.currentSubscription).toBeNull()
    })

    it('should clear data when site ID is null', async () => {
      // First reset to default mock and load data
      pbCollectionMock.mockImplementation((name: string) => {
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
      
      await store.loadSubscription()
      expect(store.currentSubscription).toEqual(mockSubscriptionData)
      
      // Now clear by setting site ID to null
      getCurrentSiteIdMock.mockReturnValue(null)
      await store.loadSubscription()
      
      expect(store.currentSubscription).toBeNull()
      expect(store.currentUsage).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('should compute isReadOnly as false when under limits', async () => {
      // Fresh load for each test
      pbCollectionMock.mockImplementation((name: string) => {
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
      
      await store.loadSubscription()
      expect(store.isReadOnly).toBe(false)
    })

    it('should compute isReadOnly correctly when limits are exceeded', async () => {
      // Fresh load with exceeded usage
      const exceededUsageData = { ...mockUsageData, items_count: 100 }
      
      pbCollectionMock.mockImplementation((name: string) => {
        if (name === 'site_subscriptions') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(mockSubscriptionData)
          }
        } else if (name === 'subscription_usage') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(exceededUsageData)
          }
        }
        return {
          getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found'))
        }
      })
      
      await store.loadSubscription()
      expect(store.isReadOnly).toBe(true)
    })

    it('should compute usageLimits correctly', async () => {
      // Fresh load for each test
      pbCollectionMock.mockImplementation((name: string) => {
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
      
      await store.loadSubscription()
      const limits = store.usageLimits
      expect(limits).toBeTruthy()
      expect(limits?.items).toEqual({
        current: 50,
        max: 100,
        unlimited: false,
        disabled: false,
        exceeded: false
      })
    })

    it('should handle unlimited plan correctly', async () => {
      // Mock Pro plan subscription
      const proSubscription = {
        ...mockSubscriptionData,
        subscription_plan: 'plan-pro',
        expand: { subscription_plan: mockProPlan }
      }
      
      pbCollectionMock.mockImplementation((name: string) => {
        if (name === 'site_subscriptions') {
          return { getFirstListItem: vi.fn().mockResolvedValue(proSubscription) }
        } else if (name === 'subscription_usage') {
          return { getFirstListItem: vi.fn().mockResolvedValue(mockUsageData) }
        }
        return { getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')) }
      })

      await store.loadSubscription()
      
      const limits = store.usageLimits
      expect(limits?.items).toEqual({
        current: 50,
        max: -1,
        unlimited: true,
        disabled: false,
        exceeded: false
      })
      expect(store.isReadOnly).toBe(false)
    })

    it('should handle disabled features correctly', async () => {
      // Mock disabled features plan
      const disabledSubscription = {
        ...mockSubscriptionData,
        subscription_plan: 'plan-disabled',
        expand: { subscription_plan: mockDisabledPlan }
      }
      
      pbCollectionMock.mockImplementation((name: string) => {
        if (name === 'site_subscriptions') {
          return { getFirstListItem: vi.fn().mockResolvedValue(disabledSubscription) }
        } else if (name === 'subscription_usage') {
          return { getFirstListItem: vi.fn().mockResolvedValue(mockUsageData) }
        }
        return { getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')) }
      })

      await store.loadSubscription()
      
      const limits = store.usageLimits
      expect(limits?.deliveries).toEqual({
        current: 20,
        max: 0,
        unlimited: false,
        disabled: true,
        exceeded: false
      })
    })
  })

  describe('checkCreateLimit', () => {
    beforeEach(async () => {
      await store.loadSubscription()
    })

    it('should allow creation when under limit', async () => {
      expect(store.checkCreateLimit('items')).toBe(true)
      expect(store.checkCreateLimit('vendors')).toBe(true)
    })

    it('should prevent creation when at limit', async () => {
      // Set usage to limit
      store.currentUsage!.items_count = 100
      expect(store.checkCreateLimit('items')).toBe(false)
    })

    it('should allow creation for unlimited features', async () => {
      // Mock Pro plan
      const proSubscription = {
        ...mockSubscriptionData,
        subscription_plan: 'plan-pro',
        expand: { subscription_plan: mockProPlan }
      }
      
      pbCollectionMock.mockImplementation((name: string) => {
        if (name === 'site_subscriptions') {
          return { getFirstListItem: vi.fn().mockResolvedValue(proSubscription) }
        } else if (name === 'subscription_usage') {
          return { getFirstListItem: vi.fn().mockResolvedValue({ ...mockUsageData, items_count: 1000 }) }
        }
        return { getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')) }
      })

      await store.loadSubscription()
      expect(store.checkCreateLimit('items')).toBe(true)
    })

    it('should prevent creation for disabled features', async () => {
      // Mock disabled features plan
      const disabledSubscription = {
        ...mockSubscriptionData,
        subscription_plan: 'plan-disabled',
        expand: { subscription_plan: mockDisabledPlan }
      }
      
      pbCollectionMock.mockImplementation((name: string) => {
        if (name === 'site_subscriptions') {
          return { getFirstListItem: vi.fn().mockResolvedValue(disabledSubscription) }
        } else if (name === 'subscription_usage') {
          return { getFirstListItem: vi.fn().mockResolvedValue(mockUsageData) }
        }
        return { getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')) }
      })

      await store.loadSubscription()
      expect(store.checkCreateLimit('deliveries')).toBe(false)
      expect(store.checkCreateLimit('services')).toBe(false)
    })

    it('should handle null usage data by treating counts as 0', async () => {
      // Mock subscription success but no usage
      pbCollectionMock.mockImplementation((name: string) => {
        if (name === 'site_subscriptions') {
          return { getFirstListItem: vi.fn().mockResolvedValue(mockSubscriptionData) }
        } else if (name === 'subscription_usage') {
          return { getFirstListItem: vi.fn().mockRejectedValue(new Error('No usage record')) }
        }
        return { getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')) }
      })

      await store.loadSubscription()
      
      // Should allow creation when no usage record exists
      expect(store.checkCreateLimit('items')).toBe(true)
      expect(store.checkCreateLimit('vendors')).toBe(true)
    })
  })

  describe('helper functions', () => {
    it('should correctly identify unlimited features', () => {
      expect(store.isUnlimited(-1)).toBe(true)
      expect(store.isUnlimited(0)).toBe(false)
      expect(store.isUnlimited(100)).toBe(false)
    })

    it('should correctly identify disabled features', () => {
      expect(store.isDisabled(0)).toBe(true)
      expect(store.isDisabled(-1)).toBe(false)
      expect(store.isDisabled(100)).toBe(false)
    })

    it('should correctly identify limited features', () => {
      expect(store.isLimited(100)).toBe(true)
      expect(store.isLimited(0)).toBe(false)
      expect(store.isLimited(-1)).toBe(false)
    })
  })

  describe('composable integration', () => {
    it('should provide access to store properties through composable', () => {
      const subscription = useSubscription()
      
      // Test that composable returns store properties
      expect(subscription.checkCreateLimit).toBeDefined()
      expect(subscription.loadSubscription).toBeDefined()
      expect(subscription.isUnlimited).toBeDefined()
      expect(subscription.isDisabled).toBeDefined()
      expect(subscription.isLimited).toBeDefined()
    })
  })

  describe('plan management', () => {
    beforeEach(() => {
      // Reset to default mock for plan management tests
      pbCollectionMock.mockImplementation((name: string) => {
        if (name === 'site_subscriptions') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(mockSubscriptionData)
          }
        } else if (name === 'subscription_usage') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(mockUsageData)
          }
        } else if (name === 'subscription_plans') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(mockSubscriptionData.expand.subscription_plan),
            getFullList: vi.fn().mockResolvedValue([mockSubscriptionData.expand.subscription_plan, mockProPlan])
          }
        }
        return {
          getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found'))
        }
      })
    })

    it('should load all plans', async () => {
      const plans = await store.loadAllPlans()
      
      expect(plans).toEqual([mockSubscriptionData.expand.subscription_plan, mockProPlan])
      expect(pbCollectionMock).toHaveBeenCalledWith('subscription_plans')
    })

    it('should create default subscription', async () => {
      const createMock = vi.fn().mockResolvedValue(mockSubscriptionData)
      
      pbCollectionMock.mockImplementation((name: string) => {
        if (name === 'subscription_plans') {
          return { getFirstListItem: vi.fn().mockResolvedValue(mockSubscriptionData.expand.subscription_plan) }
        } else if (name === 'site_subscriptions') {
          return { create: createMock }
        }
        return { getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')) }
      })

      await store.createDefaultSubscription('site-1')
      
      expect(createMock).toHaveBeenCalledWith({
        site: 'site-1',
        subscription_plan: mockSubscriptionData.expand.subscription_plan.id,
        status: 'active',
        auto_renew: false
      })
    })
  })
})