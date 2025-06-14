import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { useSubscription } from '../../composables/useSubscription';
import { pb, getCurrentSiteId } from '../../services/pocketbase';

// Mock PocketBase - simplified approach
vi.mock('../../services/pocketbase', () => {
  const collections = new Map()
  
  // Initialize with mock data
  collections.set('subscription_plans', [
    { id: 'plan-1', name: 'Free', is_active: true, features: { max_items: 1, max_vendors: 1, max_incoming_deliveries: 5, max_service_bookings: 5, max_payments: 5, max_sites: 1 }, price: 0, currency: 'INR' },
    { id: 'plan-2', name: 'Pro', is_active: true, features: { max_items: -1, max_vendors: -1, max_incoming_deliveries: -1, max_service_bookings: -1, max_payments: -1, max_sites: 3 }, price: 29.99, currency: 'INR' }
  ])
  collections.set('site_subscriptions', [])
  collections.set('subscription_usage', [])
  
  return {
    pb: {
      collection: vi.fn((name: string) => ({
        getFullList: vi.fn().mockImplementation(() => {
          const items = collections.get(name) || []
          return Promise.resolve(items)
        }),
        getFirstListItem: vi.fn().mockImplementation((filter: string) => {
          const items = collections.get(name) || []
          // Simple filter parsing for testing
          if (filter.includes('name="Free"') || filter.includes("name='Free'")) {
            const freePlan = items.find((item: any) => item.name === 'Free')
            return Promise.resolve(freePlan)
          }
          if (filter.includes('is_active=true') && name === 'subscription_plans') {
            const activePlan = items.find((item: any) => item.is_active === true)
            return Promise.resolve(activePlan)
          }
          // Return null for site_subscriptions and subscription_usage by default (no subscription exists)
          if (name === 'site_subscriptions' || name === 'subscription_usage') {
            return Promise.reject(new Error('No subscription found'))
          }
          return Promise.resolve(items[0] || null)
        }),
        create: vi.fn().mockImplementation((data: any) => {
          const newItem = { ...data, id: `${name}-${Date.now()}` }
          const items = collections.get(name) || []
          items.push(newItem)
          collections.set(name, items)
          return Promise.resolve(newItem)
        }),
        update: vi.fn().mockImplementation((id: string, data: any) => {
          const items = collections.get(name) || []
          const index = items.findIndex((item: any) => item.id === id)
          if (index !== -1) {
            items[index] = { ...items[index], ...data }
            collections.set(name, items)
            return Promise.resolve(items[index])
          }
          throw new Error('Item not found')
        })
      }))
    },
    getCurrentSiteId: vi.fn().mockReturnValue(null) // Return null to prevent automatic loading
  }
});

// Mock data
const mockFreePlan = {
  id: 'plan_free',
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
  is_active: true
};

const mockBasicPlan = {
  id: 'plan_basic',
  name: 'Basic',
  price: 29900,
  currency: 'INR',
  features: {
    max_items: -1,
    max_vendors: -1,
    max_incoming_deliveries: -1,
    max_service_bookings: -1,
    max_payments: -1,
    max_sites: 3
  },
  is_active: true
};

const mockSubscription = {
  id: 'sub_1',
  site: 'site_1',
  subscription_plan: 'plan_free',
  status: 'active',
  current_period_start: '2024-01-01T00:00:00.000Z',
  current_period_end: '2024-02-01T00:00:00.000Z',
  cancel_at_period_end: false,
  expand: {
    subscription_plan: mockFreePlan
  }
};

