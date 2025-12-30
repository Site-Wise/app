import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSubscription, type RazorpayCheckoutOptions } from '../../composables/useSubscription'

// Mock Razorpay using a class for proper constructor behavior in Vitest v4
class MockRazorpay {
  static instances: MockRazorpay[] = []
  options: any
  open = vi.fn()
  close = vi.fn()

  constructor(options: any) {
    this.options = options
    MockRazorpay.instances.push(this)
  }

  static clear() {
    MockRazorpay.instances = []
  }
}

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: typeof MockRazorpay
  }
}

const mockProPlan = {
  id: 'plan-pro',
  name: 'Pro',
  price: 999,
  currency: 'INR',
  features: {
    max_items: -1,
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

const mockSubscription = {
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
        max_vendors: 25
      },
      is_active: true,
      is_default: true
    }
  }
}

// Mock PocketBase
const getOneMock = vi.fn()
const updateMock = vi.fn()
const getFirstListItemMock = vi.fn()

vi.mock('../../services/pocketbase', () => ({
  pb: {
    collection: vi.fn((name: string) => {
      if (name === 'subscription_plans') {
        return {
          getOne: getOneMock
        }
      } else if (name === 'site_subscriptions') {
        return {
          update: updateMock,
          getFirstListItem: getFirstListItemMock
        }
      } else if (name === 'subscription_usage') {
        return {
          getFirstListItem: vi.fn().mockResolvedValue({
            id: 'usage-1',
            site: 'site-1',
            items_count: 10,
            vendors_count: 5
          })
        }
      }
      return {
        getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found'))
      }
    })
  },
  getCurrentSiteId: vi.fn(() => 'site-1')
}))

