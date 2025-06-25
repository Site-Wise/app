import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ServiceBookingsView from '../../views/ServiceBookingsView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock i18n
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'serviceBookings.title': 'Service Bookings',
        'serviceBookings.subtitle': 'Manage service bookings and track completion',
        'serviceBookings.bookService': 'Book Service',
        'serviceBookings.startDate': 'Start Date',
        'serviceBookings.duration': 'Duration',
        'serviceBookings.rate': 'Rate',
        'serviceBookings.paymentStatus': 'Payment Status',
        'serviceBookings.noBookings': 'No bookings found',
        'serviceBookings.startBooking': 'Start booking services.',
        'serviceBookings.statuses.scheduled': 'Scheduled',
        'serviceBookings.statuses.in_progress': 'In Progress',
        'serviceBookings.statuses.completed': 'Completed',
        'serviceBookings.statuses.cancelled': 'Cancelled',
        'serviceBookings.paid': 'Paid',
        'services.service': 'Service',
        'services.details': 'Details',
        'common.vendor': 'Vendor',
        'common.total': 'Total',
        'common.status': 'Status',
        'common.actions': 'Actions',
        'common.view': 'View',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.details': 'Details',
        'common.paid': 'Paid',
        'common.pending': 'Pending',
        'common.partial': 'Partial',
        'messages.confirmDelete': 'Are you sure you want to delete this {item}?',
        'serviceBookings.booking': 'booking',
        'messages.error': 'An error occurred'
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

// Mock permissions composable
vi.mock('../../composables/usePermissions', () => ({
  usePermissions: () => ({
    canCreate: true,
    canUpdate: true,
    canDelete: true
  })
}))

// Mock PocketBase services
vi.mock('../../services/pocketbase', () => ({
  serviceBookingService: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'booking-1',
        duration: 8,
        unit_rate: 500.00,
        total_amount: 4000.00,
        paid_amount: 4000.00,
        status: 'completed',
        payment_status: 'paid',
        start_date: '2024-01-20',
        end_date: '2024-01-21',
        notes: 'Completed work',
        completion_photos: ['photo1.jpg'],
        expand: {
          service: { id: 'service-1', name: 'Plumbing Work', service_type: 'plumbing', unit: 'hours' },
          vendor: { id: 'vendor-1', name: 'ABC Plumbers' }
        }
      },
      {
        id: 'booking-2',
        duration: 5,
        unit_rate: 800.00,
        total_amount: 4000.00,
        paid_amount: 2000.00,
        status: 'in_progress',
        payment_status: 'partial',
        start_date: '2024-01-15',
        end_date: null,
        notes: 'Work in progress',
        completion_photos: [],
        expand: {
          service: { id: 'service-2', name: 'Electrical Work', service_type: 'electrical', unit: 'hours' },
          vendor: { id: 'vendor-2', name: 'XYZ Electricians' }
        }
      },
      {
        id: 'booking-3',
        duration: 10,
        unit_rate: 300.00,
        total_amount: 3000.00,
        paid_amount: 0.00,
        status: 'scheduled',
        payment_status: 'pending',
        start_date: '2024-01-25',
        end_date: null,
        notes: 'Scheduled for next week',
        completion_photos: [],
        expand: {
          service: { id: 'service-3', name: 'Painting Work', service_type: 'painting', unit: 'sqft' },
          vendor: { id: 'vendor-3', name: 'Local Painters' }
        }
      }
    ]),
    create: vi.fn().mockResolvedValue({ id: 'new-booking' }),
    update: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true)
  },
  getCurrentSiteId: vi.fn().mockReturnValue('test-site-id'),
  pb: {
    collection: vi.fn(() => ({
      getFullList: vi.fn().mockResolvedValue([]),
      getOne: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({})
    }))
  },
  serviceService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  vendorService: {
    getAll: vi.fn().mockResolvedValue([])
  }
}))

// Mock photo gallery component
vi.mock('../../components/PhotoGallery.vue', () => ({
  default: {
    name: 'PhotoGallery',
    template: '<div class="mock-photo-gallery">Photo Gallery</div>',
    props: ['photos', 'itemId', 'collection']
  }
}))

