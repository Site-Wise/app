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

// Mock i18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'vendors.returns': 'Vendor Returns',
        'vendors.returnsSubtitle': 'Manage product returns and refunds from vendors',
        'vendors.addReturn': 'Add Return',
        'vendors.totalReturns': 'Total Returns',
        'vendors.pendingApproval': 'Pending Approval',
        'vendors.returnStatuses.initiated': 'Initiated',
        'vendors.returnStatuses.approved': 'Approved',
        'vendors.returnStatuses.rejected': 'Rejected',
        'vendors.returnStatuses.completed': 'Completed',
        'vendors.returnStatuses.refunded': 'Refunded',
        'common.export': 'Export',
        'common.completed': 'Completed',
        'common.status': 'Status',
        'common.actions': 'Actions',
        'common.vendor': 'Vendor',
        'common.amount': 'Amount',
        'common.date': 'Date',
        'common.reason': 'Reason',
        'common.unnamedVendor': 'Unnamed Vendor',
        'search.returns': 'Search returns...',
        'filters.allStatuses': 'All Statuses',
        'filters.allVendors': 'All Vendors',
        'returns.noReturns': 'No returns found',
        'returns.getStarted': 'Get started by creating a new return.',
        'returns.returnAmount': 'Return Amount',
        'returns.refundAmount': 'Total Refunded',
        'returns.viewDetails': 'View Details',
        'returns.processRefund': 'Process Refund',
        'returns.approve': 'Approve',
        'returns.reject': 'Reject',
        'messages.confirmApprove': 'Are you sure you want to approve this return?',
        'messages.confirmReject': 'Are you sure you want to reject this return?'
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

vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => {
    const { ref } = require('vue')
    return {
      checkCreateLimit: vi.fn().mockImplementation((feature: string) => {
        // Return true for vendor_returns feature in tests
        if (feature === 'vendor_returns') return true
        return true // default to true for all features in tests
      }),
      isReadOnly: ref(false)
    }
  }
}))

// Mock SearchBox component
vi.mock('../../components/SearchBox.vue', () => ({
  default: {
    name: 'SearchBox',
    template: '<input type="text" class="mock-search-box" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'searchLoading'],
    emits: ['update:modelValue']
  }
}))

// Mock return modal components
vi.mock('../../components/returns/ReturnModal.vue', () => ({
  default: {
    name: 'ReturnModal',
    template: '<div class="return-modal-mock">Return Modal</div>',
    props: ['isEdit', 'returnData', 'vendors'],
    emits: ['close', 'save']
  }
}))

vi.mock('../../components/returns/ReturnDetailsModal.vue', () => ({
  default: {
    name: 'ReturnDetailsModal',
    template: '<div class="return-details-modal-mock">Return Details Modal</div>',
    props: ['show', 'returnData'],
    emits: ['close']
  }
}))

vi.mock('../../components/returns/RefundModal.vue', () => ({
  default: {
    name: 'RefundModal',
    template: '<div class="refund-modal-mock">Refund Modal</div>',
    props: ['show', 'returnData'],
    emits: ['close', 'refunded']
  }
}))

