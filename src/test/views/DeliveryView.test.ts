import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import DeliveryView from '../../views/DeliveryView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock i18n
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'delivery.title': 'Deliveries',
        'delivery.subtitle': 'Track multi-item deliveries and manage receipts',
        'delivery.recordDelivery': 'Record Delivery',
        'delivery.deliveryDetails': 'Delivery Details',
        'delivery.deliveryDate': 'Delivery Date',
        'delivery.paymentStatus': 'Payment Status',
        'delivery.reference': 'Reference',
        'delivery.itemCount': 'Item Count',
        'delivery.items': 'Items',
        'delivery.unitPrice': 'Unit Price',
        'delivery.paidAmount': 'Paid Amount',
        'delivery.photos': 'Photos',
        'delivery.noDeliveries': 'No deliveries recorded',
        'delivery.noSearchResults': 'No deliveries found matching your search',
        'delivery.noPhotos': 'No photos',
        'delivery.confirmDelete': 'Are you sure you want to delete this delivery?',
        'delivery.deleteSuccess': 'Delivery deleted successfully',
        'delivery.createSuccess': 'Delivery recorded successfully',
        'delivery.updateSuccess': 'Delivery updated successfully',
        'common.vendor': 'Vendor',
        'common.total': 'Total',
        'common.actions': 'Actions',
        'common.view': 'View',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.paid': 'Paid',
        'common.pending': 'Pending',
        'common.partial': 'Partial',
        'search.delivery': 'Search deliveries by vendor, reference, or notes...',
        'subscription.banner.freeTierLimitReached': 'Free tier limit reached'
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

// Mock subscription composable
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: computed(() => false)
  })
}))

// Mock toast composable
vi.mock('../../composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  })
}))

// Mock search composable
vi.mock('../../composables/useSearch', () => ({
  useDeliverySearch: () => ({
    searchQuery: computed(() => ''),
    loading: computed(() => false),
    results: computed(() => []),
    loadAll: vi.fn()
  })
}))

// Mock PocketBase services
vi.mock('../../services/pocketbase', () => {
  const mockDeliveries = [
    {
      id: 'delivery-1',
      vendor: 'vendor-1',
      delivery_date: '2024-01-15',
      delivery_reference: 'INV-001',
      total_amount: 1500,
      payment_status: 'paid',
      paid_amount: 1500,
      notes: 'Test delivery notes',
      photos: ['photo1.jpg'],
      expand: {
        vendor: {
          id: 'vendor-1',
          name: 'Test Vendor',
          contact_person: 'John Doe',
          email: 'john@vendor.com',
          phone: '9876543210'
        },
        delivery_items: [
          {
            id: 'item-1',
            delivery: 'delivery-1',
            item: 'item-1',
            quantity: 10,
            unit_price: 100,
            total_amount: 1000,
            expand: {
              item: {
                id: 'item-1',
                name: 'Test Item',
                unit: 'pieces'
              }
            }
          },
          {
            id: 'item-2',
            delivery: 'delivery-1',
            item: 'item-2',
            quantity: 5,
            unit_price: 100,
            total_amount: 500,
            expand: {
              item: {
                id: 'item-2',
                name: 'Another Item',
                unit: 'kg'
              }
            }
          }
        ]
      }
    },
    {
      id: 'delivery-2',
      vendor: 'vendor-2',
      delivery_date: '2024-01-10',
      delivery_reference: 'INV-002',
      total_amount: 2500,
      payment_status: 'pending',
      paid_amount: 0,
      notes: '',
      photos: [],
      expand: {
        vendor: {
          id: 'vendor-2',
          name: 'Second Vendor',
          contact_person: 'Jane Smith',
          email: 'jane@vendor2.com',
          phone: '9876543211'
        },
        delivery_items: [
          {
            id: 'item-3',
            delivery: 'delivery-2',
            item: 'item-3',
            quantity: 25,
            unit_price: 100,
            total_amount: 2500,
            expand: {
              item: {
                id: 'item-3',
                name: 'Third Item',
                unit: 'units'
              }
            }
          }
        ]
      }
    }
  ]

  return {
    deliveryService: {
      getAll: vi.fn().mockResolvedValue(mockDeliveries),
      create: vi.fn().mockResolvedValue(mockDeliveries[0]),
      update: vi.fn().mockResolvedValue(mockDeliveries[0]),
      delete: vi.fn().mockResolvedValue(true)
    },
    pb: {
      collection: vi.fn(() => ({
        getFullList: vi.fn().mockResolvedValue([]),
        getOne: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({})
      }))
    }
  }
})

