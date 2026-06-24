import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import type { ServiceBooking, PaymentAllocation } from '../../services/pocketbase'

// --- URL-filter relation loader test scaffolding -----------------------------
// Reactive filter object that the mocked useUrlFilters returns, so tests can
// toggle the active relation filter before mounting the view.
const mockFilters = vi.hoisted(() => ({ vendor: undefined as string | undefined, service: undefined as string | undefined }))

vi.mock('../../composables/useUrlFilters', () => ({
  useUrlFilters: () => ({
    filters: mockFilters,
    hasActiveFilter: computed(() => !!(mockFilters.vendor || mockFilters.service)),
    clearFilter: vi.fn(),
    setFilter: vi.fn(),
    activeFilterEntries: computed(() => []),
    openRecord: vi.fn()
  })
}))

const serviceBookingMocks = vi.hoisted(() => ({
  getAll: vi.fn().mockResolvedValue([]),
  getByVendor: vi.fn().mockResolvedValue([]),
  getByService: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({ id: 'booking-new' }),
  update: vi.fn().mockResolvedValue({ id: 'booking-1' }),
  uploadCompletionPhoto: vi.fn().mockResolvedValue('photo.jpg')
}))

/**
 * Tests for ServiceBookingsView Business Logic
 * Focuses on calculations, permissions, date formatting, and validation
 */

