import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ItemsView from '../../views/ItemsView.vue'
import { setupTestPinia } from '../utils/test-setup'

// Mock services with explicit return types
const mockItems = [
  { id: 'item-1', name: 'Test Item 1', unit: 'pcs', tags: [], site: 'site-1' },
  { id: 'item-2', name: 'Test Item 2', unit: 'kg', tags: [], site: 'site-1' }
]

const mockDeliveries = [
  {
    id: 'delivery-1',
    site: 'site-1',
    expand: {
      delivery_items: [
        { item: 'item-1', quantity: 10, total_amount: 1000 }
      ]
    }
  }
]

const mockTags = [
  { id: 'tag-1', name: 'Test Tag', color: '#ef4444', type: 'item_category' }
]

vi.mock('../../services/pocketbase', () => ({
  itemService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  deliveryService: {
    getAll: vi.fn()
  },
  tagService: {
    getAll: vi.fn()
  },
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
  setCurrentUserRole: vi.fn(),
  pb: {
    authStore: {
      isValid: true,
      model: { id: 'user-1' }
    },
    collection: vi.fn(() => ({ getFullList: vi.fn().mockResolvedValue([]) }))
  }
}))

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: { value: false }
  })
}))

vi.mock('../../composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

// No need to mock the site store - setupTestPinia handles this

describe('ItemsView - useSiteData Integration', () => {
  let pinia: any
  let siteStore: any
  let getCurrentSiteIdMock: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mock function to control return value
    const pocketbaseMocks = await import('../../services/pocketbase')
    getCurrentSiteIdMock = vi.mocked(pocketbaseMocks.getCurrentSiteId)
    
    // Reset to default return value for most tests
    getCurrentSiteIdMock.mockReturnValue('site-1')
    
    const { pinia: testPinia, siteStore: testSiteStore } = setupTestPinia()
    pinia = testPinia
    siteStore = testSiteStore
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should use useSiteData pattern for data loading', async () => {
    const { itemService, deliveryService, tagService } = await import('../../services/pocketbase')
    
    vi.mocked(itemService.getAll).mockResolvedValue(mockItems)
    vi.mocked(deliveryService.getAll).mockResolvedValue(mockDeliveries)
    vi.mocked(tagService.getAll).mockResolvedValue(mockTags)

    const wrapper = mount(ItemsView, {
      global: {
        plugins: [pinia]
      }
    })

    // Wait for useSiteData to complete loading
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    // Verify services were called
    expect(itemService.getAll).toHaveBeenCalledTimes(1)
    expect(deliveryService.getAll).toHaveBeenCalledTimes(1)
    expect(tagService.getAll).toHaveBeenCalledTimes(1)

    // Verify data is loaded into component
    expect(wrapper.vm.items).toEqual(mockItems)
    expect(wrapper.vm.deliveries).toEqual(mockDeliveries)
  })

  it('should automatically reload data when site changes', async () => {
    const { itemService, deliveryService, tagService } = await import('../../services/pocketbase')
    
    const site1Items = [{ id: 'item-1', name: 'Site 1 Item', unit: 'pcs', tags: [] }]
    const site2Items = [{ id: 'item-2', name: 'Site 2 Item', unit: 'kg', tags: [] }]

    vi.mocked(itemService.getAll)
      .mockResolvedValueOnce(site1Items)
      .mockResolvedValueOnce(site2Items)
    vi.mocked(deliveryService.getAll).mockResolvedValue([])
    vi.mocked(tagService.getAll).mockResolvedValue([])

    const wrapper = mount(ItemsView, {
      global: {
        plugins: [pinia]
      }
    })

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    expect(wrapper.vm.items).toEqual(site1Items)
    expect(itemService.getAll).toHaveBeenCalledTimes(1)

    // Update the getCurrentSiteId mock to return the new site ID
    getCurrentSiteIdMock.mockReturnValue('site-2')
    
    // Use the store's selectSite method to properly trigger the watcher
    const mockSite2 = { id: 'site-2', name: 'Site 2' } as any
    await siteStore.selectSite(mockSite2, 'owner')

    // Wait for site change to trigger reload
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    expect(itemService.getAll).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.items).toEqual(site2Items)
  })

  it('should clear data when site becomes null', async () => {
    const { itemService, deliveryService, tagService } = await import('../../services/pocketbase')
    
    vi.mocked(itemService.getAll).mockResolvedValue(mockItems)
    vi.mocked(deliveryService.getAll).mockResolvedValue(mockDeliveries)
    vi.mocked(tagService.getAll).mockResolvedValue(mockTags)

    const wrapper = mount(ItemsView, {
      global: {
        plugins: [pinia]
      }
    })

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    expect(wrapper.vm.items).toEqual(mockItems)

    // Mock getCurrentSiteId to return null for clearing site
    getCurrentSiteIdMock.mockReturnValue(null)
    
    // Clear site using the store method
    await siteStore.clearCurrentSite()

    // Wait for site change
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    expect(wrapper.vm.items).toEqual([])
  })

  it('should not reload for same site ID', async () => {
    const { itemService, deliveryService, tagService } = await import('../../services/pocketbase')
    
    vi.mocked(itemService.getAll).mockResolvedValue(mockItems)
    vi.mocked(deliveryService.getAll).mockResolvedValue(mockDeliveries)
    vi.mocked(tagService.getAll).mockResolvedValue(mockTags)

    const wrapper = mount(ItemsView, {
      global: {
        plugins: [pinia]
      }
    })

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    expect(itemService.getAll).toHaveBeenCalledTimes(1)

    // Try to set same site ID again using store method
    const mockSite1 = { id: 'site-1', name: 'Site 1' } as any
    await siteStore.selectSite(mockSite1, 'owner')

    // Wait
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    // Should not reload for same site
    expect(itemService.getAll).toHaveBeenCalledTimes(1)
  })

  it('should use reload function after item operations', async () => {
    const { itemService, deliveryService, tagService } = await import('../../services/pocketbase')
    
    const initialItems = [{ id: 'item-1', name: 'Initial Item', unit: 'pcs', tags: [] }]
    const updatedItems = [
      { id: 'item-1', name: 'Initial Item', unit: 'pcs', tags: [] },
      { id: 'item-2', name: 'New Item', unit: 'kg', tags: [] }
    ]

    vi.mocked(itemService.getAll)
      .mockResolvedValueOnce(initialItems)
      .mockResolvedValueOnce(updatedItems)
    vi.mocked(itemService.create).mockResolvedValue({ id: 'item-2', name: 'New Item', unit: 'kg', tags: [] })
    vi.mocked(deliveryService.getAll).mockResolvedValue([])
    vi.mocked(tagService.getAll).mockResolvedValue([])

    const wrapper = mount(ItemsView, {
      global: {
        plugins: [pinia]
      }
    })

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    expect(wrapper.vm.items).toEqual(initialItems)

    // Create new item
    wrapper.vm.form.name = 'New Item'
    wrapper.vm.form.unit = 'kg'
    
    await wrapper.vm.saveItem()
    await nextTick()

    expect(itemService.create).toHaveBeenCalled()
    expect(itemService.getAll).toHaveBeenCalledTimes(2) // Initial + reload
    expect(wrapper.vm.items).toEqual(updatedItems)
  })

  it('should handle loading states correctly', async () => {
    const { itemService, deliveryService, tagService } = await import('../../services/pocketbase')
    
    // Create promises we can control
    let resolveItems: (value: any) => void
    const itemsPromise = new Promise(resolve => { resolveItems = resolve })
    
    vi.mocked(itemService.getAll).mockReturnValue(itemsPromise)
    vi.mocked(deliveryService.getAll).mockResolvedValue([])
    vi.mocked(tagService.getAll).mockResolvedValue([])

    const wrapper = mount(ItemsView, {
      global: {
        plugins: [pinia]
      }
    })

    // Initially should be loading
    await nextTick()
    expect(wrapper.vm.itemsLoading).toBe(true)

    // Resolve the items promise
    resolveItems(mockItems)
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    // Should no longer be loading
    expect(wrapper.vm.itemsLoading).toBe(false)
    expect(wrapper.vm.items).toEqual(mockItems)
  })

  it('should handle delivery quantity calculations correctly', async () => {
    const { itemService, deliveryService, tagService } = await import('../../services/pocketbase')
    
    const items = [
      { id: 'item-1', name: 'Test Item', unit: 'pcs', tags: [] }
    ]
    
    const deliveries = [
      {
        id: 'delivery-1',
        expand: {
          delivery_items: [
            { item: 'item-1', quantity: 10, total_amount: 1000 },
            { item: 'item-1', quantity: 5, total_amount: 500 }
          ]
        }
      }
    ]
    
    vi.mocked(itemService.getAll).mockResolvedValue(items)
    vi.mocked(deliveryService.getAll).mockResolvedValue(deliveries)
    vi.mocked(tagService.getAll).mockResolvedValue([])

    const wrapper = mount(ItemsView, {
      global: {
        plugins: [pinia]
      }
    })

    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    // Test delivery quantity calculation
    const totalQuantity = wrapper.vm.getItemDeliveredQuantity('item-1')
    expect(totalQuantity).toBe(15) // 10 + 5

    // Test average price calculation
    const avgPrice = wrapper.vm.getItemAveragePrice('item-1')
    expect(avgPrice).toBe(100) // (1000 + 500) / (10 + 5)
  })
})