describe('ServiceBookingsView - Mobile Responsive Design', () => {
  let wrapper: any
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()
    router = createMockRouter()
    
    // Mock window.innerWidth for mobile testing
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone width
    })
    
    // Mock click outside handler
    document.addEventListener = vi.fn()
    document.removeEventListener = vi.fn()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(ServiceBookingsView, {
      props,
      global: {
        plugins: [router],
        stubs: {
          'Calendar': true,
          'Plus': true,
          'Edit2': true,
          'Trash2': true,
          'Loader2': true,
          'Eye': true,
          'X': true,
          'Transition': true
        }
      }
    })
  }

  describe('Mobile Table Structure', () => {
    it('should show mobile table headers on small screens', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Check that mobile headers are present
      const mobileHeaders = wrapper.findAll('thead.lg\\:hidden th')
      expect(mobileHeaders.length).toBe(3)
      
      // Verify header text content
      expect(mobileHeaders[0].text()).toContain('Service')
      expect(mobileHeaders[1].text()).toContain('Details')
      expect(mobileHeaders[2].text()).toContain('Actions')
    })

    it('should hide desktop table headers on mobile', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Check that desktop headers have hidden class
      const desktopHeaders = wrapper.find('thead.hidden.lg\\:table-header-group')
      expect(desktopHeaders.exists()).toBe(true)
    })

    it('should display mobile table cells with lg:hidden class', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Check mobile table cells exist
      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      expect(mobileCells.length).toBeGreaterThan(0)
    })
  })

  describe('Mobile Layout Content', () => {
    it('should display service name, vendor and date in first mobile column', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const firstMobileColumn = wrapper.find('td.lg\\:hidden')
      expect(firstMobileColumn.text()).toContain('Plumbing Work')
      expect(firstMobileColumn.text()).toContain('ABC Plumbers')
      expect(firstMobileColumn.text()).toContain('1/20/2024')
    })

    it('should display amount and status in second mobile column', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      const secondColumn = mobileCells[1]
      
      expect(secondColumn.text()).toContain('₹4000.00')
      expect(secondColumn.text()).toContain('Completed')
    })

    it('should display amount in color based on payment status', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Find the paid booking
      const rows = wrapper.findAll('tr')
      const paidRow = rows.find((row: any) => row.text().includes('Plumbing Work'))
      const mobileCells = paidRow.findAll('td.lg\\:hidden')
      const secondColumn = mobileCells[1]
      const greenAmount = secondColumn.find('.text-green-600')
      
      expect(greenAmount.exists()).toBe(true)
      expect(greenAmount.text()).toContain('₹4000.00')

      // Find the pending booking
      const pendingRow = rows.find((row: any) => row.text().includes('Painting Work'))
      const pendingCells = pendingRow.findAll('td.lg\\:hidden')
      const pendingSecondColumn = pendingCells[1]
      const redAmount = pendingSecondColumn.find('.text-red-600')
      
      expect(redAmount.exists()).toBe(true)
      expect(redAmount.text()).toContain('₹3000.00')

      // Find the partial payment booking
      const partialRow = rows.find((row: any) => row.text().includes('Electrical Work'))
      const partialCells = partialRow.findAll('td.lg\\:hidden')
      const partialSecondColumn = partialCells[1]
      const yellowAmount = partialSecondColumn.find('.text-yellow-600')
      
      expect(yellowAmount.exists()).toBe(true)
      expect(yellowAmount.text()).toContain('₹4000.00')
    })

    it('should only show booking status without payment status text', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      const secondColumn = mobileCells[1]
      
      // Should show booking status
      expect(secondColumn.text()).toContain('Completed')
      
      // Should not show payment status text
      expect(secondColumn.text()).not.toContain('Paid')
      expect(secondColumn.text()).not.toContain('Payment')
    })
  })

  describe('Mobile Actions Menu', () => {
    it('should display three-dot menu button in mobile actions column', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileActionCells = wrapper.findAll('td.lg\\:hidden')
      const actionCell = mobileActionCells[2] // Third column is actions
      
      const menuButton = actionCell.find('button')
      expect(menuButton.exists()).toBe(true)
      
      // Check for three-dot icon (SVG with specific path)
      const svg = menuButton.find('svg')
      expect(svg.exists()).toBe(true)
    })

    it('should open dropdown menu when three-dot button is clicked', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileActionCells = wrapper.findAll('td.lg\\:hidden')
      const actionCell = mobileActionCells[2]
      const menuButton = actionCell.find('button')
      
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Check if menu appears
      expect(wrapper.vm.openMobileMenuId).toBe('booking-1')
      
      const dropdown = actionCell.find('.absolute')
      expect(dropdown.exists()).toBe(true)
    })

    it('should display all action options in dropdown menu', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Open menu for first item
      const mobileActionCells = wrapper.findAll('td.lg\\:hidden')
      const actionCell = mobileActionCells[2]
      const menuButton = actionCell.find('button')
      
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      const dropdown = actionCell.find('.absolute')
      const menuButtons = dropdown.findAll('button')
      
      expect(menuButtons.length).toBe(3)
      expect(menuButtons[0].text()).toContain('View')
      expect(menuButtons[1].text()).toContain('Edit')
      expect(menuButtons[2].text()).toContain('Delete')
    })

    it('should close menu when clicking outside', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Open menu
      const mobileActionCells = wrapper.findAll('td.lg\\:hidden')
      const actionCell = mobileActionCells[2]
      const menuButton = actionCell.find('button')
      
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.openMobileMenuId).toBe('booking-1')

      // Simulate click outside
      wrapper.vm.closeMobileMenu()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.openMobileMenuId).toBe(null)
    })

    it('should execute actions when menu items are clicked', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Open menu
      const mobileActionCells = wrapper.findAll('td.lg\\:hidden')
      const actionCell = mobileActionCells[2]
      const menuButton = actionCell.find('button')
      
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Click view button
      const dropdown = actionCell.find('.absolute')
      const viewButton = dropdown.findAll('button')[0]
      
      await viewButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Check that view action was triggered
      expect(wrapper.vm.viewingBooking).toBeTruthy()
      expect(wrapper.vm.openMobileMenuId).toBe(null) // Menu should close
    })
  })

  describe('Mobile Translation Support', () => {
    it('should display translated mobile headers', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileHeaders = wrapper.findAll('thead.lg\\:hidden th')
      
      expect(mobileHeaders[0].text()).toBe('Service')
      expect(mobileHeaders[1].text()).toBe('Details')
      expect(mobileHeaders[2].text()).toBe('Actions')
    })

    it('should display translated booking statuses', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      
      // Check for translated status texts
      const statuses = ['Completed', 'In Progress', 'Scheduled']
      const hasTranslatedStatuses = statuses.some(status => 
        mobileCells.some((cell: any) => cell.text().includes(status))
      )
      expect(hasTranslatedStatuses).toBe(true)
    })
  })

  describe('Mobile Performance and Error Handling', () => {
    it('should handle missing expand data gracefully', async () => {
      // Mock data with missing expand properties
      const { serviceBookingService } = await import('../../services/pocketbase')
      vi.mocked(serviceBookingService.getAll).mockResolvedValueOnce([
        {
          id: 'incomplete-1',
          duration: 5,
          unit_rate: 500.00,
          total_amount: 2500.00,
          paid_amount: 0.00,
          status: 'scheduled',
          payment_status: 'pending',
          start_date: '2024-01-25',
          end_date: null,
          notes: '',
          completion_photos: [],
          expand: undefined // Missing expand data
        }
      ])
      
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Should show "Unknown" fallbacks
      const firstMobileColumn = wrapper.find('td.lg\\:hidden')
      expect(firstMobileColumn.text()).toContain('Unknown Service')
      expect(firstMobileColumn.text()).toContain('Unknown Vendor')
    })

    it('should handle empty state properly in mobile view', async () => {
      // Mock empty data
      const { serviceBookingService } = await import('../../services/pocketbase')
      vi.mocked(serviceBookingService.getAll).mockResolvedValueOnce([])
      
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('No bookings found')
      expect(wrapper.text()).toContain('Start booking services.')
    })

    it('should handle click-outside listener properly', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Verify that event listeners are set up
      expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))
      
      // Verify cleanup happens
      wrapper.unmount()
      expect(document.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function))
    })
  })

  describe('Mobile Specific Features', () => {
    it('should not display duration, rate, or reference in mobile view', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      
      // These fields should not be displayed in mobile view
      const hasUnwantedFields = mobileCells.some((cell: any) => {
        const text = cell.text()
        return text.includes('hours') || // duration unit
               text.includes('₹500.00') || // unit rate
               text.includes('₹800.00') || // unit rate
               text.includes('sqft') // duration unit
      })
      
      expect(hasUnwantedFields).toBe(false)
    })

    it('should handle multiple menus opening and closing properly', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileActionCells = wrapper.findAll('td.lg\\:hidden')
      
      // Open first menu
      const firstActionCell = mobileActionCells[2]
      const firstMenuButton = firstActionCell.find('button')
      await firstMenuButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.openMobileMenuId).toBe('booking-1')

      // Try to open second menu (should close first and open second)
      const secondActionCell = mobileActionCells[5] // Second row
      const secondMenuButton = secondActionCell.find('button')
      await secondMenuButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.openMobileMenuId).toBe('booking-2')
    })
  })
})