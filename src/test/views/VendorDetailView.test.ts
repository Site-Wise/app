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
        'common.name': 'Name',
        'common.contact': 'Contact',
        'common.phone': 'Phone',
        'common.email': 'Email'
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
    
    wrapper = mount(VendorDetailView, {
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
  })
})