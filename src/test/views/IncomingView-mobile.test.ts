import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import IncomingView from '../../views/IncomingView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock i18n
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'incoming.title': 'Incoming Items',
        'incoming.subtitle': 'Track deliveries and manage receipts',
        'incoming.recordDelivery': 'Record Delivery',
        'incoming.details': 'Details',
        'incoming.deliveryDate': 'Delivery Date',
        'incoming.paymentStatus': 'Payment Status',
        'incoming.paid': 'Paid',
        'incoming.pending': 'Pending',
        'incoming.noDeliveries': 'No deliveries recorded',
        'incoming.startTracking': 'Start tracking by recording a delivery.',
        'common.item': 'Item',
        'common.vendor': 'Vendor',
        'common.quantity': 'Quantity',
        'common.total': 'Total',
        'common.actions': 'Actions',
        'common.view': 'View',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.paid': 'Paid',
        'common.pending': 'Pending',
        'common.partial': 'Partial',
        'forms.unitPrice': 'Unit Price'
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

// Mock subscription composable
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: computed(() => false)
  })
}))

// Mock toast composable
vi.mock('../../composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}))

// Mock PocketBase services
vi.mock('../../services/pocketbase', () => ({
  incomingItemService: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'incoming-1',
        quantity: 100,
        unit_price: 50.00,
        total_amount: 5000.00,
        paid_amount: 3000.00,
        payment_status: 'partial',
        delivery_date: '2024-01-15',
        notes: 'Test delivery notes',
        photos: ['photo1.jpg', 'photo2.jpg'],
        expand: {
          item: { id: 'item-1', name: 'Steel Rods', unit: 'kg' },
          vendor: { id: 'vendor-1', name: 'ABC Steel Co.' }
        }
      },
      {
        id: 'incoming-2', 
        quantity: 50,
        unit_price: 200.00,
        total_amount: 10000.00,
        paid_amount: 10000.00,
        payment_status: 'paid',
        delivery_date: '2024-01-10',
        notes: 'Fully paid delivery',
        photos: [],
        expand: {
          item: { id: 'item-2', name: 'Cement Bags', unit: 'bags' },
          vendor: { id: 'vendor-2', name: 'XYZ Cement Ltd.' }
        }
      },
      {
        id: 'incoming-3',
        quantity: 25,
        unit_price: 100.00,
        total_amount: 2500.00,
        paid_amount: 0.00,
        payment_status: 'pending',
        delivery_date: '2024-01-20',
        notes: 'Pending payment',
        photos: [],
        expand: {
          item: { id: 'item-3', name: 'Bricks', unit: 'pcs' },
          vendor: { id: 'vendor-3', name: 'Local Bricks' }
        }
      }
    ]),
    create: vi.fn().mockResolvedValue({ id: 'new-incoming' }),
    update: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true)
  },
  itemService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  vendorService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  pb: {
    collection: vi.fn().mockReturnValue({
      update: vi.fn().mockResolvedValue(true)
    })
  }
}))

// Mock file upload component
vi.mock('../../components/FileUploadComponent.vue', () => ({
  default: {
    name: 'FileUploadComponent',
    template: '<div class="mock-file-upload">File Upload Component</div>',
    emits: ['files-selected', 'update:modelValue']
  }
}))

// Mock photo gallery component
vi.mock('../../components/PhotoGallery.vue', () => ({
  default: {
    name: 'PhotoGallery',
    template: '<div class="mock-photo-gallery">Photo Gallery</div>',
    props: ['photos', 'itemId', 'showDeleteButton'],
    emits: ['photo-deleted']
  }
}))

