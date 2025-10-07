import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia } from 'pinia'
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
        'delivery.photoUploadError': 'Failed to upload photo. Please try again.',
        'delivery.addItem': 'Add Item',
        'delivery.noItemsAdded': 'No items added yet',
        'delivery.deliveryTotals': 'Delivery Totals',
        'delivery.itemsSummary': 'Items Summary',
        'messages.createSuccess': 'Created successfully',
        'messages.updateSuccess': 'Updated successfully',
        'messages.error': 'An error occurred',
        'forms.searchItems': 'Search items...',
        'items.noItemsFound': 'No items found'
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
    uploadPhoto: vi.fn().mockResolvedValue('photo-filename.jpg'),
    uploadPhotos: vi.fn().mockResolvedValue(['photo1.jpg', 'photo2.jpg', 'photo3.jpg']),
    getAll: vi.fn().mockResolvedValue([])
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
  },
  paymentService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  serviceBookingService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  VendorService: {
    calculateOutstandingFromData: vi.fn().mockReturnValue(0),
    calculateTotalPaidFromData: vi.fn().mockReturnValue(0)
  },
  // Required functions for Pinia store compatibility
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
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
  // PocketBase client for subscription store
  pb: {
    authStore: { isValid: true, model: { id: 'user-1' } },
    collection: vi.fn(() => ({
      getFirstListItem: vi.fn().mockResolvedValue({}),
      getFullList: vi.fn().mockResolvedValue([])
    }))
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
  methods: {
    focusItemSelector() {
      // Mock method for focus functionality
    }
  }
}

const ItemSelectorStub = {
  name: 'ItemSelector',
  template: '<div class="mock-item-selector"><input class="item-selector-input" /></div>',
  props: ['modelValue', 'items', 'usedItems', 'label', 'placeholder'],
  emits: ['update:modelValue', 'itemSelected']
}

const VendorSearchBoxStub = {
  name: 'VendorSearchBox',
  template: '<input class="mock-vendor-search" :value="modelValue" @input="updateValue" placeholder="Search vendors..." />',
  props: ['modelValue', 'vendors', 'deliveries', 'service-bookings', 'payments', 'placeholder', 'autofocus', 'required'],
  emits: ['update:modelValue', 'vendor-selected'],
  methods: {
    updateValue(event: any) {
      this.$emit('update:modelValue', event.target.value)
      if (event.target.value === 'vendor-1') {
        this.$emit('vendor-selected', { id: 'vendor-1', name: 'Test Vendor' })
      }
    }
  }
}

