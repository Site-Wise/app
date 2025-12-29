import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useSiteData, useSitePaginatedData } from '../../composables/useSiteData'
import { useSiteStore } from '../../stores/site'

// Mock the pocketbase service to prevent actual API calls
vi.mock('../../services/pocketbase', () => ({
  pb: {
    authStore: {
      isValid: true,
      model: { id: 'test-user' }
    },
    collection: () => ({
      getFullList: vi.fn().mockResolvedValue([])
    })
  },
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'admin'),
  setCurrentUserRole: vi.fn()
}))

describe('useSiteData', () => {
  let pinia: any
  let siteStore: any
  let mockLoadData: any
  let getCurrentSiteIdMock: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mock function to control return value
    const pocketbaseMocks = await import('../../services/pocketbase')
    getCurrentSiteIdMock = vi.mocked(pocketbaseMocks.getCurrentSiteId)
    
    // Reset to default return value for most tests
    getCurrentSiteIdMock.mockReturnValue('site-1')
    
    // Set up Pinia
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Get real store instance
    siteStore = useSiteStore()
    
    // Create mock data loading function
    mockLoadData = vi.fn()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should load data when site is available', async () => {
    const mockItems = [{ id: 'item-1', name: 'Test Item' }]
    mockLoadData.mockResolvedValue(mockItems)

    const { data, loading, error } = useSiteData(mockLoadData)

    // Initially loading should be true and data should be null
    expect(loading.value).toBe(true)
    expect(data.value).toBe(null)
    expect(error.value).toBe(null)

    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockLoadData).toHaveBeenCalledWith('site-1')
    expect(data.value).toEqual(mockItems)
    expect(loading.value).toBe(false)
    expect(error.value).toBe(null)
  })

  it('should not load data when no site is selected', async () => {
    // Mock getCurrentSiteId to return null for this test
    getCurrentSiteIdMock.mockReturnValue(null)
    
    // Reset and create new store instance
    pinia = createPinia()
    setActivePinia(pinia)
    siteStore = useSiteStore()
    
    // Clear any previous calls
    vi.clearAllMocks()
    mockLoadData.mockResolvedValue(['should-not-load'])

    const { data, loading, error } = useSiteData(mockLoadData)

    // Wait a bit to ensure no loading happens
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockLoadData).not.toHaveBeenCalled()
    expect(data.value).toBe(null)
    expect(loading.value).toBe(false)
    expect(error.value).toBe(null)
  })

  it('should reload data when site changes', async () => {
    const mockItems1 = [{ id: 'item-1', name: 'Site 1 Item' }]
    const mockItems2 = [{ id: 'item-2', name: 'Site 2 Item' }]

    mockLoadData
      .mockResolvedValueOnce(mockItems1)
      .mockResolvedValueOnce(mockItems2)

    const { data, loading, error } = useSiteData(mockLoadData)

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(data.value).toEqual(mockItems1)
    expect(mockLoadData).toHaveBeenCalledWith('site-1')

    // Mock getCurrentSiteId to return site-2 for the site change
    getCurrentSiteIdMock.mockReturnValue('site-2')

    // Use the store's selectSite method to properly trigger the watcher
    const mockSite2 = { id: 'site-2', name: 'Site 2' } as any
    await siteStore.selectSite(mockSite2, 'admin')

    // Wait longer for site change to trigger reload and complete
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(mockLoadData).toHaveBeenCalledWith('site-2')
    expect(data.value).toEqual(mockItems2)
    expect(mockLoadData).toHaveBeenCalledTimes(2)
  }, 10000)

  it('should handle loading errors', async () => {
    const mockError = new Error('Failed to load data')
    mockLoadData.mockRejectedValue(mockError)

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { data, loading, error } = useSiteData(mockLoadData)

    // Wait for error to be set - increased timeout for async error handling
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(data.value).toBe(null)
    expect(loading.value).toBe(false)
    expect(error.value).toEqual(mockError)

    consoleSpy.mockRestore()
  }, 10000) // Increase test timeout to 10 seconds

  it('should provide reload function', async () => {
    const mockItems1 = [{ id: 'item-1', name: 'Initial' }]
    const mockItems2 = [{ id: 'item-1', name: 'Reloaded' }]
    
    mockLoadData
      .mockResolvedValueOnce(mockItems1)
      .mockResolvedValueOnce(mockItems2)

    const { data, reload } = useSiteData(mockLoadData)

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(data.value).toEqual(mockItems1)

    // Manually reload
    await reload()

    expect(data.value).toEqual(mockItems2)
    expect(mockLoadData).toHaveBeenCalledTimes(2)
    expect(mockLoadData).toHaveBeenNthCalledWith(1, 'site-1')
    expect(mockLoadData).toHaveBeenNthCalledWith(2, 'site-1')
  })

  it('should clear data when site becomes null', async () => {
    const mockItems = [{ id: 'item-1', name: 'Test Item' }]
    mockLoadData.mockResolvedValue(mockItems)

    const { data } = useSiteData(mockLoadData)

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(data.value).toEqual(mockItems)

    // Mock getCurrentSiteId to return null for clearing site
    getCurrentSiteIdMock.mockReturnValue(null)
    
    // Clear site using the store method
    await siteStore.clearCurrentSite()

    // Wait for site change to trigger clear
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(data.value).toBe(null)
  })

  it('should not reload when changing to same site', async () => {
    const mockItems = [{ id: 'item-1', name: 'Test Item' }]
    mockLoadData.mockResolvedValue(mockItems)

    const { data } = useSiteData(mockLoadData)

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(mockLoadData).toHaveBeenCalledTimes(1)

    // Set same site ID
    // @ts-ignore - accessing private store properties for testing
    siteStore.$state.currentSiteId = 'site-1'

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 50))

    // Should not reload for same site
    expect(mockLoadData).toHaveBeenCalledTimes(1)
  })

  it('should handle concurrent site changes', async () => {
    const mockItems1 = [{ id: 'item-1', name: 'Site 1' }]
    const mockItems2 = [{ id: 'item-2', name: 'Site 2' }]
    
    let resolveFirst: (value: any) => void
    let resolveSecond: (value: any) => void
    
    const firstPromise = new Promise(resolve => { resolveFirst = resolve })
    const secondPromise = new Promise(resolve => { resolveSecond = resolve })
    
    mockLoadData
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise)

    const { data } = useSiteData(mockLoadData)

    // Wait for initial load to start
    await new Promise(resolve => setTimeout(resolve, 50))

    // Mock getCurrentSiteId to return site-2 and change site 
    getCurrentSiteIdMock.mockReturnValue('site-2')
    const mockSite2 = { id: 'site-2', name: 'Site 2' } as any
    await siteStore.selectSite(mockSite2, 'admin')
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Resolve second request first (simulating faster response)
    resolveSecond(mockItems2)
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Then resolve first request
    resolveFirst(mockItems1)
    await new Promise(resolve => setTimeout(resolve, 50))

    // Should have the data from the latest site change (site-2)
    expect(data.value).toEqual(mockItems2)
  })
})

