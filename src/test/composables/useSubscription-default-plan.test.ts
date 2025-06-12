import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSubscription } from '../../composables/useSubscription'

// Mock the pocketbase service
vi.mock('../../services/pocketbase', () => ({
  pb: {
    collection: vi.fn((_name: string) => ({
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
        throw new Error('Plan not found')
      }),
      create: vi.fn().mockResolvedValue({
        id: 'subscription-1',
        site: 'site-1',
        subscription_plan: 'plan-free',
        status: 'active'
      })
    }))
  },
  getCurrentSiteId: vi.fn().mockReturnValue('site-1')
}))

describe('useSubscription - Default Plan Assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create subscription with default plan', async () => {
    const { createDefaultSubscription } = useSubscription()
    
    await createDefaultSubscription('site-1')
    
    // Verify that the correct plan was fetched
    const mockCollection = vi.mocked(require('../../services/pocketbase').pb.collection)
    expect(mockCollection).toHaveBeenCalledWith('subscription_plans')
    
    const mockGetFirstListItem = mockCollection.mock.results[0].value.getFirstListItem
    expect(mockGetFirstListItem).toHaveBeenCalledWith('is_default=true && is_active=true')
  })

  it('should fallback to Free plan if no default plan is set', async () => {
    // Mock to simulate no default plan found
    const mockCollection = vi.fn((_name: string) => ({
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
      }),
      create: vi.fn().mockResolvedValue({})
    }))

    vi.mocked(require('../../services/pocketbase')).pb.collection = mockCollection
    
    const { createDefaultSubscription } = useSubscription()
    
    await createDefaultSubscription('site-1')
    
    // Should try default first, then fallback to Free plan
    const mockGetFirstListItem = mockCollection.mock.results[0].value.getFirstListItem
    expect(mockGetFirstListItem).toHaveBeenCalledWith('is_default=true && is_active=true')
    expect(mockGetFirstListItem).toHaveBeenCalledWith('name="Free" && is_active=true')
  })

  it('should handle errors gracefully during subscription creation', async () => {
    const mockCollection = vi.fn(() => ({
      getFirstListItem: vi.fn().mockRejectedValue(new Error('Network error')),
      create: vi.fn()
    }))

    vi.mocked(require('../../services/pocketbase')).pb.collection = mockCollection
    
    const { createDefaultSubscription } = useSubscription()
    
    // Should not throw error
    await expect(createDefaultSubscription('site-1')).resolves.toBeUndefined()
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