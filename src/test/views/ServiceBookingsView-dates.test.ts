import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ServiceBookingsView from '../../views/ServiceBookingsView.vue'

// Mock the services
vi.mock('../../services/pocketbase', async () => {
  const actual = await vi.importActual('../../test/mocks/pocketbase')
  return {
    ...actual,
    serviceBookingService: {
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({})
    },
    serviceService: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 'service-1',
          name: 'Test Service',
          standard_rate: 100,
          is_active: true
        }
      ])
    },
    vendorService: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 'vendor-1',
          name: 'Test Vendor'
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

vi.mock('../../composables/usePermissions', () => ({
  usePermissions: () => ({
    canCreate: { value: true },
    canUpdate: { value: true },
    canDelete: { value: true }
  })
}))

describe('ServiceBookingsView - Date Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should format dates correctly for date inputs', async () => {
    const wrapper = mount(ServiceBookingsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    
    // Test the formatDateForInput function
    const isoDate = '2024-01-15T10:30:00.000Z'
    const formattedDate = vm.formatDateForInput(isoDate)
    
    // Should return YYYY-MM-DD format for date inputs
    expect(formattedDate).toBe('2024-01-15')
  })

  it('should handle empty dates gracefully', async () => {
    const wrapper = mount(ServiceBookingsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    
    expect(vm.formatDateForInput('')).toBe('')
    expect(vm.formatDateForInput(null)).toBe('')
    expect(vm.formatDateForInput(undefined)).toBe('')
  })

  it('should save dates in correct format', async () => {
    const wrapper = mount(ServiceBookingsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    
    // Set up form data
    vm.form.service = 'service-1'
    vm.form.vendor = 'vendor-1'
    vm.form.start_date = '2024-01-15'
    vm.form.end_date = '2024-02-15'
    vm.form.duration = 10
    vm.form.unit_rate = 100
    vm.form.status = 'scheduled'
    vm.form.payment_status = 'pending'
    
    await vm.saveBooking()
    
    // Verify that dates are saved correctly (as strings, not converted to ISO)
    const createCall = vi.mocked(require('../../services/pocketbase').serviceBookingService.create)
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: '2024-01-15',
        end_date: '2024-02-15'
      })
    )
  })

  it('should populate form with correctly formatted dates when editing', async () => {
    const wrapper = mount(ServiceBookingsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    
    // Mock booking data with ISO date
    const mockBooking = {
      id: 'booking-1',
      service: 'service-1',
      vendor: 'vendor-1',
      start_date: '2024-01-15T00:00:00.000Z',
      end_date: '2024-02-15T00:00:00.000Z',
      duration: 10,
      unit_rate: 100,
      total_amount: 1000,
      status: 'scheduled',
      notes: 'Test booking',
      payment_status: 'pending',
      paid_amount: 0
    }
    
    vm.editBooking(mockBooking)
    
    // Verify form is populated with correctly formatted dates
    expect(vm.form.start_date).toBe('2024-01-15')
    expect(vm.form.end_date).toBe('2024-02-15')
  })

  it('should render date inputs with correct type', async () => {
    const wrapper = mount(ServiceBookingsView)
    await nextTick()
    
    // Trigger add modal
    await wrapper.setData({ showAddModal: true })
    await nextTick()
    
    // Check that date inputs have correct type
    const startDateInput = wrapper.find('input[type="date"]')
    expect(startDateInput.exists()).toBe(true)
    
    // Should have both start and end date inputs
    const dateInputs = wrapper.findAll('input[type="date"]')
    expect(dateInputs.length).toBe(2)
  })

  it('should validate required start date', async () => {
    const wrapper = mount(ServiceBookingsView)
    await nextTick()
    
    // Trigger add modal
    await wrapper.setData({ showAddModal: true })
    await nextTick()
    
    // Find start date input and verify it's required
    const startDateInput = wrapper.find('input[type="date"]')
    expect(startDateInput.attributes('required')).toBeDefined()
  })

  it('should calculate total amount correctly', async () => {
    const wrapper = mount(ServiceBookingsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    
    // Set form values
    vm.form.duration = 5
    vm.form.unit_rate = 200
    
    vm.calculateTotal()
    
    expect(vm.form.total_amount).toBe(1000) // 5 * 200
  })

  it('should update rate when service is selected', async () => {
    const wrapper = mount(ServiceBookingsView)
    await nextTick()
    
    const vm = wrapper.vm as any
    
    // Mock services data
    vm.services = [
      {
        id: 'service-1',
        name: 'Test Service',
        standard_rate: 150
      }
    ]
    
    vm.form.service = 'service-1'
    vm.updateRateFromService()
    
    expect(vm.form.unit_rate).toBe(150)
  })
})