describe('ServiceBookingsView Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Total Amount Calculation', () => {
    it('should calculate total from duration and unit rate', () => {
      const form = {
        duration: 8,
        unit_rate: 500,
        total_amount: 0
      }

      const calculateTotal = () => {
        form.total_amount = form.duration * form.unit_rate
      }

      calculateTotal()
      expect(form.total_amount).toBe(4000) // 8 * 500
    })

    it('should handle decimal values correctly', () => {
      const form = {
        duration: 6.5,
        unit_rate: 450.50,
        total_amount: 0
      }

      const calculateTotal = () => {
        form.total_amount = form.duration * form.unit_rate
      }

      calculateTotal()
      expect(form.total_amount).toBe(2928.25) // 6.5 * 450.50
    })

    it('should return zero when duration is zero', () => {
      const form = {
        duration: 0,
        unit_rate: 500,
        total_amount: 0
      }

      const calculateTotal = () => {
        form.total_amount = form.duration * form.unit_rate
      }

      calculateTotal()
      expect(form.total_amount).toBe(0)
    })

    it('should return zero when unit rate is zero', () => {
      const form = {
        duration: 8,
        unit_rate: 0,
        total_amount: 0
      }

      const calculateTotal = () => {
        form.total_amount = form.duration * form.unit_rate
      }

      calculateTotal()
      expect(form.total_amount).toBe(0)
    })

    it('should handle large values correctly', () => {
      const form = {
        duration: 100,
        unit_rate: 1000,
        total_amount: 0
      }

      const calculateTotal = () => {
        form.total_amount = form.duration * form.unit_rate
      }

      calculateTotal()
      expect(form.total_amount).toBe(100000)
    })

    it('should update total when duration changes', () => {
      const form = {
        duration: 5,
        unit_rate: 600,
        total_amount: 0
      }

      const calculateTotal = () => {
        form.total_amount = form.duration * form.unit_rate
      }

      calculateTotal()
      expect(form.total_amount).toBe(3000)

      form.duration = 10
      calculateTotal()
      expect(form.total_amount).toBe(6000)
    })

    it('should update total when unit rate changes', () => {
      const form = {
        duration: 8,
        unit_rate: 400,
        total_amount: 0
      }

      const calculateTotal = () => {
        form.total_amount = form.duration * form.unit_rate
      }

      calculateTotal()
      expect(form.total_amount).toBe(3200)

      form.unit_rate = 500
      calculateTotal()
      expect(form.total_amount).toBe(4000)
    })
  })

  describe('Rate Update from Service', () => {
    it('should update unit rate from selected service', () => {
      const services = [
        { id: 'service-1', name: 'Plumbing', standard_rate: 800 },
        { id: 'service-2', name: 'Electrical', standard_rate: 1000 }
      ]

      const form = {
        service: 'service-1',
        duration: 8,
        unit_rate: 0,
        total_amount: 0
      }

      const updateRateFromService = () => {
        const selectedService = services.find(s => s.id === form.service)
        if (selectedService && selectedService.standard_rate) {
          form.unit_rate = selectedService.standard_rate
          form.total_amount = form.duration * form.unit_rate
        }
      }

      updateRateFromService()
      expect(form.unit_rate).toBe(800)
      expect(form.total_amount).toBe(6400)
    })

    it('should not update rate when service not found', () => {
      const services = [
        { id: 'service-1', name: 'Plumbing', standard_rate: 800 }
      ]

      const form = {
        service: 'service-unknown',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000
      }

      const updateRateFromService = () => {
        const selectedService = services.find(s => s.id === form.service)
        if (selectedService && selectedService.standard_rate) {
          form.unit_rate = selectedService.standard_rate
          form.total_amount = form.duration * form.unit_rate
        }
      }

      updateRateFromService()
      expect(form.unit_rate).toBe(500) // Unchanged
      expect(form.total_amount).toBe(4000) // Unchanged
    })

    it('should not update rate when standard_rate is undefined', () => {
      const services = [
        { id: 'service-1', name: 'Custom', standard_rate: undefined }
      ]

      const form = {
        service: 'service-1',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000
      }

      const updateRateFromService = () => {
        const selectedService = services.find(s => s.id === form.service)
        if (selectedService && selectedService.standard_rate) {
          form.unit_rate = selectedService.standard_rate
          form.total_amount = form.duration * form.unit_rate
        }
      }

      updateRateFromService()
      expect(form.unit_rate).toBe(500) // Unchanged
    })
  })

  describe('Date Formatting', () => {
    it('should format date for input as YYYY-MM-DD', () => {
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toISOString().slice(0, 10)
      }

      const formatted = formatDateForInput('2024-03-15T10:30:00Z')
      expect(formatted).toBe('2024-03-15')
    })

    it('should return empty string for empty input', () => {
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toISOString().slice(0, 10)
      }

      expect(formatDateForInput('')).toBe('')
    })

    it('should format date to locale date string', () => {
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
      }

      const formatted = formatDate('2024-01-15')
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should format date to locale datetime string', () => {
      const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString()
      }

      const formatted = formatDateTime('2024-01-15T14:30:00')
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
      expect(formatted).toContain(':')
    })

    it('should handle different date formats consistently', () => {
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toISOString().slice(0, 10)
      }

      expect(formatDateForInput('2024-12-25')).toBe('2024-12-25')
      expect(formatDateForInput('2024-06-01T00:00:00')).toBe('2024-06-01')
    })
  })

  describe('Edit Booking Permissions', () => {
    it('should allow editing when percent completed is less than 100', () => {
      const canUpdate = true
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        percent_completed: 50,
        site: 'site-1'
      }

      const canEditBooking = (booking: ServiceBooking) => {
        return canUpdate && (booking.percent_completed || 0) < 100
      }

      expect(canEditBooking(booking)).toBe(true)
    })

    it('should not allow editing when percent completed is 100', () => {
      const canUpdate = true
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        percent_completed: 100,
        site: 'site-1'
      }

      const canEditBooking = (booking: ServiceBooking) => {
        return canUpdate && (booking.percent_completed || 0) < 100
      }

      expect(canEditBooking(booking)).toBe(false)
    })

    it('should allow editing when percent completed is undefined', () => {
      const canUpdate = true
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        site: 'site-1'
      }

      const canEditBooking = (booking: ServiceBooking) => {
        return canUpdate && (booking.percent_completed || 0) < 100
      }

      expect(canEditBooking(booking)).toBe(true)
    })

    it('should not allow editing when user lacks permission', () => {
      const canUpdate = false
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        percent_completed: 0,
        site: 'site-1'
      }

      const canEditBooking = (booking: ServiceBooking) => {
        return canUpdate && (booking.percent_completed || 0) < 100
      }

      expect(canEditBooking(booking)).toBe(false)
    })

    it('should allow editing at 99 percent completion', () => {
      const canUpdate = true
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        percent_completed: 99,
        site: 'site-1'
      }

      const canEditBooking = (booking: ServiceBooking) => {
        return canUpdate && (booking.percent_completed || 0) < 100
      }

      expect(canEditBooking(booking)).toBe(true)
    })
  })

  describe('Payment Detection', () => {
    it('should detect booking with payments', () => {
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        site: 'site-1'
      }

      const paymentAllocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', service_booking: 'booking-1', allocated_amount: 1000, site: 'site-1' } as PaymentAllocation
      ]

      const hasPayments = (booking: ServiceBooking) => {
        if (!paymentAllocations.length) return false
        return paymentAllocations.some(allocation => allocation.service_booking === booking.id)
      }

      expect(hasPayments(booking)).toBe(true)
    })

    it('should return false when no payments exist', () => {
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        site: 'site-1'
      }

      const paymentAllocations: PaymentAllocation[] = []

      const hasPayments = (booking: ServiceBooking) => {
        if (!paymentAllocations.length) return false
        return paymentAllocations.some(allocation => allocation.service_booking === booking.id)
      }

      expect(hasPayments(booking)).toBe(false)
    })

    it('should return false when payments are for different bookings', () => {
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        site: 'site-1'
      }

      const paymentAllocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', service_booking: 'booking-2', allocated_amount: 1000, site: 'site-1' } as PaymentAllocation
      ]

      const hasPayments = (booking: ServiceBooking) => {
        if (!paymentAllocations.length) return false
        return paymentAllocations.some(allocation => allocation.service_booking === booking.id)
      }

      expect(hasPayments(booking)).toBe(false)
    })

    it('should detect payments among multiple allocations', () => {
      const booking: ServiceBooking = {
        id: 'booking-2',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        site: 'site-1'
      }

      const paymentAllocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', service_booking: 'booking-1', allocated_amount: 1000, site: 'site-1' } as PaymentAllocation,
        { id: 'alloc-2', payment: 'payment-2', service_booking: 'booking-2', allocated_amount: 500, site: 'site-1' } as PaymentAllocation,
        { id: 'alloc-3', payment: 'payment-3', service_booking: 'booking-3', allocated_amount: 2000, site: 'site-1' } as PaymentAllocation
      ]

      const hasPayments = (booking: ServiceBooking) => {
        if (!paymentAllocations.length) return false
        return paymentAllocations.some(allocation => allocation.service_booking === booking.id)
      }

      expect(hasPayments(booking)).toBe(true)
    })
  })

  describe('Delete Booking Permissions', () => {
    it('should allow deletion when no payments exist', () => {
      const canDelete = true
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        site: 'site-1'
      }

      const paymentAllocations: PaymentAllocation[] = []

      const hasPayments = (booking: ServiceBooking) => {
        if (!paymentAllocations.length) return false
        return paymentAllocations.some(allocation => allocation.service_booking === booking.id)
      }

      const canDeleteBooking = (booking: ServiceBooking) => {
        return canDelete && !hasPayments(booking)
      }

      expect(canDeleteBooking(booking)).toBe(true)
    })

    it('should not allow deletion when payments exist', () => {
      const canDelete = true
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        site: 'site-1'
      }

      const paymentAllocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', service_booking: 'booking-1', allocated_amount: 1000, site: 'site-1' } as PaymentAllocation
      ]

      const hasPayments = (booking: ServiceBooking) => {
        if (!paymentAllocations.length) return false
        return paymentAllocations.some(allocation => allocation.service_booking === booking.id)
      }

      const canDeleteBooking = (booking: ServiceBooking) => {
        return canDelete && !hasPayments(booking)
      }

      expect(canDeleteBooking(booking)).toBe(false)
    })

    it('should not allow deletion when user lacks permission', () => {
      const canDelete = false
      const booking: ServiceBooking = {
        id: 'booking-1',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        site: 'site-1'
      }

      const paymentAllocations: PaymentAllocation[] = []

      const hasPayments = (booking: ServiceBooking) => {
        if (!paymentAllocations.length) return false
        return paymentAllocations.some(allocation => allocation.service_booking === booking.id)
      }

      const canDeleteBooking = (booking: ServiceBooking) => {
        return canDelete && !hasPayments(booking)
      }

      expect(canDeleteBooking(booking)).toBe(false)
    })
  })

  describe('Active Services Filter', () => {
    it('should filter only active services', () => {
      const services = [
        { id: 'service-1', name: 'Plumbing', is_active: true },
        { id: 'service-2', name: 'Electrical', is_active: false },
        { id: 'service-3', name: 'Carpentry', is_active: true }
      ]

      const activeServices = services.filter(service => service.is_active)

      expect(activeServices).toHaveLength(2)
      expect(activeServices[0].id).toBe('service-1')
      expect(activeServices[1].id).toBe('service-3')
    })

    it('should return empty array when no active services', () => {
      const services = [
        { id: 'service-1', name: 'Plumbing', is_active: false },
        { id: 'service-2', name: 'Electrical', is_active: false }
      ]

      const activeServices = services.filter(service => service.is_active)

      expect(activeServices).toHaveLength(0)
    })

    it('should handle empty services array', () => {
      const services: any[] = []

      const activeServices = services.filter(service => service.is_active)

      expect(activeServices).toHaveLength(0)
    })
  })

  describe('Service Unit Detection', () => {
    it('should detect hourly service', () => {
      const services = [
        { id: 'service-1', name: 'Consulting', unit: 'hour' }
      ]

      const form = { service: 'service-1' }
      const selectedService = services.find(s => s.id === form.service)
      const isHourlyService = selectedService?.unit === 'hour'

      expect(isHourlyService).toBe(true)
    })

    it('should detect non-hourly service', () => {
      const services = [
        { id: 'service-1', name: 'Installation', unit: 'job' }
      ]

      const form = { service: 'service-1' }
      const selectedService = services.find(s => s.id === form.service)
      const isHourlyService = selectedService?.unit === 'hour'

      expect(isHourlyService).toBe(false)
    })

    it('should return false when service not found', () => {
      const services = [
        { id: 'service-1', name: 'Installation', unit: 'job' }
      ]

      const form = { service: 'service-unknown' }
      const selectedService = services.find(s => s.id === form.service)
      const isHourlyService = selectedService?.unit === 'hour'

      expect(isHourlyService).toBe(false)
    })
  })

  describe('Time Calculator Integration', () => {
    it('should update form with calculated duration and date', () => {
      const form = {
        duration: 0,
        start_date: '',
        unit_rate: 500,
        total_amount: 0
      }

      const handleTimeCalculatorApply = (duration: number, date: string) => {
        form.duration = duration
        form.start_date = date
        form.total_amount = form.duration * form.unit_rate
      }

      handleTimeCalculatorApply(6.5, '2024-03-15')

      expect(form.duration).toBe(6.5)
      expect(form.start_date).toBe('2024-03-15')
      expect(form.total_amount).toBe(3250)
    })

    it('should recalculate total when applying time calculator', () => {
      const form = {
        duration: 8,
        start_date: '2024-01-01',
        unit_rate: 600,
        total_amount: 4800
      }

      const handleTimeCalculatorApply = (duration: number, date: string) => {
        form.duration = duration
        form.start_date = date
        form.total_amount = form.duration * form.unit_rate
      }

      handleTimeCalculatorApply(4, '2024-03-20')

      expect(form.duration).toBe(4)
      expect(form.start_date).toBe('2024-03-20')
      expect(form.total_amount).toBe(2400)
    })
  })
})

