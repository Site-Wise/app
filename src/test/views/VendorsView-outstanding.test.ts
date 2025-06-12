import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VendorsView from '../../views/VendorsView.vue'

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
          site: 'site-1'
        }
      ])
    },
    incomingItemService: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 'item-1',
          vendor: 'vendor-1',
          total_amount: 1000,
          paid_amount: 300,
          payment_status: 'partial'
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
    await nextTick()
    
    // Access the component's data
    const vm = wrapper.vm as any
    
    // Test the outstanding calculation for vendor-1
    // Should include:
    // - Incoming item: 1000 - 300 = 700
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

  it('should handle vendors with only incoming items outstanding', async () => {
    // Mock service to return only incoming items
    vi.mocked(require('../../services/pocketbase').serviceBookingService.getAll)
      .mockResolvedValue([])
    
    const wrapper = mount(VendorsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    const outstanding = vm.getVendorOutstanding('vendor-1')
    
    // Should only include incoming item outstanding: 1000 - 300 = 700
    expect(outstanding).toBe(700)
  })

  it('should handle vendors with only service bookings outstanding', async () => {
    // Mock service to return only service bookings
    vi.mocked(require('../../services/pocketbase').incomingItemService.getAll)
      .mockResolvedValue([])
    
    const wrapper = mount(VendorsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    const outstanding = vm.getVendorOutstanding('vendor-1')
    
    // Should only include service booking outstanding: 500 - 0 = 500
    expect(outstanding).toBe(500)
  })

  it('should load all required data including service bookings', async () => {
    mount(VendorsView)
    await nextTick()
    
    // Verify all services were called
    expect(require('../../services/pocketbase').vendorService.getAll).toHaveBeenCalled()
    expect(require('../../services/pocketbase').incomingItemService.getAll).toHaveBeenCalled()
    expect(require('../../services/pocketbase').serviceBookingService.getAll).toHaveBeenCalled()
    expect(require('../../services/pocketbase').paymentService.getAll).toHaveBeenCalled()
  })

  it('should handle paid items and bookings correctly', async () => {
    // Mock with fully paid items
    vi.mocked(require('../../services/pocketbase').incomingItemService.getAll)
      .mockResolvedValue([
        {
          id: 'item-1',
          vendor: 'vendor-1',
          total_amount: 1000,
          paid_amount: 1000,
          payment_status: 'paid'
        }
      ])
    
    vi.mocked(require('../../services/pocketbase').serviceBookingService.getAll)
      .mockResolvedValue([
        {
          id: 'booking-1',
          vendor: 'vendor-1',
          total_amount: 500,
          paid_amount: 500,
          payment_status: 'paid'
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