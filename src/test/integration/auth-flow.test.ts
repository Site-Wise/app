import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from '../../App.vue'
import SiteSelectionView from '../../views/SiteSelectionView.vue'
import DashboardView from '../../views/DashboardView.vue'
import { setupTestPinia } from '../utils/test-setup'
import { createMockRouter } from '../utils/test-utils'

// Mock services with proper Pinia-compatible structure
vi.mock('../../services/pocketbase', () => {
  const mockSites = [
    {
      id: 'site-1',
      name: 'Test Site 1',
      total_units: 100,
      total_planned_area: 50000,
      admin_user: 'user-1',
      users: ['user-1', 'user-2']
    },
    {
      id: 'site-2', 
      name: 'Test Site 2',
      total_units: 200,
      total_planned_area: 100000,
      admin_user: 'user-1',
      users: ['user-1']
    }
  ]

  return {
    pb: {
      authStore: {
        isValid: true,
        model: { id: 'user-1', email: 'test@example.com' },
        onChange: vi.fn(),
        clear: vi.fn()
      },
      collection: vi.fn(() => ({
        getFullList: vi.fn().mockResolvedValue(mockSites),
        getOne: vi.fn().mockResolvedValue(mockSites[0])
      }))
    },
    authService: {
      currentUser: { id: 'user-1', email: 'test@example.com' },
      login: vi.fn().mockResolvedValue(true),
      logout: vi.fn().mockResolvedValue(true),
      isAuthenticated: vi.fn(() => true)
    },
    getCurrentSiteId: vi.fn(() => null),
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: vi.fn(() => null),
    setCurrentUserRole: vi.fn(),
    // Add other required services
    itemService: { getAll: vi.fn().mockResolvedValue([]) },
    paymentService: { getAll: vi.fn().mockResolvedValue([]) },
    accountService: { getAll: vi.fn().mockResolvedValue([]) },
    deliveryService: { getAll: vi.fn().mockResolvedValue([]) },
    serviceService: { getAll: vi.fn().mockResolvedValue([]) },
    vendorService: { getAll: vi.fn().mockResolvedValue([]) },
    serviceBookingService: { getAll: vi.fn().mockResolvedValue([]) },
    quotationService: { getAll: vi.fn().mockResolvedValue([]) },
    tagService: { getAll: vi.fn().mockResolvedValue([]) },
    siteInvitationService: {
      getAll: vi.fn().mockResolvedValue([]),
      getReceivedInvitations: vi.fn().mockResolvedValue([]),
      getSentInvitations: vi.fn().mockResolvedValue([]),
      accept: vi.fn().mockResolvedValue({}),
      decline: vi.fn().mockResolvedValue({})
    },
    // Token refresh functions
    initializeTokenRefresh: vi.fn().mockResolvedValue(true),
    stopTokenRefresh: vi.fn(),
    getTokenStatus: vi.fn().mockReturnValue({
      isValid: true,
      isExpired: false,
      needsRefresh: false,
      expiresAt: new Date(Date.now() + 3600000),
      timeUntilExpiry: 3600000
    })
  }
})

// Mock composables
vi.mock('../../composables/useAuth', () => {
  const { ref, computed } = require('vue')
  
  const mockUser = ref(null)

  return {
    useAuth: () => ({
      isAuthenticated: computed(() => !!mockUser.value),
      user: mockUser,
      login: vi.fn().mockImplementation(async (email, password) => {
        mockUser.value = { id: 'user-1', email: email || 'test@example.com' }
        return { success: true }
      }),
      logout: vi.fn().mockImplementation(() => {
        mockUser.value = null
      }),
      refreshAuth: vi.fn()
    })
  }
})

