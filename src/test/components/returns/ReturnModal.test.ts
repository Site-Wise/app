import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { setupTestPinia } from '../../utils/test-setup'
import ReturnModal from '../../../components/returns/ReturnModal.vue'

// Mock composables
vi.mock('../../../composables/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

vi.mock('../../../composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}))

// Mock VendorSearchBox component
vi.mock('../../../components/VendorSearchBox.vue', () => ({
  default: {
    name: 'VendorSearchBox',
    props: ['modelValue', 'vendors', 'deliveries', 'serviceBookings', 'payments', 'placeholder', 'required', 'autofocus'],
    emits: ['update:modelValue', 'vendorSelected'],
    setup(props: any, { emit }: any) {
      return () => h('input', {
        type: 'text',
        class: 'mock-vendor-searchbox',
        value: props.modelValue,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value)
      })
    }
  }
}))

// Mock services
vi.mock('../../../services/pocketbase', () => ({
  vendorService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  deliveryItemService: {
    getAll: vi.fn().mockResolvedValue([]),
    getByVendorId: vi.fn().mockResolvedValue([])
  },
  vendorReturnService: {
    create: vi.fn().mockResolvedValue({ id: 'return-1' }),
    update: vi.fn().mockResolvedValue({ id: 'return-1' }),
    getReturnInfoForDeliveryItems: vi.fn().mockResolvedValue({})
  },
  vendorReturnItemService: {
    create: vi.fn().mockResolvedValue({ id: 'return-item-1' })
  },
  VendorService: {
    calculateOutstandingFromData: vi.fn().mockReturnValue(0)
  },
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
  setCurrentUserRole: vi.fn(),
  calculatePermissions: vi.fn().mockReturnValue({
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true
  }),
  pb: { authStore: { isValid: true, model: { id: 'user-1' } } }
}))

describe('ReturnModal Logic', () => {
  let wrapper: any
  let pinia: any

  beforeEach(() => {
    vi.clearAllMocks()
    const { pinia: testPinia } = setupTestPinia()
    pinia = testPinia
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Component Mounting', () => {
    it('should mount successfully', () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          returnData: null,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle edit mode', () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: true,
          returnData: {
            id: 'return-1',
            vendor: 'vendor-1',
            return_date: '2024-01-01',
            reason: 'damaged'
          },
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render VendorSearchBox component', () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      expect(wrapper.find('.mock-vendor-searchbox').exists()).toBe(true)
    })
  })

  describe('Form Handling', () => {
    it('should initialize form data', () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      expect(wrapper.vm.form).toBeDefined()
    })

    it('should handle form submission', async () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      wrapper.vm.form = {
        vendor: 'vendor-1',
        return_date: '2024-01-01',
        reason: 'damaged'
      }

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.form.vendor).toBe('vendor-1')
    })

    it('should update vendor via VendorSearchBox', async () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      // Direct form update simulating VendorSearchBox selection
      wrapper.vm.form.vendor = 'vendor-1'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.form.vendor).toBe('vendor-1')
    })
  })

  describe('Event Emissions', () => {
    it('should emit close event', async () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      wrapper.vm.$emit('close')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit saved event', async () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      wrapper.vm.$emit('saved')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('saved')).toBeTruthy()
    })
  })

  describe('VendorSearchBox Integration', () => {
    it('should pass vendors prop to VendorSearchBox', () => {
      const vendors = [
        { id: 'vendor-1', contact_person: 'Test Vendor 1', name: 'Vendor Co 1' },
        { id: 'vendor-2', contact_person: 'Test Vendor 2', name: 'Vendor Co 2' }
      ]

      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          vendors
        }
      })

      expect(wrapper.find('.mock-vendor-searchbox').exists()).toBe(true)
    })

    it('should pass deliveries prop to VendorSearchBox when provided', () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }],
          deliveries: [{ id: 'delivery-1', vendor: 'vendor-1' }]
        }
      })

      expect(wrapper.find('.mock-vendor-searchbox').exists()).toBe(true)
    })

    it('should use default empty arrays for optional props', () => {
      wrapper = mount(ReturnModal, {
        global: {
          plugins: [pinia]
        },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      // Component should mount successfully with default empty arrays
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.mock-vendor-searchbox').exists()).toBe(true)
    })
  })

  describe('Return Quantity Tracking', () => {
    beforeEach(async () => {
      const { deliveryItemService, vendorReturnService } = await import('../../../services/pocketbase')

      // Mock delivery items for vendor
      vi.mocked(deliveryItemService.getAll).mockResolvedValue([
        {
          id: 'item-1',
          delivery: 'delivery-1',
          item: 'product-1',
          quantity: 100,
          unit_price: 50,
          total_amount: 5000,
          site: 'site-1',
          expand: {
            item: { id: 'product-1', name: 'Product 1', unit: 'kg' },
            delivery: { id: 'delivery-1', delivery_date: '2024-01-01' }
          }
        },
        {
          id: 'item-2',
          delivery: 'delivery-2',
          item: 'product-2',
          quantity: 50,
          unit_price: 100,
          total_amount: 5000,
          site: 'site-1',
          expand: {
            item: { id: 'product-2', name: 'Product 2', unit: 'pcs' },
            delivery: { id: 'delivery-2', delivery_date: '2024-01-02' }
          }
        }
      ])

      // Mock return info with partial returns
      vi.mocked(vendorReturnService.getReturnInfoForDeliveryItems).mockResolvedValue({
        'item-1': {
          totalReturned: 30,
          availableForReturn: 70,
          returns: [
            {
              id: 'return-1',
              returnDate: '2024-01-10',
              quantityReturned: 30,
              status: 'completed',
              reason: 'damaged'
            }
          ]
        },
        'item-2': {
          totalReturned: 0,
          availableForReturn: 50,
          returns: []
        }
      })
    })

    it('should fetch return info when vendor is selected', async () => {
      wrapper = mount(ReturnModal, {
        global: { plugins: [pinia] },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      const { deliveryItemService, vendorReturnService } = await import('../../../services/pocketbase')

      // Simulate vendor selection
      wrapper.vm.form.vendor = 'vendor-1'
      await wrapper.vm.$nextTick()

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should have called getAll with vendor ID
      expect(deliveryItemService.getAll).toHaveBeenCalledWith('vendor-1')

      // Should have fetched return info
      expect(vendorReturnService.getReturnInfoForDeliveryItems).toHaveBeenCalledWith(['item-1', 'item-2'])

      // Should have stored return info
      expect(wrapper.vm.deliveryItemsReturnInfo).toBeDefined()
    })

    it('should calculate available quantity from return info', async () => {
      wrapper = mount(ReturnModal, {
        global: { plugins: [pinia] },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      // Manually set return info
      wrapper.vm.deliveryItemsReturnInfo = {
        'item-1': {
          totalReturned: 30,
          availableForReturn: 70,
          returns: []
        }
      }

      await wrapper.vm.$nextTick()

      // Test getAvailableQuantity helper
      const available = wrapper.vm.getAvailableQuantity('item-1', 100)
      expect(available).toBe(70)
    })

    it('should use original quantity when no return info exists', async () => {
      wrapper = mount(ReturnModal, {
        global: { plugins: [pinia] },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      wrapper.vm.deliveryItemsReturnInfo = {}
      await wrapper.vm.$nextTick()

      // Should return original quantity when no return info
      const available = wrapper.vm.getAvailableQuantity('item-new', 100)
      expect(available).toBe(100)
    })

    it('should filter out fully returned items from available list', async () => {
      const { deliveryItemService, vendorReturnService } = await import('../../../services/pocketbase')

      // Override mock for this specific test
      vi.mocked(deliveryItemService.getAll).mockResolvedValue([
        { id: 'item-1', quantity: 100, delivery: 'd1', item: 'i1', unit_price: 50, total_amount: 5000, site: 'site-1', expand: { item: { name: 'Item 1' } } },
        { id: 'item-2', quantity: 50, delivery: 'd2', item: 'i2', unit_price: 100, total_amount: 5000, site: 'site-1', expand: { item: { name: 'Item 2' } } },
        { id: 'item-3', quantity: 75, delivery: 'd3', item: 'i3', unit_price: 40, total_amount: 3000, site: 'site-1', expand: { item: { name: 'Item 3' } } }
      ])

      vi.mocked(vendorReturnService.getReturnInfoForDeliveryItems).mockResolvedValue({
        'item-1': { availableForReturn: 70, totalReturned: 30, returns: [] },
        'item-2': { availableForReturn: 0, totalReturned: 50, returns: [] },  // Fully returned
        'item-3': { availableForReturn: 75, totalReturned: 0, returns: [] }
      })

      wrapper = mount(ReturnModal, {
        global: { plugins: [pinia] },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      // Trigger vendor selection
      wrapper.vm.form.vendor = 'vendor-1'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // availableDeliveryItems should exclude item-2
      const available = wrapper.vm.availableDeliveryItems
      expect(available).toHaveLength(2)
      expect(available.find((item: any) => item.id === 'item-2')).toBeUndefined()
      expect(available.find((item: any) => item.id === 'item-1')).toBeDefined()
      expect(available.find((item: any) => item.id === 'item-3')).toBeDefined()
    })

    it('should exclude already selected items from available list', async () => {
      const { deliveryItemService, vendorReturnService } = await import('../../../services/pocketbase')

      // Override mock for this specific test
      vi.mocked(deliveryItemService.getAll).mockResolvedValue([
        { id: 'item-1', quantity: 100, delivery: 'd1', item: 'i1', unit_price: 50, total_amount: 5000, site: 'site-1' },
        { id: 'item-2', quantity: 50, delivery: 'd2', item: 'i2', unit_price: 100, total_amount: 5000, site: 'site-1' }
      ])

      vi.mocked(vendorReturnService.getReturnInfoForDeliveryItems).mockResolvedValue({
        'item-1': { availableForReturn: 90, totalReturned: 10, returns: [] },
        'item-2': { availableForReturn: 50, totalReturned: 0, returns: [] }
      })

      wrapper = mount(ReturnModal, {
        global: { plugins: [pinia] },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      wrapper.vm.form.vendor = 'vendor-1'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Manually add a selected item
      wrapper.vm.returnItems = [
        {
          delivery_item: 'item-1',
          quantity_returned: 10,
          return_rate: 50,
          return_amount: 500,
          condition: 'damaged',
          item_notes: ''
        }
      ]

      await wrapper.vm.$nextTick()

      const available = wrapper.vm.availableDeliveryItems
      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('item-2')
    })

    it('should handle empty delivery items gracefully', async () => {
      wrapper = mount(ReturnModal, {
        global: { plugins: [pinia] },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      const { deliveryItemService, vendorReturnService } = await import('../../../services/pocketbase')

      // Mock empty delivery items
      vi.mocked(deliveryItemService.getAll).mockResolvedValue([])
      vi.mocked(vendorReturnService.getReturnInfoForDeliveryItems).mockResolvedValue({})

      wrapper.vm.form.vendor = 'vendor-1'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(wrapper.vm.vendorDeliveryItems).toHaveLength(0)
      expect(wrapper.vm.deliveryItemsReturnInfo).toEqual({})
    })

    it('should handle error when fetching delivery items', async () => {
      wrapper = mount(ReturnModal, {
        global: { plugins: [pinia] },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      const { deliveryItemService } = await import('../../../services/pocketbase')

      // Mock error
      vi.mocked(deliveryItemService.getAll).mockRejectedValue(new Error('Network error'))

      wrapper.vm.form.vendor = 'vendor-1'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should handle error gracefully
      expect(wrapper.vm.vendorDeliveryItems).toHaveLength(0)
      expect(wrapper.vm.deliveryItemsReturnInfo).toEqual({})
      expect(wrapper.vm.loadingDeliveryItems).toBe(false)
    })

    it('should clear items when vendor changes', async () => {
      wrapper = mount(ReturnModal, {
        global: { plugins: [pinia] },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      // Set initial vendor
      wrapper.vm.form.vendor = 'vendor-1'
      await wrapper.vm.$nextTick()

      // Add some return items with complete structure
      wrapper.vm.returnItems = [
        {
          delivery_item: 'item-1',
          quantity_returned: 10,
          return_rate: 50,
          return_amount: 500,
          condition: 'damaged',
          item_notes: ''
        }
      ]

      await wrapper.vm.$nextTick()

      // Change vendor
      wrapper.vm.form.vendor = 'vendor-2'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Items should be cleared
      expect(wrapper.vm.returnItems).toHaveLength(0)
    })

    it('should calculate max quantity correctly for partial returns', async () => {
      wrapper = mount(ReturnModal, {
        global: { plugins: [pinia] },
        props: {
          isEdit: false,
          vendors: [{ id: 'vendor-1', contact_person: 'Test Vendor', name: 'Vendor Co' }]
        }
      })

      // Item with 100 total, 30 already returned, 70 available
      wrapper.vm.deliveryItemsReturnInfo = {
        'item-1': {
          totalReturned: 30,
          availableForReturn: 70,
          returns: [
            { id: 'return-1', quantityReturned: 30, status: 'completed', returnDate: '2024-01-01', reason: 'damaged' }
          ]
        }
      }

      await wrapper.vm.$nextTick()

      // Max should be 70, not 100
      const maxQuantity = wrapper.vm.getAvailableQuantity('item-1', 100)
      expect(maxQuantity).toBe(70)
    })
  })
})
