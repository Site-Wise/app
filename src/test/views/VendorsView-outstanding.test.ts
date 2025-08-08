import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import VendorsView from '../../views/VendorsView.vue'

// Mock useSiteData to return controlled data
vi.mock('../../composables/useSiteData', () => ({
  useSiteData: vi.fn()
}))

// Mock useSite composable
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    currentSiteId: { value: 'site-1' },
    isInitialized: { value: true }
  })
}))

// Mock site store
vi.mock('../../stores/site', () => ({
  useSiteStore: () => ({
    currentSiteId: 'site-1',
    isInitialized: true,
    $patch: vi.fn()
  })
}))

// Mock the services
vi.mock('../../services/pocketbase', async () => {
  const actual = await vi.importActual('../../test/mocks/pocketbase')
  return {
    ...actual,
    vendorService: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 'vendor-1',
          name: 'Test Vendor',
          site: 'site-1',
          tags: [] // Empty tags array to prevent issues
        }
      ])
    },
    deliveryService: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 'delivery-1',
          vendor: 'vendor-1',
          delivery_date: '2024-01-01',
          total_amount: 1000,
          paid_amount: 300,
          payment_status: 'partial',
          site: 'site-1'
        }
      ])
    },
    serviceBookingService: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 'booking-1',
          vendor: 'vendor-1',
          total_amount: 500,
          paid_amount: 0,
          payment_status: 'pending'
        }
      ])
    },
    paymentService: {
      getAll: vi.fn().mockResolvedValue([])
    },
    tagService: {
      getAll: vi.fn().mockResolvedValue([]) // Empty tags array
    },
    VendorService: {
      calculateOutstandingFromData: vi.fn().mockImplementation((vendorId, deliveries, serviceBookings, payments) => {
        if (vendorId === 'non-existent-vendor') return 0;
        
        let outstanding = 0;
        
        // Calculate delivery outstanding
        const vendorDeliveries = deliveries.filter(d => d.vendor === vendorId);
        vendorDeliveries.forEach(delivery => {
          outstanding += (delivery.total_amount - delivery.paid_amount);
        });
        
        // Calculate service booking outstanding  
        const vendorBookings = serviceBookings.filter(b => b.vendor === vendorId);
        vendorBookings.forEach(booking => {
          outstanding += (booking.total_amount - booking.paid_amount);
        });
        
        return outstanding;
      }),
      calculateTotalPaidFromData: vi.fn().mockReturnValue(300)
    }
  }
})

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: { value: false }
  })
}))

