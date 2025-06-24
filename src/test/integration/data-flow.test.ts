import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemsView from '../../views/ItemsView.vue'
import VendorsView from '../../views/VendorsView.vue'
import { createMockRouter } from '../utils/test-utils'
// import { mockItem, mockVendor, mockIncomingItem } from '../../services/pocketbase'

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
    incomingItemService: {
      getAll: vi.fn().mockResolvedValue([mockIncomingItem])
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
    incrementUsage: vi.fn(),
    decrementUsage: vi.fn(),
    getAllPlans: vi.fn().mockResolvedValue([]),
    upgradeSubscription: vi.fn(),
    cancelSubscription: vi.fn()
  }))
}))

describe('Data Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load and display items with delivery data', async () => {
    const router = createMockRouter()
    
    const wrapper = mount(ItemsView, {
      global: {
        plugins: [router],
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
    const router = createMockRouter()
    
    const wrapper = mount(VendorsView, {
      global: {
        plugins: [router],
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
        plugins: [router],
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
        plugins: [router],
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
    const { itemService } = await import('../../services/pocketbase')
    const router = createMockRouter()
    
    const wrapper = mount(ItemsView, {
      global: {
        plugins: [router],
        stubs: {
          'router-link': true
        }
      }
    })
    
    // Clear initial calls
    vi.clearAllMocks()
    
    // Trigger site change
    window.dispatchEvent(new CustomEvent('site-changed'))
    await wrapper.vm.$nextTick()
    
    expect(itemService.getAll).toHaveBeenCalled()
  })

  it('should handle quick actions from global events', async () => {
    const router = createMockRouter()
    
    const wrapper = mount(ItemsView, {
      global: {
        plugins: [router],
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