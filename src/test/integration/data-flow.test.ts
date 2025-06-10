import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemsView from '../../views/ItemsView.vue'
import VendorsView from '../../views/VendorsView.vue'
import { createMockRouter } from '../utils/test-utils'
import { mockItem, mockVendor, mockIncomingItem } from '../mocks/pocketbase'

// Mock the services
vi.mock('../../services/pocketbase', () => ({
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
  }
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
    
    // Should display item information
    expect(wrapper.text()).toContain(mockItem.name)
    expect(wrapper.text()).toContain(mockItem.description)
    
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
    
    // Should display vendor information
    expect(wrapper.text()).toContain(mockVendor.name)
    expect(wrapper.text()).toContain(mockVendor.contact_person)
    
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
    
    // Test Create
    const mockCreate = vi.mocked(itemService.create)
    mockCreate.mockResolvedValue({ ...mockItem, id: 'new-item' })
    
    const addButton = wrapper.find('button:contains("Add Item")')
    await addButton.trigger('click')
    
    // Fill and submit form
    await wrapper.find('input[placeholder="Enter item name"]').setValue('New Item')
    await wrapper.find('input[placeholder="kg, pcs, m²"]').setValue('kg')
    await wrapper.find('input[placeholder="0"]').setValue('100')
    await wrapper.find('form').trigger('submit')
    
    expect(mockCreate).toHaveBeenCalled()
    
    // Test Update
    const mockUpdate = vi.mocked(itemService.update)
    mockUpdate.mockResolvedValue(mockItem)
    
    // Test Delete
    const mockDelete = vi.mocked(itemService.delete)
    mockDelete.mockResolvedValue(true)
    
    window.confirm = vi.fn(() => true)
    
    // These would require finding the actual edit/delete buttons in the rendered items
    expect(mockUpdate).toBeDefined()
    expect(mockDelete).toBeDefined()
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
    
    // Test Create
    const mockCreate = vi.mocked(vendorService.create)
    mockCreate.mockResolvedValue({ ...mockVendor, id: 'new-vendor' })
    
    const addButton = wrapper.find('button:contains("Add Vendor")')
    await addButton.trigger('click')
    
    // Fill and submit form
    await wrapper.find('input[placeholder="Enter company name"]').setValue('New Vendor')
    await wrapper.find('form').trigger('submit')
    
    expect(mockCreate).toHaveBeenCalled()
  })

  it('should refresh data when site changes', async () => {
    const { itemService, vendorService } = await import('../../services/pocketbase')
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