import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MultiItemDeliveryModal from '../../../components/delivery/MultiItemDeliveryModal.vue'

// Mock composables
vi.mock('../../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('../../../composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}))

// Mock services - use vi.hoisted to ensure variables are available
const mockServices = vi.hoisted(() => ({
  deliveryService: {
    create: vi.fn().mockResolvedValue({ id: 'delivery-1' }),
    update: vi.fn().mockResolvedValue({ id: 'delivery-1' }),
    uploadPhoto: vi.fn().mockResolvedValue(true)
  },
  deliveryItemService: {
    createMultiple: vi.fn().mockResolvedValue(true)
  },
  vendorService: {
    getAll: vi.fn().mockResolvedValue([
      { id: 'vendor-1', name: 'ABC Construction' },
      { id: 'vendor-2', name: 'XYZ Suppliers' }
    ])
  },
  itemService: {
    getAll: vi.fn().mockResolvedValue([
      { id: 'item-1', name: 'Cement', unit: 'kg' },
      { id: 'item-2', name: 'Bricks', unit: 'pieces' }
    ])
  }
}))

vi.mock('../../../services/pocketbase', () => mockServices)

// Mock child components to avoid complex interactions
vi.mock('../../../components/FileUploadComponent.vue', () => ({
  default: {
    name: 'FileUploadComponent',
    template: '<div class="mock-file-upload">File Upload</div>',
    props: ['accept-types', 'multiple', 'allow-camera'],
    emits: ['files-selected']
  }
}))

vi.mock('../../../components/delivery/DeliveryItemRow.vue', () => ({
  default: {
    name: 'DeliveryItemRow',
    template: '<div class="mock-delivery-item-row">Item Row</div>',
    props: ['item', 'index', 'items', 'usedItems'],
    emits: ['update', 'remove']
  }
}))