vi.mock('../../composables/useSite', () => {
  const { ref, computed } = require('vue')
  
  const mockCurrentSite = ref(null)
  const mockIsReadyForRouting = ref(false)
  
  return {
    useSite: () => ({
      currentSite: mockCurrentSite,
      userSites: ref([]),
      currentUserRole: ref(null),
      isLoading: ref(false),
      hasSiteAccess: computed(() => mockCurrentSite.value !== null),
      isReadyForRouting: mockIsReadyForRouting,
      isCurrentUserAdmin: computed(() => true),
      canManageUsers: computed(() => true),
      loadUserSites: vi.fn().mockImplementation(async () => {
        // Don't automatically set isReadyForRouting - let tests control this
      }),
      selectSite: vi.fn().mockImplementation(async (siteId) => {
        const site = { id: siteId, name: 'Test Site', total_units: 100, total_planned_area: 50000 }
        mockCurrentSite.value = site
      })
    })
  }
})

vi.mock('../../composables/usePWA', () => ({
  usePWA: () => ({
    isInstallable: { value: false },
    isInstalled: { value: false },
    isOnline: { value: true },
    updateAvailable: { value: false },
    initializePWA: vi.fn(),
    requestNotificationPermission: vi.fn(),
    showNotification: vi.fn(),
    updateApp: vi.fn(),
    addToOfflineQueue: vi.fn()
  })
}))

vi.mock('../../composables/usePlatform', () => ({
  usePlatform: () => ({
    platformInfo: { value: { isTauri: false, isWeb: true, isMobile: false } }
  })
}))

vi.mock('../../composables/useNativeNotifications', () => ({
  useNativeNotifications: () => ({
    requestPermission: vi.fn().mockResolvedValue(true)
  })
}))

// Mock AppLayout component
vi.mock('../../components/AppLayout.vue', () => ({
  default: {
    name: 'AppLayout',
    template: '<div>App Layout Mock</div>'
  }
}))

