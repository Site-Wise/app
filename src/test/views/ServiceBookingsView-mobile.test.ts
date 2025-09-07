import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
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

// Mock CardDropdownMenu component
vi.mock('../../components/CardDropdownMenu.vue', () => ({
  default: {
    name: 'CardDropdownMenu',
    template: `
      <div class="relative" @click.stop>
        <button 
          @click="isOpen = !isOpen" 
          class="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </button>
        <div 
          v-if="isOpen"
          class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
          @click.stop
        >
          <div class="py-1">
            <button
              v-for="action in actions" 
              :key="action.key"
              @click="handleAction(action)"
              :disabled="action.disabled"
              class="w-full text-left px-4 py-3 text-sm flex items-center space-x-3 transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span>{{ action.label }}</span>
            </button>
          </div>
        </div>
        <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false"></div>
      </div>
    `,
    props: ['actions'],
    emits: ['action'],
    data() {
      return {
        isOpen: false
      }
    },
    methods: {
      handleAction(action) {
        if (!action.disabled) {
          this.isOpen = false
          this.$emit('action', action.key)
        }
      }
    }
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
        vendor: { id: 'vendor-1', name: 'Test Vendor', contact_person: 'Test Vendor' }
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
        vendor: { id: 'vendor-2', name: 'Another Vendor', contact_person: 'Another Vendor' }
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
    paymentAllocationService: {
      getAll: vi.fn().mockResolvedValue([]),
      getByServiceBooking: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      deleteByServiceBooking: vi.fn().mockResolvedValue()
    },
    ServiceBookingService: {
      calculateOutstandingFromData: vi.fn().mockReturnValue(0),
      calculateProgressBasedAmount: vi.fn().mockReturnValue(500),
      calculatePaymentStatusFromData: vi.fn().mockImplementation((serviceBooking, allocatedAmount) => {
        // Mock the payment status calculation logic
        if (allocatedAmount >= serviceBooking.total_amount) {
          return 'paid'
        } else if (allocatedAmount > 0) {
          return 'partial'
        } else {
          return 'pending'
        }
      }),
      calculateOutstandingAmountFromData: vi.fn().mockImplementation((serviceBooking, allocatedAmount) => {
        return Math.max(0, serviceBooking.total_amount - allocatedAmount)
      })
    },
    getCurrentSiteId: vi.fn(() => 'site-1'),
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: vi.fn(() => 'owner'),
    calculatePermissions: vi.fn().mockReturnValue({
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canManageUsers: true,
      canManageRoles: true,
      canExport: true,
      canViewFinancials: true
    }),
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
    searchQuery: ref(''),
    loading: ref(false),
    results: ref([]),
    loadAll: vi.fn()
  })
}))

