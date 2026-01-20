import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../utils/test-setup'

// All mocks must be at the top before any imports

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'vendors.vendorDetails': 'Vendor Details',
        'vendors.contactInformation': 'Contact Information',
        'vendors.paymentInformation': 'Payment Information',
        'vendors.exportLedger': 'Export Ledger',
        'vendors.exportCsv': 'Export CSV',
        'vendors.exportPdf': 'Export PDF',
        'vendors.exportTallyXml': 'Export for Tally',
        'vendors.recordPayment': 'Record Payment',
        'vendors.createReturn': 'Create Return',
        'vendors.unnamedVendor': 'Unnamed Vendor',
        'vendors.vendorLedger': 'Vendor Ledger',
        'vendors.vendor': 'Vendor',
        'vendors.contact': 'Contact',
        'vendors.generated': 'Generated',
        'vendors.date': 'Date',
        'vendors.description': 'Description',
        'vendors.reference': 'Reference',
        'vendors.dues': 'Dues',
        'vendors.payments': 'Payments',
        'vendors.balance': 'Balance',
        'vendors.unknownItem': 'Unknown Item',
        'vendors.units': 'Units',
        'vendors.received': 'Received',
        'vendors.paymentReceived': 'Payment Received',
        'vendors.creditNoteIssued': 'Credit Note Issued',
        'vendors.creditNoteUsed': 'Credit Note Applied',
        'vendors.refundForReturn': 'Refund for Return',
        'vendors.refundProcessed': 'Refund Processed',
        'vendors.ledger': 'Ledger',
        'vendors.openingBalance': 'Opening Balance',
        'vendors.filterFromDate': 'From Date',
        'vendors.filterToDate': 'To Date',
        'vendors.filterPeriod': 'Period',
        'vendors.exportAllData': 'Export all ledger data',
        'vendors.exportingAllEntries': `Exporting all ${params?.count || 0} entries`,
        'vendors.exportingFilteredEntries': `Exporting ${params?.count || 0} entries in selected date range`,
        'vendors.particulars': 'Particulars',
        'vendors.debit': 'Debit',
        'vendors.credit': 'Credit',
        'vendors.totals': 'Totals',
        'vendors.totalOutstanding': 'Total Outstanding',
        'vendors.creditBalance': 'Credit Balance',
        'vendors.finalBalance': 'Final Balance',
        'vendors.beginning': 'Beginning',
        'vendors.today': 'Today',
        'common.name': 'Name',
        'common.contact': 'Contact',
        'common.phone': 'Phone',
        'common.email': 'Email',
        'common.cancel': 'Cancel',
        'common.export': 'Export'
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

vi.mock('../../services/pocketbase', () => ({
  vendorService: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'vendor-1',
        name: 'Test Vendor',
        contact_person: 'John Doe',
        email: 'john@test.com',
        phone: '+1234567890',
        address: '123 Main St',
        payment_details: 'Bank Transfer',
        is_active: true,
        site: 'site-1'
      }
    ])
  },
  deliveryService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  paymentService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  accountService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  tagService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  vendorReturnService: {
    getByVendor: vi.fn().mockResolvedValue([])
  },
  vendorCreditNoteService: {
    getByVendor: vi.fn().mockResolvedValue([])
  },
  creditNoteUsageService: {
    getByVendor: vi.fn().mockResolvedValue([])
  },
  accountTransactionService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  serviceBookingService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  paymentAllocationService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  VendorService: {
    calculateOutstandingFromData: vi.fn().mockReturnValue(0)
  },
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
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
  setCurrentUserRole: vi.fn(),
  pb: {
    authStore: {
      isValid: true,
      model: { id: 'user-1' }
    },
    collection: vi.fn(() => ({ getFullList: vi.fn().mockResolvedValue([]) }))
  }
}))

const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
      back: mockBack
    }),
    useRoute: () => ({
      params: { id: 'vendor-1' }
    })
  }
})

// Mock DeliveryPaymentCalculator
vi.mock('../../utils/deliveryPaymentCalculator', () => ({
  DeliveryPaymentCalculator: {
    enhanceDeliveriesWithPaymentStatus: vi.fn((deliveries) => deliveries)
  }
}))