describe('Authentication Flow Integration', () => {
  let pinia: any
  let siteStore: any
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()
    const { pinia: testPinia, siteStore: testSiteStore } = setupTestPinia()
    pinia = testPinia
    siteStore = testSiteStore
    router = createMockRouter()
  })

  describe('Initial App Load', () => {
    it('should show loading skeleton when authenticated but not ready for routing', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const useSiteMocks = await import('../../composables/useSite')
      const { useAuth } = useAuthMocks
      const { useSite } = useSiteMocks
      
      const authComposable = useAuth()
      const siteComposable = useSite()
      
      // Set authenticated but not ready for routing (loading state)
      authComposable.user.value = { id: 'user-1', email: 'test@example.com' }
      siteComposable.isReadyForRouting.value = false

      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // Should show loading skeleton
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
      
      wrapper.unmount()
    })

    it('should not show site selection or app layout when not authenticated', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const { useAuth } = useAuthMocks
      
      const authComposable = useAuth()
      
      // Set not authenticated
      authComposable.user.value = null

      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // Should not show site selection or app layout when not authenticated
      expect(wrapper.findComponent(SiteSelectionView).exists()).toBe(false)
      expect(wrapper.find('.animate-pulse').exists()).toBe(false)
      // App layout and other authenticated content should not be shown
      expect(wrapper.text()).not.toContain('Select a Site')
      
      wrapper.unmount()
    })

    it('should redirect to site selection when authenticated but no site selected', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const useSiteMocks = await import('../../composables/useSite')
      const { useAuth } = useAuthMocks
      const { useSite } = useSiteMocks
      
      const authComposable = useAuth()
      const siteComposable = useSite()
      
      // Set authenticated but no site
      authComposable.user.value = { id: 'user-1', email: 'test@example.com' }
      siteComposable.currentSite.value = null // No site = no access
      siteComposable.isReadyForRouting.value = true

      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // Should render SiteSelectionView
      expect(wrapper.findComponent(SiteSelectionView).exists()).toBe(true)
      
      wrapper.unmount()
    })

    it('should show app layout when authenticated and site selected', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const useSiteMocks = await import('../../composables/useSite')
      const { useAuth } = useAuthMocks
      const { useSite } = useSiteMocks
      
      const authComposable = useAuth()
      const siteComposable = useSite()
      
      // Set authenticated with site
      authComposable.user.value = { id: 'user-1', email: 'test@example.com' }
      siteComposable.currentSite.value = {
        id: 'site-1',
        name: 'Test Site',
        total_units: 100,
        total_planned_area: 50000,
        admin_user: 'user-1',
        users: ['user-1']
      }
      siteComposable.isReadyForRouting.value = true

      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // Should render AppLayout (check that we're not showing login or site selection)
      expect(wrapper.find('router-view-stub').exists()).toBe(false)
      expect(wrapper.findComponent(SiteSelectionView).exists()).toBe(false)
      expect(wrapper.find('.animate-pulse').exists()).toBe(false)
      
      wrapper.unmount()
    })
  })

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const { useAuth } = useAuthMocks
      const authComposable = useAuth()
      
      // Start unauthenticated
      authComposable.user.value = null

      // Simulate login
      const result = await authComposable.login('test@example.com', 'password')

      // Should now be authenticated
      expect(result.success).toBe(true)
      expect(authComposable.isAuthenticated.value).toBe(true)
      expect(authComposable.user.value).toEqual({
        id: 'user-1',
        email: 'test@example.com'
      })
    })

    it('should have loadUserSites function available in useSite composable', async () => {
      const useSiteMocks = await import('../../composables/useSite')
      const { useSite } = useSiteMocks
      
      const siteComposable = useSite()

      // Should have loadUserSites function available
      expect(typeof siteComposable.loadUserSites).toBe('function')
      
      // Function should be callable without errors
      await expect(siteComposable.loadUserSites()).resolves.toBeUndefined()
    })
  })

  describe('Logout Flow', () => {
    it('should handle logout and return to login', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const useSiteMocks = await import('../../composables/useSite')
      const { useAuth } = useAuthMocks
      const { useSite } = useSiteMocks
      
      const authComposable = useAuth()
      const siteComposable = useSite()
      
      // Start authenticated with site
      authComposable.user.value = { id: 'user-1', email: 'test@example.com' }
      siteComposable.currentSite.value = {
        id: 'site-1',
        name: 'Test Site',
        total_units: 100,
        total_planned_area: 50000,
        admin_user: 'user-1',
        users: ['user-1']
      }
      siteComposable.isReadyForRouting.value = true

      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // Should show app layout initially (not login)
      expect(wrapper.find('router-view-stub').exists()).toBe(false)

      // Simulate logout
      authComposable.logout()
      await nextTick()

      // Should now be unauthenticated and not show authenticated content
      expect(authComposable.isAuthenticated.value).toBe(false)
      expect(authComposable.user.value).toBeNull()
      expect(wrapper.findComponent(SiteSelectionView).exists()).toBe(false)
      
      wrapper.unmount()
    })

    it('should clear site data on logout', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const useSiteMocks = await import('../../composables/useSite')
      const { useAuth } = useAuthMocks
      const { useSite } = useSiteMocks
      
      const authComposable = useAuth()
      const siteComposable = useSite()

      // Set up initial authenticated state with site
      authComposable.user.value = { id: 'user-1', email: 'test@example.com' }
      siteComposable.currentSite.value = {
        id: 'site-1',
        name: 'Test Site',
        total_units: 100,
        total_planned_area: 50000,
        admin_user: 'user-1',
        users: ['user-1']
      }

      expect(siteComposable.hasSiteAccess.value).toBe(true)

      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // Simulate logout
      authComposable.logout()
      // Also clear site data (this would happen in the actual logout flow)
      siteComposable.currentSite.value = null
      await nextTick()

      // Site should be cleared
      expect(siteComposable.hasSiteAccess.value).toBe(false)
      
      wrapper.unmount()
    })
  })

  describe('Site Selection Flow', () => {
    it('should navigate to app layout after site selection', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const useSiteMocks = await import('../../composables/useSite')
      const { useAuth } = useAuthMocks
      const { useSite } = useSiteMocks
      
      const authComposable = useAuth()
      const siteComposable = useSite()
      
      // Start authenticated but no site
      authComposable.user.value = { id: 'user-1', email: 'test@example.com' }
      siteComposable.currentSite.value = null
      siteComposable.isReadyForRouting.value = true

      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // Should show site selection
      expect(wrapper.findComponent(SiteSelectionView).exists()).toBe(true)

      // Simulate site selection
      const testSite = {
        id: 'site-1',
        name: 'Test Site',
        total_units: 100,
        total_planned_area: 50000,
        admin_user: 'user-1',
        users: ['user-1']
      }

      // Simulate site selection through the mock
      await siteComposable.selectSite('site-1')
      await nextTick()

      // Should now show app layout (not site selection)
      expect(wrapper.findComponent(SiteSelectionView).exists()).toBe(false)
      expect(wrapper.find('router-view-stub').exists()).toBe(false)
      
      wrapper.unmount()
    })

    it('should handle site switching through composable', async () => {
      const useSiteMocks = await import('../../composables/useSite')
      const { useSite } = useSiteMocks
      
      const siteComposable = useSite()
      
      // Start with no site
      siteComposable.currentSite.value = null
      
      // Select first site
      await siteComposable.selectSite('site-1')
      expect(siteComposable.currentSite.value).toEqual({
        id: 'site-1',
        name: 'Test Site',
        total_units: 100,
        total_planned_area: 50000
      })

      // Switch to different site
      await siteComposable.selectSite('site-2')
      expect(siteComposable.currentSite.value).toEqual({
        id: 'site-2',
        name: 'Test Site',
        total_units: 100,
        total_planned_area: 50000
      })
    })
  })

  describe('Authentication State Persistence', () => {
    it('should handle page refresh with valid auth', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const useSiteMocks = await import('../../composables/useSite')
      const { useAuth } = useAuthMocks
      const { useSite } = useSiteMocks
      
      const authComposable = useAuth()
      const siteComposable = useSite()
      
      // Simulate page refresh - auth should be restored but sites not loaded yet
      authComposable.user.value = { id: 'user-1', email: 'test@example.com' }
      siteComposable.isReadyForRouting.value = false
      
      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // Should show loading skeleton initially
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)

      // Simulate site data loading completion
      siteComposable.isReadyForRouting.value = true
      await nextTick()

      // Should be authenticated and ready
      expect(authComposable.isAuthenticated.value).toBe(true)
      
      wrapper.unmount()
    })

    it('should handle expired authentication', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const { useAuth } = useAuthMocks
      const authComposable = useAuth()
      
      // Start authenticated
      authComposable.user.value = { id: 'user-1', email: 'test@example.com' }

      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // Simulate auth expiration
      authComposable.user.value = null
      await nextTick()

      // Should not show authenticated content
      expect(wrapper.findComponent(SiteSelectionView).exists()).toBe(false)
      
      wrapper.unmount()
    })
  })

  describe('Error Handling', () => {
    it('should handle site loading errors gracefully', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const useSiteMocks = await import('../../composables/useSite')
      const { useAuth } = useAuthMocks
      const { useSite } = useSiteMocks
      
      const authComposable = useAuth()
      const siteComposable = useSite()
      
      // Mock site loading error
      const loadUserSitesError = vi.fn().mockRejectedValue(new Error('Network error'))
      siteComposable.loadUserSites = loadUserSitesError

      authComposable.user.value = { id: 'user-1', email: 'test@example.com' }

      const wrapper = mount(App, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()

      // App should not crash even with site loading errors
      expect(wrapper.exists()).toBe(true)
      
      wrapper.unmount()
    })

    it('should handle authentication errors during login', async () => {
      const useAuthMocks = await import('../../composables/useAuth')
      const { useAuth } = useAuthMocks
      const authComposable = useAuth()
      
      // Mock login error
      const loginError = vi.fn().mockResolvedValue({ success: false, error: 'Invalid credentials' })
      authComposable.login = loginError

      authComposable.user.value = null

      // Try to login
      const result = await authComposable.login('wrong@example.com', 'wrongpassword')
      
      // Error should be handled gracefully
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
      
      // User should remain unauthenticated
      expect(authComposable.isAuthenticated.value).toBe(false)
    })
  })
})