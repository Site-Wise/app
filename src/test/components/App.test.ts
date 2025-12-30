import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import App from '../../App.vue'
import { createMockRouter } from '../utils/test-utils'
import { setupTestPinia } from '../utils/test-setup'

// Mock composables
const mockLoadUserSites = vi.fn()
const mockRequestPermission = vi.fn()

// Create reactive refs for mocked state
const mockIsAuthenticated = ref(false)
const mockHasSiteAccess = ref(false)
const mockIsReadyForRouting = ref(false)

vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    refreshAuth: vi.fn()
  })
}))

// Mock token refresh and pocketbase functions needed by site store
vi.mock('../../services/pocketbase', () => ({
  initializeTokenRefresh: vi.fn().mockResolvedValue(true),
  getCurrentSiteId: vi.fn().mockReturnValue(null),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn().mockReturnValue(null),
  setCurrentUserRole: vi.fn(),
  pb: {
    authStore: {
      isValid: false,
      model: null
    },
    collection: vi.fn(() => ({
      getFullList: vi.fn().mockResolvedValue([])
    }))
  }
}))

vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    hasSiteAccess: mockHasSiteAccess,
    isReadyForRouting: mockIsReadyForRouting,
    loadUserSites: mockLoadUserSites
  })
}))

vi.mock('../../composables/usePlatform', () => ({
  usePlatform: () => ({
    platformInfo: ref({ isTauri: false })
  })
}))

vi.mock('../../composables/useNativeNotifications', () => ({
  useNativeNotifications: () => ({
    requestPermission: mockRequestPermission
  })
}))

// Mock child components
vi.mock('../../components/AppLayout.vue', () => ({
  default: { name: 'AppLayout', template: '<div>AppLayout</div>' }
}))

vi.mock('../../views/SiteSelectionView.vue', () => ({
  default: { name: 'SiteSelectionView', template: '<div>SiteSelectionView</div>' }
}))

vi.mock('../../components/ToastContainer.vue', () => ({
  default: { name: 'ToastContainer', template: '<div>ToastContainer</div>' }
}))

describe('App.vue', () => {
  let wrapper: any
  let router: any
  let pinia: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock states
    mockIsAuthenticated.value = false
    mockHasSiteAccess.value = false
    mockIsReadyForRouting.value = false
    
    const testSetup = setupTestPinia()
    pinia = testSetup.pinia
    router = createMockRouter()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Unauthenticated State', () => {
    it('should show router-view when not authenticated', async () => {
      mockIsAuthenticated.value = false
      
      wrapper = mount(App, {
        global: {
          plugins: [router, pinia],
          stubs: {
            RouterView: { template: '<div>RouterView</div>' }
          }
        }
      })

      expect(wrapper.text()).toContain('RouterView')
      expect(wrapper.text()).not.toContain('AppLayout')
      expect(wrapper.text()).not.toContain('SiteSelectionView')
    })
  })

  describe('Authenticated State', () => {
    it('should show loading skeleton when authenticated but not ready for routing', async () => {
      mockIsAuthenticated.value = true
      mockIsReadyForRouting.value = false
      
      wrapper = mount(App, {
        global: {
          plugins: [router, pinia]
        }
      })

      // Should show loading skeleton
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
      expect(wrapper.text()).not.toContain('AppLayout')
      expect(wrapper.text()).not.toContain('SiteSelectionView')
    })

    it('should show SiteSelectionView when authenticated, ready, but no site access', async () => {
      mockIsAuthenticated.value = true
      mockIsReadyForRouting.value = true
      mockHasSiteAccess.value = false
      
      wrapper = mount(App, {
        global: {
          plugins: [router, pinia]
        }
      })

      expect(wrapper.text()).toContain('SiteSelectionView')
      expect(wrapper.text()).not.toContain('AppLayout')
    })

    it('should show AppLayout when authenticated with site access', async () => {
      mockIsAuthenticated.value = true
      mockIsReadyForRouting.value = true
      mockHasSiteAccess.value = true
      
      wrapper = mount(App, {
        global: {
          plugins: [router, pinia]
        }
      })

      expect(wrapper.text()).toContain('AppLayout')
      expect(wrapper.text()).not.toContain('SiteSelectionView')
    })
  })

  describe('Authentication Watch', () => {
    it('should load user sites when user logs in', async () => {
      mockIsAuthenticated.value = false
      
      wrapper = mount(App, {
        global: {
          plugins: [router, pinia]
        }
      })

      // Simulate login
      mockIsAuthenticated.value = true
      await nextTick()
      await nextTick() // Extra tick for watch to trigger

      expect(mockLoadUserSites).toHaveBeenCalledTimes(1)
      expect(mockRequestPermission).toHaveBeenCalledTimes(1)
    })

    it('should not load user sites on initial mount when already authenticated', async () => {
      mockIsAuthenticated.value = true
      mockIsReadyForRouting.value = true
      
      wrapper = mount(App, {
        global: {
          plugins: [router, pinia]
        }
      })

      await nextTick()

      // Should not call loadUserSites since already ready for routing
      expect(mockLoadUserSites).not.toHaveBeenCalled()
    })
  })

  describe('onMounted Hook', () => {
    it('should load user sites on mount if authenticated but not ready', async () => {
      mockIsAuthenticated.value = true
      mockIsReadyForRouting.value = false

      wrapper = mount(App, {
        global: {
          plugins: [router, pinia]
        }
      })

      // Wait for async operations (initializeTokenRefresh and loadUserSites)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))
      await nextTick()

      expect(mockLoadUserSites).toHaveBeenCalledTimes(1)
      // Note: requestPermission is only called if Notification API is available in window
      // or if running in Tauri, which may not be the case in test environment
    })

    it('should not load user sites if already ready for routing', async () => {
      mockIsAuthenticated.value = true
      mockIsReadyForRouting.value = true
      
      wrapper = mount(App, {
        global: {
          plugins: [router, pinia]
        }
      })

      await nextTick()

      expect(mockLoadUserSites).not.toHaveBeenCalled()
    })
  })

  describe('ToastContainer', () => {
    it('should always render ToastContainer', async () => {
      wrapper = mount(App, {
        global: {
          plugins: [router, pinia]
        }
      })

      expect(wrapper.text()).toContain('ToastContainer')
    })
  })
})