describe('IncomingView - Mobile Responsive Design', () => {
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
    return mount(IncomingView, {
      props,
      global: {
        plugins: [router],
        stubs: {
          'TruckIcon': true,
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
      
      // Wait for component to mount and load data
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Check that mobile headers are present
      const mobileHeaders = wrapper.findAll('thead.lg\\:hidden th')
      expect(mobileHeaders.length).toBe(3)
      
      // Verify header text content
      expect(mobileHeaders[0].text()).toContain('Item')
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

    it('should hide desktop table cells on mobile', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Check desktop cells have hidden class
      const desktopCells = wrapper.findAll('td.hidden.lg\\:table-cell')
      expect(desktopCells.length).toBeGreaterThan(0)
    })
  })

  describe('Mobile Layout Content', () => {
    it('should display item name and vendor in first mobile column', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // First item should be "Bricks" (most recent delivery date: 2024-01-20)
      const firstMobileColumn = wrapper.find('td.lg\\:hidden')
      expect(firstMobileColumn.text()).toContain('Bricks')
      expect(firstMobileColumn.text()).toContain('Local Bricks')
    })

    it('should display delivery date with blue color in first column', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const deliveryDate = wrapper.find('.text-blue-600')
      expect(deliveryDate.exists()).toBe(true)
      expect(deliveryDate.text()).toContain('1/20/2024') // Most recent date (Bricks)
    })

    it('should display quantity and total in second mobile column', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      const secondColumn = mobileCells[1]
      
      expect(secondColumn.text()).toContain('Quantity')
      expect(secondColumn.text()).toContain('25 pcs') // First item is Bricks
      expect(secondColumn.text()).toContain('Total')
      expect(secondColumn.text()).toContain('₹2500.00') // First item is Bricks
    })

    it('should not display unit price in mobile view', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      const secondColumn = mobileCells[1]
      
      // Unit price should not be mentioned in mobile details
      expect(secondColumn.text()).not.toContain('Unit Price')
      expect(secondColumn.text()).not.toContain('₹50.00')
    })
  })

  describe('Mobile Payment Status Color Coding', () => {
    it('should display green total amount for fully paid items', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Find the paid item (incoming-2 with paid status)
      const rows = wrapper.findAll('tr')
      const paidRow = rows.find((row: any) => row.text().includes('Cement Bags'))
      
      expect(paidRow.exists()).toBe(true)
      const greenAmount = paidRow.find('.text-green-600')
      expect(greenAmount.exists()).toBe(true)
      expect(greenAmount.text()).toContain('₹10000.00')
    })

    it('should display red total amount for unpaid/partial items', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Find the pending payment item (incoming-3 with pending status)
      const rows = wrapper.findAll('tr')
      const pendingRow = rows.find((row: any) => row.text().includes('Bricks'))
      
      expect(pendingRow.exists()).toBe(true)
      
      // Look for red amount in mobile cells specifically
      const mobileCells = pendingRow.findAll('td.lg\\:hidden')
      const detailsCell = mobileCells[1] // Second column has financial details
      
      const redAmount = detailsCell.find('.text-red-600')
      expect(redAmount.exists()).toBe(true)
      expect(redAmount.text()).toContain('₹2500.00')
    })

    it('should show pending amount for partial payments', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Find the partial payment row
      const rows = wrapper.findAll('tr')
      const partialRow = rows.find((row: any) => row.text().includes('Steel Rods'))
      
      expect(partialRow.exists()).toBe(true)
      expect(partialRow.text()).toContain('Pending: ₹2000.00') // 5000 - 3000
    })

    it('should not show paid amount line in mobile view', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Check that "Paid:" line is not shown in mobile view
      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      const hasPaymentInfo = mobileCells.some((cell: any) => 
        cell.text().includes('Paid:') && !cell.text().includes('Pending:')
      )
      expect(hasPaymentInfo).toBe(false)
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

      // Check if menu appears (first item is incoming-3 due to sorting)
      expect(wrapper.vm.openMobileMenuId).toBe('incoming-3')
      
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
      expect(wrapper.vm.openMobileMenuId).toBe('incoming-3')

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
      expect(wrapper.vm.viewingItem).toBeTruthy()
      expect(wrapper.vm.openMobileMenuId).toBe(null) // Menu should close
    })
  })

  describe('Mobile Sorting and Data Display', () => {
    it('should sort items by delivery date descending by default', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const rows = wrapper.findAll('tbody tr')
      
      // First row should be the most recent delivery (2024-01-20)
      expect(rows[0].text()).toContain('Bricks')
      expect(rows[0].text()).toContain('1/20/2024')
      
      // Last row should be the oldest delivery (2024-01-10)
      expect(rows[2].text()).toContain('Cement Bags')
      expect(rows[2].text()).toContain('1/10/2024')
    })

    it('should not display image previews in mobile view', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Check that no image elements exist in mobile cells
      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      const hasImages = mobileCells.some((cell: any) => 
        cell.find('img').exists()
      )
      expect(hasImages).toBe(false)
    })

    it('should handle empty state properly in mobile view', async () => {
      // Mock empty data
      const { incomingItemService } = await import('../../services/pocketbase')
      vi.mocked(incomingItemService.getAll).mockResolvedValueOnce([])
      
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('No deliveries recorded')
      expect(wrapper.text()).toContain('Start tracking by recording a delivery.')
    })
  })

  describe('Mobile Form Interactions', () => {
    it('should open add modal when record delivery button is clicked', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAll('button')
      const recordButton = buttons.find((btn: any) => btn.text().includes('Record Delivery'))
      
      await recordButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showAddModal).toBe(true)
    })

    it('should close mobile menu when edit action is triggered', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Open menu and click edit
      const mobileActionCells = wrapper.findAll('td.lg\\:hidden')
      const actionCell = mobileActionCells[2]
      const menuButton = actionCell.find('button')
      
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      const dropdown = actionCell.find('.absolute')
      const editButton = dropdown.findAll('button')[1]
      
      await editButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.openMobileMenuId).toBe(null)
      expect(wrapper.vm.editingItem).toBeTruthy()
    })
  })

  describe('Mobile Translation Support', () => {
    it('should display translated mobile headers', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileHeaders = wrapper.findAll('thead.lg\\:hidden th')
      
      expect(mobileHeaders[0].text()).toBe('Item')
      expect(mobileHeaders[1].text()).toBe('Details')
      expect(mobileHeaders[2].text()).toBe('Actions')
    })

    it('should display translated action menu items', async () => {
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

      const dropdown = actionCell.find('.absolute')
      const menuButtons = dropdown.findAll('button')
      
      expect(menuButtons[0].text()).toBe('View')
      expect(menuButtons[1].text()).toBe('Edit') 
      expect(menuButtons[2].text()).toBe('Delete')
    })
  })

  describe('Viewport-Specific Responsive Behavior', () => {
    it('should switch to mobile layout at tablet viewport (768px)', async () => {
      // Mock tablet width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // At 768px, still uses mobile layout (lg breakpoint is 1024px)
      const mobileHeaders = wrapper.findAll('thead.lg\\:hidden')
      expect(mobileHeaders.length).toBeGreaterThan(0)
      
      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      expect(mobileCells.length).toBeGreaterThan(0)
    })

    it('should handle very small mobile screens (320px)', async () => {
      // Mock very small mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })

      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Should still function properly on small screens
      const mobileHeaders = wrapper.findAll('thead.lg\\:hidden th')
      expect(mobileHeaders.length).toBe(3)

      // Check that content doesn't overflow
      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      expect(mobileCells.length).toBeGreaterThan(0)
    })
  })

  describe('Mobile Menu Accessibility and Animation', () => {
    it('should have proper ARIA attributes for mobile menu', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileActionCells = wrapper.findAll('td.lg\\:hidden')
      const actionCell = mobileActionCells[2]
      const menuButton = actionCell.find('button')
      
      // Check button has title attribute for accessibility
      expect(menuButton.attributes('title')).toBe('Actions')
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
      expect(wrapper.vm.openMobileMenuId).toBe('incoming-3')

      // Try to open second menu (should close first and open second)
      const secondActionCell = mobileActionCells[5] // Second row
      const secondMenuButton = secondActionCell.find('button')
      await secondMenuButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.openMobileMenuId).toBe('incoming-1')
    })

    it('should close mobile menu when toggling the same item', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileActionCells = wrapper.findAll('td.lg\\:hidden')
      const actionCell = mobileActionCells[2]
      const menuButton = actionCell.find('button')
      
      // Open menu
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.openMobileMenuId).toBe('incoming-3')

      // Click same button again (should close)
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.openMobileMenuId).toBe(null)
    })
  })

  describe('Mobile Performance and Error Handling', () => {
    it('should handle missing item data gracefully in mobile view', async () => {
      // Mock data with missing expand properties
      const { incomingItemService } = await import('../../services/pocketbase')
      vi.mocked(incomingItemService.getAll).mockResolvedValueOnce([
        {
          id: 'incomplete-1',
          quantity: 10,
          unit_price: 100.00,
          total_amount: 1000.00,
          paid_amount: 0.00,
          payment_status: 'pending',
          delivery_date: '2024-01-25',
          notes: '',
          photos: [],
          expand: undefined // Missing expand data
        }
      ])
      
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Should show "Unknown" fallbacks
      const firstMobileColumn = wrapper.find('td.lg\\:hidden')
      expect(firstMobileColumn.text()).toContain('Unknown Item')
      expect(firstMobileColumn.text()).toContain('Unknown Vendor')
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

    it('should handle empty photos array in mobile view', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Find item with no photos (Bricks and Cement Bags have empty photos arrays)
      const rows = wrapper.findAll('tr')
      const noPhotosRow = rows.find((row: any) => row.text().includes('Bricks'))
      
      expect(noPhotosRow.exists()).toBe(true)
      
      // Should not have any image elements in mobile view
      const mobileCells = noPhotosRow.findAll('td.lg\\:hidden')
      const hasImages = mobileCells.some((cell: any) => cell.find('img').exists())
      expect(hasImages).toBe(false)
    })
  })
})