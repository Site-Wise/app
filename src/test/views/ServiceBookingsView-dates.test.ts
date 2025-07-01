import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ServiceBookingsView from '../../views/ServiceBookingsView.vue'
import { setupTestPinia } from '../utils/test-setup'

// Mock SearchBox component
vi.mock('../../components/SearchBox.vue', () => ({
  default: {
    name: 'SearchBox',
    template: '<input type="text" class="mock-search-box" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'searchLoading'],
    emits: ['update:modelValue']
  }
}))

// Mock services with proper Pinia-compatible structure

vi.mock('../../services/pocketbase', () => {
  const mockServiceBookings = [
    {
      id: 'booking-1',
      service: 'service-1',
      vendor: 'vendor-1',
      start_date: '2024-01-15',
      duration: 5,
      unit_rate: 100,
      total_amount: 500,
      status: 'scheduled',
      notes: 'Test booking',
      payment_status: 'pending',
      paid_amount: 0,
      expand: {
        service: { id: 'service-1', name: 'Test Service', category: 'Construction', unit: 'hours', standard_rate: 100, is_active: true },
        vendor: { id: 'vendor-1', name: 'Test Vendor' }
      }
    }
  ]

  const mockServices = [
    { id: 'service-1', name: 'Test Service', category: 'Construction', unit: 'hours', standard_rate: 100, is_active: true },
    { id: 'service-2', name: 'Another Service', category: 'Plumbing', unit: 'days', standard_rate: 200, is_active: true }
  ]

  const mockVendors = [
    { id: 'vendor-1', name: 'Test Vendor' },
    { id: 'vendor-2', name: 'Another Vendor' }
  ]

  return {
    serviceBookingService: {
      getAll: vi.fn().mockResolvedValue(mockServiceBookings),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({})
    },
    serviceService: {
      getAll: vi.fn().mockResolvedValue(mockServices)
    },
    vendorService: {
      getAll: vi.fn().mockResolvedValue(mockVendors)
    },
    getCurrentSiteId: vi.fn(() => 'site-1'),
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: vi.fn(() => 'owner'),
    setCurrentUserRole: vi.fn(),
    pb: {
      authStore: { isValid: true, model: { id: 'user-1' } },
      collection: vi.fn(() => ({ getFullList: vi.fn().mockResolvedValue([]) }))
    }
  }
})

// Mock composables
vi.mock('../../composables/usePermissions', () => ({
  usePermissions: () => ({
    canCreate: { value: true },
    canUpdate: { value: true },
    canDelete: { value: true }
  })
}))

vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: { value: false }
  })
}))

vi.mock('../../composables/useSearch', () => ({
  useServiceBookingSearch: () => ({
    searchQuery: { value: '' },
    loading: { value: false },
    results: { value: [] },
    loadAll: vi.fn()
  })
}))

vi.mock('../../components/PhotoGallery.vue', () => ({
  default: { name: 'PhotoGallery', template: '<div>PhotoGallery</div>' }
}))