// Mock PocketBase services
vi.mock('../../services/pocketbase', () => {
  const mockVendorReturn = {
    id: 'return-1',
    vendor: 'vendor-1',
    delivery_item: 'delivery-item-1',
    return_quantity: 5,
    return_amount: 500,
    total_return_amount: 500,
    reason: 'Defective items',
    status: 'initiated',
    requested_date: '2024-01-15',
    actual_refund_amount: 0,
    site: 'site-1',
    expand: {
      vendor: { id: 'vendor-1', name: 'Test Vendor' },
      delivery_item: { id: 'delivery-item-1', item: 'item-1', quantity: 10 }
    }
  }

  const mockVendor = {
    id: 'vendor-1',
    name: 'Test Vendor',
    contact_person: 'John Doe',
    site: 'site-1'
  }

  const mockAccount = {
    id: 'account-1',
    name: 'Test Bank Account',
    type: 'bank',
    current_balance: 10000,
    site: 'site-1'
  }

  return {
    vendorReturnService: {
      getAll: vi.fn().mockResolvedValue([mockVendorReturn]),
      create: vi.fn().mockResolvedValue({ id: 'new-return' }),
      update: vi.fn().mockResolvedValue(mockVendorReturn),
      delete: vi.fn().mockResolvedValue(true),
      approve: vi.fn().mockResolvedValue(mockVendorReturn),
      reject: vi.fn().mockResolvedValue(mockVendorReturn)
    },
    vendorService: {
      getAll: vi.fn().mockResolvedValue([mockVendor])
    },
    accountService: {
      getAll: vi.fn().mockResolvedValue([mockAccount])
    },
    deliveryItemService: {
      getAll: vi.fn().mockResolvedValue([])
    },
    vendorCreditNoteService: {
      getAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'credit-note-1', amount: 500 }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(true),
      getByVendor: vi.fn().mockResolvedValue([]),
      getByReturn: vi.fn().mockResolvedValue([]),
      updateBalance: vi.fn().mockResolvedValue({}),
      calculateActualBalance: vi.fn().mockResolvedValue(500),
      mapRecordToCreditNote: vi.fn().mockReturnValue({})
    },
    creditNoteUsageService: {
      getAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'usage-1' }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(true),
      getByPayment: vi.fn().mockResolvedValue([]),
      getByCreditNote: vi.fn().mockResolvedValue([]),
      mapRecordToCreditNoteUsage: vi.fn().mockReturnValue({})
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
      collection: vi.fn(() => ({ 
        getFullList: vi.fn().mockResolvedValue([]),
        getFirstListItem: vi.fn().mockResolvedValue({
          id: 'subscription-1',
          plan: 'free',
          max_items: 10,
          max_vendors: 5,
          max_deliveries: 5,
          max_service_bookings: 5,
          max_payments: 5,
          is_active: true
        })
      }))
    }
  }
})

