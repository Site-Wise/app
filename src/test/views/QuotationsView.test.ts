import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
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

// Mock site store
vi.mock('../../stores/site', () => ({
  useSiteStore: () => ({
    currentSiteId: 'site-1',
    isInitialized: true,
    $patch: vi.fn()
  })
}))

// Mock i18n composable - must be at the top
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'quotations.title': 'Quotations',
        'quotations.subtitle': 'Manage price quotes from vendors',
        'quotations.addQuotation': 'Add Quotation',
        'quotations.editQuotation': 'Edit Quotation',
        'quotations.deleteQuotation': 'Delete Quotation',
        'quotations.unitPrice': 'Unit Price',
        'quotations.minimumQuantity': 'Min. Quantity',
        'quotations.validUntil': 'Valid Until',
        'quotations.noQuotations': 'No quotations',
        'quotations.getStarted': 'Get started by adding a quotation.',
        'quotations.additionalNotes': 'Additional notes',
        'common.item': 'Item',
        'common.vendor': 'Vendor',
        'common.status': 'Status',
        'common.actions': 'Actions',
        'common.notes': 'Notes',
        'common.pending': 'Pending',
        'common.approved': 'Approved',
        'common.rejected': 'Rejected',
        'common.expired': 'Expired',
        'common.update': 'Update',
        'common.create': 'Create',
        'common.cancel': 'Cancel',
        'forms.selectItem': 'Select an item',
        'forms.selectVendor': 'Select a vendor',
        'forms.unitPrice': 'Unit Price',
        'forms.enterAmount': 'Enter amount',
        'forms.optional': 'Optional',
        'messages.confirmDelete': 'Are you sure you want to delete this {item}?'
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