describe('MultiItemDeliveryModal', () => {
  let wrapper: any

  // Helper function to fill vendor and proceed to next step
  const fillVendorInfo = async (wrapper: any, vendor = 'vendor-1', date = '2024-01-15') => {
    const vendorInput = wrapper.find('.mock-vendor-search')
    await vendorInput.setValue(vendor)
    await vendorInput.trigger('input')
    await wrapper.find('input[type="date"]').setValue(date)
    await nextTick()
  }

  const createWrapper = (props = {}) => {
    const pinia = createPinia()
    return mount(MultiItemDeliveryModal, {
      props: {
        ...props
      },
      global: {
        plugins: [pinia],
        stubs: {
          'FileUploadComponent': FileUploadComponentStub,
          'DeliveryItemRow': DeliveryItemRowStub,
          'ItemSelector': ItemSelectorStub,
          'VendorSearchBox': VendorSearchBoxStub
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

      // Check that VendorSearchBox component is rendered (not select)
      const vendorSearchBox = wrapper.find('.mock-vendor-search')
      expect(vendorSearchBox.exists()).toBe(true)

      // Verify vendor data is loaded in component
      expect(wrapper.vm.vendors).toHaveLength(2)
      expect(wrapper.vm.vendors[0].name).toBe('ABC Construction')
      expect(wrapper.vm.vendors[1].name).toBe('XYZ Suppliers')
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

      // Fill required fields using the vendor search box
      await fillVendorInfo(wrapper)

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
      await fillVendorInfo(wrapper)
      
      const nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()
    })

    it('should show one empty item by default', () => {
      expect(wrapper.findAll('[data-testid^="item-row-"]')).toHaveLength(1)
    })

    it('should save new item and create another form when saveNewItem is called', async () => {
      // Update the new item form with valid data
      wrapper.vm.updateNewItem(-1, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 2,
        unit_price: 50,
        total_amount: 100,
        notes: ''
      })
      await nextTick()

      // Save the new item
      await wrapper.vm.saveNewItem()
      await nextTick()

      // Should have one completed item and a new empty form
      expect(wrapper.vm.completedDeliveryItems).toHaveLength(1)
      expect(wrapper.vm.newItemForm).toBeTruthy()
      expect(wrapper.vm.newItemForm.item).toBe('') // New form should be empty

      // Should show both new item form and completed item
      expect(wrapper.findAll('[data-testid^="item-row-"]')).toHaveLength(2) // One for new form (-1), one for completed (0)
    })

    it('should remove completed item and keep new item form when removeDeliveryItem is called', async () => {
      // First add a completed item
      wrapper.vm.updateNewItem(-1, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 2,
        unit_price: 50,
        total_amount: 100,
        notes: ''
      })
      await wrapper.vm.saveNewItem()
      await nextTick()

      expect(wrapper.vm.completedDeliveryItems).toHaveLength(1)
      expect(wrapper.findAll('[data-testid^="item-row-"]')).toHaveLength(2) // New form + completed item

      // Remove the completed item
      wrapper.vm.removeDeliveryItem(0)
      await nextTick()

      // Should have no completed items but still have new item form
      expect(wrapper.vm.completedDeliveryItems).toHaveLength(0)
      expect(wrapper.vm.newItemForm).toBeTruthy()
      expect(wrapper.findAll('[data-testid^="item-row-"]')).toHaveLength(1) // Only new form
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
      await fillVendorInfo(wrapper)
      
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
      const vendorInput = wrapper.find('.mock-vendor-search')
      await vendorInput.setValue('vendor-1')
      await vendorInput.trigger('input')
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
      await fillVendorInfo(wrapper)
      
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
      await fillVendorInfo(wrapper, 'vendor-1', '2024-01-15')
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

      // Complete form using VendorSearchBox
      await fillVendorInfo(wrapper, 'vendor-1', '2024-01-15')
      await nextTick()
      
      let nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()

      // Add item through new item form
      wrapper.vm.updateNewItem(-1, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 5,
        unit_price: 100,
        total_amount: 500,
        notes: 'Test notes'
      })
      await wrapper.vm.saveNewItem()

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

  describe('Photo Upload Functionality', () => {
    it('should upload multiple photos successfully during delivery creation', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Wait for data loading
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Set up photo files
      const mockFiles = [
        new File(['photo1'], 'photo1.jpg', { type: 'image/jpeg' }),
        new File(['photo2'], 'photo2.jpg', { type: 'image/jpeg' }),
        new File(['photo3'], 'photo3.jpg', { type: 'image/jpeg' })
      ]
      
      wrapper.vm.selectedFilesForUpload = mockFiles

      // Complete form for delivery creation using VendorSearchBox
      await fillVendorInfo(wrapper, 'vendor-1', '2024-01-15')
      await nextTick()

      // Move to items step
      let nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()

      // Add item through new item form
      wrapper.vm.updateNewItem(-1, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 50,
        total_amount: 500,
        notes: ''
      })
      await wrapper.vm.saveNewItem()
      await nextTick()

      // Navigate to final step and submit
      wrapper.vm.currentStep = 2
      await nextTick()

      // Submit the delivery
      const submitButton = wrapper.findAll('button').find(btn => {
        const text = btn.text()
        const classes = btn.classes()
        return text.includes('Create') || text.includes('Update') || classes.includes('bg-green-600')
      })
      
      await submitButton.trigger('click')
      await nextTick()

      const { deliveryService } = await import('../../../services/pocketbase')
      expect(deliveryService.uploadPhotos).toHaveBeenCalledWith('delivery-1', mockFiles)
    })

    it('should handle photo upload failure gracefully', async () => {
      const { deliveryService } = await import('../../../services/pocketbase')
      deliveryService.uploadPhotos.mockRejectedValueOnce(new Error('Upload failed'))

      wrapper = createWrapper()
      await nextTick()
      
      // Wait for data loading
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Set up photo files
      const mockFiles = [
        new File(['photo1'], 'photo1.jpg', { type: 'image/jpeg' })
      ]
      
      wrapper.vm.selectedFilesForUpload = mockFiles

      // Complete form using VendorSearchBox
      await fillVendorInfo(wrapper, 'vendor-1', '2024-01-15')
      await nextTick()

      // Move to items step
      let nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()

      // Add item through new item form
      wrapper.vm.updateNewItem(-1, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 5,
        unit_price: 100,
        total_amount: 500,
        notes: ''
      })
      await wrapper.vm.saveNewItem()
      await nextTick()

      // Navigate to final step and submit
      wrapper.vm.currentStep = 2
      await nextTick()

      const submitButton = wrapper.findAll('button').find(btn => {
        const text = btn.text()
        return text.includes('Create') || text.includes('Update')
      })
      
      await submitButton.trigger('click')
      await nextTick()

      // Should still create delivery even if photo upload fails
      expect(deliveryService.create).toHaveBeenCalled()
      expect(deliveryService.uploadPhotos).toHaveBeenCalledWith('delivery-1', mockFiles)
    })

    it('should update existing photos list when editing delivery with new photos', async () => {
      const mockEditingDelivery = {
        id: 'delivery-1',
        vendor: 'vendor-1',
        delivery_date: '2024-01-15',
        delivery_reference: 'REF-001',
        photos: ['existing1.jpg', 'existing2.jpg'],
        notes: 'Test delivery',
        total_amount: 500,
        expand: {
          delivery_items: [
            {
              id: 'item-1',
              item: 'item-1',
              quantity: 5,
              unit_price: 100,
              total_amount: 500,
              notes: ''
            }
          ]
        }
      }

      wrapper = createWrapper({ editingDelivery: mockEditingDelivery })
      await nextTick()
      
      // Wait for data loading
      await new Promise(resolve => setTimeout(resolve, 50))
      await nextTick()

      // Add new photos
      const mockNewFiles = [
        new File(['photo3'], 'photo3.jpg', { type: 'image/jpeg' })
      ]
      
      wrapper.vm.selectedFilesForUpload = mockNewFiles

      // Submit the update
      wrapper.vm.currentStep = 2
      await nextTick()

      const submitButton = wrapper.findAll('button').find(btn => {
        const text = btn.text()
        return text.includes('Update')
      })
      
      await submitButton.trigger('click')
      await nextTick()

      const { deliveryService } = await import('../../../services/pocketbase')
      expect(deliveryService.uploadPhotos).toHaveBeenCalledWith('delivery-1', mockNewFiles)
      
      // Should update existingPhotos with new uploads (mock returns static array regardless of input)
      expect(wrapper.vm.existingPhotos).toEqual(['existing1.jpg', 'existing2.jpg', 'photo1.jpg', 'photo2.jpg', 'photo3.jpg'])
    })

    it('should handle files selection properly', async () => {
      wrapper = createWrapper()
      await nextTick()

      const mockFiles = [
        new File(['photo1'], 'photo1.jpg', { type: 'image/jpeg' }),
        new File(['photo2'], 'photo2.jpg', { type: 'image/jpeg' })
      ]

      // Test handleFilesSelected method
      wrapper.vm.handleFilesSelected(mockFiles)
      expect(wrapper.vm.selectedFilesForUpload).toEqual(mockFiles)
    })

    it('should clear selected files when form is reset', async () => {
      wrapper = createWrapper()
      await nextTick()

      const mockFiles = [
        new File(['photo1'], 'photo1.jpg', { type: 'image/jpeg' })
      ]

      wrapper.vm.selectedFilesForUpload = mockFiles
      expect(wrapper.vm.selectedFilesForUpload.length).toBe(1)

      // Reset form
      await wrapper.vm.resetForm()
      expect(wrapper.vm.selectedFilesForUpload.length).toBe(0)
    })
  })

  describe('Delivery Items Association', () => {
    it('should properly associate delivery items with delivery record', async () => {
      const { deliveryService, deliveryItemService } = await import('../../../services/pocketbase')
      
      // Mock the createMultiple to return items with IDs
      const mockCreatedItems = [
        { id: 'di-1', item: 'item-1', quantity: 5, unit_price: 100, total_amount: 500 },
        { id: 'di-2', item: 'item-2', quantity: 10, unit_price: 50, total_amount: 500 }
      ]
      deliveryItemService.createMultiple.mockResolvedValueOnce(mockCreatedItems)
      
      wrapper = createWrapper()
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Complete form using VendorSearchBox
      await fillVendorInfo(wrapper, 'vendor-1', '2024-01-15')
      await nextTick()

      // Move to items step
      let nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()

      // Add multiple items through new item form
      wrapper.vm.updateNewItem(-1, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 5,
        unit_price: 100,
        total_amount: 500,
        notes: ''
      })
      await wrapper.vm.saveNewItem()
      await nextTick()

      wrapper.vm.updateNewItem(-1, {
        tempId: 'temp-2',
        item: 'item-2',
        quantity: 10,
        unit_price: 50,
        total_amount: 500,
        notes: ''
      })
      await wrapper.vm.saveNewItem()
      await nextTick()
      
      // Move to review step
      wrapper.vm.currentStep = 2
      await nextTick()
      
      // Submit using the component method directly
      await wrapper.vm.saveDelivery()
      await nextTick()
      
      // Verify deliveryItemService.createMultiple was called with correct data
      expect(deliveryItemService.createMultiple).toHaveBeenCalledWith(
        'delivery-1',
        [
          { item: 'item-1', quantity: 5, unit_price: 100, notes: '' },
          { item: 'item-2', quantity: 10, unit_price: 50, notes: '' }
        ]
      )
    })

    it('should handle delivery items association even with photo upload', async () => {
      const { deliveryService, deliveryItemService } = await import('../../../services/pocketbase')
      
      // Mock the createMultiple to return items with IDs
      const mockCreatedItems = [
        { id: 'di-1', item: 'item-1', quantity: 5, unit_price: 100, total_amount: 500 }
      ]
      deliveryItemService.createMultiple.mockResolvedValueOnce(mockCreatedItems)
      
      wrapper = createWrapper()
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Set up photo files
      const mockFiles = [
        new File(['photo1'], 'photo1.jpg', { type: 'image/jpeg' }),
        new File(['photo2'], 'photo2.jpg', { type: 'image/jpeg' })
      ]
      
      wrapper.vm.selectedFilesForUpload = mockFiles
      
      // Complete form using VendorSearchBox
      await fillVendorInfo(wrapper, 'vendor-1', '2024-01-15')
      await nextTick()

      // Move to items step
      let nextButton = wrapper.find('button[class*="btn-primary"]')
      await nextButton.trigger('click')
      await nextTick()

      // Add item through new item form
      wrapper.vm.updateNewItem(-1, {
        tempId: 'temp-1',
        item: 'item-1',
        quantity: 5,
        unit_price: 100,
        total_amount: 500,
        notes: ''
      })
      await wrapper.vm.saveNewItem()
      await nextTick()
      
      // Move to review step
      wrapper.vm.currentStep = 2
      await nextTick()
      
      // Submit using the component method directly
      await wrapper.vm.saveDelivery()
      await nextTick()
      
      // Verify order of operations: 
      // 1. Delivery created
      expect(deliveryService.create).toHaveBeenCalled()
      
      // 2. Delivery items created and associated
      expect(deliveryItemService.createMultiple).toHaveBeenCalledWith(
        'delivery-1',
        [{ item: 'item-1', quantity: 5, unit_price: 100, notes: '' }]
      )
      
      // 3. Photos uploaded AFTER items association
      expect(deliveryService.uploadPhotos).toHaveBeenCalledWith('delivery-1', mockFiles)
      
      // Verify the order by checking the call order
      const createCallOrder = deliveryService.create.mock.invocationCallOrder[0]
      const itemsCallOrder = deliveryItemService.createMultiple.mock.invocationCallOrder[0]
      const photosCallOrder = deliveryService.uploadPhotos.mock.invocationCallOrder[0]
      
      expect(createCallOrder).toBeLessThan(itemsCallOrder)
      expect(itemsCallOrder).toBeLessThan(photosCallOrder)
    })
  })
})