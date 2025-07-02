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