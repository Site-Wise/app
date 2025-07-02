import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import SubscriptionBanner from '../../components/SubscriptionBanner.vue'

// Create a simple mock for useSubscription that returns the correct structure
const createMockSubscription = (overrides = {}) => {
  const defaults = {
    currentSubscription: null,
    currentUsage: null,
    currentPlan: {
      id: 'free-plan',
      name: 'Free',
      price: 0,
      currency: 'USD',
      features: {
        max_items: 100,
        max_vendors: 25,
        max_deliveries: 100,
        max_services: 10,
        max_service_bookings: 50,
        max_payments: 200,
        max_sites: 1
      },
      is_active: true,
      is_default: true,
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    },
    usageLimits: {
      items: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
      vendors: { current: 0, max: 25, exceeded: false, disabled: false, unlimited: false },
      deliveries: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
      service_bookings: { current: 0, max: 50, exceeded: false, disabled: false, unlimited: false },
      payments: { current: 0, max: 200, exceeded: false, disabled: false, unlimited: false }
    },
    isLoading: false,
    error: null,
    isReadOnly: false,
    isSubscriptionActive: true,
    isSubscriptionCancelled: false,
    canReactivateSubscription: false,
    subscriptionStatus: 'active',
    // Methods
    loadSubscription: vi.fn(),
    createDefaultSubscription: vi.fn(),
    createFreeTierSubscription: vi.fn(),
    checkCreateLimit: vi.fn(() => true),
    getAllPlans: vi.fn(),
    upgradeSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    reactivateSubscription: vi.fn(),
    initializeRazorpayCheckout: vi.fn(),
    isUnlimited: vi.fn(() => false),
    isDisabled: vi.fn(() => false),
    isLimited: vi.fn(() => true)
  }
  
  return { ...defaults, ...overrides }
}

// Mock the useSubscription composable
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: vi.fn(() => createMockSubscription())
}))

// Mock the useI18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      // Simple translation mock that returns the key
      if (params) {
        return `${key}(${JSON.stringify(params)})`
      }
      return key
    }
  })
}))

describe('SubscriptionBanner', () => {
  let wrapper: any
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a minimal router for testing
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
        { path: '/subscription', name: 'subscription', component: { template: '<div>Subscription</div>' } }
      ]
    })
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
          'router-link': true
        }
      }
    })
  }

  it('should render component', () => {
    wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('should not show banner when subscription is active and not read-only', () => {
    // Default mock has isSubscriptionActive: true and isReadOnly: false
    wrapper = createWrapper()
    // The banner should not be visible
    expect(wrapper.find('.bg-amber-50').exists()).toBe(false)
  })

  it('should show banner when subscription is inactive', async () => {
    const { useSubscription } = await import('../../composables/useSubscription')
    const mockUseSubscription = vi.mocked(useSubscription)
    
    // Override to make subscription inactive
    mockUseSubscription.mockImplementation(() => createMockSubscription({
      isSubscriptionActive: false
    }))

    wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    
    // The banner should be visible
    expect(wrapper.find('.bg-amber-50').exists()).toBe(true)
    expect(wrapper.text()).toContain('subscription.banner.subscriptionExpired')
  })

  it('should show banner when in read-only mode', async () => {
    const { useSubscription } = await import('../../composables/useSubscription')
    const mockUseSubscription = vi.mocked(useSubscription)
    
    // Override to make it read-only
    mockUseSubscription.mockImplementation(() => createMockSubscription({
      isReadOnly: true,
      usageLimits: {
        items: { current: 100, max: 100, exceeded: true, disabled: false, unlimited: false },
        vendors: { current: 0, max: 25, exceeded: false, disabled: false, unlimited: false },
        deliveries: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
        service_bookings: { current: 0, max: 50, exceeded: false, disabled: false, unlimited: false },
        payments: { current: 0, max: 200, exceeded: false, disabled: false, unlimited: false }
      }
    }))

    wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    
    // The banner should be visible
    expect(wrapper.find('.bg-amber-50').exists()).toBe(true)
    expect(wrapper.text()).toContain('subscription.banner.freeTierLimitReached')
  })

  it('should show exceeded limits in usage details', async () => {
    const { useSubscription } = await import('../../composables/useSubscription')
    const mockUseSubscription = vi.mocked(useSubscription)
    
    // Override with exceeded limits
    mockUseSubscription.mockImplementation(() => createMockSubscription({
      isReadOnly: true,
      usageLimits: {
        items: { current: 100, max: 100, exceeded: true, disabled: false, unlimited: false },
        vendors: { current: 25, max: 25, exceeded: true, disabled: false, unlimited: false },
        deliveries: { current: 0, max: 100, exceeded: false, disabled: false, unlimited: false },
        service_bookings: { current: 0, max: 50, exceeded: false, disabled: false, unlimited: false },
        payments: { current: 0, max: 200, exceeded: false, disabled: false, unlimited: false }
      }
    }))

    wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    
    const text = wrapper.text()
    expect(text).toContain('subscription.limits.items')
    expect(text).toContain('subscription.limits.vendors')
  })

  it('should allow dismissing the banner when canDismiss is true', async () => {
    const { useSubscription } = await import('../../composables/useSubscription')
    const mockUseSubscription = vi.mocked(useSubscription)
    
    mockUseSubscription.mockImplementation(() => createMockSubscription({
      isReadOnly: true
    }))

    wrapper = createWrapper({ canDismiss: true })
    await wrapper.vm.$nextTick()
    
    // Banner should be visible
    expect(wrapper.find('.bg-amber-50').exists()).toBe(true)
    
    // Find and click dismiss button
    const dismissButton = wrapper.find('button[aria-label]')
    expect(dismissButton.exists()).toBe(true)
    
    await dismissButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Banner should be hidden after dismissing
    expect(wrapper.find('.bg-amber-50').exists()).toBe(false)
  })

  it('should not show dismiss button when canDismiss is false', async () => {
    const { useSubscription } = await import('../../composables/useSubscription')
    const mockUseSubscription = vi.mocked(useSubscription)
    
    mockUseSubscription.mockImplementation(() => createMockSubscription({
      isReadOnly: true
    }))

    wrapper = createWrapper({ canDismiss: false })
    await wrapper.vm.$nextTick()
    
    // Banner should be visible
    expect(wrapper.find('.bg-amber-50').exists()).toBe(true)
    
    // Dismiss button should not exist
    const dismissButton = wrapper.find('button[aria-label]')
    expect(dismissButton.exists()).toBe(false)
  })
})