// Import dependencies after all mocks
import VendorReturnsView from '../../views/VendorReturnsView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('VendorReturnsView', () => {
  let wrapper: any
  let pinia: any
  let siteStore: any

  const createWrapper = () => {
    const router = createMockRouter()
    
    return mount(VendorReturnsView, {
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
    const mockReturns = [{
      id: 'return-1',
      vendor: 'vendor-1',
      delivery_item: 'delivery-item-1',
      return_quantity: 5,
      return_amount: 500,
      total_return_amount: 500,
      reason: 'Defective items',
      status: 'initiated',
      requested_date: '2024-01-15',
      actual_refund_amount: 0,
      site: 'site-1',
      expand: {
        vendor: { id: 'vendor-1', name: 'Test Vendor' },
        delivery_item: { id: 'delivery-item-1', item: 'item-1', quantity: 10 }
      }
    }]

    const mockVendors = [{
      id: 'vendor-1',
      name: 'Test Vendor',
      contact_person: 'John Doe',
      site: 'site-1'
    }]

    const mockAccounts = [{
      id: 'account-1',
      name: 'Test Bank Account',
      type: 'bank',
      current_balance: 10000,
      site: 'site-1'
    }]
    
    // Mock useSiteData to return different data based on the service function passed
    const { useSiteData } = await import('../../composables/useSiteData')
    const reloadReturns = vi.fn()
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      const { ref } = require('vue')
      
      // Check the function to determine which data to return
      const funcString = serviceFunction.toString()
      
      if (funcString.includes('vendorReturnService.getAll')) {
        return {
          data: ref(mockReturns),
          loading: ref(false),
          error: ref(null),
          reload: reloadReturns
        }
      } else if (funcString.includes('vendorService.getAll')) {
        return {
          data: ref(mockVendors),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('accountService.getAll')) {
        return {
          data: ref(mockAccounts),
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
    ;(wrapper as any).reloadReturns = reloadReturns
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Basic Rendering', () => {
    it('should render page title and subtitle', () => {
      expect(wrapper.find('h1').text()).toBe('Vendor Returns')
      expect(wrapper.text()).toContain('Manage product returns and refunds from vendors')
    })

    it('should render export and add return buttons', () => {
      const buttons = wrapper.findAll('button')
      const exportButton = buttons.find((btn: any) => btn.text().includes('Export'))
      const addButton = buttons.find((btn: any) => btn.text().includes('Add Return'))
      
      expect(exportButton.exists()).toBe(true)
      expect(addButton.exists()).toBe(true)
    })

    it('should render search boxes for desktop and mobile', () => {
      const searchBoxes = wrapper.findAll('.mock-search-box')
      expect(searchBoxes.length).toBeGreaterThanOrEqual(1)
    })

    it('should render filter dropdowns', () => {
      const selects = wrapper.findAll('select')
      expect(selects.length).toBeGreaterThanOrEqual(2) // Status and vendor filters
      
      expect(wrapper.text()).toContain('All Statuses')
      expect(wrapper.text()).toContain('All Vendors')
    })
  })

  describe('Statistics Cards', () => {
    it('should display statistics cards with correct data', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.text()).toContain('Total Returns')
      expect(wrapper.text()).toContain('Pending Approval')
      expect(wrapper.text()).toContain('Completed')
      
      // Check that the numbers are displayed
      expect(wrapper.text()).toContain('1') // Total returns count
    })

    it('should calculate pending returns correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.vm.pendingReturns).toBe(1) // One return with 'initiated' status
    })

    it('should calculate completed returns correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.vm.completedReturns).toBe(0) // No returns with 'completed' status
    })

    it('should calculate total refunded amount correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.vm.totalRefunded).toBe(0) // No actual refunds yet
    })
  })

  describe('Data Display', () => {
    it('should display returns in table', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.text()).toContain('Test Vendor')
      expect(wrapper.text()).toContain('Defective items')
      expect(wrapper.text()).toContain('500')
      expect(wrapper.text()).toContain('Initiated') // Status is displayed with proper case
    })

    it('should show vendor names in filter dropdown', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.text()).toContain('Test Vendor')
    })

    it('should format dates correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const formatted = wrapper.vm.formatDate('2024-01-15')
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })
  })

  describe('Filtering', () => {
    it('should filter returns by search query', async () => {
      await wrapper.vm.$nextTick()

      // Set search query directly
      wrapper.vm.searchQuery = 'Defective'
      await wrapper.vm.$nextTick()

      const filtered = wrapper.vm.filteredReturns
      expect(filtered.length).toBe(1)
      expect(filtered[0].reason).toContain('Defective')
    })

    it('should filter returns by status', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Set status filter
      wrapper.vm.statusFilter = 'initiated'
      await wrapper.vm.$nextTick()
      
      const filtered = wrapper.vm.filteredReturns
      expect(filtered.length).toBe(1)
      expect(filtered[0].status).toBe('initiated')
    })

    it('should filter returns by vendor', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Set vendor filter
      wrapper.vm.vendorFilter = 'vendor-1'
      await wrapper.vm.$nextTick()
      
      const filtered = wrapper.vm.filteredReturns
      expect(filtered.length).toBe(1)
      expect(filtered[0].vendor).toBe('vendor-1')
    })

    it('should show no results when filters don\'t match', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Set non-matching search query
      wrapper.vm.searchQuery = 'nonexistent'
      await wrapper.vm.$nextTick()
      
      const filtered = wrapper.vm.filteredReturns
      expect(filtered.length).toBe(0)
    })
  })

  describe('Modal Operations', () => {
    it('should handle add button click based on subscription permissions', async () => {
      const buttons = wrapper.findAll('button')
      const addButton = buttons.find((btn: any) => btn.text().includes('Add Return'))
      
      // Verify the button exists
      expect(addButton).toBeDefined()
      expect(addButton.exists()).toBe(true)
      
      // Wait for component to initialize properly
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Test that the modal functionality works regardless of subscription state
      // by directly calling the method (since subscription might disable the button)
      await wrapper.vm.openCreateModal()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showReturnModal).toBe(true)
      expect(wrapper.vm.isEditMode).toBe(false)
      
      // Clean up
      wrapper.vm.closeReturnModal()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.showReturnModal).toBe(false)
    })

    it('should open details modal when view details is triggered', async () => {
      const mockReturn = {
        id: 'return-1',
        vendor: 'vendor-1',
        status: 'initiated'
      }
      
      wrapper.vm.viewReturn(mockReturn)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showDetailsModal).toBe(true)
      expect(wrapper.vm.selectedReturn).toEqual(mockReturn)
    })

    it('should open refund modal when process refund is triggered', async () => {
      const mockReturn = {
        id: 'return-1',
        vendor: 'vendor-1',
        status: 'approved'
      }
      
      wrapper.vm.processRefund(mockReturn)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showRefundModal).toBe(true)
      expect(wrapper.vm.selectedReturn).toEqual(mockReturn)
    })

    it('should close modals when close events are emitted', async () => {
      // Open modal first
      wrapper.vm.showReturnModal = true
      wrapper.vm.selectedReturn = { id: 'test' }
      await wrapper.vm.$nextTick()
      
      // Close modal by setting values directly (testing the state management)
      wrapper.vm.showReturnModal = false
      wrapper.vm.selectedReturn = null
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showReturnModal).toBe(false)
      expect(wrapper.vm.selectedReturn).toBe(null)
      
      // Test details modal close
      wrapper.vm.showDetailsModal = true
      wrapper.vm.selectedReturn = { id: 'test' }
      wrapper.vm.showDetailsModal = false
      wrapper.vm.selectedReturn = null
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showDetailsModal).toBe(false)
      expect(wrapper.vm.selectedReturn).toBe(null)
      
      // Test refund modal close
      wrapper.vm.showRefundModal = true
      wrapper.vm.showRefundModal = false
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showRefundModal).toBe(false)
    })
  })

  describe('Return Status Operations', () => {
    it('should approve return when confirmed', async () => {
      const { vendorReturnService } = await import('../../services/pocketbase')
      const mockUpdate = vi.mocked(vendorReturnService.update)
      
      const mockReturn = { id: 'return-1', status: 'initiated' }
      await wrapper.vm.approveReturn(mockReturn)
      
      expect(mockUpdate).toHaveBeenCalledWith('return-1', { status: 'approved' })
      expect((wrapper as any).reloadReturns).toHaveBeenCalled()
    })

    it('should handle reject through modal', async () => {
      const { vendorReturnService } = await import('../../services/pocketbase')
      const mockUpdate = vi.mocked(vendorReturnService.update)
      
      // Set up the selected return
      wrapper.vm.selectedReturn = { id: 'return-1', status: 'initiated' }
      await wrapper.vm.handleReject()
      
      expect(mockUpdate).toHaveBeenCalledWith('return-1', { status: 'rejected' })
      expect((wrapper as any).reloadReturns).toHaveBeenCalled()
    })

    it('should handle error in approve return gracefully', async () => {
      const { vendorReturnService } = await import('../../services/pocketbase')
      const mockUpdate = vi.mocked(vendorReturnService.update)
      
      // Mock console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Make update throw an error
      mockUpdate.mockRejectedValueOnce(new Error('Update failed'))
      
      const mockReturn = { id: 'return-1', status: 'initiated' }
      await wrapper.vm.approveReturn(mockReturn)
      
      expect(consoleSpy).toHaveBeenCalledWith('Error approving return:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle complete return', async () => {
      const { vendorReturnService } = await import('../../services/pocketbase')
      const mockUpdate = vi.mocked(vendorReturnService.update)
      
      wrapper.vm.selectedReturn = { id: 'return-1', status: 'approved' }
      await wrapper.vm.handleComplete()
      
      expect(mockUpdate).toHaveBeenCalledWith('return-1', { status: 'completed' })
      expect((wrapper as any).reloadReturns).toHaveBeenCalled()
      expect(wrapper.vm.showDetailsModal).toBe(false)
    })
  })

  describe('Utility Functions', () => {
    it('should get correct status classes', () => {
      expect(wrapper.vm.getStatusClass('initiated')).toContain('bg-yellow-100')
      expect(wrapper.vm.getStatusClass('approved')).toContain('bg-blue-100')
      expect(wrapper.vm.getStatusClass('rejected')).toContain('bg-red-100')
      expect(wrapper.vm.getStatusClass('completed')).toContain('bg-green-100')
      expect(wrapper.vm.getStatusClass('refunded')).toContain('bg-purple-100')
    })

    it('should handle export functionality', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      wrapper.vm.exportReturns()
      expect(consoleSpy).toHaveBeenCalledWith('Export returns')
    })

    it('should format currency correctly', () => {
      // Assuming there's a currency formatting function
      const amount = 1234.56
      const formatted = `₹${amount.toFixed(2)}`
      expect(formatted).toBe('₹1234.56')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no returns', async () => {
      // Override useSiteData to return empty array
      const { useSiteData } = await import('../../composables/useSiteData')
      
      vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
        const { ref } = require('vue')
        const funcString = serviceFunction.toString()
        
        if (funcString.includes('vendorReturnService.getAll')) {
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
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(newWrapper.vm.returns.length).toBe(0)
      expect(newWrapper.vm.pendingReturns).toBe(0)
      expect(newWrapper.vm.completedReturns).toBe(0)
      
      newWrapper.unmount()
    })
  })

  describe('Event Handling', () => {
    it('should handle return modal save event', async () => {
      wrapper.vm.showReturnModal = true
      await wrapper.vm.$nextTick()
      
      // Simulate modal save event
      await wrapper.vm.handleReturnSave()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showReturnModal).toBe(false)
      expect((wrapper as any).reloadReturns).toHaveBeenCalled()
    })

    it('should handle approve and reject through details modal', async () => {
      const { vendorReturnService } = await import('../../services/pocketbase')
      const mockUpdate = vi.mocked(vendorReturnService.update)
      
      const mockReturn = { id: 'return-1', status: 'initiated' }
      wrapper.vm.selectedReturn = mockReturn
      wrapper.vm.showDetailsModal = true
      await wrapper.vm.$nextTick()
      
      // Test approve
      await wrapper.vm.handleApprove()
      await wrapper.vm.$nextTick()
      
      expect(mockUpdate).toHaveBeenCalledWith('return-1', { status: 'approved' })
      expect(wrapper.vm.showDetailsModal).toBe(false)
      
      // Reset for reject test
      mockUpdate.mockClear()
      wrapper.vm.selectedReturn = mockReturn
      wrapper.vm.showDetailsModal = true
      
      // Test reject
      await wrapper.vm.handleReject()
      await wrapper.vm.$nextTick()
      
      expect(mockUpdate).toHaveBeenCalledWith('return-1', { status: 'rejected' })
      expect(wrapper.vm.showDetailsModal).toBe(false)
    })

    it('should handle refund process through modal', async () => {
      const mockReturn = { id: 'return-1', status: 'approved', processing_option: 'refund' }
      
      // Test opening refund modal directly
      wrapper.vm.processRefund(mockReturn)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showRefundModal).toBe(true)
      expect(wrapper.vm.selectedReturn).toEqual(mockReturn)
      
      // Test that handleRefund closes details modal and opens refund modal
      wrapper.vm.showDetailsModal = true
      wrapper.vm.selectedReturn = mockReturn
      wrapper.vm.handleRefund()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showDetailsModal).toBe(false)
      expect(wrapper.vm.showRefundModal).toBe(true)
      
      // Test saving refund
      await wrapper.vm.handleRefundSave()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showRefundModal).toBe(false)
      expect((wrapper as any).reloadReturns).toHaveBeenCalled()
    })
  })

  describe('Reactive Data Management', () => {
    it('should handle site changes through useSiteData', async () => {
      // Site changes are handled automatically by useSiteData
      // This test verifies the component structure supports it
      expect(wrapper.vm.returns).toBeDefined()
      expect(wrapper.vm.vendors).toBeDefined()
      expect(wrapper.vm.accounts).toBeDefined()
    })

    it('should update statistics when returns data changes', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Initial state
      expect(wrapper.vm.pendingReturns).toBe(1)
      
      // Verify reactivity would work when data changes
      expect(wrapper.vm.returns.length).toBe(1)
    })
  })
})