const mockUsage = {
  id: 'usage_1',
  site: 'site_1',
  period_start: '2024-01-01T00:00:00.000Z',
  period_end: '2024-02-01T00:00:00.000Z',
  items_count: 0,
  vendors_count: 0,
  incoming_deliveries_count: 0,
  service_bookings_count: 0,
  payments_count: 0
};

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentSiteId as Mock).mockReturnValue('site_1');
  });

  describe('loadSubscription', () => {
    it('should load subscription and usage data successfully', async () => {
      // Setup mock to handle both immediate watcher call and manual call
      const getFirstListItemMock = vi.fn()
        .mockResolvedValueOnce(mockSubscription)  // For immediate watcher
        .mockResolvedValueOnce(mockUsage)         // For immediate watcher
        .mockResolvedValueOnce(mockSubscription)  // For manual loadSubscription call
        .mockResolvedValueOnce(mockUsage);        // For manual loadSubscription call
      
      const mockCollection = vi.fn(() => ({
        getFirstListItem: getFirstListItemMock,
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({})
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, currentSubscription, currentUsage, isLoading } = useSubscription();

      // Wait for immediate watcher to complete before checking initial state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(isLoading.value).toBe(false);

      await loadSubscription();

      expect(currentSubscription.value).toEqual(mockSubscription);
      expect(currentUsage.value).toEqual(mockUsage);
      expect(isLoading.value).toBe(false);
    });

    it('should create usage record if it does not exist', async () => {
      const mockCreate = vi.fn().mockResolvedValue(mockUsage);
      const mockCollection = vi.fn((name: string) => {
        if (name === 'site_subscriptions') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(mockSubscription)
          };
        }
        if (name === 'subscription_usage') {
          return {
            getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
            create: mockCreate
          };
        }
        return { getFirstListItem: vi.fn(), create: vi.fn() };
      });
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, currentUsage } = useSubscription();

      await loadSubscription();

      expect(mockCreate).toHaveBeenCalledWith({
        site: 'site_1',
        period_start: expect.any(String),
        period_end: expect.any(String),
        items_count: 0,
        vendors_count: 0,
        incoming_deliveries_count: 0,
        service_bookings_count: 0,
        payments_count: 0
      });
      expect(currentUsage.value).toEqual(mockUsage);
    });

    it('should handle errors gracefully', async () => {
      const mockCollection = vi.fn(() => ({
        getFirstListItem: vi.fn().mockRejectedValue(new Error('Network error'))
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, error } = useSubscription();

      await loadSubscription();

      expect(error.value).toBe('Network error');
    });
  });

  describe('isReadOnly computed', () => {
    it('should return false when no limits are exceeded', async () => {
      const mockCollection = vi.fn(() => ({
        getFirstListItem: vi.fn()
          .mockResolvedValueOnce(mockSubscription)
          .mockResolvedValueOnce(mockUsage)
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, isReadOnly } = useSubscription();
      await loadSubscription();

      expect(isReadOnly.value).toBe(false);
    });

    it('should return true when items limit is exceeded', async () => {
      const exceededUsage = { ...mockUsage, items_count: 1 };
      
      // Setup mock to handle both immediate watcher call and manual call
      const getFirstListItemMock = vi.fn()
        .mockResolvedValueOnce(mockSubscription)  // For immediate watcher
        .mockResolvedValueOnce(exceededUsage)     // For immediate watcher
        .mockResolvedValueOnce(mockSubscription)  // For manual loadSubscription call
        .mockResolvedValueOnce(exceededUsage);    // For manual loadSubscription call
      
      const mockCollection = vi.fn(() => ({
        getFirstListItem: getFirstListItemMock,
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({})
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, isReadOnly } = useSubscription();
      
      // Wait for immediate watcher to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await loadSubscription();

      expect(isReadOnly.value).toBe(true);
    });

    it('should return false for unlimited plan', async () => {
      const unlimitedSubscription = {
        ...mockSubscription,
        subscription_plan: 'plan_basic',
        expand: { subscription_plan: mockBasicPlan }
      };
      const mockCollection = vi.fn(() => ({
        getFirstListItem: vi.fn()
          .mockResolvedValueOnce(unlimitedSubscription)
          .mockResolvedValueOnce({ ...mockUsage, items_count: 100 })
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, isReadOnly } = useSubscription();
      await loadSubscription();

      expect(isReadOnly.value).toBe(false);
    });
  });

  describe('usageLimits computed', () => {
    it('should calculate usage limits correctly', async () => {
      // Setup the mock before instantiating the composable
      const getFirstListItemMock = vi.fn()
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockUsage);
      
      const mockCollection = vi.fn(() => ({
        getFirstListItem: getFirstListItemMock,
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({})
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { usageLimits } = useSubscription();
      
      // Wait for the immediate watcher to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(usageLimits.value).toEqual({
        items: { current: 0, max: 1, exceeded: false },
        vendors: { current: 0, max: 1, exceeded: false },
        incoming_deliveries: { current: 0, max: 5, exceeded: false },
        service_bookings: { current: 0, max: 5, exceeded: false },
        payments: { current: 0, max: 5, exceeded: false }
      });
    });

    it('should show exceeded status correctly', async () => {
      const exceededUsage = { ...mockUsage, items_count: 1, vendors_count: 1 };
      
      // Setup mock to handle both immediate watcher call and manual call
      const getFirstListItemMock = vi.fn()
        .mockResolvedValueOnce(mockSubscription)  // For immediate watcher
        .mockResolvedValueOnce(exceededUsage)     // For immediate watcher
        .mockResolvedValueOnce(mockSubscription)  // For manual loadSubscription call
        .mockResolvedValueOnce(exceededUsage);    // For manual loadSubscription call
      
      const mockCollection = vi.fn(() => ({
        getFirstListItem: getFirstListItemMock,
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({})
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, usageLimits } = useSubscription();
      
      // Wait for immediate watcher to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await loadSubscription();

      expect(usageLimits.value?.items.exceeded).toBe(true);
      expect(usageLimits.value?.vendors.exceeded).toBe(true);
    });
  });

  describe('checkCreateLimit', () => {
    it('should return true when under limit', async () => {
      // Setup mock to handle both immediate watcher call and manual call
      const getFirstListItemMock = vi.fn()
        .mockResolvedValueOnce(mockSubscription)  // For immediate watcher
        .mockResolvedValueOnce(mockUsage)         // For immediate watcher
        .mockResolvedValueOnce(mockSubscription)  // For manual loadSubscription call
        .mockResolvedValueOnce(mockUsage);        // For manual loadSubscription call
      
      const mockCollection = vi.fn(() => ({
        getFirstListItem: getFirstListItemMock,
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({})
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, checkCreateLimit } = useSubscription();
      
      // Wait for immediate watcher to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await loadSubscription();

      expect(checkCreateLimit('items')).toBe(true);
      expect(checkCreateLimit('vendors')).toBe(true);
    });

    it('should return false when at limit', async () => {
      const atLimitUsage = { ...mockUsage, items_count: 1 };
      const mockCollection = vi.fn(() => ({
        getFirstListItem: vi.fn()
          .mockResolvedValueOnce(mockSubscription)
          .mockResolvedValueOnce(atLimitUsage)
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, checkCreateLimit } = useSubscription();
      await loadSubscription();

      expect(checkCreateLimit('items')).toBe(false);
    });

    it('should return true for unlimited features', async () => {
      const unlimitedSubscription = {
        ...mockSubscription,
        subscription_plan: 'plan_basic',
        expand: { subscription_plan: mockBasicPlan }
      };
      const mockCollection = vi.fn(() => ({
        getFirstListItem: vi.fn()
          .mockResolvedValueOnce(unlimitedSubscription)
          .mockResolvedValueOnce(mockUsage)
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, checkCreateLimit } = useSubscription();
      await loadSubscription();

      expect(checkCreateLimit('items')).toBe(true);
      expect(checkCreateLimit('vendors')).toBe(true);
    });
  });

  describe('refreshUsage', () => {
    it('should refresh usage from server', async () => {
      const updatedUsage = { ...mockUsage, items_count: 5 };
      const mockGetFirstListItem = vi.fn()
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockUsage)
        .mockResolvedValueOnce(updatedUsage);
      
      const mockCollection = vi.fn(() => ({
        getFirstListItem: mockGetFirstListItem
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, refreshUsage, currentUsage } = useSubscription();
      await loadSubscription();

      await refreshUsage();

      expect(currentUsage.value?.items_count).toBe(5);
    });
  });

  describe('isUnlimited', () => {
    it('should correctly identify unlimited values', async () => {
      const mockCollection = vi.fn(() => ({
        getFirstListItem: vi.fn().mockResolvedValue(mockSubscription)
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { isUnlimited } = useSubscription();

      expect(isUnlimited(-1)).toBe(true);
      expect(isUnlimited(0)).toBe(true);
      expect(isUnlimited(10)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
    });
  });

  describe('getAllPlans', () => {
    it('should return all active plans', async () => {
      const mockGetFullList = vi.fn().mockResolvedValue([mockFreePlan, mockBasicPlan]);
      const mockCollection = vi.fn(() => ({
        getFullList: mockGetFullList
      }));
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { getAllPlans } = useSubscription();
      const plans = await getAllPlans();

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: 'is_active=true',
        sort: 'price'
      });
      expect(plans).toEqual([mockFreePlan, mockBasicPlan]);
    });
  });

  describe('upgradeSubscription', () => {
    it('should upgrade subscription to new plan', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        ...mockSubscription,
        subscription_plan: 'plan_basic'
      });
      const mockCollection = vi.fn((name: string) => {
        if (name === 'site_subscriptions') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(mockSubscription),
            update: mockUpdate
          };
        }
        return {
          getFirstListItem: vi.fn().mockResolvedValue(mockUsage)
        };
      });
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, upgradeSubscription } = useSubscription();
      await loadSubscription();

      await upgradeSubscription('plan_basic');

      expect(mockUpdate).toHaveBeenCalledWith('sub_1', {
        subscription_plan: 'plan_basic',
        status: 'active'
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        ...mockSubscription,
        cancel_at_period_end: true
      });
      const mockCollection = vi.fn((name: string) => {
        if (name === 'site_subscriptions') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(mockSubscription),
            update: mockUpdate
          };
        }
        return {
          getFirstListItem: vi.fn().mockResolvedValue(mockUsage)
        };
      });
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { loadSubscription, cancelSubscription } = useSubscription();
      await loadSubscription();

      await cancelSubscription();

      expect(mockUpdate).toHaveBeenCalledWith('sub_1', {
        cancel_at_period_end: true,
        cancelled_at: expect.any(String)
      });
    });
  });

  describe('createFreeTierSubscription', () => {
    it('should create free tier subscription for new site', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'sub_new',
        site: 'site_new',
        subscription_plan: 'plan_free'
      });
      const mockCollection = vi.fn((name: string) => {
        if (name === 'subscription_plans') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(mockFreePlan)
          };
        }
        if (name === 'site_subscriptions') {
          return {
            create: mockCreate
          };
        }
        return {};
      });
      (pb.collection as Mock).mockImplementation(mockCollection);

      const { createFreeTierSubscription } = useSubscription();
      await createFreeTierSubscription('site_new');

      expect(mockCreate).toHaveBeenCalledWith({
        site: 'site_new',
        subscription_plan: 'plan_free',
        status: 'active',
        current_period_start: expect.any(String),
        current_period_end: expect.any(String),
        cancel_at_period_end: false
      });
    });
  });
});