describe('useSitePaginatedData', () => {
  let pinia: any
  let siteStore: any
  let mockLoadPaginatedData: any
  let getCurrentSiteIdMock: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mock function to control return value
    const pocketbaseMocks = await import('../../services/pocketbase')
    getCurrentSiteIdMock = vi.mocked(pocketbaseMocks.getCurrentSiteId)
    
    // Reset to default return value for most tests
    getCurrentSiteIdMock.mockReturnValue('site-1')
    
    // Set up Pinia
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Get real store instance
    siteStore = useSiteStore()
    
    // Create mock paginated data loading function
    mockLoadPaginatedData = vi.fn()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should initialize with default pagination values', () => {
    // Mock the function to return the expected structure
    mockLoadPaginatedData.mockResolvedValue({
      items: [],
      totalItems: 0,
      totalPages: 1
    })
    
    const { items, loading, error, currentPage, totalPages, totalItems, perPage } = useSitePaginatedData(mockLoadPaginatedData)

    expect(items.value).toEqual([])
    expect(loading.value).toBe(true) // Loading starts immediately when site is available
    expect(error.value).toBe(null)
    expect(currentPage.value).toBe(1)
    expect(totalPages.value).toBe(1)
    expect(totalItems.value).toBe(0)
    expect(perPage.value).toBe(10)
  })

  it('should use custom perPage option', () => {
    // Mock the function to return the expected structure
    mockLoadPaginatedData.mockResolvedValue({
      items: [],
      totalItems: 0,
      totalPages: 1
    })
    
    const { perPage } = useSitePaginatedData(mockLoadPaginatedData, { perPage: 25 })
    expect(perPage.value).toBe(25)
  })

  it('should load paginated data when site is available', async () => {
    const mockResult = {
      items: [{ id: 'item-1', name: 'Test Item' }],
      totalItems: 50,
      totalPages: 5
    }
    mockLoadPaginatedData.mockResolvedValue(mockResult)

    const { items, loading, error, totalPages, totalItems } = useSitePaginatedData(mockLoadPaginatedData)

    // Initially loading should be true
    expect(loading.value).toBe(true)

    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockLoadPaginatedData).toHaveBeenCalledWith('site-1', 1, 10)
    expect(items.value).toEqual(mockResult.items)
    expect(totalPages.value).toBe(5)
    expect(totalItems.value).toBe(50)
    expect(loading.value).toBe(false)
    expect(error.value).toBe(null)
  })

  it('should not load data when no site is selected', async () => {
    getCurrentSiteIdMock.mockReturnValue(null)
    
    pinia = createPinia()
    setActivePinia(pinia)
    siteStore = useSiteStore()
    
    vi.clearAllMocks()
    mockLoadPaginatedData.mockResolvedValue({ items: [], totalItems: 0, totalPages: 1 })

    const { items, totalPages, totalItems } = useSitePaginatedData(mockLoadPaginatedData)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockLoadPaginatedData).not.toHaveBeenCalled()
    expect(items.value).toEqual([])
    expect(totalPages.value).toBe(1)
    expect(totalItems.value).toBe(0)
  })

  it('should handle pagination navigation', async () => {
    const mockResult = {
      items: [{ id: 'item-1', name: 'Test Item' }],
      totalItems: 50,
      totalPages: 5
    }
    mockLoadPaginatedData.mockResolvedValue(mockResult)

    const { currentPage, totalPages, nextPage, prevPage, goToPage } = useSitePaginatedData(mockLoadPaginatedData)

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(currentPage.value).toBe(1)

    // Test next page
    nextPage()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(currentPage.value).toBe(2)
    expect(mockLoadPaginatedData).toHaveBeenCalledWith('site-1', 2, 10)

    // Test previous page
    prevPage()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(currentPage.value).toBe(1)

    // Test go to specific page
    goToPage(3)
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(currentPage.value).toBe(3)
    expect(mockLoadPaginatedData).toHaveBeenCalledWith('site-1', 3, 10)
  })

  it('should not navigate beyond page boundaries', async () => {
    const mockResult = {
      items: [{ id: 'item-1', name: 'Test Item' }],
      totalItems: 20,
      totalPages: 2
    }
    mockLoadPaginatedData.mockResolvedValue(mockResult)

    const { currentPage, nextPage, prevPage, goToPage } = useSitePaginatedData(mockLoadPaginatedData)

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 50))

    // Try to go to previous page from page 1
    prevPage()
    expect(currentPage.value).toBe(1)

    // Go to last page
    goToPage(2)
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(currentPage.value).toBe(2)

    // Try to go to next page from last page
    nextPage()
    expect(currentPage.value).toBe(2)

    // Try to go to invalid pages
    goToPage(0)
    expect(currentPage.value).toBe(2)

    goToPage(10)
    expect(currentPage.value).toBe(2)
  })

  it('should reset to page 1 when site changes', async () => {
    const mockResult1 = {
      items: [{ id: 'item-1', name: 'Site 1 Item' }],
      totalItems: 30,
      totalPages: 3
    }
    const mockResult2 = {
      items: [{ id: 'item-2', name: 'Site 2 Item' }],
      totalItems: 40,
      totalPages: 4
    }
    
    mockLoadPaginatedData
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult1) // For page navigation
      .mockResolvedValueOnce(mockResult2) // For site change

    const { currentPage, goToPage, items } = useSitePaginatedData(mockLoadPaginatedData)

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(currentPage.value).toBe(1)

    // Navigate to page 2
    goToPage(2)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(currentPage.value).toBe(2)

    // Change site
    getCurrentSiteIdMock.mockReturnValue('site-2')
    const mockSite2 = { id: 'site-2', name: 'Site 2' } as any
    await siteStore.selectSite(mockSite2, 'admin')
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(currentPage.value).toBe(1) // Should reset to page 1
    expect(items.value).toEqual(mockResult2.items)
  })

  it('should handle loading errors in paginated data', async () => {
    const mockError = new Error('Failed to load paginated data')
    mockLoadPaginatedData.mockRejectedValue(mockError)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { items, loading, error } = useSitePaginatedData(mockLoadPaginatedData)

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(items.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toEqual(mockError)
    
    consoleSpy.mockRestore()
  })

  it('should clear data when site becomes null', async () => {
    const mockResult = {
      items: [{ id: 'item-1', name: 'Test Item' }],
      totalItems: 50,
      totalPages: 5
    }
    mockLoadPaginatedData.mockResolvedValue(mockResult)

    const { items, totalPages, totalItems } = useSitePaginatedData(mockLoadPaginatedData)

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(items.value).toEqual(mockResult.items)

    // Clear site - mock must be set BEFORE calling clearCurrentSite
    getCurrentSiteIdMock.mockReturnValue(null)
    await siteStore.clearCurrentSite()

    // Wait for site change watcher to trigger and clear data
    await new Promise(resolve => setTimeout(resolve, 150))

    expect(items.value).toEqual([])
    expect(totalPages.value).toBe(1)
    expect(totalItems.value).toBe(0)
  }, 10000)

  it('should provide reload functionality', async () => {
    const mockResult1 = {
      items: [{ id: 'item-1', name: 'Initial' }],
      totalItems: 10,
      totalPages: 1
    }
    const mockResult2 = {
      items: [{ id: 'item-1', name: 'Reloaded' }],
      totalItems: 15,
      totalPages: 2
    }
    
    mockLoadPaginatedData
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2)

    const { items, totalItems, reload } = useSitePaginatedData(mockLoadPaginatedData)

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(items.value).toEqual(mockResult1.items)
    expect(totalItems.value).toBe(10)

    // Manually reload
    await reload()

    expect(items.value).toEqual(mockResult2.items)
    expect(totalItems.value).toBe(15)
    expect(mockLoadPaginatedData).toHaveBeenCalledTimes(2)
  })

  it('should handle auth store invalid state', async () => {
    // Mock invalid auth state by overriding the mock
    const pocketbaseMocks = await import('../../services/pocketbase')
    const originalPb = pocketbaseMocks.pb
    
    // Create a new mock for this test
    Object.defineProperty(originalPb, 'authStore', {
      value: { isValid: false },
      writable: true,
      configurable: true
    })

    const { items, totalPages, totalItems } = useSitePaginatedData(mockLoadPaginatedData)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockLoadPaginatedData).not.toHaveBeenCalled()
    expect(items.value).toEqual([])
    expect(totalPages.value).toBe(1)
    expect(totalItems.value).toBe(0)
  })
})