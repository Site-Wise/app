import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import SubscriptionBanner from '../../components/SubscriptionBanner.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock the useSubscription composable
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: vi.fn(() => ({
    currentSubscription: computed(() => null),
    currentUsage: computed(() => null),
    currentPlan: computed(() => ({
      id: 'free-plan',
      name: 'Free',
      price: 0,
      currency: 'USD',
      features: {
        max_items: 100,
        max_vendors: 25,
        max_incoming_deliveries: 100,
        max_service_bookings: 50,
        max_payments: 200,
        max_sites: 1
      },
      is_active: true,
      is_default: true,
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })),
    usageLimits: computed(() => ({
      items: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
      vendors: { current: 0, max: 25, exceeded: false, disabled: false, unlimited: false },
      incoming_deliveries: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
      service_bookings: { current: 0, max: 50, exceeded: false, disabled: false, unlimited: false },
      payments: { current: 0, max: 200, exceeded: false, disabled: false, unlimited: false }
    })),
    isLoading: computed(() => false),
    error: computed(() => null),
    isReadOnly: computed(() => false),
    isSubscriptionActive: computed(() => true),
    loadSubscription: vi.fn().mockResolvedValue(undefined),
    createDefaultSubscription: vi.fn().mockResolvedValue(undefined),
    createFreeTierSubscription: vi.fn().mockResolvedValue(undefined),
    checkCreateLimit: vi.fn().mockReturnValue(true),
    getAllPlans: vi.fn().mockResolvedValue([]),
    upgradeSubscription: vi.fn().mockResolvedValue(undefined),
    cancelSubscription: vi.fn().mockResolvedValue(undefined)
  }))
}))

// Mock the useI18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    currentLanguage: computed(() => 'en'),
    setLanguage: vi.fn(),
    t: (key: string, params?: any) => {
      if (params) {
        return `${key}(${JSON.stringify(params)})`
      }
      return key
    },
    availableLanguages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' }
    ]
  })
}))

describe('SubscriptionBanner', () => {
  let wrapper: any
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()
    router = createMockRouter([
      { path: '/subscription', name: 'subscription', component: { template: '<div>Subscription</div>' } }
    ])
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(SubscriptionBanner, {
      props,
      global: {
        plugins: [router],
        stubs: {
          'router-link': { template: '<a><slot /></a>' }
        }
      }
    })
  }

  it('should render component', () => {
    wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('should not show banner when subscription is active and not read-only', () => {
    wrapper = createWrapper()
    expect(wrapper.find('.bg-amber-50').exists()).toBe(false)
  })

  it('should show banner when subscription is inactive', async () => {
    const { useSubscription } = await import('../../composables/useSubscription')
    const mockUseSubscription = vi.mocked(useSubscription)
    
    mockUseSubscription.mockReturnValue({
      currentSubscription: computed(() => null),
      currentUsage: computed(() => null),
      currentPlan: computed(() => ({
        id: 'free-plan',
        name: 'Free',
        price: 0,
        currency: 'USD',
        features: {
          max_items: 100,
          max_vendors: 25,
          max_incoming_deliveries: 100,
          max_service_bookings: 50,
          max_payments: 200,
          max_sites: 1
        },
        is_active: true,
        is_default: true,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      })),
      usageLimits: computed(() => ({
        items: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
        vendors: { current: 0, max: 25, exceeded: false, disabled: false, unlimited: false },
        incoming_deliveries: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
        service_bookings: { current: 0, max: 50, exceeded: false, disabled: false, unlimited: false },
        payments: { current: 0, max: 200, exceeded: false, disabled: false, unlimited: false }
      })),
      isLoading: computed(() => false),
      error: computed(() => null),
      isReadOnly: computed(() => false),
      isSubscriptionActive: computed(() => false), // Inactive subscription
      loadSubscription: vi.fn().mockResolvedValue(undefined),
      createDefaultSubscription: vi.fn().mockResolvedValue(undefined),
      createFreeTierSubscription: vi.fn().mockResolvedValue(undefined),
      checkCreateLimit: vi.fn().mockReturnValue(true),
      refreshUsage: vi.fn().mockResolvedValue(undefined),
      isUnlimited: vi.fn().mockReturnValue(false),
      getAllPlans: vi.fn().mockResolvedValue([]),
      upgradeSubscription: vi.fn().mockResolvedValue(undefined),
      cancelSubscription: vi.fn().mockResolvedValue(undefined),
      reactivateSubscription: vi.fn().mockResolvedValue(undefined),
      isSubscriptionCancelled: computed(() => false),
      canReactivateSubscription: computed(() => false),
      subscriptionStatus: computed(() => 'active'),
      initializeRazorpayCheckout: vi.fn().mockResolvedValue(undefined),
      createRazorpayOrder: vi.fn().mockResolvedValue({}),
      handlePaymentSuccess: vi.fn().mockResolvedValue(undefined),
      isDisabled: vi.fn().mockReturnValue(false),
      isLimited: vi.fn().mockReturnValue(true)
    })

    wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.bg-amber-50').exists()).toBe(true)
  })

  it('should show banner when in read-only mode', async () => {
    const { useSubscription } = await import('../../composables/useSubscription')
    const mockUseSubscription = vi.mocked(useSubscription)
    
    mockUseSubscription.mockReturnValue({
      currentSubscription: computed(() => null),
      currentUsage: computed(() => null),
      currentPlan: computed(() => ({
        id: 'free-plan',
        name: 'Free',
        price: 0,
        currency: 'USD',
        features: {
          max_items: 100,
          max_vendors: 25,
          max_incoming_deliveries: 100,
          max_service_bookings: 50,
          max_payments: 200,
          max_sites: 1
        },
        is_active: true,
        is_default: true,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      })),
      usageLimits: computed(() => ({
        items: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
        vendors: { current: 0, max: 25, exceeded: false, disabled: false, unlimited: false },
        incoming_deliveries: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
        service_bookings: { current: 0, max: 50, exceeded: false, disabled: false, unlimited: false },
        payments: { current: 0, max: 200, exceeded: false, disabled: false, unlimited: false }
      })),
      isLoading: computed(() => false),
      error: computed(() => null),
      isReadOnly: computed(() => true), // Read-only mode
      isSubscriptionActive: computed(() => true),
      loadSubscription: vi.fn().mockResolvedValue(undefined),
      createDefaultSubscription: vi.fn().mockResolvedValue(undefined),
      createFreeTierSubscription: vi.fn().mockResolvedValue(undefined),
      checkCreateLimit: vi.fn().mockReturnValue(true),
      refreshUsage: vi.fn().mockResolvedValue(undefined),
      isUnlimited: vi.fn().mockReturnValue(false),
      getAllPlans: vi.fn().mockResolvedValue([]),
      upgradeSubscription: vi.fn().mockResolvedValue(undefined),
      cancelSubscription: vi.fn().mockResolvedValue(undefined),
      reactivateSubscription: vi.fn().mockResolvedValue(undefined),
      isSubscriptionCancelled: computed(() => false),
      canReactivateSubscription: computed(() => false),
      subscriptionStatus: computed(() => 'active'),
      initializeRazorpayCheckout: vi.fn().mockResolvedValue(undefined),
      createRazorpayOrder: vi.fn().mockResolvedValue({}),
      handlePaymentSuccess: vi.fn().mockResolvedValue(undefined),
      isDisabled: vi.fn().mockReturnValue(false),
      isLimited: vi.fn().mockReturnValue(true)
    })

    wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.bg-amber-50').exists()).toBe(true)
  })
})