// ---------------------------------------------------------------------------
// URL-driven relation-filter loader branching.
//
// The primary bookings useSiteData loader must branch on the active filter:
//   filters.vendor  -> serviceBookingService.getByVendor
//   filters.service -> serviceBookingService.getByService
//   neither         -> serviceBookingService.getAll
//
// We mock useSiteData so that the FIRST loader registered (the bookings loader)
// is captured and invoked, exercising the real branching closure in the view.
// ---------------------------------------------------------------------------

// useSiteData: capture every registered loader; immediately invoke them so the
// view's branching closure runs against the mocked serviceBookingService.
vi.mock('../../composables/useSiteData', () => ({
  useSiteData: (loadFn: (siteId: string) => Promise<any>) => {
    // Fire-and-forget; the loader's call into serviceBookingService is synchronous
    // up to the awaited service method, which is enough to assert the branch.
    loadFn('site-1')
    return {
      data: ref([] as any[]),
      loading: ref(false),
      error: ref(null),
      reload: vi.fn(async () => { await loadFn('site-1') })
    }
  }
}))

vi.mock('../../composables/useSearch', () => ({
  useServiceBookingSearch: () => ({
    searchQuery: ref(''),
    loading: ref(false),
    results: ref([] as any[]),
    loadAll: vi.fn()
  })
}))

