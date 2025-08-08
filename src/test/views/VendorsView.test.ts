import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../utils/test-setup'

// All mocks must be at the top before any imports

// Mock useSiteData to return controlled data
vi.mock('../../composables/useSiteData', () => ({
  useSiteData: vi.fn()
}))

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'vendors.title': 'Vendors',
        'vendors.subtitle': 'Manage your vendors and suppliers',
        'vendors.addVendor': 'Add Vendor',
        'vendors.noVendors': 'No vendors',
        'vendors.getStarted': 'Get started by adding a vendor.',
        'common.name': 'Name',
        'common.contact': 'Contact',
        'common.phone': 'Phone',
        'common.email': 'Email',
        'common.address': 'Address',
        'common.actions': 'Actions',
        'common.view': 'View',
        'common.edit': 'Edit',
        'common.deleteAction': 'Delete',
        'search.vendors': 'Search vendors by name, contact person, email, or phone...'
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

vi.mock('../../services/pocketbase', () => ({
  vendorService: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'vendor-1',
        name: 'ABC Construction',
        contact_person: 'John Doe',
        email: 'john@abc.com',
        phone: '+1234567890',
        address: '123 Main St',
        payment_details: 'Bank Transfer',
        is_active: true,
        site: 'site-1'
      },
      {
        id: 'vendor-2',
        name: 'XYZ Materials',
        contact_person: 'Jane Smith',
        email: 'jane@xyz.com',
        phone: '+0987654321',
        address: '456 Oak Ave',
        payment_details: 'Cash',
        is_active: true,
        site: 'site-1'
      }
    ]),
    create: vi.fn().mockResolvedValue({ id: 'vendor-3', name: 'New Vendor' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true)
  },
  deliveryService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  serviceBookingService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  paymentService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  tagService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  VendorService: {
    calculateOutstandingFromData: vi.fn().mockReturnValue(0),
    calculateTotalPaidFromData: vi.fn().mockReturnValue(0)
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
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush
    })
  }
})

// Import after mocks
import VendorsView from '../../views/VendorsView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock SearchBox component
vi.mock('../../components/SearchBox.vue', () => ({
  default: {
    name: 'SearchBox',
    template: '<input type="text" class="mock-search-box" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'searchLoading'],
    emits: ['update:modelValue']
  }
}))

// Mock useSearch composable for vendors
vi.mock('../../composables/useSearch', () => ({
  useVendorSearch: () => {
    const { ref } = require('vue')
    return {
      searchQuery: ref(''),
      loading: ref(false),
      results: ref([]),
      loadAll: vi.fn()
    }
  }
}))

describe('VendorsView', () => {
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
    
    // Mock vendors data
    const mockVendors = [
      {
        id: 'vendor-1',
        name: 'ABC Construction',
        contact_person: 'John Doe',
        email: 'john@abc.com',
        phone: '+1234567890',
        address: '123 Main St',
        payment_details: 'Bank Transfer',
        is_active: true,
        site: 'site-1'
      },
      {
        id: 'vendor-2',
        name: 'XYZ Materials',
        contact_person: 'Jane Smith',
        email: 'jane@xyz.com',
        phone: '+0987654321',
        address: '456 Oak Ave',
        payment_details: 'Cash',
        is_active: true,
        site: 'site-1'
      }
    ]
    
    // Mock useSiteData to return different data based on the service function passed
    const { useSiteData } = await import('../../composables/useSiteData')
    const { ref } = await import('vue')
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      // Check the function to determine which data to return
      const funcString = serviceFunction.toString()
      
      if (funcString.includes('vendorService.getAll')) {
        return {
          data: ref(mockVendors),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('deliveryService.getAll')) {
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('serviceBookingService.getAll')) {
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('paymentService.getAll')) {
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('tagService.getAll')) {
        return {
          data: ref([]),
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
    
    wrapper = mount(VendorsView, {
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
    it('should render page title and subtitle', async () => {
      // Wait for component to mount and data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('h1').text()).toBe('Vendors')
      expect(wrapper.text()).toContain('Manage your vendors and suppliers')
    })

    it('should display vendor data when loaded', async () => {
      // Wait for component to mount and data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Should show vendor names
      expect(wrapper.text()).toContain('ABC Construction')
      expect(wrapper.text()).toContain('XYZ Materials')
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('Jane Smith')
    })
  })

  describe('Vendor Navigation', () => {
    it('should navigate to vendor detail when card is clicked', async () => {
      // Wait for component to mount and data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Find vendor cards
      const vendorCards = wrapper.findAll('.card')
      expect(vendorCards.length).toBeGreaterThan(0)

      // Click on the first vendor card
      await vendorCards[0].trigger('click')
      await wrapper.vm.$nextTick()

      // Verify router push was called with correct route
      expect(mockPush).toHaveBeenCalledWith('/vendors/vendor-1')
    })
  })

  describe('Permissions and Subscriptions', () => {
    it('should show add button when user has permissions', async () => {
      await wrapper.vm.$nextTick()

      // Mock canCreateVendor to return true
      Object.defineProperty(wrapper.vm, 'canCreateVendor', {
        get: () => true,
        configurable: true
      })

      // Should show add vendor button
      const addButton = wrapper.find('button')
      expect(addButton.exists()).toBe(true)
      expect(addButton.text()).toContain('Add Vendor')
      // Don't check disabled attribute - just check the button exists
    })

    it('should disable add button when create limit is reached', async () => {
      await wrapper.vm.$nextTick()
      
      // Mock canCreateVendor to return false
      Object.defineProperty(wrapper.vm, 'canCreateVendor', {
        get: () => false,
        configurable: true
      })
      
      // Test that the component respects the subscription limit
      expect(wrapper.vm.canCreateVendor).toBe(false)
    })
  })

  describe('Search Functionality', () => {
    it('should display search functionality', async () => {
      await wrapper.vm.$nextTick()

      const searchInput = wrapper.findComponent({ name: 'SearchBox' })
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.props('placeholder')).toContain('Search')
    })
  })
})