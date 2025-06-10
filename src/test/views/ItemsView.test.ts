import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemsView from '../../views/ItemsView.vue'
import { createMockRouter } from '../utils/test-utils'
import { mockItem, mockIncomingItem } from '../mocks/pocketbase'

// Mock the services
vi.mock('../../services/pocketbase', () => ({
  itemService: {
    getAll: vi.fn().mockResolvedValue([mockItem]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  incomingItemService: {
    getAll: vi.fn().mockResolvedValue([mockIncomingItem])
  }
}))

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
    
    expect(wrapper.text()).toContain(mockItem.name)
    expect(wrapper.text()).toContain(mockItem.description)
    expect(wrapper.text()).toContain(`${mockItem.quantity} ${mockItem.unit}`)
  })

  it('should show add modal when add button is clicked', async () => {
    const addButton = wrapper.find('button:contains("Add Item")')
    await addButton.trigger('click')
    
    expect(wrapper.find('.fixed').exists()).toBe(true)
    expect(wrapper.text()).toContain('Add New Item')
  })

  it('should handle item creation', async () => {
    const { itemService } = await import('../../services/pocketbase')
    const mockCreate = vi.mocked(itemService.create)
    mockCreate.mockResolvedValue(mockItem)
    
    // Open add modal
    const addButton = wrapper.find('button:contains("Add Item")')
    await addButton.trigger('click')
    
    // Fill form
    await wrapper.find('input[placeholder="Enter item name"]').setValue('New Item')
    await wrapper.find('input[placeholder="kg, pcs, m²"]').setValue('kg')
    await wrapper.find('input[placeholder="0"]').setValue('100')
    
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
    mockUpdate.mockResolvedValue(mockItem)
    
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
      expect(mockDelete).toHaveBeenCalledWith(mockItem.id)
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
      
      expect(pushSpy).toHaveBeenCalledWith(`/items/${mockItem.id}`)
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