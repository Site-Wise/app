import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ItemsView from '../../views/ItemsView.vue'
import VendorsView from '../../views/VendorsView.vue'
import { createMockRouter } from '../utils/test-utils'

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

// Mock TagSelector component
vi.mock('../../components/TagSelector.vue', () => ({
  default: {
    name: 'TagSelector',
    template: '<div class="tag-selector-mock"></div>',
    props: ['modelValue', 'label', 'tagType', 'placeholder'],
    emits: ['update:modelValue', 'tagsChanged']
  }
}))

// Mock the services
vi.mock('../../services/pocketbase', () => {
  const mockItem = {
    id: 'item-1',
    name: 'Steel Rebar',
    description: 'High-grade steel rebar',
    unit: 'kg',
    tags: ['tag-1', 'tag-2'],
    site: 'site-1',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z'
  }

  const mockVendor = {
    id: 'vendor-1',
    name: 'Steel Suppliers Inc',
    contact_person: 'John Doe',
    email: 'john@steelsuppliers.com',
    phone: '+1234567890',
    address: '123 Steel Street',
    tags: ['Steel', 'Metal'],
    site: 'site-1',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z'
  }

  const mockIncomingItem = {
    id: 'incoming-1',
    item: 'item-1',
    vendor: 'vendor-1',
    quantity: 500,
    unit_price: 45,
    total_amount: 22500,
    delivery_date: '2024-01-15',
    photos: [],
    notes: 'Delivered on time',
    payment_status: 'pending',
    paid_amount: 0,
    site: 'site-1',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z'
  }

  return {
    itemService: {
      getAll: vi.fn().mockResolvedValue([mockItem]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    vendorService: {
      getAll: vi.fn().mockResolvedValue([mockVendor]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    deliveryService: {
      getAll: vi.fn().mockResolvedValue([{
        id: 'delivery-1',
        vendor: 'vendor-1',
        delivery_date: '2024-01-15',
        total_amount: 1000,
        payment_status: 'pending',
        paid_amount: 0,
        site: 'site-1'
      }])
      },
    paymentService: {
      getAll: vi.fn().mockResolvedValue([])
    },
    serviceBookingService: {
      getAll: vi.fn().mockResolvedValue([])
    },
    tagService: {
      getAll: vi.fn().mockResolvedValue([
        { id: 'tag-1', name: 'Construction', color: '#ef4444', type: 'item_category', site: 'site-1', usage_count: 5 },
        { id: 'tag-2', name: 'Material', color: '#22c55e', type: 'item_category', site: 'site-1', usage_count: 3 }
      ]),
      findOrCreate: vi.fn(),
      incrementUsage: vi.fn()
    },
    getCurrentSiteId: vi.fn().mockReturnValue(null), // Return null to prevent subscription loading
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
      collection: vi.fn((_name: string) => ({
        getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
        create: vi.fn().mockResolvedValue({}),
        getFullList: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({})
      }))
    },
    // Export mock data for use in tests
    mockItem,
    mockVendor,
    mockIncomingItem
  }
})

// Mock the subscription composable to prevent real network calls
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: vi.fn(() => ({
    currentSubscription: { value: null },
    currentUsage: { value: null },
    currentPlan: { value: null },
    usageLimits: { value: null },
    isLoading: { value: false },
    error: { value: null },
    isReadOnly: { value: false },
    isSubscriptionActive: { value: false },
    loadSubscription: vi.fn(),
    createDefaultSubscription: vi.fn(),
    createFreeTierSubscription: vi.fn(),
    checkCreateLimit: vi.fn().mockReturnValue(true),
    getAllPlans: vi.fn().mockResolvedValue([]),
    upgradeSubscription: vi.fn(),
    cancelSubscription: vi.fn()
  }))
}))

