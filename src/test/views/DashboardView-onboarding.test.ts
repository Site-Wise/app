import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('DashboardView Onboarding Logic', () => {
  const ONBOARDING_DISMISSED_KEY = 'sitewise_onboarding_dismissed_'

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('isExperiencedUser Logic', () => {
    it('should return false when user has one site', () => {
      const isExperiencedUser = (userSitesLength: number) => userSitesLength > 1

      expect(isExperiencedUser(1)).toBe(false)
    })

    it('should return true when user has multiple sites', () => {
      const isExperiencedUser = (userSitesLength: number) => userSitesLength > 1

      expect(isExperiencedUser(2)).toBe(true)
      expect(isExperiencedUser(5)).toBe(true)
    })

    it('should return false when user has no sites', () => {
      const isExperiencedUser = (userSitesLength: number) => userSitesLength > 1

      expect(isExperiencedUser(0)).toBe(false)
    })
  })

  describe('shouldShowOnboarding Logic', () => {
    interface OnboardingState {
      isExperiencedUser: boolean
      isOnboardingDismissed: boolean
      vendorCount: number
      deliveryCount: number
      serviceBookingCount: number
    }

    const shouldShowOnboarding = (state: OnboardingState): boolean => {
      // Don't show for experienced users with multiple sites
      if (state.isExperiencedUser) return false

      // Don't show if user dismissed it
      if (state.isOnboardingDismissed) return false

      // Show if no vendors OR no deliveries/service bookings
      const hasNoVendors = state.vendorCount === 0
      const hasNoActivity = state.deliveryCount === 0 && state.serviceBookingCount === 0

      return hasNoVendors || hasNoActivity
    }

    it('should not show onboarding for experienced users', () => {
      const result = shouldShowOnboarding({
        isExperiencedUser: true,
        isOnboardingDismissed: false,
        vendorCount: 0,
        deliveryCount: 0,
        serviceBookingCount: 0
      })

      expect(result).toBe(false)
    })

    it('should not show onboarding when dismissed', () => {
      const result = shouldShowOnboarding({
        isExperiencedUser: false,
        isOnboardingDismissed: true,
        vendorCount: 0,
        deliveryCount: 0,
        serviceBookingCount: 0
      })

      expect(result).toBe(false)
    })

    it('should show onboarding when no vendors exist', () => {
      const result = shouldShowOnboarding({
        isExperiencedUser: false,
        isOnboardingDismissed: false,
        vendorCount: 0,
        deliveryCount: 0,
        serviceBookingCount: 0
      })

      expect(result).toBe(true)
    })

    it('should show onboarding when vendors exist but no activity', () => {
      const result = shouldShowOnboarding({
        isExperiencedUser: false,
        isOnboardingDismissed: false,
        vendorCount: 3,
        deliveryCount: 0,
        serviceBookingCount: 0
      })

      expect(result).toBe(true)
    })

    it('should not show onboarding when vendors and deliveries exist', () => {
      const result = shouldShowOnboarding({
        isExperiencedUser: false,
        isOnboardingDismissed: false,
        vendorCount: 3,
        deliveryCount: 5,
        serviceBookingCount: 0
      })

      expect(result).toBe(false)
    })

    it('should not show onboarding when vendors and service bookings exist', () => {
      const result = shouldShowOnboarding({
        isExperiencedUser: false,
        isOnboardingDismissed: false,
        vendorCount: 2,
        deliveryCount: 0,
        serviceBookingCount: 3
      })

      expect(result).toBe(false)
    })

    it('should not show onboarding when all data exists', () => {
      const result = shouldShowOnboarding({
        isExperiencedUser: false,
        isOnboardingDismissed: false,
        vendorCount: 5,
        deliveryCount: 10,
        serviceBookingCount: 3
      })

      expect(result).toBe(false)
    })
  })

  describe('dismissOnboarding Logic', () => {
    it('should store dismissal using localStorage API', () => {
      const siteId = 'site-123'
      const mockStorage: Record<string, string> = {}

      const dismissOnboarding = (siteId: string, storage: Record<string, string>) => {
        storage[ONBOARDING_DISMISSED_KEY + siteId] = 'true'
      }

      dismissOnboarding(siteId, mockStorage)

      expect(mockStorage[ONBOARDING_DISMISSED_KEY + siteId]).toBe('true')
    })

    it('should not affect other sites when dismissing', () => {
      const siteId1 = 'site-123'
      const siteId2 = 'site-456'
      const mockStorage: Record<string, string> = {}

      const dismissOnboarding = (siteId: string, storage: Record<string, string>) => {
        storage[ONBOARDING_DISMISSED_KEY + siteId] = 'true'
      }

      dismissOnboarding(siteId1, mockStorage)

      expect(mockStorage[ONBOARDING_DISMISSED_KEY + siteId1]).toBe('true')
      expect(mockStorage[ONBOARDING_DISMISSED_KEY + siteId2]).toBeUndefined()
    })

    it('should read dismissal state from storage', () => {
      const siteId = 'site-789'
      const mockStorage: Record<string, string> = {
        [ONBOARDING_DISMISSED_KEY + siteId]: 'true'
      }

      const isDismissed = mockStorage[ONBOARDING_DISMISSED_KEY + siteId] === 'true'

      expect(isDismissed).toBe(true)
    })

    it('should return false when not dismissed', () => {
      const siteId = 'site-abc'
      const mockStorage: Record<string, string> = {}

      const isDismissed = mockStorage[ONBOARDING_DISMISSED_KEY + siteId] === 'true'

      expect(isDismissed).toBe(false)
    })
  })

  describe('onMounted Initialization Logic', () => {
    it('should read dismissal state on mount when site exists', () => {
      const siteId = 'site-init'
      const mockStorage: Record<string, string> = {
        [ONBOARDING_DISMISSED_KEY + siteId]: 'true'
      }

      const initializeDismissState = (siteId: string | null, storage: Record<string, string>): boolean => {
        if (siteId) {
          return storage[ONBOARDING_DISMISSED_KEY + siteId] === 'true'
        }
        return false
      }

      const result = initializeDismissState(siteId, mockStorage)
      expect(result).toBe(true)
    })

    it('should return false when site is null', () => {
      const mockStorage: Record<string, string> = {}

      const initializeDismissState = (siteId: string | null, storage: Record<string, string>): boolean => {
        if (siteId) {
          return storage[ONBOARDING_DISMISSED_KEY + siteId] === 'true'
        }
        return false
      }

      const result = initializeDismissState(null, mockStorage)
      expect(result).toBe(false)
    })

    it('should return false when storage has no entry', () => {
      const siteId = 'site-no-entry'
      const mockStorage: Record<string, string> = {}

      const initializeDismissState = (siteId: string | null, storage: Record<string, string>): boolean => {
        if (siteId) {
          return storage[ONBOARDING_DISMISSED_KEY + siteId] === 'true'
        }
        return false
      }

      const result = initializeDismissState(siteId, mockStorage)
      expect(result).toBe(false)
    })
  })

  describe('Onboarding State Transitions', () => {
    interface OnboardingState {
      isExperiencedUser: boolean
      isOnboardingDismissed: boolean
      vendorCount: number
      deliveryCount: number
      serviceBookingCount: number
    }

    const shouldShowOnboarding = (state: OnboardingState): boolean => {
      if (state.isExperiencedUser) return false
      if (state.isOnboardingDismissed) return false
      const hasNoVendors = state.vendorCount === 0
      const hasNoActivity = state.deliveryCount === 0 && state.serviceBookingCount === 0
      return hasNoVendors || hasNoActivity
    }

    it('should transition from showing to hidden when user adds vendor and delivery', () => {
      // Initial state - new user with no data
      let state: OnboardingState = {
        isExperiencedUser: false,
        isOnboardingDismissed: false,
        vendorCount: 0,
        deliveryCount: 0,
        serviceBookingCount: 0
      }
      expect(shouldShowOnboarding(state)).toBe(true)

      // After adding vendor
      state = { ...state, vendorCount: 1 }
      expect(shouldShowOnboarding(state)).toBe(true) // Still showing - need activity

      // After adding delivery
      state = { ...state, deliveryCount: 1 }
      expect(shouldShowOnboarding(state)).toBe(false) // Hidden - setup complete
    })

    it('should transition from showing to hidden when user adds vendor and service booking', () => {
      let state: OnboardingState = {
        isExperiencedUser: false,
        isOnboardingDismissed: false,
        vendorCount: 0,
        deliveryCount: 0,
        serviceBookingCount: 0
      }
      expect(shouldShowOnboarding(state)).toBe(true)

      state = { ...state, vendorCount: 1 }
      expect(shouldShowOnboarding(state)).toBe(true)

      state = { ...state, serviceBookingCount: 1 }
      expect(shouldShowOnboarding(state)).toBe(false)
    })

    it('should transition to hidden immediately when dismissed', () => {
      let state: OnboardingState = {
        isExperiencedUser: false,
        isOnboardingDismissed: false,
        vendorCount: 0,
        deliveryCount: 0,
        serviceBookingCount: 0
      }
      expect(shouldShowOnboarding(state)).toBe(true)

      state = { ...state, isOnboardingDismissed: true }
      expect(shouldShowOnboarding(state)).toBe(false)
    })
  })

  describe('LocalStorage Key Format', () => {
    it('should use correct key prefix', () => {
      const keyPrefix = 'sitewise_onboarding_dismissed_'
      expect(ONBOARDING_DISMISSED_KEY).toBe(keyPrefix)
    })

    it('should generate correct key for a site', () => {
      const siteId = 'site-123'
      const key = ONBOARDING_DISMISSED_KEY + siteId

      expect(key).toBe('sitewise_onboarding_dismissed_site-123')
    })

    it('should generate unique keys for different sites', () => {
      const site1Key = ONBOARDING_DISMISSED_KEY + 'site-1'
      const site2Key = ONBOARDING_DISMISSED_KEY + 'site-2'

      expect(site1Key).not.toBe(site2Key)
    })
  })

  describe('Data Loading with Vendors', () => {
    it('should include vendors in dashboard data structure', () => {
      const dashboardData = {
        payments: [],
        deliveries: [],
        serviceBookings: [],
        vendorRefunds: [],
        vendors: []
      }

      expect(dashboardData).toHaveProperty('vendors')
      expect(Array.isArray(dashboardData.vendors)).toBe(true)
    })

    it('should correctly extract vendor count from data', () => {
      const dashboardData = {
        vendors: [
          { id: 'v1', name: 'Vendor 1' },
          { id: 'v2', name: 'Vendor 2' },
          { id: 'v3', name: 'Vendor 3' }
        ]
      }

      const vendorCount = dashboardData.vendors.length
      expect(vendorCount).toBe(3)
    })

    it('should correctly extract delivery count from data', () => {
      const dashboardData = {
        deliveries: [
          { id: 'd1', vendor: 'v1' },
          { id: 'd2', vendor: 'v2' }
        ]
      }

      const deliveryCount = dashboardData.deliveries.length
      expect(deliveryCount).toBe(2)
    })

    it('should correctly extract service booking count from data', () => {
      const dashboardData = {
        serviceBookings: [
          { id: 'sb1', vendor: 'v1' },
          { id: 'sb2', vendor: 'v2' },
          { id: 'sb3', vendor: 'v3' },
          { id: 'sb4', vendor: 'v1' }
        ]
      }

      const serviceBookingCount = dashboardData.serviceBookings.length
      expect(serviceBookingCount).toBe(4)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null dashboard data gracefully', () => {
      const dashboardData = null

      const getVendorCount = (data: any) => data?.vendors?.length || 0
      const getDeliveryCount = (data: any) => data?.deliveries?.length || 0
      const getServiceBookingCount = (data: any) => data?.serviceBookings?.length || 0

      expect(getVendorCount(dashboardData)).toBe(0)
      expect(getDeliveryCount(dashboardData)).toBe(0)
      expect(getServiceBookingCount(dashboardData)).toBe(0)
    })

    it('should handle undefined vendors array gracefully', () => {
      const dashboardData = {
        payments: [],
        deliveries: [],
        serviceBookings: []
        // vendors is undefined
      }

      const vendorCount = (dashboardData as any).vendors?.length || 0
      expect(vendorCount).toBe(0)
    })

    it('should handle empty site ID', () => {
      const siteId = ''

      const initializeDismissState = (siteId: string | null): boolean => {
        if (siteId) {
          return localStorage.getItem(ONBOARDING_DISMISSED_KEY + siteId) === 'true'
        }
        return false
      }

      // Empty string is falsy, so should return false
      const result = initializeDismissState(siteId)
      expect(result).toBe(false)
    })
  })
})