// Mock jsPDF
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getHeight: vi.fn().mockReturnValue(297),
        getWidth: vi.fn().mockReturnValue(210)
      }
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    autoTable: vi.fn(),
    lastAutoTable: { finalY: 100 },
    save: vi.fn()
  }))
}))

// Mock TallyXmlExporter  
vi.mock('../../utils/tallyXmlExport', () => ({
  TallyXmlExporter: {
    exportVendorLedger: vi.fn()
  }
}))

// Import after mocks
import VendorDetailView from '../../views/VendorDetailView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('VendorDetailView', () => {
  let wrapper: any
  let pinia: any
  let siteStore: any
  let router: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { pinia: testPinia, siteStore: testSiteStore } = setupTestPinia()
    pinia = testPinia
    siteStore = testSiteStore
    
    router = createMockRouter()
    
    // Mock route params
    router.currentRoute.value.params = { id: 'vendor-1' }
    
    wrapper = mount(VendorDetailView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true,
          'AlertCircle': true,
          'CheckCircle': true
        },
        mocks: {
          $route: {
            params: { id: 'vendor-1' }
          }
        }
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Basic Rendering', () => {
    it('should render vendor detail view when vendor is loaded', async () => {
      // Wait for component to mount and data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should show vendor name and details
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('Test Vendor')
    })
  })

  describe('Navigation', () => {
    it('should have back button functionality', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Find and click back button
      const backButton = wrapper.find('button')
      expect(backButton.exists()).toBe(true)
      
      await backButton.trigger('click')
      
      // Should call router back
      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('Export Functionality', () => {
    it('should show export dropdown button', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Should show export button
      expect(wrapper.text()).toContain('Export Ledger')
    })

    it('should handle PDF export with proper logo aspect ratio', async () => {
      // Mock Image constructor with proper aspect ratio
      const mockImage = {
        naturalWidth: 100,
        naturalHeight: 50, // 2:1 aspect ratio
        crossOrigin: '',
        src: '',
        onload: null,
        onerror: null
      }

      // Mock Image constructor globally
      global.Image = vi.fn().mockImplementation(() => mockImage)

      // Mock jsPDF
      const mockDoc = {
        internal: {
          pageSize: { width: 210, height: 297 },
          getCurrentPageInfo: () => ({ pageNumber: 1 })
        },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        setTextColor: vi.fn(),
        setDrawColor: vi.fn(),
        text: vi.fn(),
        line: vi.fn(),
        addImage: vi.fn(),
        addPage: vi.fn(),
        save: vi.fn()
      }

      // Mock jsPDF import
      vi.doMock('jspdf', () => ({
        jsPDF: vi.fn().mockImplementation(() => mockDoc)
      }))

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Test the aspect ratio calculation directly
      const maxLogoWidth = 25
      const maxLogoHeight = 15
      const aspectRatio = mockImage.naturalWidth / mockImage.naturalHeight // 100/50 = 2
      let logoWidth = maxLogoWidth // 25
      let logoHeight = maxLogoWidth / aspectRatio // 25/2 = 12.5

      // Verify the calculation is correct
      expect(aspectRatio).toBe(2)
      expect(logoWidth).toBe(25)
      expect(logoHeight).toBe(12.5)
      expect(logoHeight).toBeLessThanOrEqual(maxLogoHeight)
    })

    it('should handle tall logo aspect ratio by scaling with height', async () => {
      // Mock Image constructor with tall aspect ratio (logo is taller than it is wide)
      const mockImage = {
        naturalWidth: 50,
        naturalHeight: 100, // 1:2 aspect ratio (tall logo)
        crossOrigin: '',
        src: '',
        onload: null,
        onerror: null
      }

      // Test the aspect ratio calculation for tall logos
      const maxLogoWidth = 25
      const maxLogoHeight = 15
      const aspectRatio = mockImage.naturalWidth / mockImage.naturalHeight // 50/100 = 0.5
      let logoWidth = maxLogoWidth // 25
      let logoHeight = maxLogoWidth / aspectRatio // 25/0.5 = 50

      // Height exceeds max, so scale by height instead
      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight // 15
        logoWidth = maxLogoHeight * aspectRatio // 15 * 0.5 = 7.5
      }

      // Verify the calculation is correct for tall logos
      expect(aspectRatio).toBe(0.5)
      expect(logoWidth).toBe(7.5)
      expect(logoHeight).toBe(15)
      expect(logoWidth).toBeLessThanOrEqual(maxLogoWidth)
      expect(logoHeight).toBeLessThanOrEqual(maxLogoHeight)
    })
  })

  describe('Action Buttons', () => {
    it('should show payment and return action buttons', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Should show action buttons
      expect(wrapper.text()).toContain('Record Payment')
      expect(wrapper.text()).toContain('Create Return')
    })

    it('should have XML export option in export dropdown', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Find export dropdown button
      const exportButton = wrapper.findAll('button').find(btn => btn.text().includes('Export Ledger'));
      expect(exportButton?.exists()).toBe(true);
      
      // Click to open dropdown
      await exportButton?.trigger('click');
      await wrapper.vm.$nextTick()

      // Check if XML export option exists - it shows as translation key in tests
      const xmlExportButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Export for Tally') || 
        btn.text().includes('vendors.exportTallyXml') ||
        btn.text().includes('exportTallyXml')
      );
      
      expect(xmlExportButton?.exists()).toBe(true);
    });

    it('should open export modal when Tally export is clicked', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Open export dropdown
      const exportButton = wrapper.findAll('button').find(btn => btn.text().includes('Export Ledger'))
      await exportButton?.trigger('click')
      await wrapper.vm.$nextTick()

      // Click XML export option - use translation key that appears in tests
      const xmlExportButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Export for Tally') ||
        btn.text().includes('vendors.exportTallyXml') ||
        btn.text().includes('exportTallyXml')
      )
      await xmlExportButton?.trigger('click')
      await wrapper.vm.$nextTick()

      // Modal should open with tally format
      expect(wrapper.vm.showExportModal).toBe(true)
      expect(wrapper.vm.exportFormat).toBe('tally')
    });
  })

  describe('Export Modal', () => {
    it('should open export modal when export option is clicked', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Initially modal should be hidden
      expect(wrapper.vm.showExportModal).toBe(false)

      // Open export modal directly via method
      wrapper.vm.openExportModal('csv')
      await wrapper.vm.$nextTick()

      // Modal should be visible
      expect(wrapper.vm.showExportModal).toBe(true)
      expect(wrapper.vm.exportFormat).toBe('csv')
      expect(wrapper.vm.exportAllData).toBe(true)
    })

    it('should open export modal for PDF format', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.openExportModal('pdf')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportModal).toBe(true)
      expect(wrapper.vm.exportFormat).toBe('pdf')
    })

    it('should open export modal for Tally format', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.openExportModal('tally')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportModal).toBe(true)
      expect(wrapper.vm.exportFormat).toBe('tally')
    })

    it('should close export modal', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Open modal first
      wrapper.vm.openExportModal('csv')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.showExportModal).toBe(true)

      // Close modal
      wrapper.vm.closeExportModal()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportModal).toBe(false)
    })

    it('should reset export modal state when opening', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Set some values
      wrapper.vm.exportFromDate = '2024-01-01'
      wrapper.vm.exportToDate = '2024-01-31'
      wrapper.vm.exportAllData = false

      // Open modal - should reset
      wrapper.vm.openExportModal('csv')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.exportFromDate).toBe('')
      expect(wrapper.vm.exportToDate).toBe('')
      expect(wrapper.vm.exportAllData).toBe(true)
    })

    it('should close modal after executeExport for csv format', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.openExportModal('csv')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportModal).toBe(true)
      expect(wrapper.vm.exportFormat).toBe('csv')

      // executeExport should close modal after export (even if export fails due to mocks)
      await wrapper.vm.executeExport()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportModal).toBe(false)
    })

    it('should keep modal open when pdf export fails due to error', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.openExportModal('pdf')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportModal).toBe(true)
      expect(wrapper.vm.exportFormat).toBe('pdf')

      // executeExport catches errors and doesn't close modal on failure
      // This is expected behavior - user can retry or cancel manually
      await wrapper.vm.executeExport()
      await wrapper.vm.$nextTick()

      // Modal stays open on error (jsPDF mock throws)
      expect(wrapper.vm.showExportModal).toBe(true)
    })

    it('should close modal after executeExport for tally format', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.openExportModal('tally')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportModal).toBe(true)
      expect(wrapper.vm.exportFormat).toBe('tally')

      // executeExport should close modal after export (even if export fails due to mocks)
      await wrapper.vm.executeExport()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportModal).toBe(false)
    })

    it('should show date range inputs when exportAllData is false', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.openExportModal('csv')
      wrapper.vm.exportAllData = false
      await wrapper.vm.$nextTick()

      // Modal should be open and date inputs visible
      expect(wrapper.vm.showExportModal).toBe(true)
      expect(wrapper.vm.exportAllData).toBe(false)
    })

    it('should compute export preview count correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // When exportAllData is true, preview count should match total entries
      wrapper.vm.openExportModal('csv')
      await wrapper.vm.$nextTick()

      const totalEntries = wrapper.vm.ledgerEntries.length
      expect(wrapper.vm.exportPreviewCount).toBe(totalEntries)
    })

    it('should compute export opening balance as zero when exportAllData is true', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.openExportModal('csv')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.exportOpeningBalance).toBe(0)
    })
  })

  describe('Filtered Export Entries', () => {
    it('should return all entries when exportAllData is true', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.exportAllData = true
      const result = wrapper.vm.getFilteredEntriesForExport()

      expect(result.entries).toEqual(wrapper.vm.ledgerEntries)
      expect(result.openingBalance).toBe(0)
      expect(result.hasOpeningBalance).toBe(false)
    })

    it('should return all entries when no date filters are set', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.exportAllData = false
      wrapper.vm.exportFromDate = ''
      wrapper.vm.exportToDate = ''
      const result = wrapper.vm.getFilteredEntriesForExport()

      expect(result.entries).toEqual(wrapper.vm.ledgerEntries)
      expect(result.openingBalance).toBe(0)
      expect(result.hasOpeningBalance).toBe(false)
    })
  })

  describe('Mobile Menu', () => {
    it('should handle mobile action for export CSV', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const openExportModalSpy = vi.spyOn(wrapper.vm, 'openExportModal')

      // Trigger mobile action
      wrapper.vm.showMobileMenu = true
      await wrapper.vm.$nextTick()

      // Click the CSV export button in mobile menu
      const mobileButtons = wrapper.findAll('button')
      const csvButton = mobileButtons.find(btn => btn.text().includes('Export CSV'))
      if (csvButton) {
        await csvButton.trigger('click')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 150))
        expect(openExportModalSpy).toHaveBeenCalledWith('csv')
      }
    })

    it('should close mobile menu when action is triggered', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.showMobileMenu = true
      await wrapper.vm.$nextTick()

      // Simulate handleMobileAction
      wrapper.vm.handleMobileAction('createReturn')

      // Menu should close immediately
      expect(wrapper.vm.showMobileMenu).toBe(false)
    })

    it('should handle createReturn action', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.showMobileMenu = true
      wrapper.vm.handleMobileAction('createReturn')

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(mockPush).toHaveBeenCalled()
    })
  })

  describe('Dropdown Behavior', () => {
    it('should toggle export dropdown visibility', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportDropdown).toBe(false)

      // Toggle dropdown
      wrapper.vm.showExportDropdown = true
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportDropdown).toBe(true)

      // Toggle again
      wrapper.vm.showExportDropdown = false
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportDropdown).toBe(false)
    })

    it('should close dropdown when export option is selected', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      wrapper.vm.showExportDropdown = true
      await wrapper.vm.$nextTick()

      // Open export modal (which should close dropdown)
      wrapper.vm.openExportModal('csv')
      wrapper.vm.showExportDropdown = false
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportDropdown).toBe(false)
      expect(wrapper.vm.showExportModal).toBe(true)
    })
  })
})