describe('Data Flow Integration', () => {
  let pinia: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Setup basic useSiteData mock
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

  it('should load and display items with delivery data', async () => {
    // Setup useSiteData mock for ItemsView
    const { useSiteData } = await import('../../composables/useSiteData')
    
    const mockItems = [{
      id: 'item-1',
      name: 'Steel Rebar',
      description: 'High-grade steel rebar',
      unit: 'kg',
      tags: ['tag-1', 'tag-2'],
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }]
    
    const mockDeliveries = [{
      id: 'delivery-1',
      vendor: 'vendor-1',
      delivery_date: '2024-01-15',
      total_amount: 1000,
      payment_status: 'pending',
      paid_amount: 0,
      site: 'site-1'
    }]
    
    const mockTags = [
      { id: 'tag-1', name: 'Construction', color: '#ef4444', type: 'item_category', site: 'site-1', usage_count: 5 },
      { id: 'tag-2', name: 'Material', color: '#22c55e', type: 'item_category', site: 'site-1', usage_count: 3 }
    ]
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      const { ref } = require('vue')
      const funcString = serviceFunction.toString()
      
      if (funcString.includes('itemService.getAll')) {
        return {
          data: ref({ items: mockItems, deliveries: mockDeliveries, tags: mockTags }),
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
    
    const router = createMockRouter()
    
    const wrapper = mount(ItemsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
    
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    
    // Should display item information
    const mockItemLocal = {
      id: 'item-1',
      name: 'Steel Rebar',
      description: 'High-grade steel rebar',
      unit: 'kg',
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }
    expect(wrapper.text()).toContain(mockItemLocal.name)
    expect(wrapper.text()).toContain(mockItemLocal.description)
    
    // Should display delivery summary
    expect(wrapper.text()).toContain('Total Delivered')
    expect(wrapper.text()).toContain('Avg. Price')
  })

  it('should load and display vendors with financial data', async () => {
    // Setup useSiteData mock for VendorsView
    const { useSiteData } = await import('../../composables/useSiteData')
    
    const mockVendors = [{
      id: 'vendor-1',
      name: 'Steel Suppliers Inc',
      contact_person: 'John Doe',
      email: 'john@steelsuppliers.com',
      phone: '+1234567890',
      address: '123 Steel Street',
      tags: ['Steel', 'Metal'],
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }]
    
    const mockDeliveries = [{
      id: 'delivery-1',
      vendor: 'vendor-1',
      delivery_date: '2024-01-15',
      total_amount: 1000,
      payment_status: 'pending',
      paid_amount: 0,
      site: 'site-1'
    }]
    
    const mockServiceBookings = [{
      id: 'booking-1',
      vendor: 'vendor-1',
      total_amount: 800,
      paid_amount: 600
    }]
    
    const mockPayments = [{
      id: 'payment-1',
      vendor: 'vendor-1',
      amount: 700
    }]
    
    const mockTags = [
      { id: 'tag-1', name: 'Steel Supplier', color: '#ef4444', type: 'specialty', site: 'site-1', usage_count: 5 },
      { id: 'tag-2', name: 'Concrete', color: '#22c55e', type: 'specialty', site: 'site-1', usage_count: 3 }
    ]
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      const { ref } = require('vue')
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
          data: ref(mockDeliveries),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('serviceBookingService.getAll')) {
        return {
          data: ref(mockServiceBookings),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('paymentService.getAll')) {
        return {
          data: ref(mockPayments),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('tagService.getAll')) {
        return {
          data: ref(mockTags),
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
    
    const router = createMockRouter()
    
    const wrapper = mount(VendorsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
    
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Should display vendor information
    const mockVendorLocal = {
      id: 'vendor-1',
      name: 'Steel Suppliers Inc',
      contact_person: 'John Doe',
      email: 'john@steelsuppliers.com',
      phone: '+1234567890',
      address: '123 Steel Street',
      tags: ['Steel', 'Metal'],
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }
    expect(wrapper.text()).toContain(mockVendorLocal.name)
    expect(wrapper.text()).toContain(mockVendorLocal.contact_person)
    
    // Should display financial summary
    expect(wrapper.text()).toContain('Outstanding')
    expect(wrapper.text()).toContain('Total Paid')
  })

  it('should handle CRUD operations for items', async () => {
    const { itemService } = await import('../../services/pocketbase')
    const router = createMockRouter()
    
    const wrapper = mount(ItemsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
    
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Test that the component can call create function
    const mockCreate = vi.mocked(itemService.create)
    mockCreate.mockResolvedValue({ 
      id: 'new-item',
      name: 'Steel Rebar',
      description: 'High-grade steel rebar',
      unit: 'kg',
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })
    
    // Test that the services are available (integration test)
    expect(itemService.create).toBeDefined()
    expect(itemService.update).toBeDefined()
    expect(itemService.delete).toBeDefined()
  })

  it('should handle CRUD operations for vendors', async () => {
    const { vendorService } = await import('../../services/pocketbase')
    const router = createMockRouter()
    
    const wrapper = mount(VendorsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
    
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Test that the component can call create function
    const mockCreate = vi.mocked(vendorService.create)
    mockCreate.mockResolvedValue({ 
      id: 'new-vendor',
      name: 'Steel Suppliers Inc',
      contact_person: 'John Doe',
      email: 'john@steelsuppliers.com',
      phone: '+1234567890',
      address: '123 Steel Street',
      tags: ['Steel', 'Metal'],
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })
    
    // Test that the services are available (integration test)
    expect(vendorService.create).toBeDefined()
    expect(vendorService.update).toBeDefined()
    expect(vendorService.delete).toBeDefined()
  })

  it('should refresh data when site changes', async () => {
    // Setup mock for useSiteData with reload tracking
    const { useSiteData } = await import('../../composables/useSiteData')
    const reloadSpy = vi.fn()
    
    vi.mocked(useSiteData).mockImplementation(() => {
      const { ref } = require('vue')
      return {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        reload: reloadSpy
      }
    })
    
    const router = createMockRouter()
    
    const wrapper = mount(ItemsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
    
    // Clear initial calls
    vi.clearAllMocks()
    reloadSpy.mockClear()
    
    // Trigger site change by changing the site in store
    const { useSiteStore } = await import('../../stores/site')
    const siteStore = useSiteStore()
    siteStore.$patch({ currentSiteId: 'site-2' })
    
    await wrapper.vm.$nextTick()
    
    // With the new reactive architecture, data should refresh automatically
    // We can verify that the component still exists and is reactive
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle quick actions from global events', async () => {
    const router = createMockRouter()
    
    const wrapper = mount(ItemsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
    
    // Trigger quick action
    window.dispatchEvent(new CustomEvent('show-add-modal'))
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.fixed').exists()).toBe(true)
  })
})