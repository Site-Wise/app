import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../utils/test-setup'

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

// Mock search composable
vi.mock('../../composables/useSearch', () => ({
  useQuotationSearch: () => {
    const { ref } = require('vue')
    return {
      searchQuery: ref(''),
      loading: ref(false),
      results: ref([]),
      loadAll: vi.fn()
    }
  }
}))

// Mock i18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'quotations.title': 'Quotations',
        'quotations.subtitle': 'Manage price quotations from vendors',
        'quotations.addQuotation': 'Add Quotation',
        'quotations.editQuotation': 'Edit Quotation',
        'quotations.unitPrice': 'Unit Price',
        'quotations.minimumQuantity': 'Minimum Quantity',
        'quotations.validUntil': 'Valid Until',
        'quotations.noQuotations': 'No quotations',
        'quotations.getStarted': 'Get started by creating a new quotation.',
        'common.item': 'Item',
        'common.vendor': 'Vendor',
        'common.status': 'Status',
        'common.actions': 'Actions',
        'common.create': 'Create',
        'common.update': 'Update',
        'common.cancel': 'Cancel',
        'common.keyboardShortcut': 'Keyboard shortcut: {keys}',
        'search.quotations': 'Search quotations...',
        'forms.selectVendor': 'Select vendor',
        'forms.selectItem': 'Select item',
        'forms.enterUnitPrice': 'Enter unit price',
        'forms.enterMinimumQuantity': 'Enter minimum quantity',
        'forms.enterValidUntil': 'Enter valid until date',
        'forms.enterNotes': 'Enter notes',
        'messages.confirmDelete': 'Are you sure you want to delete this {item}?',
        'units.kg': 'kg',
        'units.pcs': 'pcs'
      }
      let result = translations[key] || key
      if (params) {
        Object.keys(params).forEach(param => {
          result = result.replace(`{${param}}`, params[param])
        })
      }
      return result
    }
  })
}))

// Mock permissions composable
vi.mock('../../composables/usePermissions', () => ({
  usePermissions: () => ({
    canCreate: { value: true },
    canUpdate: { value: true },
    canDelete: { value: true }
  })
}))

// Mock subscription composable
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: { value: false }
  })
}))

// Mock PocketBase services
vi.mock('../../services/pocketbase', () => {
  const mockQuotation = {
    id: 'quotation-1',
    vendor: 'vendor-1',
    item: 'item-1',
    unit_price: 50.00,
    minimum_quantity: 100,
    valid_until: '2024-12-31',
    notes: 'Bulk discount available',
    status: 'pending',
    site: 'site-1',
    expand: {
      vendor: { id: 'vendor-1', name: 'Test Vendor', contact_person: 'Test Vendor' },
      item: { id: 'item-1', name: 'Steel Rebar', unit: 'kg' }
    }
  }

  const mockItem = {
    id: 'item-1',
    name: 'Steel Rebar',
    unit: 'kg',
    site: 'site-1'
  }

  const mockVendor = {
    id: 'vendor-1',
    name: 'Test Vendor',
    site: 'site-1'
  }

  return {
    quotationService: {
      getAll: vi.fn().mockResolvedValue([mockQuotation]),
      create: vi.fn().mockResolvedValue({ id: 'new-quotation' }),
      update: vi.fn().mockResolvedValue(mockQuotation),
      delete: vi.fn().mockResolvedValue(true)
    },
    itemService: {
      getAll: vi.fn().mockResolvedValue([mockItem])
    },
    vendorService: {
      getAll: vi.fn().mockResolvedValue([mockVendor])
    },
    getCurrentSiteId: vi.fn().mockReturnValue('site-1'),
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: vi.fn().mockReturnValue('owner'),
    setCurrentUserRole: vi.fn(),
    calculatePermissions: vi.fn().mockReturnValue({
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canManageUsers: true,
      canManageRoles: true,
      canExport: true,
      canViewFinancials: true
    }),
    pb: {
      authStore: { isValid: true, model: { id: 'user-1' } },
      collection: vi.fn(() => ({ getFullList: vi.fn().mockResolvedValue([]) }))
    }
  }
})

