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

  describe('Layout Structure', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick() // Wait for data loading
    })

    it('should render table wrapper hidden on mobile (md:block)', () => {
      // The md+ table wrapper has classes hidden and md:block
      const tableWrapper = wrapper.find('.hidden.md\\:block')
      expect(tableWrapper.exists()).toBe(true)
      expect(tableWrapper.classes()).toContain('hidden')
      expect(tableWrapper.classes()).toContain('md:block')
    })

    it('should render card wrapper visible on mobile (md:hidden)', () => {
      // The mobile card container has md:hidden
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      expect(cardWrapper.exists()).toBe(true)
      expect(cardWrapper.classes()).toContain('md:hidden')
    })

    it('should render one card per booking in the mobile container', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      // Each booking card has a relative class + overflow-hidden
      const cards = cardWrapper.findAll('.relative.overflow-hidden')
      expect(cards).toHaveLength(2) // 2 bookings
    })

    it('should render the progressive table inside the hidden md:block wrapper', () => {
      // The table is inside a div with hidden and md:block; find by looking for the table
      // within the overall wrapper (it exists in the DOM even if visually hidden on mobile)
      const table = wrapper.find('.hidden.md\\:block table')
      expect(table.exists()).toBe(true)
    })
  })

  describe('Mobile Card Content', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()
    })

    it('should display service name and vendor in each card', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      const firstCard = cards[0]
      expect(firstCard.text()).toContain('Test Service')
      expect(firstCard.text()).toContain('Test Vendor')
    })

    it('should display start date in each card', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      // The date is rendered via formatDate which calls toLocaleDateString
      // Just check that some date-like text appears
      const firstCard = cards[0]
      // formatDate('2024-01-15') → locale string like '1/15/2024'
      expect(firstCard.text()).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should display total amount formatted with ₹ in each card', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      const firstCard = cards[0]
      expect(firstCard.text()).toContain('₹500.00')
    })

    it('should display payment status badge in each card', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')

      // Status badges use status-* class pattern
      const pendingBadge = cardWrapper.find('.status-pending')
      const paidBadge = cardWrapper.find('.status-paid')

      // booking-1 is pending, booking-2 is paid
      expect(pendingBadge.exists()).toBe(true)
      expect(paidBadge.exists()).toBe(true)
    })

    it('should display translated Pending status text', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      // booking-1 has payment_status: 'pending'
      const firstCard = cards[0]
      expect(firstCard.text()).toContain('Pending')
    })
  })

  describe('Mobile Card Color Semantics', () => {
    beforeEach(async () => {
      wrapper = mount(ServiceBookingsView, {
        global: { plugins: [pinia] }
      })
      await nextTick()
      await nextTick()
    })

    it('should apply pending color stripe to pending booking card', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      // booking-1 is pending → left stripe should have bg-clay-500
      const firstCard = cards[0]
      const stripe = firstCard.find('.absolute.left-0.inset-y-0.w-1')
      expect(stripe.exists()).toBe(true)
      expect(stripe.classes()).toContain('bg-clay-500')
    })

    it('should apply paid color stripe to paid booking card', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      // booking-2 is paid → left stripe should have bg-forest-500
      const secondCard = cards[1]
      const stripe = secondCard.find('.absolute.left-0.inset-y-0.w-1')
      expect(stripe.exists()).toBe(true)
      expect(stripe.classes()).toContain('bg-forest-500')
    })

    it('should show paid sub-line in forest color when paid_amount > 0', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      // booking-2 has paid_amount: 450 → should show forest-colored paid sub-line
      const secondCard = cards[1]
      const paidSubLine = secondCard.find('.text-forest-600')
      expect(paidSubLine.exists()).toBe(true)
      expect(paidSubLine.text()).toContain('₹450.00')
    })

    it('should display status badges that are visually distinct (pending vs paid)', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      const firstCardBadge = cards[0].find('[class*="status-"]')
      const secondCardBadge = cards[1].find('[class*="status-"]')

      // They should have different status classes
      expect(firstCardBadge.classes().join(' ')).toContain('status-pending')
      expect(secondCardBadge.classes().join(' ')).toContain('status-paid')
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

    it('should display one CardDropdownMenu per booking card in mobile container', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const dropdownMenus = cardWrapper.findAllComponents({ name: 'CardDropdownMenu' })
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
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const firstDropdown = cardWrapper.findComponent({ name: 'CardDropdownMenu' })
      const dropdownButton = firstDropdown.find('button')

      await dropdownButton.trigger('click')
      await nextTick()

      const dropdownMenu = firstDropdown.find('.absolute.right-0.top-full')
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

    it('should display translated booking statuses in mobile cards', () => {
      const statusElements = wrapper.findAll('.status-pending, .status-paid, .status-partial')
      expect(statusElements.length).toBeGreaterThan(0)

      // Should show status text (even if translation missing, should show key)
      statusElements.forEach((element: any) => {
        expect(element.text()).toBeTruthy()
      })
    })

    it('should display progress label in mobile card', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      // The progress section renders the sw-eyebrow label
      expect(cardWrapper.exists()).toBe(true)
      // Cards render with content — verify we have card content
      const cards = cardWrapper.findAll('.relative.overflow-hidden')
      expect(cards.length).toBeGreaterThan(0)
      cards.forEach((card: any) => {
        // Each card has a progress bar
        expect(card.find('.bg-amber-500').exists()).toBe(true)
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

    afterEach(async () => {
      // Restore the useSiteData mock implementation to the original factory so
      // subsequent describe blocks are not affected by mockImplementation overrides.
      const { useSiteData } = await import('../../composables/useSiteData')
      vi.mocked(useSiteData).mockRestore()
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

    it('should not display duration, rate, or unit info in mobile cards', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      expect(cards.length).toBeGreaterThan(0)
      cards.forEach((card: any) => {
        // Should not contain detailed duration info like "5 hours"
        expect(card.text()).not.toMatch(/\d+\s+(hours|days|units)/)
      })
    })

    it('should display total amount (not unit rate) in mobile cards', () => {
      const cardWrapper = wrapper.find('.md\\:hidden.space-y-3')
      const cards = cardWrapper.findAll('.relative.overflow-hidden')

      expect(cards.length).toBeGreaterThan(0)
      // booking-1 total is ₹500.00, booking-2 total is ₹450.00
      const firstCard = cards[0]
      expect(firstCard.text()).toContain('₹500.00')
      // Should show a total in the expected range
      expect(firstCard.text()).toMatch(/₹[45]\d{2}\.00/)
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