// Mock MultiItemDeliveryModal component
vi.mock('../../components/delivery/MultiItemDeliveryModal.vue', () => ({
  default: {
    name: 'MultiItemDeliveryModal',
    template: '<div class="mock-delivery-modal">Multi Item Delivery Modal</div>',
    props: ['editing-delivery'],
    emits: ['close', 'saved']
  }
}))

// Mock PhotoGallery component
vi.mock('../../components/PhotoGallery.vue', () => ({
  default: {
    name: 'PhotoGallery',
    template: '<div class="mock-photo-gallery">Photo Gallery</div>',
    props: ['photos', 'initial-index'],
    emits: ['close']
  }
}))

describe('DeliveryView', () => {
  let wrapper: any
  let router: any

  beforeEach(async () => {
    vi.clearAllMocks()
    router = createMockRouter()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = () => {
    return mount(DeliveryView, {
      global: {
        plugins: [router],
        stubs: {
          'router-link': true,
          'router-view': true
        }
      }
    })
  }

  it('should render delivery view correctly', async () => {
    wrapper = createWrapper()
    
    // Wait for component to mount and data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="main-content"], .delivery-view, h1').exists()).toBe(true)
    expect(wrapper.text()).toContain('Deliveries')
  })

  it('should display delivery list correctly', async () => {
    wrapper = createWrapper()
    
    // Wait for data loading
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    // Should show deliveries
    expect(wrapper.text()).toContain('Test Vendor')
    expect(wrapper.text()).toContain('Second Vendor')
    expect(wrapper.text()).toContain('INV-001')
    expect(wrapper.text()).toContain('INV-002')
  })

  it('should show record delivery button for desktop', async () => {
    wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    const recordButton = buttons.find((btn: any) => btn.text().includes('Record Delivery'))
    expect(recordButton).toBeDefined()
  })

  it('should handle mobile actions menu', async () => {
    wrapper = createWrapper()
    
    // Wait for data loading
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    // Find mobile three-dots menu button
    const mobileMenuButtons = wrapper.findAll('button').filter((btn: any) => {
      const svg = btn.find('svg')
      return svg.exists() && btn.classes().includes('touch-manipulation')
    })

    if (mobileMenuButtons.length > 0) {
      await mobileMenuButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      
      // Should show mobile menu
      expect(wrapper.find('.absolute').exists()).toBe(true)
    }
  })

  it('should handle delivery actions', async () => {
    wrapper = createWrapper()
    
    // Wait for data loading
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    // Test view action
    const viewButtons = wrapper.findAll('button').filter((btn: any) => 
      btn.text().includes('View') || btn.find('svg[data-testid="eye"]').exists()
    )
    
    if (viewButtons.length > 0) {
      await viewButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      // Should open view modal (check component state)
      expect(wrapper.vm.viewingDelivery).toBeTruthy()
    }
  })

  it('should display search functionality', async () => {
    wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Should have search input
    const searchInputs = wrapper.findAll('input[type="text"]')
    expect(searchInputs.length).toBeGreaterThan(0)
    
    const searchInput = searchInputs.find((input: any) => 
      input.attributes('placeholder')?.includes('Search') || 
      input.attributes('placeholder')?.includes('deliveries')
    )
    expect(searchInput).toBeDefined()
  })

  it('should show empty state when no deliveries', async () => {
    // Mock empty delivery list
    const { deliveryService } = await import('../../services/pocketbase')
    vi.mocked(deliveryService.getAll).mockResolvedValueOnce([])

    wrapper = createWrapper()
    
    // Wait for data loading
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No deliveries recorded')
  })

  it('should handle delivery modal', async () => {
    wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Test opening modal
    wrapper.vm.showAddModal = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.mock-delivery-modal').exists()).toBe(true)
  })

  it('should handle photo gallery', async () => {
    wrapper = createWrapper()
    
    // Wait for data loading
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    // Test opening photo gallery
    wrapper.vm.showPhotoGallery = true
    wrapper.vm.galleryDelivery = wrapper.vm.deliveries[0]
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.mock-photo-gallery').exists()).toBe(true)
  })

  it('should display delivery status correctly', async () => {
    wrapper = createWrapper()
    
    // Wait for data loading
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    // Should show payment status
    expect(wrapper.text()).toContain('Paid')
    expect(wrapper.text()).toContain('Pending')
  })

  it('should format amounts correctly', async () => {
    wrapper = createWrapper()
    
    // Wait for data loading
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    // Should show formatted amounts
    expect(wrapper.text()).toContain('₹1500.00')
    expect(wrapper.text()).toContain('₹2500.00')
  })

  it('should hide delete button for paid and partial deliveries', async () => {
    // Import the mocked service
    const { deliveryService } = await import('../../services/pocketbase')
    
    const mockDeliveriesWithDifferentStatuses = [
      {
        id: 'pending-delivery',
        vendor: 'vendor-1', 
        delivery_date: '2024-01-01',
        delivery_reference: 'PENDING-001',
        total_amount: 1000,
        payment_status: 'pending',
        paid_amount: 0,
        site: 'site-1',
        expand: {
          vendor: { 
            id: 'vendor-1',
            name: 'Test Vendor',
            contact_person: 'John Doe'
          },
          delivery_items: [{
            id: 'item-1',
            delivery: 'pending-delivery',
            item: 'item-1',
            quantity: 10,
            unit_price: 100,
            total_amount: 1000,
            expand: {
              item: { id: 'item-1', name: 'Cement', unit: 'bags' }
            }
          }]
        }
      },
      {
        id: 'paid-delivery',
        vendor: 'vendor-1',
        delivery_date: '2024-01-02', 
        delivery_reference: 'PAID-002',
        total_amount: 2000,
        payment_status: 'paid',
        paid_amount: 2000,
        site: 'site-1',
        expand: {
          vendor: {
            id: 'vendor-1', 
            name: 'Test Vendor',
            contact_person: 'John Doe'
          },
          delivery_items: [{
            id: 'item-2',
            delivery: 'paid-delivery', 
            item: 'item-2',
            quantity: 20,
            unit_price: 100,
            total_amount: 2000,
            expand: {
              item: { id: 'item-2', name: 'Steel Rods', unit: 'pieces' }
            }
          }]
        }
      },
      {
        id: 'partial-delivery',
        vendor: 'vendor-1',
        delivery_date: '2024-01-03',
        delivery_reference: 'PARTIAL-003', 
        total_amount: 1500,
        payment_status: 'partial',
        paid_amount: 750,
        site: 'site-1',
        expand: {
          vendor: {
            id: 'vendor-1',
            name: 'Test Vendor', 
            contact_person: 'John Doe'
          },
          delivery_items: [{
            id: 'item-3',
            delivery: 'partial-delivery',
            item: 'item-3', 
            quantity: 15,
            unit_price: 100,
            total_amount: 1500,
            expand: {
              item: { id: 'item-3', name: 'Bricks', unit: 'pieces' }
            }
          }]
        }
      }
    ]

    // Override the mock to return our test data with different payment statuses
    vi.mocked(deliveryService.getAll).mockResolvedValue(mockDeliveriesWithDifferentStatuses)

    wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    // Verify all 3 deliveries are displayed
    const deliveryRows = wrapper.findAll('tbody tr')
    expect(deliveryRows).toHaveLength(3)
    
    // Find all delete buttons in the entire component
    const allDeleteButtons = wrapper.findAll('button[class*="text-red-600"]')
    
    // CRITICAL TEST: Only 1 delete button should exist (for pending delivery only)
    expect(allDeleteButtons).toHaveLength(1)
    
    // Verify the payment statuses are displayed correctly
    expect(wrapper.text()).toContain('PENDING-001') // Pending delivery reference
    expect(wrapper.text()).toContain('PAID-002')    // Paid delivery reference  
    expect(wrapper.text()).toContain('PARTIAL-003') // Partial delivery reference
    
    // Verify payment status indicators (case-insensitive)
    expect(wrapper.text()).toContain('Pending')
    expect(wrapper.text()).toContain('Paid')
    expect(wrapper.text()).toContain('Partial')
    
    // Test specific rows to ensure delete button visibility logic
    const pendingRow = deliveryRows.find(row => row.text().includes('PENDING-001'))
    const paidRow = deliveryRows.find(row => row.text().includes('PAID-002'))
    const partialRow = deliveryRows.find(row => row.text().includes('PARTIAL-003'))
    
    // PENDING delivery SHOULD have delete button
    expect(pendingRow?.find('button[class*="text-red-600"]').exists()).toBe(true)
    
    // PAID delivery should NOT have delete button (financial integrity protection)
    expect(paidRow?.find('button[class*="text-red-600"]').exists()).toBe(false)
    
    // PARTIAL delivery should NOT have delete button (financial integrity protection)  
    expect(partialRow?.find('button[class*="text-red-600"]').exists()).toBe(false)
    
    // Verify edit buttons still exist for all deliveries (editing allowed, deletion restricted)
    const allEditButtons = wrapper.findAll('button[class*="text-blue-600"]')
    expect(allEditButtons.length).toBeGreaterThan(0) // Edit buttons should still be present
  })
})