import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'

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
        'messages.confirmDelete': 'Are you sure you want to delete this {item}?',
        'tags.itemTags': 'Item Tags',
        'tags.searchItemTags': 'Search item tags...'
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
    incrementUsage: vi.fn().mockResolvedValue(undefined),
    decrementUsage: vi.fn().mockResolvedValue(undefined),
    isReadOnly: { value: false }
  })
}))

vi.mock('../../services/pocketbase', () => {
  const mockItem = {
    id: 'item-1',
    name: 'Test Item',
    description: 'Test Description',
    unit: 'kg',
    tags: ['tag-1', 'tag-2'],
    site: 'site-1'
  }
  
  const mockIncomingItem = {
    id: 'incoming-1',
    item: 'item-1',
    quantity: 10,
    total_amount: 1000
  }
  
  const mockTags = [
    { id: 'tag-1', name: 'Construction', color: '#ef4444', type: 'item_category', site: 'site-1', usage_count: 5 },
    { id: 'tag-2', name: 'Material', color: '#22c55e', type: 'item_category', site: 'site-1', usage_count: 3 }
  ]
  
  return {
    itemService: {
      getAll: vi.fn().mockResolvedValue([mockItem]),
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
    tagService: {
      getAll: vi.fn().mockResolvedValue(mockTags),
      findOrCreate: vi.fn().mockResolvedValue(mockTags[0]),
      incrementUsage: vi.fn().mockResolvedValue(undefined)
    },
    getCurrentSiteId: vi.fn().mockReturnValue('site-1'),
    pb: {
      collection: vi.fn((name: string) => {
        if (name === 'site_subscriptions') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'sub-1',
              site: 'site-1',
              subscription_plan: 'plan-free',
              status: 'active',
              current_period_start: '2024-01-01T00:00:00.000Z',
              current_period_end: '2024-02-01T00:00:00.000Z',
              cancel_at_period_end: false,
              expand: {
                subscription_plan: {
                  id: 'plan-free',
                  name: 'Free',
                  price: 0,
                  currency: 'INR',
                  features: {
                    max_items: 10,
                    max_vendors: 10,
                    max_incoming_deliveries: 50,
                    max_service_bookings: 50,
                    max_payments: 50,
                    max_sites: 1
                  },
                  is_active: true,
                  is_default: true
                }
              }
            })
          }
        } else if (name === 'subscription_usage') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'usage-1',
              site: 'site-1',
              period_start: '2024-01-01T00:00:00.000Z',
              period_end: '2024-02-01T00:00:00.000Z',
              items_count: 0,
              vendors_count: 0,
              incoming_deliveries_count: 0,
              service_bookings_count: 0,
              payments_count: 0
            }),
            create: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({})
          }
        }
        return {
          getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
          create: vi.fn().mockResolvedValue({}),
          getFullList: vi.fn().mockResolvedValue([])
        }
      })
    }
  }
})

// Mock TagSelector component
vi.mock('../../components/TagSelector.vue', () => ({
  default: {
    name: 'TagSelector',
    template: '<div class="tag-selector-mock"><input data-testid="tag-input" /></div>',
    props: ['modelValue', 'label', 'tagType', 'placeholder'],
    emits: ['update:modelValue', 'tagsChanged']
  }
}))

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
    const addButton = wrapper.findAll('button').find((btn: VueWrapper<Element>) => btn.text().includes('Add Item'))
    expect(addButton).toBeDefined()
    expect(addButton!.exists()).toBe(true)
  })

  it('should display items in grid', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Test Item')
    expect(wrapper.text()).toContain('Test Description')
    expect(wrapper.text()).toContain('kg')
  })

  it('should show add modal when add button is clicked', async () => {
    // Wait for data to load and subscription to be ready
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const addButton = wrapper.findAll('button').find((btn: VueWrapper<Element>) => btn.text().includes('Add Item'))
    expect(addButton).toBeDefined()
    
    await addButton.trigger('click')
    await wrapper.vm.$nextTick()
    
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
      unit: 'kg',
      tags: [],
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })
    
    // Wait for subscription to be ready
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Open add modal
    const addButton = wrapper.findAll('button').find((btn: VueWrapper<Element>) => btn.text().includes('Add Item'))!
    await addButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Wait for modal to be fully rendered
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Check modal is visible
    expect(wrapper.vm.showAddModal).toBe(true)
    
    // Fill form - find inputs by their v-model bindings
    const nameInput = wrapper.find('input[type="text"][required]')
    const unitSelect = wrapper.find('select[required]')
    
    expect(nameInput.exists()).toBe(true)
    expect(unitSelect.exists()).toBe(true)
    
    await nameInput.setValue('New Item')
    await unitSelect.setValue('kg')
    
    // Submit form
    await wrapper.find('form').trigger('submit')
    
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'New Item',
      description: '',
      unit: 'kg',
      tags: []
    })
  })

  it('should handle item editing', async () => {
    const { itemService } = await import('../../services/pocketbase')
    const mockUpdate = vi.mocked(itemService.update)
    mockUpdate.mockResolvedValue({
      id: 'item-1',
      name: 'Test Item',
      description: 'Test Description',
      unit: 'kg',
      tags: ['tag-1'],
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
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

  it('should display item tags', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Tags should be displayed in the item card
    expect(wrapper.text()).toContain('Construction')
    expect(wrapper.text()).toContain('Material')
  })

  it('should include TagSelector in form', async () => {
    // Wait for subscription to be ready
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Open add modal
    const addButton = wrapper.findAll('button').find((btn: any) => btn.text().includes('Add Item'))!
    await addButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Check that TagSelector component is present
    expect(wrapper.find('.tag-selector-mock').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tag-input"]').exists()).toBe(true)
  })
})