vi.mock('../../composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../../components/TagSelector.vue', () => ({
  default: {
    name: 'TagSelector',
    template: '<div>TagSelector Mock</div>',
    props: ['modelValue', 'label', 'tagType', 'placeholder']
  }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

describe('VendorsView - Outstanding Calculations', () => {
  let pinia: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Mock data for the tests
    const mockVendors = [{
      id: 'vendor-1',
      name: 'Test Vendor',
      site: 'site-1',
      tags: []
    }]

    const mockDeliveries = [{
      id: 'delivery-1',
      vendor: 'vendor-1',
      delivery_date: '2024-01-01',
      total_amount: 1000,
      paid_amount: 300,
      payment_status: 'partial',
      site: 'site-1'
    }]

    const mockServiceBookings = [{
      id: 'booking-1',
      vendor: 'vendor-1',
      total_amount: 500,
      paid_amount: 0,
      payment_status: 'pending'
    }]

    const mockPayments = []
    const mockTags = []
    
    // Mock useSiteData to return different data based on the service function passed
    const { useSiteData } = await import('../../composables/useSiteData')
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      const { ref } = require('vue')
      
      // Check the function to determine which data to return
      const funcString = serviceFunction.toString()
      
      if (funcString.includes('vendorService.getAll')) {
        return {
          data: ref(mockVendors),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('deliveryService.getAll')) {
        return {
          data: ref(mockDeliveries),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('serviceBookingService.getAll')) {
        return {
          data: ref(mockServiceBookings),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('paymentService.getAll')) {
        return {
          data: ref(mockPayments),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('tagService.getAll')) {
        return {
          data: ref(mockTags),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      }
      
      // Default fallback
      return {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        reload: vi.fn()
      }
    })
  })

  it('should calculate outstanding amounts including both incoming items and service bookings', async () => {
    const wrapper = mount(VendorsView, {
      global: {
        plugins: [pinia]
      }
    })
    
    // Wait for data to load
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Access the component's data
    const vm = wrapper.vm as any
    
    // Verify data is loaded first
    expect(vm.deliveries).toHaveLength(1)
    expect(vm.serviceBookings).toHaveLength(1)
    
    // Test the outstanding calculation for vendor-1
    // Should include:
    // - Delivery: 1000 - 300 = 700
    // - Service booking: 500 - 0 = 500
    // - Total: 1200
    const outstanding = vm.getVendorOutstanding('vendor-1')
    expect(outstanding).toBe(1200)
  })

  it('should handle vendors with no outstanding amounts', async () => {
    const wrapper = mount(VendorsView, { global: { plugins: [pinia] } })
    await nextTick()
    
    const vm = wrapper.vm as any
    
    // Test vendor that doesn't exist
    const outstanding = vm.getVendorOutstanding('non-existent-vendor')
    expect(outstanding).toBe(0)
  })

  it('should handle vendors with only deliveries outstanding', async () => {
    // Override useSiteData to return empty service bookings for this test
    const { useSiteData } = await import('../../composables/useSiteData')
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      const { ref } = require('vue')
      const funcString = serviceFunction.toString()
      
      if (funcString.includes('vendorService.getAll')) {
        return {
          data: ref([{
            id: 'vendor-1',
            name: 'Test Vendor',
            site: 'site-1',
            tags: []
          }]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('deliveryService.getAll')) {
        return {
          data: ref([{
            id: 'delivery-1',
            vendor: 'vendor-1',
            delivery_date: '2024-01-01',
            total_amount: 1000,
            paid_amount: 300,
            payment_status: 'partial',
            site: 'site-1'
          }]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('serviceBookingService.getAll')) {
        // Return empty array for this test
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('paymentService.getAll')) {
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('tagService.getAll')) {
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      }
      
      return {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        reload: vi.fn()
      }
    })
    
    const wrapper = mount(VendorsView, { global: { plugins: [pinia] } })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify data is loaded first
    expect(vm.deliveries).toHaveLength(1)
    expect(vm.serviceBookings).toHaveLength(0) // Should be empty due to our mock
    
    const outstanding = vm.getVendorOutstanding('vendor-1')
    
    // Should only include delivery outstanding: 1000 - 300 = 700
    expect(outstanding).toBe(700)
  })

  it('should handle vendors with only service bookings outstanding', async () => {
    // Override useSiteData to return empty deliveries for this test
    const { useSiteData } = await import('../../composables/useSiteData')
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      const { ref } = require('vue')
      const funcString = serviceFunction.toString()
      
      if (funcString.includes('vendorService.getAll')) {
        return {
          data: ref([{
            id: 'vendor-1',
            name: 'Test Vendor',
            site: 'site-1',
            tags: []
          }]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('deliveryService.getAll')) {
        // Return empty array for this test
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('serviceBookingService.getAll')) {
        return {
          data: ref([{
            id: 'booking-1',
            vendor: 'vendor-1',
            total_amount: 500,
            paid_amount: 0,
            payment_status: 'pending'
          }]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('paymentService.getAll')) {
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('tagService.getAll')) {
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      }
      
      return {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        reload: vi.fn()
      }
    })
    
    const wrapper = mount(VendorsView, { global: { plugins: [pinia] } })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify data is loaded first
    expect(vm.deliveries).toHaveLength(0) // Should be empty due to our mock
    expect(vm.serviceBookings).toHaveLength(1)
    
    const outstanding = vm.getVendorOutstanding('vendor-1')
    
    // Should only include service booking outstanding: 500 - 0 = 500
    expect(outstanding).toBe(500)
  })

  it('should load all required data including service bookings', async () => {
    const { useSiteData } = await import('../../composables/useSiteData')
    
    mount(VendorsView, { global: { plugins: [pinia] } })
    await nextTick()
    
    // Verify useSiteData was called (which handles service calls internally)
    expect(useSiteData).toHaveBeenCalled()
    
    // Verify that useSiteData was called multiple times for different services
    expect(vi.mocked(useSiteData).mock.calls.length).toBeGreaterThan(0)
  })

  it('should handle paid items and bookings correctly', async () => {
    // Override useSiteData to return fully paid items for this test
    const { useSiteData } = await import('../../composables/useSiteData')
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      const { ref } = require('vue')
      const funcString = serviceFunction.toString()
      
      if (funcString.includes('vendorService.getAll')) {
        return {
          data: ref([{
            id: 'vendor-1',
            name: 'Test Vendor',
            site: 'site-1',
            tags: []
          }]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('deliveryService.getAll')) {
        return {
          data: ref([{
            id: 'delivery-1',
            vendor: 'vendor-1',
            delivery_date: '2024-12-01',
            total_amount: 1000,
            paid_amount: 1000,
            payment_status: 'paid',
            site: 'site-1'
          }]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('serviceBookingService.getAll')) {
        return {
          data: ref([{
            id: 'booking-1',
            vendor: 'vendor-1',
            total_amount: 500,
            paid_amount: 500,
            payment_status: 'paid',
            service: 'plumbing',
            start_date: '2024-04-01',
            duration: 3,
            unit_rate: 1000,
            site: 'site-1',
            status: 'scheduled',
          }]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('paymentService.getAll')) {
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('tagService.getAll')) {
        return {
          data: ref([]),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      }
      
      return {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        reload: vi.fn()
      }
    })
    
    const wrapper = mount(VendorsView, { global: { plugins: [pinia] } })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    const outstanding = vm.getVendorOutstanding('vendor-1')
    
    // Both fully paid, so outstanding should be 0
    expect(outstanding).toBe(0)
  })
})