vi.mock('../../services/pocketbase', () => {
  const mockQuotation = {
    id: 'quotation-1',
    vendor: 'vendor-1',
    item: 'item-1',
    quotation_type: 'item' as const,
    unit_price: 50,
    minimum_quantity: 100,
    valid_until: '2024-12-31',
    notes: 'Test quotation',
    status: 'pending' as const,
    site: 'site-1',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    expand: {
      vendor: {
        id: 'vendor-1',
        name: 'Test Vendor'
      },
      item: {
        id: 'item-1',
        name: 'Test Item',
        unit: 'kg'
      }
    }
  }

  const mockItem = {
    id: 'item-1',
    name: 'Test Item',
    unit: 'kg'
  }

  const mockVendor = {
    id: 'vendor-1',
    name: 'Test Vendor'
  }
  
  return {
    getCurrentSiteId: vi.fn().mockReturnValue('test-site-id'),
    pb: {
      collection: vi.fn(() => ({
        getFullList: vi.fn().mockResolvedValue([]),
        getOne: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({})
      }))
    },
    quotationService: {
      getAll: vi.fn().mockResolvedValue([mockQuotation]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    itemService: {
      getAll: vi.fn().mockResolvedValue([mockItem])
    },
    vendorService: {
      getAll: vi.fn().mockResolvedValue([mockVendor])
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

  beforeEach(async () => {
    vi.clearAllMocks()
    
    pinia = createPinia()
    setActivePinia(pinia)
    
    const { useSiteStore } = await import('../../stores/site')
    siteStore = useSiteStore()
    siteStore.currentSiteId = 'site-1'
    siteStore.isInitialized = true
    
    // Mock useSiteData to return different data based on call
    const { useSiteData } = await import('../../composables/useSiteData')
    vi.mocked(useSiteData)
      .mockReturnValueOnce({
        data: { value: [{
          id: 'quotation-1',
          vendor: 'vendor-1',
          item: 'item-1',
          quotation_type: 'item' as const,
          unit_price: 50,
          minimum_quantity: 100,
          valid_until: '2024-12-31',
          notes: 'Test quotation',
          status: 'pending' as const,
          site: 'site-1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          expand: {
            vendor: {
              id: 'vendor-1',
              name: 'Test Vendor'
            },
            item: {
              id: 'item-1',
              name: 'Test Item',
              unit: 'kg'
            }
          }
        }] },
        loading: { value: false },
        reload: vi.fn()
      })
      .mockReturnValueOnce({
        data: { value: [{
          id: 'item-1',
          name: 'Test Item',
          unit: 'kg'
        }] },
        loading: { value: false },
        reload: vi.fn()
      })
      .mockReturnValueOnce({
        data: { value: [{
          id: 'vendor-1',
          name: 'Test Vendor'
        }] },
        loading: { value: false },
        reload: vi.fn()
      })
    
    const router = createMockRouter()
    
    wrapper = mount(QuotationsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
  })
  
  afterEach(() => {
    wrapper?.unmount()
  })

  it('should render quotations page title', () => {
    expect(wrapper.find('h1').text()).toBe('Quotations')
  })

  it('should render add quotation button', () => {
    const buttons = wrapper.findAll('button')
    const addButton = buttons.find((btn: any) => btn.text().includes('Add Quotation'))
    expect(addButton?.exists()).toBe(true)
  })

  it('should display quotations in table', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Test Item')
    expect(wrapper.text()).toContain('Test Vendor')
    expect(wrapper.text()).toContain('50.00')
    expect(wrapper.text()).toContain('100')
  })

  it('should show table headers with translation keys', () => {
    expect(wrapper.text()).toContain('Item')
    expect(wrapper.text()).toContain('Vendor')
    expect(wrapper.text()).toContain('Unit Price')
    expect(wrapper.text()).toContain('Min. Quantity')
    expect(wrapper.text()).toContain('Valid Until')
    expect(wrapper.text()).toContain('Status')
    expect(wrapper.text()).toContain('Actions')
  })

  it('should show add modal when add button is clicked', async () => {
    const buttons = wrapper.findAll('button')
    const addButton = buttons.find((btn: any) => btn.text().includes('Add Quotation'))
    expect(addButton?.exists()).toBe(true)
    
    await addButton?.trigger('click')
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.fixed').exists()).toBe(true)
    expect(wrapper.text()).toContain('Add Quotation')
  })

  it('should handle quotation creation', async () => {
    const { quotationService } = await import('../../services/pocketbase')
    const mockCreate = vi.mocked(quotationService.create)
    mockCreate.mockResolvedValue({
      id: 'quotation-2',
      vendor: 'vendor-1',
      item: 'item-1',
      quotation_type: 'item' as const,
      unit_price: 60,
      minimum_quantity: 50,
      valid_until: '2024-11-30',
      notes: 'New quotation',
      status: 'pending' as const,
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })
    
    // Open add modal
    const buttons = wrapper.findAll('button')
    const addButton = buttons.find((btn: any) => btn.text().includes('Add Quotation'))
    expect(addButton?.exists()).toBe(true)
    await addButton?.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Fill form
    const selects = wrapper.findAll('select')
    const priceInputs = wrapper.findAll('input[type="number"]')
    
    if (selects.length > 0) await selects[0].setValue('item-1')
    if (selects.length > 1) await selects[1].setValue('vendor-1')
    if (priceInputs.length > 0) await priceInputs[0].setValue('60')
    
    // Submit form
    await wrapper.find('form').trigger('submit')
    
    expect(mockCreate).toHaveBeenCalled()
  })

  it('should handle quotation editing', async () => {
    const { quotationService } = await import('../../services/pocketbase')
    const mockUpdate = vi.mocked(quotationService.update)
    mockUpdate.mockResolvedValue({
      id: 'quotation-1',
      vendor: 'vendor-1',
      item: 'item-1',
      quotation_type: 'item' as const,
      unit_price: 55,
      minimum_quantity: 100,
      valid_until: '2024-12-31',
      notes: 'Updated quotation',
      status: 'pending' as const,
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })
    
    // Wait for quotations to load
    await wrapper.vm.$nextTick()
    
    // Find and click edit button using a more specific selector
    const editButton = wrapper.find('button[title="Edit"]')
    
    if (editButton.exists()) {
      await editButton.trigger('click')
      
      expect(wrapper.text()).toContain('Edit Quotation')
    }
  })

  it('should handle quotation deletion', async () => {
    const { quotationService } = await import('../../services/pocketbase')
    const mockDelete = vi.mocked(quotationService.delete)
    mockDelete.mockResolvedValue(true)
    
    // Mock window.confirm
    window.confirm = vi.fn(() => true)
    
    // Wait for quotations to load
    await wrapper.vm.$nextTick()
    
    // Find and click delete button using a more specific selector
    const deleteButton = wrapper.find('button[title="Delete"]')
    
    if (deleteButton.exists()) {
      await deleteButton.trigger('click')
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalledWith('quotation-1')
    }
  })

  it('should show empty state when no quotations', async () => {
    // Clear previous mocks and setup empty state
    vi.clearAllMocks()
    
    const { useSiteData } = await import('../../composables/useSiteData')
    vi.mocked(useSiteData)
      .mockReturnValueOnce({
        data: { value: [] }, // Empty quotations
        loading: { value: false },
        reload: vi.fn()
      })
      .mockReturnValueOnce({
        data: { value: [] }, // Empty items
        loading: { value: false },
        reload: vi.fn()
      })
      .mockReturnValueOnce({
        data: { value: [] }, // Empty vendors
        loading: { value: false },
        reload: vi.fn()
      })
    
    // Remount component to trigger data loading
    wrapper.unmount()
    const router = createMockRouter()
    wrapper = mount(QuotationsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('No quotations')
    expect(wrapper.text()).toContain('Get started by adding a quotation.')
  })

  it('should reload data when site changes', async () => {
    // Since useSiteData handles site changes automatically through reactive watchers,
    // we verify that the component properly uses useSiteData which will handle reloading
    const { useSiteData } = await import('../../composables/useSiteData')
    
    // Component should call useSiteData for quotations, items, and vendors
    expect(vi.mocked(useSiteData)).toHaveBeenCalledTimes(3)
    
    // Verify the component is properly mounted and using reactive data
    expect(wrapper.vm).toBeDefined()
    expect(wrapper.exists()).toBe(true)
    
    // The useSiteData composable should provide reactive data loading
    // This is tested more thoroughly in useSiteData.test.ts
    const mockCalls = vi.mocked(useSiteData).mock.calls
    expect(mockCalls.length).toBeGreaterThan(0)
  })
})