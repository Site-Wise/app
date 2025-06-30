import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MultiItemDeliveryModal from '../../../components/delivery/MultiItemDeliveryModal.vue'

// Mock external dependencies
vi.mock('../../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'delivery.editDelivery': 'Edit Delivery',
        'delivery.recordDelivery': 'Record Delivery',
        'delivery.multiItemSubtitle': 'Add multiple items to this delivery',
        'delivery.deliveryInfo': 'Delivery Information',
        'delivery.addItems': 'Add Items',
        'delivery.reviewDelivery': 'Review Delivery',
        'delivery.steps.deliveryInfo': 'Delivery Info',
        'delivery.steps.items': 'Items',
        'delivery.steps.review': 'Review',
        'common.vendor': 'Vendor',
        'common.next': 'Next',
        'common.back': 'Back',
        'common.cancel': 'Cancel',
        'common.create': 'Create',
        'common.update': 'Update',
        'common.total': 'Total',
        'forms.selectVendor': 'Select a vendor',
        'delivery.deliveryDate': 'Delivery Date',
        'delivery.deliveryReference': 'Delivery Reference',
        'delivery.deliveryReferencePlaceholder': 'Invoice/Bill number',
        'delivery.paymentStatus': 'Payment Status',
        'delivery.paidAmount': 'Paid Amount',
        'common.pending': 'Pending',
        'common.partial': 'Partial',
        'common.paid': 'Paid',
        'common.notes': 'Notes',
        'forms.deliveryNotes': 'Additional delivery notes...',
        'delivery.photos': 'Photos',
        'delivery.addItem': 'Add Item',
        'delivery.noItemsAdded': 'No items added yet',
        'delivery.deliveryTotals': 'Delivery Totals',
        'delivery.itemsSummary': 'Items Summary',
        'messages.createSuccess': 'Created successfully',
        'messages.updateSuccess': 'Updated successfully',
        'messages.error': 'An error occurred'
      }
      return translations[key] || key
    }
  })
}))

vi.mock('../../../composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}))

// Mock services
vi.mock('../../../services/pocketbase', () => ({
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
      { id: 'item-2', name: 'Bricks', unit: 'pieces' },
      { id: 'item-3', name: 'Steel', unit: 'kg' }
    ])
  }
}))

// Mock child components using stubs instead of vi.mock for better testing
const FileUploadComponentStub = {
  name: 'FileUploadComponent',
  template: '<div class="mock-file-upload">File Upload Component</div>',
  props: ['accept-types', 'multiple', 'allow-camera'],
  emits: ['files-selected']
}

const DeliveryItemRowStub = {
  name: 'DeliveryItemRow',
  template: '<div class="mock-delivery-item-row" :data-testid="`item-row-${index}`">Item Row {{ index }}</div>',
  props: ['item', 'index', 'items', 'usedItems'],
  emits: ['update', 'remove'],
  setup(props: any, { emit }: any) {
    return {
      $emit: emit
    }
  }
}

