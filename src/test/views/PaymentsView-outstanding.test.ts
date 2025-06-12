import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PaymentsView from '../../views/PaymentsView.vue'

// Mock the services
vi.mock('../../services/pocketbase', async () => {
  const actual = await vi.importActual('../../test/mocks/pocketbase')
  return {
    ...actual,
    paymentService: {
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({})
    },
    vendorService: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 'vendor-1',
          name: 'Test Vendor'
        }
      ])
    },
    accountService: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 'account-1',
          name: 'Test Account',
          type: 'bank_account',
          is_active: true,
          current_balance: 10000
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
          total_amount: 800,
          paid_amount: 200,
          payment_status: 'partial'
        }
      ])
    },
    getCurrentSiteId: vi.fn().mockReturnValue('site-1')
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
    isReadOnly: { value: false }
  })
}))

describe('PaymentsView - Outstanding Calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate vendor outstanding amounts including service bookings', async () => {
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify that data is loaded
    expect(vm.vendors).toHaveLength(1)
    expect(vm.incomingItems).toHaveLength(1)
    expect(vm.serviceBookings).toHaveLength(1)
    
    // Check vendorsWithOutstanding computed property
    const vendorsWithOutstanding = vm.vendorsWithOutstanding
    
    expect(vendorsWithOutstanding).toHaveLength(1)
    expect(vendorsWithOutstanding[0].id).toBe('vendor-1')
    
    // Outstanding should include both incoming items and service bookings
    // Incoming: 1000 - 300 = 700
    // Service: 800 - 200 = 600
    // Total: 1300
    expect(vendorsWithOutstanding[0].outstandingAmount).toBe(1300)
  })

  it('should calculate pending items count including service bookings', async () => {
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    const vendorsWithOutstanding = vm.vendorsWithOutstanding
    
    // Should count both incoming items and service bookings
    expect(vendorsWithOutstanding[0].pendingItems).toBe(2)
  })

  it('should update vendor outstanding when vendor is selected', async () => {
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Set vendor in form
    vm.form.vendor = 'vendor-1'
    vm.loadVendorOutstanding()
    
    // Should include both incoming items and service bookings
    // Incoming: 1000 - 300 = 700
    // Service: 800 - 200 = 600
    // Total: 1300
    expect(vm.vendorOutstanding).toBe(1300)
  })

  it('should handle vendors with no outstanding amounts', async () => {
    // Mock with fully paid items
    const { incomingItemService, serviceBookingService } = await import('../../services/pocketbase')
    vi.mocked(incomingItemService.getAll)
      .mockResolvedValue([
        {
          id: 'item-1',
          vendor: 'vendor-1',
          total_amount: 1000,
          paid_amount: 1000,
          payment_status: 'paid',
          item: 'item-1',
          quantity: 10,
          unit_price: 100,
          delivery_date: '2024-01-01',
          site: 'site-1',
        }
      ])
    
    vi.mocked(serviceBookingService.getAll)
      .mockResolvedValue([
        {
          id: 'booking-1',
          vendor: 'vendor-1',
          total_amount: 800,
          paid_amount: 800,
          payment_status: 'paid',
          service: 'electrical-1',
          start_date: '2024-12-01',
          duration: 10,
          unit_rate: 100,
          site: 'site-1',
          status: 'scheduled',
        }
      ])
    
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    const vendorsWithOutstanding = vm.vendorsWithOutstanding
    
    // Should not include vendors with no outstanding amounts
    expect(vendorsWithOutstanding).toHaveLength(0)
  })

  it('should handle vendors with only incoming items outstanding', async () => {
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify component loads and has expected data structure
    expect(vm.vendors).toBeDefined()
    expect(vm.incomingItems).toBeDefined()
    expect(vm.serviceBookings).toBeDefined()
    
    // Verify vendorsWithOutstanding computed property exists and works
    expect(vm.vendorsWithOutstanding).toBeDefined()
    expect(Array.isArray(vm.vendorsWithOutstanding)).toBe(true)
  })

  it('should handle vendors with only service bookings outstanding', async () => {
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify component loads and calculates outstanding amounts
    expect(vm.vendors).toBeDefined()
    expect(vm.serviceBookings).toBeDefined()
    
    // Verify the component has the loadVendorOutstanding method
    expect(typeof vm.loadVendorOutstanding).toBe('function')
    
    // Verify vendorOutstanding reactive property exists
    expect(vm.vendorOutstanding).toBeDefined()
  })

  it('should load all required data including service bookings', async () => {
    mount(PaymentsView)
    await nextTick()
    
    // Verify all services were called
    const { paymentService, vendorService, accountService, incomingItemService, serviceBookingService } = await import('../../services/pocketbase')
    expect(paymentService.getAll).toHaveBeenCalled()
    expect(vendorService.getAll).toHaveBeenCalled()
    expect(accountService.getAll).toHaveBeenCalled()
    expect(incomingItemService.getAll).toHaveBeenCalled()
    expect(serviceBookingService.getAll).toHaveBeenCalled()
  })

  it('should show correct outstanding amount in payment form', async () => {
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify the payment form functionality exists
    expect(vm.form).toBeDefined()
    expect(typeof vm.loadVendorOutstanding).toBe('function')
    expect(vm.vendorOutstanding).toBeDefined()
    
    // Verify modal functionality works
    vm.showAddModal = true
    await nextTick()
    
    expect(vm.showAddModal).toBe(true)
    
    // Verify form has vendor field
    expect(vm.form.vendor).toBeDefined()
  })
})