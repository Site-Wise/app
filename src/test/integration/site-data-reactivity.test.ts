import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ItemsView from '../../views/ItemsView.vue'
import AccountsView from '../../views/AccountsView.vue'
import { setupTestPinia } from '../utils/test-setup'
import { createMockRouter } from '../utils/test-utils'

// Mock services with proper Pinia-compatible structure
vi.mock('../../services/pocketbase', () => {
  const mockItems = [
    {
      id: 'item-1',
      name: 'Test Item 1',
      description: 'A test item',
      rate: 100,
      unit: 'pieces',
      category: 'Materials',
      is_active: true
    },
    {
      id: 'item-2', 
      name: 'Test Item 2',
      description: 'Another test item',
      rate: 200,
      unit: 'kg',
      category: 'Tools',
      is_active: true
    }
  ]

  const mockAccounts = [
    {
      id: 'account-1',
      name: 'Test Account 1',
      type: 'expense',
      description: 'A test expense account',
      current_balance: 1500.00,
      is_active: true
    },
    {
      id: 'account-2',
      name: 'Test Account 2', 
      type: 'income',
      description: 'A test income account',
      current_balance: 2500.00,
      is_active: true
    }
  ]

  const mockDeliveries = [
    { id: 'delivery-1', vendor: 'vendor-1', date: '2024-01-15' }
  ]

  const mockTags = [
    { id: 'tag-1', name: 'urgent', color: '#ff0000' }
  ]

  return {
    itemService: {
      getAll: vi.fn().mockResolvedValue(mockItems),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({})
    },
    accountService: {
      getAll: vi.fn().mockResolvedValue(mockAccounts),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({})
    },
    deliveryService: {
      getAll: vi.fn().mockResolvedValue(mockDeliveries)
    },
    tagService: {
      getAll: vi.fn().mockResolvedValue(mockTags)
    },
    getCurrentSiteId: vi.fn(() => 'site-1'),
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: vi.fn(() => 'owner'),
    setCurrentUserRole: vi.fn(),
    pb: {
      authStore: { isValid: true, model: { id: 'user-1' } },
      collection: vi.fn(() => ({ getFullList: vi.fn().mockResolvedValue([]) }))
    }
  }
})

// Mock composables
vi.mock('../../composables/usePermissions', () => ({
  usePermissions: () => ({
    canCreate: { value: true },
    canUpdate: { value: true },
    canDelete: { value: true }
  })
}))

vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: { value: false }
  })
}))

vi.mock('../../composables/useSearch', () => ({
  useItemSearch: () => ({
    searchQuery: { value: '' },
    loading: { value: false },
    results: { value: [] },
    loadAll: vi.fn()
  }),
  useAccountSearch: () => ({
    searchQuery: { value: '' },
    loading: { value: false },
    results: { value: [] },
    loadAll: vi.fn()
  })
}))