// Import dependencies after all mocks
import QuotationsView from '../../views/QuotationsView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('QuotationsView', () => {
  let wrapper: any
  let pinia: any
  let siteStore: any

  const createWrapper = () => {
    const router = createMockRouter()
    
    return mount(QuotationsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { pinia: testPinia, siteStore: testSiteStore } = setupTestPinia()
    pinia = testPinia
    siteStore = testSiteStore
    
    // Mock data for useSiteData
    const mockQuotations = [{
      id: 'quotation-1',
      vendor: 'vendor-1',
      item: 'item-1',
      unit_price: 50.00,
      minimum_quantity: 100,
      valid_until: '2024-12-31',
      notes: 'Bulk discount available',
      status: 'pending',
      site: 'site-1',
      expand: {
        vendor: { id: 'vendor-1', name: 'Test Vendor', contact_person: 'Test Vendor' },
        item: { id: 'item-1', name: 'Steel Rebar', unit: 'kg' }
      }
    }]

    const mockItems = [{
      id: 'item-1',
      name: 'Steel Rebar',
      unit: 'kg',
      site: 'site-1'
    }]

    const mockVendors = [{
      id: 'vendor-1',
      name: 'Test Vendor',
      site: 'site-1'
    }]
    
    // Mock useSiteData to return different data based on the service function passed
    const { useSiteData } = await import('../../composables/useSiteData')
    const reloadQuotations = vi.fn()
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      const { ref } = require('vue')
      
      // Check the function to determine which data to return
      const funcString = serviceFunction.toString()
      
      if (funcString.includes('quotationService.getAll')) {
        return {
          data: ref(mockQuotations),
          loading: ref(false),
          error: ref(null),
          reload: reloadQuotations
        }
      } else if (funcString.includes('itemService.getAll')) {
        return {
          data: ref(mockItems),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('vendorService.getAll')) {
        return {
          data: ref(mockVendors),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      }
      
      // Default fallback
      return {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        reload: vi.fn()
      }
    })
    
    wrapper = createWrapper()
    
    // Store reload function for later tests
    ;(wrapper as any).reloadQuotations = reloadQuotations
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Basic Rendering', () => {
    it('should render page title and subtitle', () => {
      expect(wrapper.find('h1').text()).toBe('Quotations')
      expect(wrapper.text()).toContain('Manage price quotations from vendors')
    })

    it('should render add quotation button on desktop', () => {
      const buttons = wrapper.findAll('button')
      const addButton = buttons.find((btn: any) => btn.text().includes('Add Quotation'))
      expect(addButton).toBeDefined()
      expect(addButton.exists()).toBe(true)
    })

    it('should render search box on mobile', () => {
      const searchInput = wrapper.find('input[placeholder="Search quotations..."]')
      expect(searchInput.exists()).toBe(true)
    })

    it('should display table headers with correct translations', () => {
      expect(wrapper.text()).toContain('Item')
      expect(wrapper.text()).toContain('Vendor')
      expect(wrapper.text()).toContain('Unit Price')
      expect(wrapper.text()).toContain('Minimum Quantity')
      expect(wrapper.text()).toContain('Valid Until')
      expect(wrapper.text()).toContain('Status')
      expect(wrapper.text()).toContain('Actions')
    })
  })

  describe('Data Display', () => {
    it('should display quotations in table', async () => {
      // Wait for data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.text()).toContain('Steel Rebar')
      expect(wrapper.text()).toContain('Test Vendor')
      expect(wrapper.text()).toContain('₹50.00')
      expect(wrapper.text()).toContain('100')
      expect(wrapper.text()).toContain('pending')
    })

    it('should display unit information correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.text()).toContain('kg (kg)')
    })

    it('should format dates correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Check that date is formatted (should contain numbers and slashes)
      const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/
      expect(dateRegex.test(wrapper.text())).toBe(true)
    })
  })

  describe('Add Quotation Modal', () => {
    it('should open add modal when add button is clicked', async () => {
      const buttons = wrapper.findAll('button')
      const addButton = buttons.find((btn: any) => btn.text().includes('Add Quotation'))
      
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showAddModal).toBe(true)
      expect(wrapper.find('.fixed').exists()).toBe(true)
      expect(wrapper.text()).toContain('Add Quotation')
    })

    it('should close modal when cancel button is clicked', async () => {
      // Open modal
      wrapper.vm.showAddModal = true
      await wrapper.vm.$nextTick()
      
      // Find and click cancel button
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn: any) => btn.text().includes('Cancel'))
      await cancelButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showAddModal).toBe(false)
    })

    it('should reset form when modal is closed', async () => {
      // Set some form data
      wrapper.vm.form.vendor = 'vendor-1'
      wrapper.vm.form.item = 'item-1'
      wrapper.vm.form.unit_price = 100
      await wrapper.vm.$nextTick()
      
      // Close modal
      wrapper.vm.closeModal()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.vendor).toBe('')
      expect(wrapper.vm.form.item).toBe('')
      expect(wrapper.vm.form.unit_price).toBe(0)
    })
  })

  describe('Quotation Creation', () => {
    it('should create quotation with form data', async () => {
      const { quotationService } = await import('../../services/pocketbase')
      const mockCreate = vi.mocked(quotationService.create)
      
      // Open modal
      wrapper.vm.showAddModal = true
      await wrapper.vm.$nextTick()
      
      // Set form data
      wrapper.vm.form.vendor = 'vendor-1'
      wrapper.vm.form.item = 'item-1'
      wrapper.vm.form.unit_price = 75
      wrapper.vm.form.minimum_quantity = 50
      wrapper.vm.form.valid_until = '2024-12-31'
      wrapper.vm.form.notes = 'Test notes'
      wrapper.vm.form.status = 'pending'
      await wrapper.vm.$nextTick()
      
      // Save quotation
      await wrapper.vm.saveQuotation()
      
      expect(mockCreate).toHaveBeenCalledWith({
        vendor: 'vendor-1',
        item: 'item-1',
        unit_price: 75,
        minimum_quantity: 50,
        valid_until: '2024-12-31',
        notes: 'Test notes',
        status: 'pending'
      })
      
      // Verify reload was called
      expect((wrapper as any).reloadQuotations).toHaveBeenCalled()
    })

    it('should close modal after successful creation', async () => {
      // Set form data and save
      wrapper.vm.showAddModal = true
      wrapper.vm.form.vendor = 'vendor-1'
      wrapper.vm.form.item = 'item-1'
      wrapper.vm.form.unit_price = 75
      await wrapper.vm.$nextTick()
      
      await wrapper.vm.saveQuotation()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showAddModal).toBe(false)
    })
  })

  describe('Quotation Editing', () => {
    it('should populate form when editing quotation', async () => {
      const mockQuotation = {
        id: 'quotation-1',
        vendor: 'vendor-1',
        item: 'item-1',
        unit_price: 50,
        minimum_quantity: 100,
        valid_until: '2024-12-31',
        notes: 'Test notes',
        status: 'pending'
      }
      
      wrapper.vm.editQuotation(mockQuotation)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.editingQuotation).toEqual(mockQuotation)
      expect(wrapper.vm.form.vendor).toBe('vendor-1')
      expect(wrapper.vm.form.item).toBe('item-1')
      expect(wrapper.vm.form.unit_price).toBe(50)
      expect(wrapper.vm.form.minimum_quantity).toBe(100)
      expect(wrapper.vm.form.valid_until).toBe('2024-12-31')
      expect(wrapper.vm.form.notes).toBe('Test notes')
      expect(wrapper.vm.form.status).toBe('pending')
    })

    it('should update quotation with new data', async () => {
      const { quotationService } = await import('../../services/pocketbase')
      const mockUpdate = vi.mocked(quotationService.update)
      
      // Set editing mode
      wrapper.vm.editingQuotation = { id: 'quotation-1' }
      wrapper.vm.form.vendor = 'vendor-1'
      wrapper.vm.form.item = 'item-1'
      wrapper.vm.form.unit_price = 60
      wrapper.vm.form.status = 'approved'
      await wrapper.vm.$nextTick()
      
      await wrapper.vm.saveQuotation()
      
      expect(mockUpdate).toHaveBeenCalledWith('quotation-1', {
        vendor: 'vendor-1',
        item: 'item-1',
        unit_price: 60,
        status: 'approved'
      })
    })
  })

  describe('Quotation Deletion', () => {
    it('should delete quotation when confirmed', async () => {
      const { quotationService } = await import('../../services/pocketbase')
      const mockDelete = vi.mocked(quotationService.delete)
      
      // Mock window.confirm
      window.confirm = vi.fn(() => true)
      
      await wrapper.vm.deleteQuotation('quotation-1')
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalledWith('quotation-1')
      expect((wrapper as any).reloadQuotations).toHaveBeenCalled()
    })

    it('should not delete quotation when cancelled', async () => {
      const { quotationService } = await import('../../services/pocketbase')
      const mockDelete = vi.mocked(quotationService.delete)
      
      // Mock window.confirm to return false
      window.confirm = vi.fn(() => false)
      
      await wrapper.vm.deleteQuotation('quotation-1')
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no quotations', async () => {
      // Override useSiteData to return empty array
      const { useSiteData } = await import('../../composables/useSiteData')
      
      vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
        const { ref } = require('vue')
        const funcString = serviceFunction.toString()
        
        if (funcString.includes('quotationService.getAll')) {
          return {
            data: ref([]),
            loading: ref(false),
            error: ref(null),
            reload: vi.fn()
          }
        }
        
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      })
      
      // Create new wrapper with empty data
      const newWrapper = createWrapper()
      await newWrapper.vm.$nextTick()
      
      expect(newWrapper.text()).toContain('No quotations')
      expect(newWrapper.text()).toContain('Get started by creating a new quotation.')
      
      newWrapper.unmount()
    })
  })

  describe('Utility Functions', () => {
    it('should format unit display correctly', () => {
      const unitDisplay = wrapper.vm.getUnitDisplay('kg')
      expect(unitDisplay).toBe('kg (kg)')
    })

    it('should format dates correctly', () => {
      const formatted = wrapper.vm.formatDate('2024-12-31')
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should handle add quotation keyboard shortcut', async () => {
      await wrapper.vm.handleAddQuotation()
      expect(wrapper.vm.showAddModal).toBe(true)
    })
  })

  describe('Search Integration', () => {
    it('should use search results when searching', async () => {
      // Test the search logic directly on the component
      await wrapper.vm.$nextTick()
      
      // Initially should use all quotations when no search query
      expect(wrapper.vm.searchQuery).toBe('')
      expect(wrapper.vm.quotations).toEqual(wrapper.vm.allQuotations)
      
      // When search query is set, it should use search results  
      wrapper.vm.searchQuery = 'test query'
      await wrapper.vm.$nextTick()
      
      // The component logic uses search results when searchQuery is not empty
      // Since our mock returns empty search results, it should use those
      expect(wrapper.vm.quotations).toEqual(wrapper.vm.searchResults)
    })
  })
})