vi.mock('../../composables/usePermissions', () => ({
  usePermissions: () => ({
    canCreate: ref(true),
    canUpdate: ref(true),
    canDelete: ref(true),
    canRead: ref(true),
    canViewFinancials: ref(true)
  })
}))

vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: ref(false)
  })
}))

vi.mock('../../composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() })
}))

vi.mock('../../composables/useModalState', () => ({
  useModalState: () => ({ openModal: vi.fn(), closeModal: vi.fn() })
}))

vi.mock('../../composables/useQuickActionModal', () => ({
  useQuickActionModal: vi.fn()
}))

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

vi.mock('../../services/pocketbase', () => ({
  serviceBookingService: serviceBookingMocks,
  serviceService: { getAll: vi.fn().mockResolvedValue([]) },
  vendorService: { getAll: vi.fn().mockResolvedValue([]) },
  paymentAllocationService: { getAll: vi.fn().mockResolvedValue([]) },
  deliveryService: { getAll: vi.fn().mockResolvedValue([]) },
  paymentService: { getAll: vi.fn().mockResolvedValue([]) },
  ServiceBookingService: {
    calculatePaymentStatusFromData: vi.fn().mockReturnValue('pending'),
    calculateProgressBasedAmount: vi.fn().mockReturnValue(0),
    calculateOutstandingAmountFromData: vi.fn().mockReturnValue(0)
  },
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
  setCurrentUserRole: vi.fn(),
  calculatePermissions: vi.fn().mockReturnValue({
    canCreate: true, canRead: true, canUpdate: true, canDelete: true,
    canManageUsers: true, canManageRoles: true, canExport: true, canViewFinancials: true
  })
}))