describe('MultiItemDeliveryModal - Core Logic', () => {
  let wrapper: any

  const createWrapper = (props = {}) => {
    return mount(MultiItemDeliveryModal, {
      props: {
        ...props
      },
      attachTo: document.body
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Total Calculation Logic', () => {
    it('should calculate total amount correctly from delivery items', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Wait for component to initialize
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Manually set delivery items to test total calculation
      wrapper.vm.deliveryItems = [
        {
          tempId: 'temp-1',
          item: 'item-1',
          quantity: 2,
          unit_price: 100,
          total_amount: 200,
          notes: ''
        },
        {
          tempId: 'temp-2',
          item: 'item-2',
          quantity: 3,
          unit_price: 50,
          total_amount: 150,
          notes: ''
        }
      ]

      await nextTick()

      expect(wrapper.vm.totalAmount).toBe(350) // 200 + 150
    })

    it('should handle decimal calculations correctly', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      wrapper.vm.deliveryItems = [
        {
          tempId: 'temp-1',
          item: 'item-1',
          quantity: 2.5,
          unit_price: 123.45,
          total_amount: 308.63, // 2.5 * 123.45 = 308.625, rounded to 308.63
          notes: ''
        }
      ]

      await nextTick()

      expect(wrapper.vm.totalAmount).toBe(308.63)
    })

    it('should handle zero values correctly', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      wrapper.vm.deliveryItems = [
        {
          tempId: 'temp-1',
          item: 'item-1',
          quantity: 0,
          unit_price: 100,
          total_amount: 0,
          notes: ''
        }
      ]

      await nextTick()

      expect(wrapper.vm.totalAmount).toBe(0)
    })

    it('should maintain precision with multiple decimal items', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      wrapper.vm.deliveryItems = [
        {
          tempId: 'temp-1',
          item: 'item-1',
          quantity: 1.33,
          unit_price: 25.50,
          total_amount: 33.92, // 1.33 * 25.50 = 33.915, rounded to 33.92
          notes: ''
        },
        {
          tempId: 'temp-2',
          item: 'item-2',
          quantity: 2.66,
          unit_price: 37.75,
          total_amount: 100.42, // 2.66 * 37.75 = 100.415, rounded to 100.42
          notes: ''
        }
      ]

      await nextTick()

      expect(wrapper.vm.totalAmount).toBe(134.34) // 33.92 + 100.42
    })
  })

  describe('Validation Logic', () => {
    it('should validate delivery info step correctly', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Initially should not be able to proceed (missing vendor, date is auto-filled)
      // Clear the auto-filled date first
      wrapper.vm.deliveryForm.delivery_date = ''
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Set vendor only
      wrapper.vm.deliveryForm.vendor = 'vendor-1'
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Set delivery date as well
      wrapper.vm.deliveryForm.delivery_date = '2024-01-15'
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(true)
    })

    it('should validate items step correctly', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Move to step 1 (items)
      wrapper.vm.currentStep = 1

      // Should be false with empty items
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Add invalid item (missing required fields)
      wrapper.vm.deliveryItems = [
        {
          tempId: 'temp-1',
          item: '', // Missing item
          quantity: 2,
          unit_price: 100,
          total_amount: 200,
          notes: ''
        }
      ]
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Add valid item
      wrapper.vm.deliveryItems = [
        {
          tempId: 'temp-1',
          item: 'item-1',
          quantity: 2,
          unit_price: 100,
          total_amount: 200,
          notes: ''
        }
      ]
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(true)
    })

    it('should validate all items have required fields', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      wrapper.vm.currentStep = 1

      // Multiple items with one invalid
      wrapper.vm.deliveryItems = [
        {
          tempId: 'temp-1',
          item: 'item-1',
          quantity: 2,
          unit_price: 100,
          total_amount: 200,
          notes: ''
        },
        {
          tempId: 'temp-2',
          item: 'item-2',
          quantity: 0, // Invalid quantity
          unit_price: 50,
          total_amount: 0,
          notes: ''
        }
      ]
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Fix the invalid item
      wrapper.vm.deliveryItems[1].quantity = 3
      wrapper.vm.deliveryItems[1].total_amount = 150
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(true)
    })
  })

  describe('Item Management Logic', () => {
    it('should add new items correctly', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      const initialCount = wrapper.vm.deliveryItems.length
      
      wrapper.vm.addNewItem()
      await nextTick()

      expect(wrapper.vm.deliveryItems.length).toBe(initialCount + 1)
      
      const newItem = wrapper.vm.deliveryItems[wrapper.vm.deliveryItems.length - 1]
      expect(newItem.tempId).toBeDefined()
      expect(newItem.item).toBe('')
      expect(newItem.quantity).toBe(1)
      expect(newItem.unit_price).toBe(0)
      expect(newItem.total_amount).toBe(0)
    })

    it('should remove items correctly', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Add some items first
      wrapper.vm.deliveryItems = [
        { tempId: 'temp-1', item: 'item-1', quantity: 1, unit_price: 100, total_amount: 100, notes: '' },
        { tempId: 'temp-2', item: 'item-2', quantity: 2, unit_price: 50, total_amount: 100, notes: '' }
      ]
      await nextTick()

      expect(wrapper.vm.deliveryItems.length).toBe(2)

      wrapper.vm.removeDeliveryItem(0)
      await nextTick()

      expect(wrapper.vm.deliveryItems.length).toBe(1)
      expect(wrapper.vm.deliveryItems[0].tempId).toBe('temp-2')
    })

    it('should update items correctly', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      wrapper.vm.deliveryItems = [
        { tempId: 'temp-1', item: 'item-1', quantity: 1, unit_price: 100, total_amount: 100, notes: '' }
      ]
      await nextTick()

      const updatedItem = {
        tempId: 'temp-1',
        item: 'item-2',
        quantity: 3,
        unit_price: 75,
        total_amount: 225,
        notes: 'Updated notes'
      }

      wrapper.vm.updateDeliveryItem(0, updatedItem)
      await nextTick()

      expect(wrapper.vm.deliveryItems[0]).toEqual(updatedItem)
      expect(wrapper.vm.totalAmount).toBe(225)
    })
  })

  describe('Submission Logic', () => {
    it('should create delivery with correct total amount', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Set up form data
      wrapper.vm.deliveryForm.vendor = 'vendor-1'
      wrapper.vm.deliveryForm.delivery_date = '2024-01-15'
      wrapper.vm.deliveryItems = [
        {
          tempId: 'temp-1',
          item: 'item-1',
          quantity: 5,
          unit_price: 100,
          total_amount: 500,
          notes: 'Test notes'
        }
      ]
      await nextTick()

      expect(wrapper.vm.canSubmit).toBe(true)
      expect(wrapper.vm.totalAmount).toBe(500)

      await wrapper.vm.saveDelivery()

      expect(mockServices.deliveryService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor: 'vendor-1',
          delivery_date: '2024-01-15',
          total_amount: 500
        })
      )
    })
  })
})