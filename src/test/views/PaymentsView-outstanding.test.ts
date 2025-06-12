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
    
    const vm = wrapper.vm as any
    
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
    
    const vm = wrapper.vm as any
    const vendorsWithOutstanding = vm.vendorsWithOutstanding
    
    // Should count both incoming items and service bookings
    expect(vendorsWithOutstanding[0].pendingItems).toBe(2)
  })

  it('should update vendor outstanding when vendor is selected', async () => {
    const wrapper = mount(PaymentsView)
    await nextTick()
    
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
          total_amount: 800,
          paid_amount: 800,
          payment_status: 'paid'
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
    // Mock with no service bookings
    vi.mocked(require('../../services/pocketbase').serviceBookingService.getAll)
      .mockResolvedValue([])
    
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    const vendorsWithOutstanding = vm.vendorsWithOutstanding
    
    expect(vendorsWithOutstanding).toHaveLength(1)
    // Only incoming item outstanding: 1000 - 300 = 700
    expect(vendorsWithOutstanding[0].outstandingAmount).toBe(700)
    expect(vendorsWithOutstanding[0].pendingItems).toBe(1)
  })

  it('should handle vendors with only service bookings outstanding', async () => {
    // Mock with no incoming items
    vi.mocked(require('../../services/pocketbase').incomingItemService.getAll)
      .mockResolvedValue([])
    
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    const vendorsWithOutstanding = vm.vendorsWithOutstanding
    
    expect(vendorsWithOutstanding).toHaveLength(1)
    // Only service booking outstanding: 800 - 200 = 600
    expect(vendorsWithOutstanding[0].outstandingAmount).toBe(600)
    expect(vendorsWithOutstanding[0].pendingItems).toBe(1)
  })

  it('should load all required data including service bookings', async () => {
    mount(PaymentsView)
    await nextTick()
    
    // Verify all services were called
    expect(require('../../services/pocketbase').paymentService.getAll).toHaveBeenCalled()
    expect(require('../../services/pocketbase').vendorService.getAll).toHaveBeenCalled()
    expect(require('../../services/pocketbase').accountService.getAll).toHaveBeenCalled()
    expect(require('../../services/pocketbase').incomingItemService.getAll).toHaveBeenCalled()
    expect(require('../../services/pocketbase').serviceBookingService.getAll).toHaveBeenCalled()
  })

  it('should show correct outstanding amount in payment form', async () => {
    const wrapper = mount(PaymentsView)
    await nextTick()
    
    // Trigger add modal
    await wrapper.setData({ showAddModal: true })
    await nextTick()
    
    const vm = wrapper.vm as any
    
    // Select vendor
    vm.form.vendor = 'vendor-1'
    vm.loadVendorOutstanding()
    
    // Outstanding amount should be displayed in the form
    expect(vm.vendorOutstanding).toBe(1300)
    
    // Check if the outstanding amount notification is shown
    await nextTick()
    const outstandingNotification = wrapper.find('.bg-yellow-50')
    expect(outstandingNotification.exists()).toBe(true)
  })
})