import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, nextTick } from 'vue'
import App from '../../App.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock composables
const mockLoadUserSites = vi.fn()
const mockRequestPermission = vi.fn()

// Mock authentication state - will be modified in tests
let mockIsAuthenticated = false

// Mock site state - will be modified in tests  
let mockHasSiteAccess = false
let mockIsReadyForRouting = false

vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: computed(() => mockIsAuthenticated)
  })
}))

vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    hasSiteAccess: computed(() => mockHasSiteAccess),
    isReadyForRouting: computed(() => mockIsReadyForRouting),
    loadUserSites: mockLoadUserSites
  })
}))

vi.mock('../../composables/usePlatform', () => ({
  usePlatform: () => ({
    platformInfo: computed(() => ({ isTauri: false }))
  })
}))

vi.mock('../../composables/useNativeNotifications', () => ({
  useNativeNotifications: () => ({
    requestPermission: mockRequestPermission
  })
}))

describe('App.vue - Reload Behavior', () => {
  let wrapper: any
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()
    router = createMockRouter()
    
    // Reset mock states to unauthenticated by default
    mockIsAuthenticated = false
    mockHasSiteAccess = false
    mockIsReadyForRouting = false
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = () => {
    return mount(App, {
      global: {
        plugins: [router],
        stubs: {
          'router-view': { template: '<div data-testid="router-view">Router View</div>' },
          SiteSelectionView: { template: '<div data-testid="site-selection">Site Selection</div>' },
          AppLayout: { template: '<div data-testid="app-layout">App Layout</div>' },
          ToastContainer: { template: '<div data-testid="toast-container">Toast</div>' }
        }
      }
    })
  }

  describe('Authentication States', () => {
    it('should show router-view when not authenticated', () => {
      mockIsAuthenticated = false
      wrapper = createWrapper()
      
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="site-selection"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(false)
    })

    it('should show loading skeleton when authenticated but not ready for routing', async () => {
      mockIsAuthenticated = true
      mockIsReadyForRouting = false
      mockHasSiteAccess = false
      
      wrapper = createWrapper()
      await nextTick()
      
      // Should show loading skeleton with proper structure
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="site-selection"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(false)
    })

    it('should show site selection when authenticated, ready, but no site access', async () => {
      mockIsAuthenticated = true
      mockIsReadyForRouting = true
      mockHasSiteAccess = false
      
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.find('[data-testid="site-selection"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(false)
      expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    })

    it('should show app layout when authenticated, ready, and has site access', async () => {
      mockIsAuthenticated = true
      mockIsReadyForRouting = true
      mockHasSiteAccess = true
      
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="site-selection"]').exists()).toBe(false)
      expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    })
  })

  describe('Critical Reload Behavior - Prevents Dashboard Redirect', () => {
    it('should NOT show SiteSelectionView during loading phase to prevent auto-redirect', async () => {
      // CRITICAL: This test ensures the reload redirect bug is fixed
      // During page reload, this sequence must be maintained:
      // 1. Show loading skeleton (prevents SiteSelectionView from rendering)
      // 2. loadUserSites() completes and sets isReadyForRouting = true  
      // 3. Only then show SiteSelectionView or AppLayout based on actual state
      
      mockIsAuthenticated = true
      mockIsReadyForRouting = false  // Key: not ready yet
      mockHasSiteAccess = false      // Would normally show SiteSelectionView
      
      wrapper = createWrapper()
      await nextTick()
      
      // CRITICAL CHECK: SiteSelectionView must NOT render during loading
      // If it renders, it will auto-redirect to dashboard via its onMounted logic
      expect(wrapper.find('[data-testid="site-selection"]').exists()).toBe(false)
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
      
      // Simulate loadUserSites completing - need to remount for reactivity
      mockIsReadyForRouting = true
      if (wrapper) wrapper.unmount()
      wrapper = createWrapper()
      await nextTick()
      
      // Now SiteSelectionView should render safely
      expect(wrapper.find('[data-testid="site-selection"]').exists()).toBe(true)
      expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    })

    it('should maintain correct component during site loading transition', async () => {
      // CRITICAL: Tests the exact scenario that caused the reload redirect bug
      // Simulates a user reloading /items page
      
      mockIsAuthenticated = true
      mockIsReadyForRouting = false
      mockHasSiteAccess = false
      
      wrapper = createWrapper()
      await nextTick()
      
      // Phase 1: Loading - show skeleton
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
      expect(wrapper.find('[data-testid="site-selection"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(false)
      
      // Phase 2: Loading completes, user has site access - remount for reactivity
      mockIsReadyForRouting = true
      mockHasSiteAccess = true
      if (wrapper) wrapper.unmount()
      wrapper = createWrapper()
      await nextTick()
      
      // Should go directly to AppLayout without showing SiteSelectionView
      expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="site-selection"]').exists()).toBe(false)
      expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    })

    it('should handle edge case where user loses site access during loading', async () => {
      mockIsAuthenticated = true
      mockIsReadyForRouting = false
      mockHasSiteAccess = true  // Initially has access
      
      wrapper = createWrapper()
      await nextTick()
      
      // Loading phase
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
      
      // Site access is revoked during loading - remount for reactivity
      mockIsReadyForRouting = true
      mockHasSiteAccess = false
      if (wrapper) wrapper.unmount()
      wrapper = createWrapper()
      await nextTick()
      
      // Should show site selection, not crash
      expect(wrapper.find('[data-testid="site-selection"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(false)
    })
  })

  describe('Loading Skeleton Structure', () => {
    it('should render proper loading skeleton with header and content areas', async () => {
      mockIsAuthenticated = true
      mockIsReadyForRouting = false
      
      wrapper = createWrapper()
      await nextTick()
      
      const skeleton = wrapper.find('.animate-pulse')
      expect(skeleton.exists()).toBe(true)
      
      // Check skeleton structure
      expect(skeleton.find('.bg-white.dark\\:bg-gray-800').exists()).toBe(true) // Header
      expect(skeleton.find('.grid.grid-cols-1.md\\:grid-cols-3').exists()).toBe(true) // Cards
      
      // Check skeleton has proper dark mode support
      expect(skeleton.find('.bg-gray-300.dark\\:bg-gray-600').exists()).toBe(true)
    })
  })

  describe('Initialization Flow', () => {
    it('should call loadUserSites on mount when authenticated', async () => {
      mockIsAuthenticated = true
      
      wrapper = createWrapper()
      await nextTick()
      
      expect(mockLoadUserSites).toHaveBeenCalledOnce()
    })

    it('should not call loadUserSites when not authenticated', async () => {
      mockIsAuthenticated = false
      
      wrapper = createWrapper()
      await nextTick()
      
      expect(mockLoadUserSites).not.toHaveBeenCalled()
    })

    it('should request notification permission after site loading on supported platforms', async () => {
      mockIsAuthenticated = true
      
      wrapper = createWrapper()
      await nextTick()
      
      // Should request permission after loadUserSites
      expect(mockRequestPermission).toHaveBeenCalledOnce()
    })
  })
})