describe('MultiItemDeliveryModal', () => {
  let wrapper: any

  const createWrapper = (props = {}) => {
    return mount(MultiItemDeliveryModal, {
      props: {
        ...props
      },
      global: {
        stubs: {
          'FileUploadComponent': FileUploadComponentStub,
          'DeliveryItemRow': DeliveryItemRowStub
        }
      },
      attachTo: document.body
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    it('should render with correct initial state', async () => {
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.find('h3').text()).toBe('Record Delivery')
      expect(wrapper.text()).toContain('Delivery Information')
      expect(wrapper.text()).toContain('Delivery Info')
    })

    it('should show edit mode when editing delivery', async () => {
      const mockDelivery = {
        id: 'delivery-1',
        vendor: 'vendor-1',
        delivery_date: '2024-01-15',
        delivery_reference: 'INV-001',
        notes: 'Test notes',
        payment_status: 'pending',
        paid_amount: 0
      }

      wrapper = createWrapper({ editingDelivery: mockDelivery })
      await nextTick()

      expect(wrapper.find('h3').text()).toBe('Edit Delivery')
    })

    it('should load vendors and items data on mount', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Wait for data loading to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      const vendorSelect = wrapper.find('select')
      const options = vendorSelect.findAll('option')
      
      expect(options).toHaveLength(3) // 2 vendors + placeholder
      expect(options[1].text()).toBe('ABC Construction')
      expect(options[2].text()).toBe('XYZ Suppliers')
    })
  })

  describe('Step Navigation', () => {
    it('should start at step 0 (Delivery Info)', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Wait for data loading to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      expect(wrapper.text()).toContain('Delivery Information')
      
      const buttons = wrapper.findAll('button')
      const nextButton = buttons.find((btn: any) => btn.text().includes('Next'))
      expect(nextButton).toBeDefined()
      expect(nextButton.text()).toContain('Next')
    })

    it('should not proceed to next step without required fields', async () => {
      wrapper = createWrapper()
      await nextTick()

      const nextButton = wrapper.find('button[class*="btn-primary"]')
      expect(nextButton.attributes('disabled')).toBeDefined()
    })

    it('should proceed to next step when delivery info is filled', async () => {
      wrapper = createWrapper()
      await nextTick()

      // Fill required fields
      await wrapper.find('select').setValue('vendor-1')
      await wrapper.find('input[type="date"]').setValue('2024-01-15')
      await nextTick()

      const nextButton = wrapper.find('button[class*="btn-primary"]')
      expect(nextButton.attributes('disabled')).toBeUndefined()

      await nextButton.trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('Add Items')
    })
  })

  describe('Delivery Items Management', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await nextTick()

      // Move to items step
      await wrapper.find('select').setValue('vendor-1')
      await wrapper.find('input[type="date"]').setValue('2024-01-15')
      await nextTick()
      
      const nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()
    })

    it('should show one empty item by default', () => {
      expect(wrapper.findAll('[data-testid^="item-row-"]')).toHaveLength(1)
    })

    it('should add new item when add button is clicked', async () => {
      const addButton = wrapper.find('button[class*="btn-primary"]')
      await addButton.trigger('click')
      await nextTick()

      expect(wrapper.findAll('[data-testid^="item-row-"]')).toHaveLength(2)
    })

    it('should remove item when remove event is emitted', async () => {
      // First add another item
      const addButton = wrapper.find('button[class*="btn-primary"]')
      await addButton.trigger('click')
      await nextTick()

      expect(wrapper.findAll('[data-testid^="item-row-"]')).toHaveLength(2)

      // Directly call the removeDeliveryItem method
      wrapper.vm.removeDeliveryItem(0)
      await nextTick()

      expect(wrapper.findAll('[data-testid^="item-row-"]')).toHaveLength(1)
    })

    it('should update total when item is updated', async () => {
      // Simulate item update with calculated total
      const updatedItem = {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 5,
        unit_price: 100,
        total_amount: 500,
        notes: ''
      }

      // Directly call the updateDeliveryItem method
      wrapper.vm.updateDeliveryItem(0, updatedItem)
      await nextTick()

      // Check if the total amount is calculated correctly
      expect(wrapper.vm.totalAmount).toBe(500)
    })

    it('should calculate correct total with multiple items', async () => {
      // Add second item
      const addButton = wrapper.find('button[class*="btn-primary"]')
      await addButton.trigger('click')
      await nextTick()

      // Update first item
      wrapper.vm.updateDeliveryItem(0, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 2,
        unit_price: 50,
        total_amount: 100,
        notes: ''
      })

      // Update second item
      wrapper.vm.updateDeliveryItem(1, {
        tempId: 'temp-2',
        item: 'item-2',
        quantity: 3,
        unit_price: 75,
        total_amount: 225,
        notes: ''
      })

      await nextTick()

      expect(wrapper.vm.totalAmount).toBe(325) // 100 + 225
    })
  })

  describe('Total Calculation Accuracy', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await nextTick()

      // Move to items step
      await wrapper.find('select').setValue('vendor-1')
      await wrapper.find('input[type="date"]').setValue('2024-01-15')
      await nextTick()
      
      const nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()
    })

    it('should handle decimal calculations correctly', async () => {
      // Test decimal calculation: 2.5 * 123.45 = 308.625, should round to 308.63
      wrapper.vm.updateDeliveryItem(0, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 2.5,
        unit_price: 123.45,
        total_amount: 308.63, // This should be calculated by DeliveryItemRow
        notes: ''
      })

      await nextTick()
      expect(wrapper.vm.totalAmount).toBe(308.63)
    })

    it('should handle zero values correctly', async () => {
      wrapper.vm.updateDeliveryItem(0, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 0,
        unit_price: 100,
        total_amount: 0,
        notes: ''
      })

      await nextTick()
      expect(wrapper.vm.totalAmount).toBe(0)
    })

    it('should maintain precision with multiple decimal items', async () => {
      // Add second item
      const addButton = wrapper.find('button[class*="btn-primary"]')
      await addButton.trigger('click')
      await nextTick()

      // First item: 1.33 * 25.50 = 33.915, rounds to 33.92
      wrapper.vm.updateDeliveryItem(0, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 1.33,
        unit_price: 25.50,
        total_amount: 33.92,
        notes: ''
      })

      // Second item: 2.66 * 37.75 = 100.415, rounds to 100.42
      wrapper.vm.updateDeliveryItem(1, {
        tempId: 'temp-2',
        item: 'item-2',
        quantity: 2.66,
        unit_price: 37.75,
        total_amount: 100.42,
        notes: ''
      })

      await nextTick()
      expect(wrapper.vm.totalAmount).toBe(134.34) // 33.92 + 100.42
    })
  })

  describe('Form Validation', () => {
    it('should validate delivery info before proceeding to items', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Wait for data loading
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Initially false because vendor is empty (delivery_date is auto-filled with today)
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Clear delivery date to test validation properly
      await wrapper.find('input[type="date"]').setValue('')
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Fill vendor only (should still be false)
      await wrapper.find('select').setValue('vendor-1')
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Fill delivery date (should now be true)
      await wrapper.find('input[type="date"]').setValue('2024-01-15')
      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(true)
    })

    it('should validate items before proceeding to review', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Wait for data loading
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Move to items step
      await wrapper.find('select').setValue('vendor-1')
      await wrapper.find('input[type="date"]').setValue('2024-01-15')
      await nextTick()
      
      const nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()

      // Should be false with empty item
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Add valid item
      wrapper.vm.updateDeliveryItem(0, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 2,
        unit_price: 50,
        total_amount: 100,
        notes: ''
      })

      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(true)
    })

    it('should validate all items have required fields', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Wait for data loading
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Move to items step and add items
      await wrapper.find('select').setValue('vendor-1')
      await wrapper.find('input[type="date"]').setValue('2024-01-15')
      await nextTick()
      
      let nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()

      // Add second item
      const addButton = wrapper.find('button[class*="btn-primary"]')
      await addButton.trigger('click')
      await nextTick()

      // Update first item (valid)
      wrapper.vm.updateDeliveryItem(0, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 2,
        unit_price: 50,
        total_amount: 100,
        notes: ''
      })

      // Update second item (invalid - missing item)
      wrapper.vm.updateDeliveryItem(1, {
        tempId: 'temp-2',
        item: '', // Missing item
        quantity: 1,
        unit_price: 30,
        total_amount: 30,
        notes: ''
      })

      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(false)

      // Fix second item
      wrapper.vm.updateDeliveryItem(1, {
        tempId: 'temp-2',
        item: 'item-2',
        quantity: 1,
        unit_price: 30,
        total_amount: 30,
        notes: ''
      })

      await nextTick()
      expect(wrapper.vm.canProceedToNextStep).toBe(true)
    })
  })

  describe('Form Submission', () => {
    it('should create delivery with correct total amount', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Wait for data loading
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Complete form
      await wrapper.find('select').setValue('vendor-1')
      await wrapper.find('input[type="date"]').setValue('2024-01-15')
      await nextTick()
      
      let nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()

      // Add item
      wrapper.vm.updateDeliveryItem(0, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 5,
        unit_price: 100,
        total_amount: 500,
        notes: 'Test notes'
      })

      await nextTick()

      // Move to review step
      const buttons = wrapper.findAll('button')
      nextButton = buttons.find((btn: any) => btn.text().includes('Next'))
      
      await nextButton.trigger('click')
      await nextTick()

      // Submit - find the submit button in review step
      const reviewButtons = wrapper.findAll('button')
      const submitButton = reviewButtons.find((btn: any) => {
        const text = btn.text()
        const classes = btn.classes()
        return text.includes('Create') || text.includes('Update') || classes.includes('bg-green-600')
      })
      
      expect(submitButton).toBeDefined()
      await submitButton.trigger('click')
      await nextTick()

      const { deliveryService } = await import('../../../services/pocketbase')
      expect(deliveryService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor: 'vendor-1',
          delivery_date: '2024-01-15',
          total_amount: 500
        })
      )
    })
  })
})