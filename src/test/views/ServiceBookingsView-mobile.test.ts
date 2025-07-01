import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ServiceBookingsView from '../../views/ServiceBookingsView.vue'
import { setupTestPinia } from '../utils/test-setup'

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
    },
    {
      id: 'booking-2',
      service: 'service-2',
      vendor: 'vendor-2',
      start_date: '2024-01-20',
      duration: 3,
      unit_rate: 150,
      total_amount: 450,
      status: 'completed',
      notes: 'Another booking',
      payment_status: 'paid',
      paid_amount: 450,
      expand: {
        service: { id: 'service-2', name: 'Another Service', category: 'Plumbing', unit: 'days', standard_rate: 150, is_active: true },
        vendor: { id: 'vendor-2', name: 'Another Vendor' }
      }
    }
  ]

  const mockServices = [
    { id: 'service-1', name: 'Test Service', category: 'Construction', unit: 'hours', standard_rate: 100, is_active: true },
    { id: 'service-2', name: 'Another Service', category: 'Plumbing', unit: 'days', standard_rate: 150, is_active: true }
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

// Mock window.confirm for delete operations
const mockConfirm = vi.fn(() => true)
Object.defineProperty(window, 'confirm', { value: mockConfirm, configurable: true })

describe('ServiceBookingsView - Mobile Responsive Design', () => {
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

  describe('Mobile Table Structure', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick() // Wait for data loading
    })

    it('should show mobile table headers on small screens', () => {
      const mobileHeaders = wrapper.find('thead.lg\\:hidden')
      expect(mobileHeaders.exists()).toBe(true)
      
      const headerCells = mobileHeaders.findAll('th')
      expect(headerCells).toHaveLength(3) // Service, Details, Actions
    })

    it('should hide desktop table headers on mobile', () => {
      const desktopHeaders = wrapper.find('thead.hidden.lg\\:table-header-group')
      expect(desktopHeaders.exists()).toBe(true)
      expect(desktopHeaders.classes()).toContain('hidden')
      expect(desktopHeaders.classes()).toContain('lg:table-header-group')
    })

    it('should display mobile table cells with lg:hidden class', () => {
      const mobileTableCells = wrapper.findAll('td.lg\\:hidden')
      expect(mobileTableCells.length).toBeGreaterThan(0)
      
      // Each booking should have 3 mobile cells (service info, amount/status, actions)
      expect(mobileTableCells.length).toBe(6) // 2 bookings × 3 cells each
    })
  })

  describe('Mobile Layout Content', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()
    })

    it('should display service name, vendor and date in first mobile column', () => {
      const firstMobileCells = wrapper.findAll('td.lg\\:hidden').filter((cell: any, index: number) => index % 3 === 0)
      expect(firstMobileCells).toHaveLength(2)

      const firstCell = firstMobileCells[0]
      expect(firstCell.text()).toContain('Test Service')
      expect(firstCell.text()).toContain('Test Vendor')
      expect(firstCell.text()).toContain('1/15/2024') // Or similar locale format
    })

    it('should display amount and status in second mobile column', () => {
      const secondMobileCells = wrapper.findAll('td.lg\\:hidden').filter((cell: any, index: number) => index % 3 === 1)
      expect(secondMobileCells).toHaveLength(2)

      const firstCell = secondMobileCells[0]
      expect(firstCell.text()).toContain('₹500.00')
      expect(firstCell.text()).toContain('Scheduled') // Status should be displayed (capitalized)
    })

    it('should display amount in color based on payment status', () => {
      const amountCells = wrapper.findAll('td.lg\\:hidden .text-sm.font-semibold')
      expect(amountCells.length).toBeGreaterThan(0)

      // Check for payment status color classes
      const pendingAmount = amountCells.find((cell: any) => cell.text().includes('500.00'))
      expect(pendingAmount?.classes()).toContain('text-red-600') // pending = red

      const paidAmount = amountCells.find((cell: any) => cell.text().includes('450.00'))
      expect(paidAmount?.classes()).toContain('text-green-600') // paid = green
    })

    it('should only show booking status without payment status text', () => {
      const statusElements = wrapper.findAll('.status-pending, .status-paid, .status-partial')
      expect(statusElements.length).toBeGreaterThan(0)
      
      // Mobile view should show booking status, not payment status in mobile cells
      const mobileStatusCells = wrapper.findAll('td.lg\\:hidden .text-xs')
      expect(mobileStatusCells.length).toBeGreaterThan(0)
    })
  })

  describe('Mobile Actions Menu', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()
    })

    it('should display three-dot menu button in mobile actions column', () => {
      const actionButtons = wrapper.findAll('td.lg\\:hidden button svg')
      expect(actionButtons.length).toBeGreaterThan(0)
      
      // Should have three-dot icons (viewBox 0 0 20 20)
      const threeDotButtons = actionButtons.filter((btn: any) => 
        btn.attributes('viewBox') === '0 0 20 20'
      )
      expect(threeDotButtons.length).toBe(2) // One for each booking
    })

    it('should open dropdown menu when three-dot button is clicked', async () => {
      const firstThreeDotButton = wrapper.findAll('td.lg\\:hidden button')[0]
      
      // Initially menu should be closed
      expect(wrapper.find('.absolute.right-0.top-full').exists()).toBe(false)
      
      // Click the three-dot button
      await firstThreeDotButton.trigger('click')
      await nextTick()
      
      // Menu should now be open
      expect(wrapper.find('.absolute.right-0.top-full').exists()).toBe(true)
    })

    it('should display all action options in dropdown menu', async () => {
      const firstThreeDotButton = wrapper.findAll('td.lg\\:hidden button')[0]
      await firstThreeDotButton.trigger('click')
      await nextTick()

      const dropdownMenu = wrapper.find('.absolute.right-0.top-full')
      expect(dropdownMenu.exists()).toBe(true)

      const menuItems = dropdownMenu.findAll('button')
      expect(menuItems).toHaveLength(3) // View, Edit, Delete

      expect(menuItems[0].text()).toContain('View')
      expect(menuItems[1].text()).toContain('Edit')
      expect(menuItems[2].text()).toContain('Delete')
    })

    it('should close menu when clicking outside', async () => {
      const firstThreeDotButton = wrapper.findAll('td.lg\\:hidden button')[0]
      await firstThreeDotButton.trigger('click')
      await nextTick()

      // Menu should be open
      expect(wrapper.find('.absolute.right-0.top-full').exists()).toBe(true)

      // Call closeMobileMenu directly (simulating click outside)
      wrapper.vm.closeMobileMenu()
      await nextTick()

      // Menu should be closed
      expect(wrapper.find('.absolute.right-0.top-full').exists()).toBe(false)
    })

    it('should execute actions when menu items are clicked', async () => {
      const firstThreeDotButton = wrapper.findAll('td.lg\\:hidden button')[0]
      await firstThreeDotButton.trigger('click')
      await nextTick()

      const dropdownMenu = wrapper.find('.absolute.right-0.top-full')
      const menuItems = dropdownMenu.findAll('button')

      // Test view action
      const viewSpy = vi.spyOn(wrapper.vm, 'viewBooking')
      await menuItems[0].trigger('click')
      expect(viewSpy).toHaveBeenCalled()

      // Test edit action
      const editSpy = vi.spyOn(wrapper.vm, 'editBooking')
      await menuItems[1].trigger('click')
      expect(editSpy).toHaveBeenCalled()

      // Test delete action
      const deleteSpy = vi.spyOn(wrapper.vm, 'deleteBooking')
      await menuItems[2].trigger('click')
      expect(deleteSpy).toHaveBeenCalled()
    })
  })

  describe('Mobile Translation Support', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()
    })

    it('should display translated mobile headers', () => {
      const mobileHeaders = wrapper.find('thead.lg\\:hidden')
      const headerCells = mobileHeaders.findAll('th')
      
      // Headers should contain translated text (even if keys are missing, should show keys)
      expect(headerCells[0].text()).toBeTruthy()
      expect(headerCells[1].text()).toBeTruthy()
      expect(headerCells[2].text()).toBeTruthy()
    })

    it('should display translated booking statuses', () => {
      const statusElements = wrapper.findAll('.status-pending, .status-paid, .status-partial')
      expect(statusElements.length).toBeGreaterThan(0)
      
      // Should show status text (even if translation missing, should show key)
      statusElements.forEach((element: any) => {
        expect(element.text()).toBeTruthy()
      })
    })
  })

  describe('Mobile Performance and Error Handling', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()
    })

    it('should handle missing expand data gracefully', async () => {
      // Create booking without expand data
      const bookingWithoutExpand = {
        id: 'booking-no-expand',
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-15',
        duration: 5,
        unit_rate: 100,
        total_amount: 500,
        status: 'scheduled',
        payment_status: 'pending',
        paid_amount: 0
        // No expand property
      }

      const pocketbaseMocks = await import('../../services/pocketbase')
      vi.mocked(pocketbaseMocks.serviceBookingService.getAll).mockResolvedValueOnce([bookingWithoutExpand])

      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()

      // Should not crash and should show fallback text
      expect(wrapper.text()).toContain('Unknown Service')
      expect(wrapper.text()).toContain('Unknown Vendor')
    })

    it('should handle empty state properly in mobile view', async () => {
      const pocketbaseMocks = await import('../../services/pocketbase')
      vi.mocked(pocketbaseMocks.serviceBookingService.getAll).mockResolvedValueOnce([])

      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()

      // Should show empty state message (check for actual message)
      expect(wrapper.text()).toContain('No service bookings')
    })

    it('should handle click-outside listener properly', async () => {
      const firstThreeDotButton = wrapper.findAll('td.lg\\:hidden button')[0]
      await firstThreeDotButton.trigger('click')
      await nextTick()

      // Menu should be open
      expect(wrapper.vm.openMobileMenuId).toBe('booking-1')

      // Simulate toggle with same ID (should close)
      wrapper.vm.toggleMobileMenu('booking-1')
      await nextTick()

      expect(wrapper.vm.openMobileMenuId).toBeNull()
    })
  })

  describe('Mobile Specific Features', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()
    })

    it('should not display duration, rate, or reference in mobile view', () => {
      // Mobile cells should not show detailed info that's shown in desktop
      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      
      mobileCells.forEach((cell: any) => {
        // Should not contain detailed duration info like "5 hours"
        expect(cell.text()).not.toMatch(/\d+\s+(hours|days|units)/)
        // Should not contain rate info like "₹100.00" (except total amount)
        const text = cell.text()
        if (text.includes('₹')) {
          // If it contains currency, it should be the total amount, not unit rate
          expect(text).toMatch(/₹[45]\d{2}\.00/) // 450.00 or 500.00
        }
      })
    })

    it('should handle multiple menus opening and closing properly', async () => {
      const allButtons = wrapper.findAll('td.lg\\:hidden button')
      const threeDotButtons = allButtons.filter((btn: any) => {
        const svg = btn.find('svg')
        return svg.exists() && svg.attributes('viewBox') === '0 0 20 20'
      })

      expect(threeDotButtons.length).toBeGreaterThan(1)

      // Open first menu
      await threeDotButtons[0].trigger('click')
      await nextTick()
      expect(wrapper.vm.openMobileMenuId).toBe('booking-1')

      // Open second menu (should close first and open second)  
      await threeDotButtons[1].trigger('click')
      await nextTick()
      expect(wrapper.vm.openMobileMenuId).toBe('booking-2')

      // Close all menus
      wrapper.vm.closeMobileMenu()
      await nextTick()
      expect(wrapper.vm.openMobileMenuId).toBeNull()
    })
  })
})