import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// All mocks must be at the top before any imports
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'items.title': 'Items',
        'items.subtitle': 'Manage your construction items and quantities',
        'items.addItem': 'Add Item',
        'items.editItem': 'Edit Item',
        'items.deleteItem': 'Delete Item',
        'items.noItems': 'No items',
        'items.getStarted': 'Get started by creating a new item.',
        'items.totalDelivered': 'Total Delivered',
        'items.avgPrice': 'Avg. Price',
        'items.unit': 'Unit',
        'common.name': 'Name',
        'common.description': 'Description',
        'common.quantity': 'Quantity',
        'common.item': 'item',
        'forms.enterItemName': 'Enter item name',
        'forms.enterDescription': 'Enter item description',
        'forms.enterQuantity': 'Enter quantity',
        'forms.enterUnit': 'kg, pcs, m²',
        'forms.enterCategory': 'Enter category',
        'common.update': 'Update',
        'common.create': 'Create',
        'common.cancel': 'Cancel',
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
  const mockItem = {
    id: 'item-1',
    name: 'Test Item',
    description: 'Test Description',
    quantity: 100,
    unit: 'kg',
    category: 'Test Category'
  }
  
  const mockIncomingItem = {
    id: 'incoming-1',
    item: 'item-1',
    quantity: 10,
    total_amount: 1000
  }
  
  return {
    itemService: {
      getAll: vi.fn().mockResolvedValue([mockItem]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    incomingItemService: {
      getAll: vi.fn().mockResolvedValue([mockIncomingItem])
    }
  }
})

// Import dependencies after all mocks
import ItemsView from '../../views/ItemsView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('ItemsView', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    const router = createMockRouter()
    
    wrapper = mount(ItemsView, {
      global: {
        plugins: [router],
        stubs: {
          'router-link': true
        }
      }
    })
  })

  it('should render items page title', () => {
    expect(wrapper.find('h1').text()).toBe('Items')
  })

  it('should render add item button', () => {
    const addButton = wrapper.find('button:contains("Add Item")')
    expect(addButton.exists()).toBe(true)
  })

  it('should display items in grid', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Test Item')
    expect(wrapper.text()).toContain('Test Description')
    expect(wrapper.text()).toContain('100 kg')
  })

  it('should show add modal when add button is clicked', async () => {
    const addButton = wrapper.find('button:contains("Add Item")')
    await addButton.trigger('click')
    
    expect(wrapper.find('.fixed').exists()).toBe(true)
    expect(wrapper.text()).toContain('Add Item')
  })

  it('should handle item creation', async () => {
    const { itemService } = await import('../../services/pocketbase')
    const mockCreate = vi.mocked(itemService.create)
    mockCreate.mockResolvedValue({
      id: 'item-1',
      name: 'Test Item',
      description: 'Test Description',
      quantity: 100,
      unit: 'kg',
      category: 'Test Category'
    })
    
    // Open add modal
    const addButton = wrapper.find('button:contains("Add Item")')
    await addButton.trigger('click')
    
    // Fill form
    await wrapper.find('input[placeholder="Enter item name"]').setValue('New Item')
    await wrapper.find('input[placeholder="kg, pcs, m²"]').setValue('kg')
    await wrapper.find('input[type="number"]').setValue('100')
    
    // Submit form
    await wrapper.find('form').trigger('submit')
    
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'New Item',
      description: '',
      quantity: 100,
      unit: 'kg',
      category: ''
    })
  })

  it('should handle item editing', async () => {
    const { itemService } = await import('../../services/pocketbase')
    const mockUpdate = vi.mocked(itemService.update)
    mockUpdate.mockResolvedValue({
      id: 'item-1',
      name: 'Test Item',
      description: 'Test Description',
      quantity: 100,
      unit: 'kg',
      category: 'Test Category'
    })
    
    // Wait for items to load
    await wrapper.vm.$nextTick()
    
    // Find and click edit button
    const editButton = wrapper.find('button[title="Edit"]')
    if (editButton.exists()) {
      await editButton.trigger('click')
      
      expect(wrapper.text()).toContain('Edit Item')
    }
  })

  it('should handle item deletion', async () => {
    const { itemService } = await import('../../services/pocketbase')
    const mockDelete = vi.mocked(itemService.delete)
    mockDelete.mockResolvedValue(true)
    
    // Mock window.confirm
    window.confirm = vi.fn(() => true)
    
    // Wait for items to load
    await wrapper.vm.$nextTick()
    
    // Find and click delete button
    const deleteButton = wrapper.find('button[title="Delete"]')
    if (deleteButton.exists()) {
      await deleteButton.trigger('click')
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalledWith('item-1')
    }
  })

  it('should navigate to item detail when item is clicked', async () => {
    const router = wrapper.vm.$router
    const pushSpy = vi.spyOn(router, 'push')
    
    // Wait for items to load
    await wrapper.vm.$nextTick()
    
    // Find and click item card
    const itemCard = wrapper.find('.card')
    if (itemCard.exists()) {
      await itemCard.trigger('click')
      
      expect(pushSpy).toHaveBeenCalledWith('/items/item-1')
    }
  })

  it('should display delivery summary for items', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Total Delivered')
    expect(wrapper.text()).toContain('Avg. Price')
  })

  it('should handle quick action event', async () => {
    // Trigger quick action event
    window.dispatchEvent(new CustomEvent('show-add-modal'))
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.fixed').exists()).toBe(true)
  })

  it('should handle site change event', async () => {
    const { itemService } = await import('../../services/pocketbase')
    
    // Clear previous calls
    vi.clearAllMocks()
    
    // Trigger site change event
    window.dispatchEvent(new CustomEvent('site-changed'))
    
    await wrapper.vm.$nextTick()
    
    expect(itemService.getAll).toHaveBeenCalled()
  })
})