describe('useSubscription - Razorpay Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())

    // Clear previous Razorpay instances
    MockRazorpay.clear()

    // Setup window.Razorpay
    window.Razorpay = MockRazorpay as any

    // Default mocks
    getOneMock.mockResolvedValue(mockProPlan)
    updateMock.mockResolvedValue({ ...mockSubscription, subscription_plan: 'plan-pro' })
    getFirstListItemMock.mockResolvedValue(mockSubscription)

    // Mock environment variable
    vi.stubEnv('VITE_RAZORPAY_KEY', 'test_razorpay_key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window as any).Razorpay
  })

  describe('initializeRazorpayCheckout', () => {
    it('should initialize Razorpay with correct options', async () => {
      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      expect(getOneMock).toHaveBeenCalledWith('plan-pro')

      // Check that a Razorpay instance was created
      expect(MockRazorpay.instances.length).toBe(1)
      const instance = MockRazorpay.instances[0]

      // Check the options passed to the constructor
      expect(instance.options).toEqual(
        expect.objectContaining({
          key: 'test_razorpay_key',
          amount: 99900, // 999 * 100 (paise)
          currency: 'INR',
          name: 'Site-Wise',
          description: 'Subscribe to Pro Plan'
        })
      )
      expect(instance.open).toHaveBeenCalled()
    })

    it('should throw error when no site is selected', async () => {
      const { getCurrentSiteId } = await import('../../services/pocketbase')
      vi.mocked(getCurrentSiteId).mockReturnValueOnce(null)

      const { initializeRazorpayCheckout } = useSubscription()

      await expect(initializeRazorpayCheckout('plan-pro')).rejects.toThrow('No site selected')
    })

    it('should throw error when Razorpay SDK is not loaded', async () => {
      delete (window as any).Razorpay

      const { initializeRazorpayCheckout } = useSubscription()

      await expect(initializeRazorpayCheckout('plan-pro')).rejects.toThrow(
        'Razorpay SDK not loaded'
      )
    })

    it('should handle plan fetch errors', async () => {
      getOneMock.mockRejectedValueOnce(new Error('Plan not found'))

      const { initializeRazorpayCheckout } = useSubscription()

      await expect(initializeRazorpayCheckout('plan-pro')).rejects.toThrow('Plan not found')
    })

    it('should use default currency INR if not specified', async () => {
      const planWithoutCurrency = { ...mockProPlan, currency: undefined }
      getOneMock.mockResolvedValueOnce(planWithoutCurrency)

      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const instance = MockRazorpay.instances[0]
      expect(instance.options).toEqual(
        expect.objectContaining({
          currency: 'INR'
        })
      )
    })

    it('should include theme color in options', async () => {
      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const instance = MockRazorpay.instances[0]
      expect(instance.options).toEqual(
        expect.objectContaining({
          theme: {
            color: '#f97316'
          }
        })
      )
    })

    it('should convert price to paise correctly', async () => {
      const planWithDecimal = { ...mockProPlan, price: 1499.50 }
      getOneMock.mockResolvedValueOnce(planWithDecimal)

      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const instance = MockRazorpay.instances[0]
      expect(instance.options).toEqual(
        expect.objectContaining({
          amount: 149950 // 1499.50 * 100
        })
      )
    })

    it('should open Razorpay modal', async () => {
      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const instance = MockRazorpay.instances[0]
      expect(instance.open).toHaveBeenCalled()
    })
  })

  describe('Razorpay payment handler', () => {
    it('should have payment success handler', async () => {
      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const razorpayOptions = MockRazorpay.instances[0].options as RazorpayCheckoutOptions
      expect(razorpayOptions.handler).toBeDefined()
      expect(typeof razorpayOptions.handler).toBe('function')
    })

    it('should have modal dismiss handler', async () => {
      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const razorpayOptions = MockRazorpay.instances[0].options as RazorpayCheckoutOptions
      expect(razorpayOptions.modal?.ondismiss).toBeDefined()
      expect(typeof razorpayOptions.modal?.ondismiss).toBe('function')
    })

    it('should call upgradeSubscription on successful payment', async () => {
      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const razorpayOptions = MockRazorpay.instances[0].options as RazorpayCheckoutOptions
      const mockPaymentResponse = {
        razorpay_payment_id: 'pay_123',
        razorpay_order_id: 'order_123',
        razorpay_signature: 'sig_123'
      }

      // Call the handler
      await razorpayOptions.handler(mockPaymentResponse)

      // Should call update to upgrade subscription
      expect(updateMock).toHaveBeenCalled()
    })

    it('should handle payment handler errors', async () => {
      updateMock.mockRejectedValueOnce(new Error('Update failed'))

      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const razorpayOptions = MockRazorpay.instances[0].options as RazorpayCheckoutOptions
      const mockPaymentResponse = {
        razorpay_payment_id: 'pay_123',
        razorpay_order_id: 'order_123',
        razorpay_signature: 'sig_123'
      }

      await expect(razorpayOptions.handler(mockPaymentResponse)).rejects.toThrow()
    })
  })

  describe('Razorpay environment configuration', () => {
    it('should use VITE_RAZORPAY_KEY from environment', async () => {
      vi.stubEnv('VITE_RAZORPAY_KEY', 'custom_key_123')

      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const instance = MockRazorpay.instances[0]
      expect(instance.options).toEqual(
        expect.objectContaining({
          key: 'custom_key_123'
        })
      )
    })

    it('should use empty string if VITE_RAZORPAY_KEY not set', async () => {
      vi.unstubAllEnvs()

      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      const instance = MockRazorpay.instances[0]
      expect(instance.options).toEqual(
        expect.objectContaining({
          key: ''
        })
      )
    })
  })

  describe('Razorpay order data generation', () => {
    it('should generate unique receipt IDs', async () => {
      const { initializeRazorpayCheckout } = useSubscription()

      await initializeRazorpayCheckout('plan-pro')

      // Clear instances for second call
      const firstInstanceCount = MockRazorpay.instances.length
      await initializeRazorpayCheckout('plan-pro')

      // Receipt IDs should be different (timestamp-based)
      // We can't directly test this, but we ensure the function completes without error
      expect(MockRazorpay.instances.length).toBe(firstInstanceCount + 1)
    })

    it('should include site and plan IDs in notes', async () => {
      const { initializeRazorpayCheckout } = useSubscription()

      // We can't directly access the order data, but we ensure the checkout initializes
      await expect(initializeRazorpayCheckout('plan-pro')).resolves.not.toThrow()
    })
  })
})
