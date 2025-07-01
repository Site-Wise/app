import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useSiteData } from '../../composables/useSiteData'
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
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(data.value).toEqual(mockItems1)
    expect(mockLoadData).toHaveBeenCalledWith('site-1')

    // Mock getCurrentSiteId to return site-2 for the site change
    getCurrentSiteIdMock.mockReturnValue('site-2')
    
    // Use the store's selectSite method to properly trigger the watcher
    const mockSite2 = { id: 'site-2', name: 'Site 2' } as any
    await siteStore.selectSite(mockSite2, 'admin')
    
    // Wait longer for site change to trigger reload and complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(mockLoadData).toHaveBeenCalledWith('site-2')
    expect(data.value).toEqual(mockItems2)
    expect(mockLoadData).toHaveBeenCalledTimes(2)
  })

  it('should handle loading errors', async () => {
    const mockError = new Error('Failed to load data')
    mockLoadData.mockRejectedValue(mockError)

    const { data, loading, error } = useSiteData(mockLoadData)

    // Wait for error to be set
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(data.value).toBe(null)
    expect(loading.value).toBe(false)
    expect(error.value).toEqual(mockError)
  })

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