describe('ServiceBookingsView URL-filter loader branching', () => {
  let mount: typeof import('@vue/test-utils').mount
  let ServiceBookingsView: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockFilters.vendor = undefined
    mockFilters.service = undefined
    serviceBookingMocks.getAll.mockResolvedValue([])
    serviceBookingMocks.getByVendor.mockResolvedValue([])
    serviceBookingMocks.getByService.mockResolvedValue([])
    ;({ mount } = await import('@vue/test-utils'))
    ServiceBookingsView = (await import('../../views/ServiceBookingsView.vue')).default
  })

  const mountView = () =>
    mount(ServiceBookingsView, {
      global: {
        stubs: {
          RecordLink: { template: '<span><slot />{{ label }}</span>', props: ['type', 'mode', 'id', 'label'] },
          SearchBox: true,
          CardDropdownMenu: true,
          PhotoGallery: true,
          FileUploadComponent: true,
          VendorSearchBox: true,
          ServiceSearchBox: true,
          TimeCalculatorModal: true,
          Skeleton: true,
          'router-link': { template: '<a><slot /></a>', props: ['to'] }
        }
      }
    })

  it('branches to getByVendor when filtered by vendor', () => {
    mockFilters.vendor = 'vendor-42'
    mountView()
    expect(serviceBookingMocks.getByVendor).toHaveBeenCalledWith('vendor-42')
    expect(serviceBookingMocks.getByService).not.toHaveBeenCalled()
    expect(serviceBookingMocks.getAll).not.toHaveBeenCalled()
  })

  it('branches to getByService when filtered by service', () => {
    mockFilters.service = 'service-7'
    mountView()
    expect(serviceBookingMocks.getByService).toHaveBeenCalledWith('service-7')
    expect(serviceBookingMocks.getByVendor).not.toHaveBeenCalled()
    expect(serviceBookingMocks.getAll).not.toHaveBeenCalled()
  })

  it('falls back to getAll when no filter is active', () => {
    mountView()
    expect(serviceBookingMocks.getAll).toHaveBeenCalled()
    expect(serviceBookingMocks.getByVendor).not.toHaveBeenCalled()
    expect(serviceBookingMocks.getByService).not.toHaveBeenCalled()
  })
})
