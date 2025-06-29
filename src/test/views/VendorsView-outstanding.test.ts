import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VendorsView from '../../views/VendorsView.vue'
import { vendorService, deliveryService, serviceBookingService, paymentService } from '../../services/pocketbase'

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
    incrementUsage: vi.fn(),
    decrementUsage: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate outstanding amounts including both incoming items and service bookings', async () => {
    const wrapper = mount(VendorsView)
    
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
    const wrapper = mount(VendorsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    
    // Test vendor that doesn't exist
    const outstanding = vm.getVendorOutstanding('non-existent-vendor')
    expect(outstanding).toBe(0)
  })

  it('should handle vendors with only deliveries outstanding', async () => {
    // Mock service to return only deliveries
    vi.mocked(serviceBookingService.getAll)
      .mockResolvedValueOnce([])
    
    const wrapper = mount(VendorsView)
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
    // Mock service to return only service bookings
    vi.mocked(deliveryService.getAll)
      .mockResolvedValueOnce([])
    
    const wrapper = mount(VendorsView)
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
    mount(VendorsView)
    await nextTick()
    
    // Verify all services were called
    expect(vendorService.getAll).toHaveBeenCalled()
    expect(deliveryService.getAll).toHaveBeenCalled()
    expect(serviceBookingService.getAll).toHaveBeenCalled()
    expect(paymentService.getAll).toHaveBeenCalled()
  })

  it('should handle paid items and bookings correctly', async () => {
    // Mock with fully paid items
    vi.mocked(deliveryService.getAll)
      .mockResolvedValue([
        {
          id: 'delivery-1',
          vendor: 'vendor-1',
          delivery_date: '2024-12-01',
          total_amount: 1000,
          paid_amount: 1000,
          payment_status: 'paid',
          site: 'site-1'
        }
      ])
    
    vi.mocked(serviceBookingService.getAll)
      .mockResolvedValue([
        {
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
        }
      ])
    
    const wrapper = mount(VendorsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    const outstanding = vm.getVendorOutstanding('vendor-1')
    
    // Both fully paid, so outstanding should be 0
    expect(outstanding).toBe(0)
  })
})