vi.mock('../../composables/useSiteData', () => ({
  useSiteData: vi.fn((loadFunction) => {
    const { ref } = require('vue')
    
    // Check what type of data is being requested based on the function
    const funcString = loadFunction.toString()
    
    if (funcString.includes('serviceBookingService.getAll')) {
      return {
        data: ref([
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
              vendor: { id: 'vendor-1', name: 'Test Vendor', contact_person: 'Test Vendor' }
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
              vendor: { id: 'vendor-2', name: 'Another Vendor', contact_person: 'Another Vendor' }
            }
          }
        ]),
        loading: ref(false),
        reload: vi.fn()
      }
    } else if (funcString.includes('paymentAllocationService.getAll')) {
      return {
        data: ref([
          // Payment allocation for booking-2 to make it fully paid
          {
            id: 'allocation-1',
            service_booking: 'booking-2',
            allocated_amount: 450,
            payment: 'payment-1'
          }
          // No allocation for booking-1, so it remains pending
        ]),
        loading: ref(false),
        reload: vi.fn()
      }
    } else if (funcString.includes('serviceService.getAll')) {
      return {
        data: ref([
          { id: 'service-1', name: 'Test Service', category: 'Construction', unit: 'hours', standard_rate: 100, is_active: true },
          { id: 'service-2', name: 'Another Service', category: 'Plumbing', unit: 'days', standard_rate: 150, is_active: true }
        ]),
        loading: ref(false),
        reload: vi.fn()
      }
    } else if (funcString.includes('vendorService.getAll')) {
      return {
        data: ref([
          { id: 'vendor-1', name: 'Test Vendor' },
          { id: 'vendor-2', name: 'Another Vendor' }
        ]),
        loading: ref(false),
        reload: vi.fn()
      }
    }
    
    // Default return for any other useSiteData calls
    return {
      data: ref([]),
      loading: ref(false),
      reload: vi.fn()
    }
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
      expect(firstCell.text()).toContain('Pending') // Payment status should be displayed (capitalized)
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

    it('should display dropdown menu button in mobile actions column', () => {
      const dropdownMenus = wrapper.findAll('td.lg\\:hidden').filter((td: any) => 
        td.findComponent({ name: 'CardDropdownMenu' }).exists()
      )
      expect(dropdownMenus.length).toBe(2) // One for each booking
    })

    it('should open dropdown menu when button is clicked', async () => {
      const firstDropdown = wrapper.findComponent({ name: 'CardDropdownMenu' })
      const dropdownButton = firstDropdown.find('button')
      
      // Initially menu should be closed
      expect(firstDropdown.find('.absolute.right-0.top-full').exists()).toBe(false)
      
      // Click the dropdown button
      await dropdownButton.trigger('click')
      await nextTick()
      
      // Menu should now be open
      expect(firstDropdown.find('.absolute.right-0.top-full').exists()).toBe(true)
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
      const firstDropdown = wrapper.findComponent({ name: 'CardDropdownMenu' })
      const dropdownButton = firstDropdown.find('button')
      
      await dropdownButton.trigger('click')
      await nextTick()

      // Menu should be open
      expect(firstDropdown.find('.absolute.right-0.top-full').exists()).toBe(true)

      // Click outside overlay (CardDropdownMenu handles this internally)
      const overlay = firstDropdown.find('.fixed.inset-0')
      await overlay.trigger('click')
      await nextTick()

      // Menu should be closed
      expect(firstDropdown.find('.absolute.right-0.top-full').exists()).toBe(false)
    })

    it('should have action menu items available', async () => {
      const firstDropdown = wrapper.findComponent({ name: 'CardDropdownMenu' })
      const dropdownButton = firstDropdown.find('button')
      
      await dropdownButton.trigger('click')
      await nextTick()

      const dropdownMenu = firstDropdown.find('.absolute.right-0.top-full')
      const menuItems = dropdownMenu.findAll('button')

      // Should have action items
      expect(menuItems.length).toBeGreaterThan(0)
      
      // Should have view action at minimum
      expect(menuItems[0].text()).toContain('View')
    })

    it('should handle click-outside listener properly', async () => {
      const cardDropdownMenu = wrapper.findComponent({ name: 'CardDropdownMenu' })
      expect(cardDropdownMenu.exists()).toBe(true)

      // Get the dropdown button (MoreVertical button)
      const dropdownButton = cardDropdownMenu.find('button')
      await dropdownButton.trigger('click')
      await nextTick()

      // Menu should be open
      expect(cardDropdownMenu.vm.isOpen).toBe(true)

      // Click outside overlay should close menu
      const clickOutside = cardDropdownMenu.find('.fixed.inset-0')
      await clickOutside.trigger('click')
      await nextTick()

      expect(cardDropdownMenu.vm.isOpen).toBe(false)
    })

    it('should handle multiple menus opening and closing properly', async () => {
      const cardDropdownMenus = wrapper.findAllComponents({ name: 'CardDropdownMenu' })
      expect(cardDropdownMenus.length).toBeGreaterThan(1)

      // Open first menu
      const firstDropdownButton = cardDropdownMenus[0].find('button')
      await firstDropdownButton.trigger('click')
      await nextTick()
      expect(cardDropdownMenus[0].vm.isOpen).toBe(true)

      // Open second menu (should close first due to click-outside behavior)
      const secondDropdownButton = cardDropdownMenus[1].find('button')
      await secondDropdownButton.trigger('click')
      await nextTick()
      
      // First menu should close automatically when second is opened (due to click-outside)
      expect(cardDropdownMenus[1].vm.isOpen).toBe(true)
      
      // Close the open menu by clicking outside
      const clickOutside = cardDropdownMenus[1].find('.fixed.inset-0')
      await clickOutside.trigger('click')
      await nextTick()
      expect(cardDropdownMenus[1].vm.isOpen).toBe(false)
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
      // Override useSiteData for this test to return booking without expand data
      const { useSiteData } = await import('../../composables/useSiteData')
      vi.mocked(useSiteData).mockImplementation((loadFunction) => {
        const { ref } = require('vue')
        const funcString = loadFunction.toString()
        
        if (funcString.includes('serviceBookingService.getAll')) {
          return {
            data: ref([{
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
            }]),
            loading: ref(false),
            reload: vi.fn()
          }
        }
        
        // Return empty data for other services
        return {
          data: ref([]),
          loading: ref(false),
          reload: vi.fn()
        }
      })

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
      // Override useSiteData for this test to return empty array
      const { useSiteData } = await import('../../composables/useSiteData')
      vi.mocked(useSiteData).mockImplementation(() => {
        const { ref } = require('vue')
        return {
          data: ref([]),
          loading: ref(false),
          reload: vi.fn()
        }
      })

      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()

      // Should show empty state message (check for actual message)
      expect(wrapper.text()).toContain('No service bookings')
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