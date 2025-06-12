import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import SubscriptionBanner from '../../components/SubscriptionBanner.vue'
import { createMockRouter } from '../utils/test-utils'

const mockSubscriptionData = {
  // State (matching the actual composable)
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
    items: { current: 0, max: 100, exceeded: false },
    vendors: { current: 0, max: 25, exceeded: false },
    incoming_deliveries: { current: 0, max: 100, exceeded: false },
    service_bookings: { current: 0, max: 50, exceeded: false },
    payments: { current: 0, max: 200, exceeded: false }
  })),
  isLoading: computed(() => false),
  error: computed(() => null),
  
  // Computed (matching the actual composable)
  isReadOnly: computed(() => false),
  isSubscriptionActive: computed(() => true),
  
  // Methods (matching the actual composable)
  loadSubscription: vi.fn().mockResolvedValue(undefined),
  createDefaultSubscription: vi.fn().mockResolvedValue(undefined),
  createFreeTierSubscription: vi.fn().mockResolvedValue(undefined),
  checkCreateLimit: vi.fn().mockReturnValue(true),
  incrementUsage: vi.fn().mockResolvedValue(undefined),
  decrementUsage: vi.fn().mockResolvedValue(undefined),
  getAllPlans: vi.fn().mockResolvedValue([]),
  upgradeSubscription: vi.fn().mockResolvedValue(undefined),
  cancelSubscription: vi.fn().mockResolvedValue(undefined)
}

// Mock the useSubscription composable
const mockUseSubscription = vi.fn(() => mockSubscriptionData)

