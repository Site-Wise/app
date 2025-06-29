import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'

// Mock the PocketBase service
vi.mock('../../services/pocketbase', () => {
  const mockGetAll = vi.fn()
  const mockGetUserRoleForSite = vi.fn()
  const mockAuthService = {
    currentUser: { id: 'user-1', name: 'Test User' }
  }

  return {
    siteService: {
      getAll: mockGetAll
    },
    siteUserService: {
      getUserRoleForSite: mockGetUserRoleForSite
    },
    getCurrentSiteId: vi.fn(() => null),
    setCurrentSiteId: vi.fn(),
    setCurrentUserRole: vi.fn(),
    authService: mockAuthService,
    // Export these for test access
    __mockGetAll: mockGetAll,
    __mockGetUserRoleForSite: mockGetUserRoleForSite,
    __mockAuthService: mockAuthService
  }
})

import { useSite } from '../../composables/useSite'

describe('useSite composable - Initialization and Loading States', () => {
  let mockGetAll: any
  let mockGetUserRoleForSite: any
  let mockAuthService: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get mock functions from the module
    const pocketbaseModule = await import('../../services/pocketbase')
    mockGetAll = (pocketbaseModule as any).__mockGetAll
    mockGetUserRoleForSite = (pocketbaseModule as any).__mockGetUserRoleForSite
    mockAuthService = (pocketbaseModule as any).__mockAuthService
    
    // Reset localStorage
    localStorage.clear()
    
    // Default mock responses
    mockGetAll.mockResolvedValue([
      { id: 'site-1', name: 'Test Site', total_units: 10, total_planned_area: 5000 }
    ])
    mockGetUserRoleForSite.mockResolvedValue('owner')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State Management', () => {
    it('should properly manage isLoading and isReadyForRouting states', async () => {
      const { isLoading, isReadyForRouting, loadUserSites } = useSite()
      
      // Initial state
      expect(isLoading.value).toBe(false)
      expect(isReadyForRouting.value).toBe(false)
      
      // Start loading
      const loadPromise = loadUserSites()
      
      // During loading
      expect(isLoading.value).toBe(true)
      expect(isReadyForRouting.value).toBe(false)
      
      // Wait for completion
      await loadPromise
      await nextTick()
      
      // After loading
      expect(isLoading.value).toBe(false)
      expect(isReadyForRouting.value).toBe(true)
    })

    it('should reset isReadyForRouting when starting new load', async () => {
      const { isReadyForRouting, loadUserSites } = useSite()
      
      // Complete first load
      await loadUserSites()
      await nextTick()
      expect(isReadyForRouting.value).toBe(true)
      
      // Start second load
      const secondLoadPromise = loadUserSites()
      
      // Should reset to false during loading
      expect(isReadyForRouting.value).toBe(false)
      
      await secondLoadPromise
      await nextTick()
      
      // Should be true again after completion
      expect(isReadyForRouting.value).toBe(true)
    })

    it('should set isReadyForRouting to true even when loadUserSites fails', async () => {
      const { isLoading, isReadyForRouting, loadUserSites } = useSite()
      
      // Make the service call fail
      mockGetAll.mockRejectedValueOnce(new Error('Network error'))
      
      try {
        await loadUserSites()
      } catch (error) {
        // Expected to fail
      }
      
      await nextTick()
      
      // Critical: Even on failure, should be ready for routing
      // This prevents infinite loading states
      expect(isLoading.value).toBe(false)
      expect(isReadyForRouting.value).toBe(true)
    })
  })

  describe('Site Access Logic', () => {
    it('should properly determine hasSiteAccess based on currentSite', async () => {
      const { hasSiteAccess, loadUserSites } = useSite()
      
      // Initially no access
      expect(hasSiteAccess.value).toBe(false)
      
      // After loading sites
      await loadUserSites()
      await nextTick()
      
      // Should have access to first site
      expect(hasSiteAccess.value).toBe(true)
    })

    it('should handle no sites available', async () => {
      const { hasSiteAccess, isReadyForRouting, loadUserSites } = useSite()
      
      // Mock no sites
      mockGetAll.mockResolvedValueOnce([])
      
      await loadUserSites()
      await nextTick()
      
      // Should be ready for routing but have no site access
      expect(isReadyForRouting.value).toBe(true)
      expect(hasSiteAccess.value).toBe(false)
    })
  })

  describe('Critical Reload Behavior Prevention', () => {
    it('should prevent premature site selection UI rendering during load', async () => {
      // CRITICAL TEST: This simulates the exact reload scenario that caused the bug
      
      const { hasSiteAccess, isReadyForRouting, isLoading, loadUserSites } = useSite()
      
      // Simulate page reload state - authenticated but sites not loaded yet
      expect(hasSiteAccess.value).toBe(false)
      expect(isReadyForRouting.value).toBe(false)
      expect(isLoading.value).toBe(false)
      
      // Start loading (simulates App.vue onMounted calling loadUserSites)
      const loadPromise = loadUserSites()
      
      // CRITICAL: During loading, App.vue should show skeleton, NOT SiteSelectionView
      // because isReadyForRouting is false
      expect(isLoading.value).toBe(true)
      expect(isReadyForRouting.value).toBe(false)
      expect(hasSiteAccess.value).toBe(false)
      
      // Complete loading
      await loadPromise
      await nextTick()
      
      // Now it's safe to show appropriate UI
      expect(isLoading.value).toBe(false)
      expect(isReadyForRouting.value).toBe(true)
      expect(hasSiteAccess.value).toBe(true)  // User has access to loaded site
    })

    it('should handle localStorage site ID restoration without premature UI changes', async () => {
      const { getCurrentSiteId } = await import('../../services/pocketbase')
      
      // Mock saved site ID in localStorage  
      vi.mocked(getCurrentSiteId).mockReturnValue('site-1')
      
      const { hasSiteAccess, isReadyForRouting, loadUserSites } = useSite()
      
      // Even with saved site ID, should not have access until validation complete
      expect(hasSiteAccess.value).toBe(false)
      expect(isReadyForRouting.value).toBe(false)
      
      // Load and validate
      await loadUserSites()
      await nextTick()
      
      // Now should have properly validated access
      expect(isReadyForRouting.value).toBe(true)
      expect(hasSiteAccess.value).toBe(true)
    })

    it('should handle case where saved site ID is no longer valid', async () => {
      const { getCurrentSiteId } = await import('../../services/pocketbase')
      
      // Mock invalid saved site ID
      vi.mocked(getCurrentSiteId).mockReturnValue('invalid-site-id')
      
      // Mock user sites that don't include the saved ID
      mockGetAll.mockResolvedValueOnce([
        { id: 'different-site', name: 'Different Site', total_units: 5, total_planned_area: 2000 }
      ])
      
      const { hasSiteAccess, isReadyForRouting, loadUserSites } = useSite()
      
      await loadUserSites()
      await nextTick()
      
      // Should be ready for routing but have no access (site was cleared)
      expect(isReadyForRouting.value).toBe(true)
      expect(hasSiteAccess.value).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle user role loading failure gracefully', async () => {
      mockGetUserRoleForSite.mockRejectedValueOnce(new Error('Role fetch failed'))
      
      const { isReadyForRouting, loadUserSites } = useSite()
      
      await loadUserSites()
      await nextTick()
      
      // Should still be ready for routing despite role loading failure
      expect(isReadyForRouting.value).toBe(true)
    })

    it('should handle missing auth service gracefully', async () => {
      // Temporarily clear the mock auth service
      const originalAuthService = mockAuthService.currentUser
      mockAuthService.currentUser = null
      
      const { isReadyForRouting, loadUserSites } = useSite()
      
      await loadUserSites()
      await nextTick()
      
      expect(isReadyForRouting.value).toBe(true)
      
      // Restore auth service
      mockAuthService.currentUser = originalAuthService
    })
  })
})