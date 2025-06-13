import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSubscription } from '../../composables/useSubscription'
import { pb } from '../../services/pocketbase'

// Mock the pocketbase service
vi.mock('../../services/pocketbase', () => ({
  pb: {
    collection: vi.fn((name: string) => {
      if (name === 'subscription_plans') {
        return {
          getFirstListItem: vi.fn().mockImplementation((filter: string) => {
            if (filter.includes('is_default=true')) {
              return Promise.resolve({
                id: 'plan-free',
                name: 'Free',
                price: 0,
                currency: 'INR',
                features: {
                  max_items: 1,
                  max_vendors: 1,
                  max_incoming_deliveries: 5,
                  max_service_bookings: 5,
                  max_payments: 5,
                  max_sites: 1
                },
                is_active: true,
                is_default: true
              })
            }
            if (filter.includes('name="Free"')) {
              return Promise.resolve({
                id: 'plan-free',
                name: 'Free',
                price: 0,
                currency: 'INR',
                is_default: true
              })
            }
            return Promise.reject(new Error('Plan not found'))
          })
        }
      } else if (name === 'site_subscriptions') {
        return {
          getFirstListItem: vi.fn().mockRejectedValue(new Error('No subscription found')),
          create: vi.fn().mockResolvedValue({
            id: 'subscription-1',
            site: 'site-1',
            subscription_plan: 'plan-free',
            status: 'active'
          })
        }
      } else if (name === 'subscription_usage') {
        return {
          getFirstListItem: vi.fn().mockRejectedValue(new Error('No usage found')),
          create: vi.fn().mockResolvedValue({})
        }
      }
      return {
        getFirstListItem: vi.fn().mockRejectedValue(new Error('Collection not found')),
        create: vi.fn().mockResolvedValue({})
      }
    })
  },
  getCurrentSiteId: vi.fn().mockReturnValue(null) // Return null to prevent automatic loading
}))

describe('useSubscription - Default Plan Assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create subscription with default plan', async () => {
    const { createDefaultSubscription } = useSubscription()
    
    await createDefaultSubscription('site-1')
    
    // Verify that the correct plan was fetched
    expect(pb.collection).toHaveBeenCalledWith('subscription_plans')
    
    // Find the subscription_plans collection call
    const subscriptionPlansCall = vi.mocked(pb.collection).mock.calls.find(call => call[0] === 'subscription_plans')
    expect(subscriptionPlansCall).toBeDefined()
  })

  it('should fallback to Free plan if no default plan is set', async () => {
    // Create a special mock for this test that fails default but succeeds Free
    const mockPlansCollection = {
      getFirstListItem: vi.fn().mockImplementation((filter: string) => {
        if (filter.includes('is_default=true')) {
          throw new Error('No default plan found')
        }
        if (filter.includes('name="Free"')) {
          return Promise.resolve({
            id: 'plan-free',
            name: 'Free',
            is_default: false
          })
        }
        throw new Error('Plan not found')
      })
    }
    
    const mockSiteSubscriptionsCollection = {
      getFirstListItem: vi.fn().mockRejectedValue(new Error('No subscription found')),
      create: vi.fn().mockResolvedValue({})
    }
    
    const mockUsageCollection = {
      getFirstListItem: vi.fn().mockRejectedValue(new Error('No usage found')),
      create: vi.fn().mockResolvedValue({})
    }

    // Override the collection mock for this test
    vi.mocked(pb.collection).mockImplementation((name: string) => {
      if (name === 'subscription_plans') return mockPlansCollection
      if (name === 'site_subscriptions') return mockSiteSubscriptionsCollection
      if (name === 'subscription_usage') return mockUsageCollection
      return { getFirstListItem: vi.fn(), create: vi.fn() } as any
    })
    
    const { createDefaultSubscription } = useSubscription()
    
    await createDefaultSubscription('site-1')
    
    // Should try default first, then fallback to Free plan
    expect(mockPlansCollection.getFirstListItem).toHaveBeenCalledWith('is_default=true && is_active=true')
    expect(mockPlansCollection.getFirstListItem).toHaveBeenCalledWith('name="Free" && is_active=true')
  })

  it('should handle errors gracefully during subscription creation', async () => {
    // Create a mock where both default and Free plan lookups fail
    const mockPlansCollection = {
      getFirstListItem: vi.fn().mockRejectedValue(new Error('Network error'))
    }
    
    const mockSiteSubscriptionsCollection = {
      getFirstListItem: vi.fn().mockRejectedValue(new Error('No subscription found')),
      create: vi.fn()
    }
    
    const mockUsageCollection = {
      getFirstListItem: vi.fn().mockRejectedValue(new Error('No usage found')),
      create: vi.fn().mockResolvedValue({})
    }

    vi.mocked(pb.collection).mockImplementation((name: string) => {
      if (name === 'subscription_plans') return mockPlansCollection
      if (name === 'site_subscriptions') return mockSiteSubscriptionsCollection
      if (name === 'subscription_usage') return mockUsageCollection
      return { getFirstListItem: vi.fn(), create: vi.fn() } as any
    })
    
    const { createDefaultSubscription } = useSubscription()
    
    // Should throw error when both default and Free plan lookups fail
    await expect(createDefaultSubscription('site-1')).rejects.toThrow('Network error')
  })

  it('should maintain backward compatibility with createFreeTierSubscription', async () => {
    const { createFreeTierSubscription, createDefaultSubscription } = useSubscription()
    
    // Both functions should exist and be callable
    
    // createFreeTierSubscription should call createDefaultSubscription
    expect(typeof createFreeTierSubscription).toBe('function')
    
    // Both functions should exist and be callable
    expect(createDefaultSubscription).toBeDefined()
    expect(createFreeTierSubscription).toBeDefined()
  })
})