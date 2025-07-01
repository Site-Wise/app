import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ItemsView from '../../views/ItemsView.vue'
import AccountsView from '../../views/AccountsView.vue'

// Mock useSiteData to return controlled data
vi.mock('../../composables/useSiteData', () => ({
  useSiteData: vi.fn()
}))

// Mock useSite composable
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    currentSiteId: { value: 'site-1' },
    isInitialized: { value: true }
  })
}))

// Mock site store
vi.mock('../../stores/site', () => ({
  useSiteStore: () => ({
    currentSiteId: 'site-1',
    isInitialized: true,
    $patch: vi.fn()
  })
}))

// Mock the services
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
  accountService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  pb: {
    authStore: {
      isValid: true,
      model: { id: 'user-1' }
    }
  },
  getCurrentSiteId: vi.fn().mockReturnValue('site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn().mockReturnValue('owner'),
  setCurrentUserRole: vi.fn()
}))

// Mock other composables
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

vi.mock('../../composables/useSearch', () => ({
  useAccountSearch: () => ({
    searchQuery: { value: '' },
    loading: { value: false },
    results: { value: [] },
    loadAll: vi.fn()
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

describe('Site Data Reactivity Integration', () => {
  let pinia: any
  let siteStore: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Create fresh Pinia instance
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Import store after Pinia is set up using the mocked version
    const { useSiteStore } = await import('../../stores/site')
    siteStore = useSiteStore()
    
    // Set initial site (these should work with the mocked store)
    siteStore.currentSiteId = 'site-1'
    siteStore.isInitialized = true
    
    // Set up useSiteData mock
    const { useSiteData } = await import('../../composables/useSiteData')
    
    vi.mocked(useSiteData).mockImplementation(() => {
      const { ref } = require('vue')
      return {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        reload: vi.fn()
      }
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('ItemsView Site Reactivity', () => {
    it('should load items data for current site', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Item 1', unit: 'pcs', site: 'site-1' }
      ]
      const mockDeliveries = []
      const mockTags = []

      const { itemService, deliveryService, tagService } = await import('../../services/pocketbase')
      vi.mocked(itemService.getAll).mockResolvedValue(mockItems)
      vi.mocked(deliveryService.getAll).mockResolvedValue(mockDeliveries)
      vi.mocked(tagService.getAll).mockResolvedValue(mockTags)

      const wrapper = mount(ItemsView, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for useSiteData to load
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(mockItemService.getAll).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.items).toEqual(mockItems)
    })

    it('should reload items when site changes', async () => {
      const site1Items = [
        { id: 'item-1', name: 'Site 1 Item', unit: 'pcs', site: 'site-1' }
      ]
      const site2Items = [
        { id: 'item-2', name: 'Site 2 Item', unit: 'kg', site: 'site-2' }
      ]

      mockItemService.getAll
        .mockResolvedValueOnce(site1Items)
        .mockResolvedValueOnce(site2Items)
      mockDeliveryService.getAll.mockResolvedValue([])
      mockTagService.getAll.mockResolvedValue([])

      const wrapper = mount(ItemsView, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(wrapper.vm.items).toEqual(site1Items)
      expect(mockItemService.getAll).toHaveBeenCalledTimes(1)

      // Change site
      siteStore.currentSiteId = 'site-2'
      
      // Wait for site change to trigger reload
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(mockItemService.getAll).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.items).toEqual(site2Items)
    })

    it('should clear data when site becomes null', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Item 1', unit: 'pcs', site: 'site-1' }
      ]

      mockItemService.getAll.mockResolvedValue(mockItems)
      mockDeliveryService.getAll.mockResolvedValue([])
      mockTagService.getAll.mockResolvedValue([])

      const wrapper = mount(ItemsView, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(wrapper.vm.items).toEqual(mockItems)

      // Clear site
      siteStore.currentSiteId = null
      
      // Wait for site change
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(wrapper.vm.items).toEqual([])
    })

    it('should reload data after creating new item', async () => {
      const initialItems = [
        { id: 'item-1', name: 'Item 1', unit: 'pcs' }
      ]
      const updatedItems = [
        { id: 'item-1', name: 'Item 1', unit: 'pcs' },
        { id: 'item-2', name: 'New Item', unit: 'kg' }
      ]

      mockItemService.getAll
        .mockResolvedValueOnce(initialItems)
        .mockResolvedValueOnce(updatedItems)
      mockItemService.create.mockResolvedValue({ id: 'item-2', name: 'New Item', unit: 'kg' })
      mockDeliveryService.getAll.mockResolvedValue([])
      mockTagService.getAll.mockResolvedValue([])

      const wrapper = mount(ItemsView, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(wrapper.vm.items).toEqual(initialItems)

      // Simulate creating a new item
      wrapper.vm.form.name = 'New Item'
      wrapper.vm.form.unit = 'kg'
      
      await wrapper.vm.saveItem()
      await nextTick()

      expect(mockItemService.create).toHaveBeenCalled()
      expect(mockItemService.getAll).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.items).toEqual(updatedItems)
    })
  })

  describe('AccountsView Site Reactivity', () => {
    it('should load accounts data for current site', async () => {
      const mockAccounts = [
        { id: 'acc-1', name: 'Account 1', type: 'bank', site: 'site-1' }
      ]

      mockAccountService.getAll.mockResolvedValue(mockAccounts)

      const wrapper = mount(AccountsView, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for useSiteData to load
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(mockAccountService.getAll).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.accounts).toEqual(mockAccounts)
    })

    it('should reload accounts when site changes', async () => {
      const site1Accounts = [
        { id: 'acc-1', name: 'Site 1 Account', type: 'bank', site: 'site-1' }
      ]
      const site2Accounts = [
        { id: 'acc-2', name: 'Site 2 Account', type: 'cash', site: 'site-2' }
      ]

      mockAccountService.getAll
        .mockResolvedValueOnce(site1Accounts)
        .mockResolvedValueOnce(site2Accounts)

      const wrapper = mount(AccountsView, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(wrapper.vm.accounts).toEqual(site1Accounts)

      // Change site
      siteStore.currentSiteId = 'site-2'
      
      // Wait for site change to trigger reload
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(mockAccountService.getAll).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.accounts).toEqual(site2Accounts)
    })

    it('should not make duplicate requests on rapid site changes', async () => {
      const mockAccounts = [
        { id: 'acc-1', name: 'Account 1', type: 'bank' }
      ]

      mockAccountService.getAll.mockResolvedValue(mockAccounts)

      const wrapper = mount(AccountsView, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(mockAccountService.getAll).toHaveBeenCalledTimes(1)

      // Rapidly change sites multiple times
      siteStore.currentSiteId = 'site-2'
      siteStore.currentSiteId = 'site-3'
      siteStore.currentSiteId = 'site-4'
      
      // Wait for all changes to settle
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      // Should only call once more for the final site
      expect(mockAccountService.getAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('No Duplicate Requests', () => {
    it('should not make duplicate requests when same site is selected', async () => {
      mockItemService.getAll.mockResolvedValue([])
      mockDeliveryService.getAll.mockResolvedValue([])
      mockTagService.getAll.mockResolvedValue([])

      const wrapper = mount(ItemsView, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(mockItemService.getAll).toHaveBeenCalledTimes(1)

      // Set same site again
      siteStore.currentSiteId = 'site-1'
      
      // Wait
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Should not call again for same site
      expect(mockItemService.getAll).toHaveBeenCalledTimes(1)
    })

    it('should handle concurrent data loading without race conditions', async () => {
      let resolveFirst: (value: any) => void
      let resolveSecond: (value: any) => void
      
      const firstPromise = new Promise(resolve => { resolveFirst = resolve })
      const secondPromise = new Promise(resolve => { resolveSecond = resolve })
      
      mockItemService.getAll
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise)
      mockDeliveryService.getAll.mockResolvedValue([])
      mockTagService.getAll.mockResolvedValue([])

      const wrapper = mount(ItemsView, {
        global: {
          plugins: [pinia]
        }
      })

      // Change site quickly before first request completes
      siteStore.currentSiteId = 'site-2'
      
      // Resolve second request first
      resolveSecond([{ id: 'item-2', name: 'Site 2 Item' }])
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Then resolve first request
      resolveFirst([{ id: 'item-1', name: 'Site 1 Item' }])
      await new Promise(resolve => setTimeout(resolve, 10))
      await nextTick()

      // Should have data from the latest site
      expect(wrapper.vm.items).toEqual([{ id: 'item-2', name: 'Site 2 Item' }])
    })
  })
})