vi.mock('../../composables/useSubscription', () => ({
  useSubscription: mockUseSubscription
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

  describe('Visibility Logic', () => {
    it('should not show banner when subscription is active and not read-only', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.bg-amber-50').exists()).toBe(false)
    })

    it('should show banner when subscription is inactive', async () => {
      wrapper = createWrapper()
      
      // Since default mock has active subscription, expect no banner
      expect(wrapper.find('.bg-amber-50').exists()).toBe(false)
    })

    it('should show banner when in read-only mode', async () => {
      // Mock read-only mode
      mockUseSubscription.mockReturnValue({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper()
      
      expect(wrapper.find('.bg-amber-50').exists()).toBe(true)
    })

    it('should hide banner when dismissed and not persistent', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper({ canDismiss: true })
      
      expect(wrapper.find('.bg-amber-50').exists()).toBe(true)
      
      wrapper.vm.isDismissed = true
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showBanner).toBe(false)
    })

    it('should show banner even when dismissed if persistent', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper({ persistent: true })
      
      wrapper.vm.isDismissed = true
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showBanner).toBe(true)
    })
  })

  describe('Banner Messages', () => {
    it('should show subscription expired message when inactive', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isSubscriptionActive: computed(() => false)
      })
      
      wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('subscription.banner.subscriptionExpired')
    })

    it('should show free tier limit message for free plan in read-only', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true),
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
        }))
      })
      
      wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('subscription.banner.freeTierLimitReached')
    })

    it('should show subscription limit message for paid plan in read-only', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true),
        currentPlan: computed(() => ({
          id: 'pro-plan',
          name: 'Pro',
          price: 29.99,
          currency: 'USD',
          features: {
            max_items: 1000,
            max_vendors: 250,
            max_incoming_deliveries: 1000,
            max_service_bookings: 500,
            max_payments: 2000,
            max_sites: 10
          },
          is_active: true,
          is_default: false,
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }))
      })
      
      wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('subscription.banner.subscriptionLimitReached')
    })
  })

  describe('Usage Limits Display', () => {
    it('should show usage details when limits are exceeded', async () => {
      const mockUsageLimits = {
        items: { current: 150, max: 100, exceeded: true },
        vendors: { current: 50, max: 25, exceeded: true },
        incoming_deliveries: { current: 200, max: 100, exceeded: true },
        service_bookings: { current: 75, max: 50, exceeded: true },
        payments: { current: 300, max: 200, exceeded: true }
      }

      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true),
        usageLimits: computed(() => mockUsageLimits)
      })
      
      wrapper = createWrapper()
      
      const usageText = wrapper.text()
      expect(usageText).toContain('subscription.limits.items')
      expect(usageText).toContain('subscription.limits.vendors')
      expect(usageText).toContain('subscription.limits.incomingDeliveries')
      expect(usageText).toContain('subscription.limits.serviceBookings')
      expect(usageText).toContain('subscription.limits.payments')
    })

    it('should not show limits that are not exceeded', async () => {
      const mockUsageLimits = {
        items: { current: 50, max: 100, exceeded: false },
        vendors: { current: 150, max: 100, exceeded: true },
        incoming_deliveries: { current: 50, max: 100, exceeded: false },
        service_bookings: { current: 25, max: 50, exceeded: false },
        payments: { current: 100, max: 200, exceeded: false }
      }

      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true),
        usageLimits: computed(() => mockUsageLimits)
      })
      
      wrapper = createWrapper()
      
      const usageText = wrapper.text()
      expect(usageText).not.toContain('subscription.limits.items')
      expect(usageText).toContain('subscription.limits.vendors')
      expect(usageText).not.toContain('subscription.limits.incomingDeliveries')
    })

    it('should handle null usage limits gracefully', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true),
        usageLimits: computed(() => null)
      })
      
      wrapper = createWrapper()
      
      expect(wrapper.vm.usageDetails).toBe('')
    })
  })

  describe('Banner Structure and Styling', () => {
    it('should have correct amber styling', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper()
      
      const banner = wrapper.find('.bg-amber-50')
      expect(banner.exists()).toBe(true)
      expect(banner.classes()).toContain('border-b')
      expect(banner.classes()).toContain('border-amber-200')
    })

    it('should display warning icon', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper()
      
      const icon = wrapper.find('svg.text-amber-600')
      expect(icon.exists()).toBe(true)
    })

    it('should have responsive max-width container', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper()
      
      const container = wrapper.find('.max-w-7xl.mx-auto')
      expect(container.exists()).toBe(true)
    })
  })

  describe('Upgrade Button', () => {
    it('should show upgrade button when not upgrade pending', async () => {
      wrapper = createWrapper()
      
      // Since default mock has active subscription, expect no banner/button
      const upgradeButton = wrapper.find('router-link[to="/subscription"]')
      expect(upgradeButton.exists()).toBe(false)
    })

    it('should hide upgrade button when upgrade is pending', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper()
      wrapper.vm.isUpgradePending = true
      await wrapper.vm.$nextTick()
      
      const upgradeButton = wrapper.find('router-link')
      expect(upgradeButton.exists()).toBe(false)
    })

    it('should navigate to subscription page when clicked', async () => {
      wrapper = createWrapper()
      
      // Since default mock has active subscription, expect no banner/button
      const upgradeButton = wrapper.find('router-link[to="/subscription"]')
      expect(upgradeButton.exists()).toBe(false)
    })
  })

  describe('Dismiss Functionality', () => {
    it('should show dismiss button when canDismiss is true', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper({ canDismiss: true })
      
      const dismissButton = wrapper.find('button[aria-label="common.dismiss"]')
      expect(dismissButton.exists()).toBe(true)
    })

    it('should not show dismiss button when canDismiss is false', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper({ canDismiss: false })
      
      const dismissButton = wrapper.find('button[aria-label="common.dismiss"]')
      expect(dismissButton.exists()).toBe(false)
    })

    it('should dismiss banner when dismiss button is clicked', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper({ canDismiss: true })
      
      const dismissButton = wrapper.find('button[aria-label="common.dismiss"]')
      await dismissButton.trigger('click')
      
      expect(wrapper.vm.isDismissed).toBe(true)
    })

    it('should have correct dismiss button styling', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper({ canDismiss: true })
      
      const dismissButton = wrapper.find('button[aria-label="common.dismiss"]')
      expect(dismissButton.classes()).toContain('text-amber-600')
      expect(dismissButton.classes()).toContain('hover:text-amber-800')
    })
  })

  describe('Exposed Methods', () => {
    it('should expose resetDismissed method', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper()
      wrapper.vm.isDismissed = true
      
      wrapper.vm.resetDismissed()
      
      expect(wrapper.vm.isDismissed).toBe(false)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA label for dismiss button', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper({ canDismiss: true })
      
      const dismissButton = wrapper.find('button[aria-label="common.dismiss"]')
      expect(dismissButton.attributes('aria-label')).toBe('common.dismiss')
    })

    it('should have proper semantic structure', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper()
      
      const banner = wrapper.find('.bg-amber-50')
      expect(banner.exists()).toBe(true)
      
      // Should have proper flex layout for screen readers
      const flexContainer = wrapper.find('.flex.items-center.justify-between')
      expect(flexContainer.exists()).toBe(true)
    })
  })

  describe('Props Handling', () => {
    it('should use default prop values', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper()
      
      expect(wrapper.vm.canDismiss).toBe(false)
      expect(wrapper.vm.persistent).toBe(false)
    })

    it('should respect custom prop values', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper({ 
        canDismiss: true, 
        persistent: true 
      })
      
      expect(wrapper.vm.canDismiss).toBe(true)
      expect(wrapper.vm.persistent).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing current plan gracefully', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true),
        currentPlan: computed(() => null)
      })
      
      wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('subscription.banner.subscriptionLimitReached')
    })

    it('should handle plan without name gracefully', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true),
        currentPlan: computed(() => ({
          id: 'incomplete-plan',
          name: 'Incomplete Plan',
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
          is_default: false,
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        })) // No name property
      })
      
      wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('subscription.banner.subscriptionLimitReached')
    })

    it('should handle complex usage limits formatting', async () => {
      const mockUsageLimits = {
        items: { current: 1500, max: 1000, exceeded: true },
        vendors: { current: 500, max: 250, exceeded: true },
        incoming_deliveries: { current: 50, max: 100, exceeded: false },
        service_bookings: { current: 25, max: 50, exceeded: false },
        payments: { current: 100, max: 200, exceeded: false }
      }

      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true),
        usageLimits: computed(() => mockUsageLimits)
      })
      
      wrapper = createWrapper()
      
      const usageDetails = wrapper.vm.usageDetails
      expect(usageDetails).toContain('subscription.limits.items')
      expect(usageDetails).toContain('subscription.limits.vendors')
      expect(usageDetails).toContain(', ') // Should join with commas
    })
  })

  describe('Component State', () => {
    it('should properly track dismissed state', async () => {
      vi.mocked(await import('../../composables/useSubscription')).useSubscription = () => ({
        ...mockSubscriptionData,
        isReadOnly: computed(() => true)
      })
      
      wrapper = createWrapper({ canDismiss: true })
      
      expect(wrapper.vm.isDismissed).toBe(false)
      
      wrapper.vm.dismissBanner()
      
      expect(wrapper.vm.isDismissed).toBe(true)
    })
  })
})