describe('ServiceBookingsView - Date Handling', () => {
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

  describe('Date Display and Formatting', () => {
    it('should format dates correctly for display', async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })

      await nextTick()
      await nextTick() // Wait for data loading

      // Check if date is formatted correctly in the table
      const dateCell = wrapper.find('[data-testid="booking-start-date"]') || 
                      wrapper.findAll('td').find(td => td.text().includes('1/15/2024'))
      
      // The date should be formatted using toLocaleDateString()
      expect(wrapper.text()).toContain('1/15/2024') // Or similar locale format
    })

    it('should handle empty dates gracefully', async () => {
      const bookingWithoutDate = {
        id: 'booking-empty',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '',
        duration: 5,
        unit_rate: 100,
        total_amount: 500,
        status: 'scheduled',
        notes: 'Test booking',
        payment_status: 'pending',
        paid_amount: 0
        // No expand property
      }

      // Mock service to return booking without date
      const pocketbaseMocks = await import('../../services/pocketbase')
      vi.mocked(pocketbaseMocks.serviceBookingService.getAll).mockResolvedValueOnce([bookingWithoutDate])

      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })

      await nextTick()
      await nextTick()

      // Should not crash and should handle empty date
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Date Input Handling', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()
    })

    it('should render date inputs with correct type', async () => {
      // Open the add modal
      const addButton = wrapper.find('button')
      await addButton.trigger('click')
      await nextTick()

      const dateInput = wrapper.find('input[type="date"]')
      expect(dateInput.exists()).toBe(true)
      expect(dateInput.attributes('type')).toBe('date')
    })

    it('should validate required start date', async () => {
      // Open the add modal
      const addButton = wrapper.find('button')
      await addButton.trigger('click')
      await nextTick()

      const dateInput = wrapper.find('input[type="date"]')
      expect(dateInput.attributes('required')).toBeDefined()
    })

    it('should save dates in correct format', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      const createSpy = vi.mocked(pocketbaseMocks.serviceBookingService.create)

      // Open the add modal
      const addButton = wrapper.find('button')
      await addButton.trigger('click')
      await nextTick()

      // Fill in the form
      await wrapper.find('select').setValue('service-1') // service
      await wrapper.findAll('select')[1].setValue('vendor-1') // vendor
      await wrapper.find('input[type="date"]').setValue('2024-02-20')
      await wrapper.find('input[type="number"]').setValue(3) // duration
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      await nextTick()

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: '2024-02-20' // Should keep YYYY-MM-DD format
        })
      )
    })

    it('should populate form with correctly formatted dates when editing', async () => {
      // Open the add modal first
      const addButton = wrapper.find('button')
      await addButton.trigger('click')
      await nextTick()

      // Create a mock booking for editing
      const mockBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-15',
        duration: 5,
        unit_rate: 100,
        total_amount: 500,
        status: 'scheduled',
        notes: 'Test booking',
        payment_status: 'pending',
        paid_amount: 0
      }

      // Simulate editing a booking by calling the edit function directly
      await wrapper.vm.editBooking(mockBooking)
      await nextTick()

      const dateInput = wrapper.find('input[type="date"]')
      expect(dateInput.element.value).toBe('2024-01-15')
    })
  })

  describe('Date Calculations and Business Logic', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()

      // Open the add modal
      const addButton = wrapper.find('button')
      await addButton.trigger('click')
      await nextTick()
    })

    it('should calculate total amount correctly', async () => {
      // Set duration and unit rate
      wrapper.vm.form.duration = 5
      wrapper.vm.form.unit_rate = 150

      // Call calculateTotal
      wrapper.vm.calculateTotal()

      expect(wrapper.vm.form.total_amount).toBe(750) // 5 * 150
    })

    it('should update rate when service is selected', async () => {
      // Select a service
      wrapper.vm.form.service = 'service-1'
      
      // Call updateRateFromService
      wrapper.vm.updateRateFromService()

      expect(wrapper.vm.form.unit_rate).toBe(100) // standard_rate from mockServices
    })

    it('should auto-calculate total when duration or rate changes', async () => {
      const durationInput = wrapper.find('input[placeholder="0"]')
      const rateInput = wrapper.find('input[placeholder="0.00"]')

      // Set duration
      await durationInput.setValue('4')
      await durationInput.trigger('input')

      // Set rate
      await rateInput.setValue('125')
      await rateInput.trigger('input')

      await nextTick()

      expect(wrapper.vm.form.total_amount).toBe(500) // 4 * 125
    })
  })

  describe('Date Utility Functions', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
    })

    it('should format date for input correctly', () => {
      const result = wrapper.vm.formatDateForInput('2024-01-15T10:30:00.000Z')
      expect(result).toBe('2024-01-15')
    })

    it('should handle empty date strings in formatDateForInput', () => {
      const result = wrapper.vm.formatDateForInput('')
      expect(result).toBe('')
    })

    it('should format date for display correctly', () => {
      const result = wrapper.vm.formatDate('2024-01-15')
      expect(result).toMatch(/1\/15\/2024|15\/1\/2024|2024-1-15/) // Various locale formats
    })

    it('should format datetime for display correctly', () => {
      const result = wrapper.vm.formatDateTime('2024-01-15T10:30:00.000Z')
      expect(result).toContain('2024') // Should contain year
      expect(result).toContain('10:30') // Should contain time
    })
  })

  describe('Form Validation and Error Handling', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()

      // Open the add modal
      const addButton = wrapper.find('button')
      await addButton.trigger('click')
      await nextTick()
    })

    it('should require start date for form submission', async () => {
      const dateInput = wrapper.find('input[type="date"]')
      expect(dateInput.attributes('required')).toBeDefined()
    })

    it('should handle date validation errors gracefully', async () => {
      // Try to submit form without required fields
      const form = wrapper.find('form')
      
      // This should trigger browser validation
      await form.trigger('submit')
      
      // Form should still be visible (not submitted)
      expect(wrapper.find('form').exists()).toBe(true)
    })
  })

  describe('Search Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()
    })

    it('should display search functionality', () => {
      const searchInput = wrapper.findComponent({ name: 'SearchBox' })
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.props('placeholder')).toContain('Search')
    })
  })
})