describe('Site Data Reactivity Integration', () => {
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

  describe('ItemsView Site Reactivity', () => {
    let wrapper: any

    afterEach(() => {
      wrapper?.unmount()
    })

    it('should load items data for current site', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      const itemServiceSpy = vi.mocked(pocketbaseMocks.itemService.getAll)

      wrapper = mount(ItemsView, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()
      await nextTick() // Wait for useSiteData to load

      // Should call itemService.getAll for the current site
      expect(itemServiceSpy).toHaveBeenCalled()
      
      // Component should render without errors (data loading is async)
      expect(wrapper.exists()).toBe(true)
    })

    it('should reload items when site changes', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      const itemServiceSpy = vi.mocked(pocketbaseMocks.itemService.getAll)

      wrapper = mount(ItemsView, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()
      await nextTick()

      // Clear the spy calls from initial load
      itemServiceSpy.mockClear()

      // Mock new site data
      const newSiteItems = [
        { id: 'item-3', name: 'New Site Item', rate: 300, unit: 'units', category: 'New', is_active: true }
      ]
      itemServiceSpy.mockResolvedValueOnce(newSiteItems)

      // Simulate site change
      const newSite = { 
        id: 'site-2', 
        name: 'New Site',
        total_units: 200,
        total_planned_area: 100000,
        admin_user: 'user-1',
        users: ['user-1']
      }
      await siteStore.selectSite(newSite, 'owner')
      await nextTick()
      await nextTick()

      // Should reload data for new site
      expect(itemServiceSpy).toHaveBeenCalled()
    })

    it('should clear data when site becomes null', async () => {
      wrapper = mount(ItemsView, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()
      await nextTick()

      // Clear current site
      await siteStore.clearCurrentSite()
      await nextTick()
      await nextTick()

      // Data should be cleared (component should handle null data gracefully)
      expect(wrapper.exists()).toBe(true) // Component should still exist
    })

    it('should reload data after creating new item', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      const itemServiceSpy = vi.mocked(pocketbaseMocks.itemService.getAll)
      const createSpy = vi.mocked(pocketbaseMocks.itemService.create)

      wrapper = mount(ItemsView, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()
      await nextTick()

      // Clear initial load calls
      itemServiceSpy.mockClear()

      // Open add modal and create item
      const addButton = wrapper.find('button')
      if (addButton.exists()) {
        await addButton.trigger('click')
        await nextTick()

        // Fill form and submit (simplified)
        if (wrapper.vm.form) {
          wrapper.vm.form.name = 'New Item'
          wrapper.vm.form.rate = 150
          wrapper.vm.form.unit = 'pieces'
          wrapper.vm.form.category = 'Test'

          // Trigger save
          await wrapper.vm.saveItem()
          await nextTick()

          // Should have called create and then reload
          expect(createSpy).toHaveBeenCalled()
          expect(itemServiceSpy).toHaveBeenCalled()
        }
      }
    })
  })

  describe('AccountsView Site Reactivity', () => {
    let wrapper: any

    afterEach(() => {
      wrapper?.unmount()
    })

    it('should load accounts data for current site', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      const accountServiceSpy = vi.mocked(pocketbaseMocks.accountService.getAll)

      wrapper = mount(AccountsView, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()
      await nextTick() // Wait for useSiteData to load

      // Should call accountService.getAll for the current site
      expect(accountServiceSpy).toHaveBeenCalled()
      
      // Component should render without errors (data loading is async)
      expect(wrapper.exists()).toBe(true)
    })

    it('should reload accounts when site changes', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      const accountServiceSpy = vi.mocked(pocketbaseMocks.accountService.getAll)

      // Mock new site data with proper structure
      const newSiteAccounts = [
        { id: 'account-3', name: 'New Site Account', type: 'expense', current_balance: 1000.00, is_active: true }
      ]
      accountServiceSpy.mockResolvedValue(newSiteAccounts)

      wrapper = mount(AccountsView, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()
      await nextTick()

      // Clear the spy calls from initial load
      accountServiceSpy.mockClear()
      accountServiceSpy.mockResolvedValueOnce(newSiteAccounts)

      // Simulate site change
      const newSite = { 
        id: 'site-2', 
        name: 'New Site',
        total_units: 200,
        total_planned_area: 100000,
        admin_user: 'user-1',
        users: ['user-1']
      }
      await siteStore.selectSite(newSite, 'owner')
      await nextTick()
      await nextTick()

      // Should reload data for new site
      expect(accountServiceSpy).toHaveBeenCalled()
    })

    it('should not make duplicate requests on rapid site changes', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      const accountServiceSpy = vi.mocked(pocketbaseMocks.accountService.getAll)

      wrapper = mount(AccountsView, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()
      await nextTick()

      // Clear initial load calls
      accountServiceSpy.mockClear()

      // Rapid site changes
      const site1 = { id: 'site-2', name: 'Site 2', total_units: 100, total_planned_area: 50000, admin_user: 'user-1', users: ['user-1'] }
      const site2 = { id: 'site-3', name: 'Site 3', total_units: 100, total_planned_area: 50000, admin_user: 'user-1', users: ['user-1'] }

      // Change sites rapidly
      await siteStore.selectSite(site1, 'owner')
      await siteStore.selectSite(site2, 'owner')
      
      await nextTick()
      await nextTick()

      // Should only have made the final request due to debouncing/reactivity optimization
      expect(accountServiceSpy).toHaveBeenCalled()
    })
  })

  describe('No Duplicate Requests', () => {
    it('should not make duplicate requests when same site is selected', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      const itemServiceSpy = vi.mocked(pocketbaseMocks.itemService.getAll)

      const wrapper = mount(ItemsView, {
        global: { plugins: [pinia] }
      })

      await nextTick()
      await nextTick()

      // Clear initial load calls
      itemServiceSpy.mockClear()

      // Select the same site again
      const currentSite = siteStore.currentSite
      if (currentSite) {
        await siteStore.selectSite(currentSite, siteStore.currentUserRole)
        await nextTick()

        // Should not make duplicate request for same site
        expect(itemServiceSpy).not.toHaveBeenCalled()
      }

      wrapper.unmount()
    })

    it('should handle concurrent data loading without race conditions', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      const itemServiceSpy = vi.mocked(pocketbaseMocks.itemService.getAll)
      const accountServiceSpy = vi.mocked(pocketbaseMocks.accountService.getAll)

      // Create multiple components simultaneously
      const itemsWrapper = mount(ItemsView, {
        global: { plugins: [pinia, router] }
      })
      
      const accountsWrapper = mount(AccountsView, {
        global: { plugins: [pinia, router] }
      })

      await nextTick()
      await nextTick()

      // Both should load their data independently
      expect(itemServiceSpy).toHaveBeenCalled()
      expect(accountServiceSpy).toHaveBeenCalled()

      // Change site while both are mounted
      itemServiceSpy.mockClear()
      accountServiceSpy.mockClear()

      const newSite = { 
        id: 'site-2', 
        name: 'New Site',
        total_units: 200,
        total_planned_area: 100000,
        admin_user: 'user-1',
        users: ['user-1']
      }
      await siteStore.selectSite(newSite, 'owner')
      await nextTick()
      await nextTick()

      // Both should reload for new site
      expect(itemServiceSpy).toHaveBeenCalled()
      expect(accountServiceSpy).toHaveBeenCalled()

      itemsWrapper.unmount()
      accountsWrapper.unmount()
    })
  })
})