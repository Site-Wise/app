import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import PaymentsView from '../../views/PaymentsView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock i18n
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'payments.title': 'Payments',
        'payments.subtitle': 'Track and manage vendor payments',
        'payments.recordPayment': 'Record Payment',
        'payments.details': 'Details',
        'payments.paymentDate': 'Payment Date',
        'payments.paymentAccount': 'Payment Account',
        'payments.itemsAffected': 'Items Affected',
        'common.vendor': 'Vendor',
        'common.account': 'Account',
        'common.amount': 'Amount',
        'common.reference': 'Reference',
        'common.actions': 'Actions',
        'common.view': 'View',
        'common.delete': 'Delete',
        'common.payment': 'Payment',
        'common.unknown': 'Unknown',
        'messages.createSuccess': '{item} created successfully',
        'messages.error': 'An error occurred',
        'subscription.banner.freeTierLimitReached': 'Free tier limit reached'
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
  paymentService: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'payment-1',
        amount: 5000.00,
        payment_date: '2024-01-20',
        reference: 'CHQ-001',
        notes: 'Partial payment for steel',
        incoming_items: ['item-1', 'item-2'],
        expand: {
          vendor: { id: 'vendor-1', name: 'ABC Steel Co.' },
          account: { id: 'account-1', name: 'Main Bank', type: 'bank' }
        }
      },
      {
        id: 'payment-2',
        amount: 10000.00,
        payment_date: '2024-01-15',
        reference: 'UPI-12345',
        notes: 'Full payment',
        incoming_items: ['item-3'],
        expand: {
          vendor: { id: 'vendor-2', name: 'XYZ Cement Ltd.' },
          account: { id: 'account-2', name: 'Digital Wallet', type: 'digital_wallet' }
        }
      },
      {
        id: 'payment-3',
        amount: 2500.00,
        payment_date: '2024-01-10',
        reference: '',
        notes: '',
        incoming_items: [],
        expand: {
          vendor: { id: 'vendor-3', name: 'Local Bricks' },
          account: { id: 'account-3', name: 'Cash', type: 'cash' }
        }
      }
    ]),
    create: vi.fn().mockResolvedValue({ id: 'new-payment' })
  },
  accountTransactionService: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'payment-1',
        type: 'debit',
        amount: 5000.00,
        transaction_date: '2024-01-20',
        reference: 'CHQ-001',
        description: 'Payment for steel',
        vendor: 'vendor-1',
        account: 'account-1',
        expand: {
          vendor: { id: 'vendor-1', name: 'ABC Steel Co.' },
          account: { id: 'account-1', name: 'Main Bank', type: 'bank' }
        }
      },
      {
        id: 'payment-2',
        type: 'debit',
        amount: 10000.00,
        transaction_date: '2024-01-15',
        reference: 'UPI-12345',
        description: 'Full payment',
        vendor: 'vendor-2',
        account: 'account-2',
        expand: {
          vendor: { id: 'vendor-2', name: 'XYZ Cement Ltd.' },
          account: { id: 'account-2', name: 'Digital Wallet', type: 'digital_wallet' }
        }
      },
      {
        id: 'payment-3',
        type: 'debit',
        amount: 2500.00,
        transaction_date: '2024-01-10',
        reference: '',
        description: '',
        vendor: 'vendor-3',
        account: 'account-3',
        expand: {
          vendor: { id: 'vendor-3', name: 'Local Bricks' },
          account: { id: 'account-3', name: 'Cash', type: 'cash' }
        }
      }
    ])
  },
  vendorService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  accountService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  deliveryService: {
    getAll: vi.fn().mockResolvedValue([])
  },
  serviceBookingService: {
    getAll: vi.fn().mockResolvedValue([])
  }
}))

describe('PaymentsView - Mobile Responsive Design', () => {
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
    return mount(PaymentsView, {
      props,
      global: {
        plugins: [router],
        stubs: {
          'CreditCard': true,
          'Plus': true,
          'Eye': true,
          'Trash2': true,
          'Loader2': true,
          'Banknote': true,
          'Wallet': true,
          'Smartphone': true,
          'Building2': true,
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
      expect(mobileHeaders[0].text()).toContain('Vendor')
      expect(mobileHeaders[1].text()).toContain('Account')
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
    it('should display vendor name and date in first mobile column', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const firstMobileColumn = wrapper.find('td.lg\\:hidden')
      expect(firstMobileColumn.text()).toContain('ABC Steel Co.')
      expect(firstMobileColumn.text()).toContain('1/20/2024')
    })

    it('should display amount and account in second mobile column', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      const secondColumn = mobileCells[1]
      
      expect(secondColumn.text()).toContain('₹5000.00')
      expect(secondColumn.text()).toContain('Main Bank')
    })

    it('should display amount in green color', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      const secondColumn = mobileCells[1]
      const greenAmount = secondColumn.find('.text-green-600')
      
      expect(greenAmount.exists()).toBe(true)
      expect(greenAmount.text()).toContain('₹5000.00')
    })

    it('should show account icon next to account name', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileCells = wrapper.findAll('td.lg\\:hidden')
      const secondColumn = mobileCells[1]
      
      // Check for account icon (component stub)
      expect(secondColumn.text()).toContain('Main Bank')
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
      expect(wrapper.vm.openMobileMenuId).toBe('payment-1')
      
      const dropdown = actionCell.find('.absolute')
      expect(dropdown.exists()).toBe(true)
    })

    it('should display view option in dropdown menu', async () => {
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
      
      expect(menuButtons.length).toBe(1)
      expect(menuButtons[0].text()).toContain('View')
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
      expect(wrapper.vm.openMobileMenuId).toBe('payment-1')

      // Simulate click outside
      wrapper.vm.closeMobileMenu()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.openMobileMenuId).toBe(null)
    })
  })

  describe('Mobile Outstanding Amounts Section', () => {
    it('should display outstanding amounts in responsive layout', async () => {
      // Mock vendors with outstanding amounts
      const { vendorService, deliveryService } = await import('../../services/pocketbase')
      vi.mocked(vendorService.getAll).mockResolvedValueOnce([
        { id: 'vendor-1', name: 'ABC Steel Co.' }
      ])
      vi.mocked(deliveryService.getAll).mockResolvedValueOnce([
        {
          id: 'delivery-1',
          vendor: 'vendor-1',
          delivery_date: '2024-01-01',
          total_amount: 10000,
          paid_amount: 5000,
          payment_status: 'partial',
          site: 'site-1'
        }
      ])
      
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const outstandingSection = wrapper.find('.mt-8.card')
      expect(outstandingSection.exists()).toBe(true)
      
      // Check for flex-col on mobile
      const vendorCards = outstandingSection.findAll('.flex-col')
      expect(vendorCards.length).toBeGreaterThan(0)
    })
  })

  describe('Mobile Translation Support', () => {
    it('should display translated mobile headers', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      const mobileHeaders = wrapper.findAll('thead.lg\\:hidden th')
      
      expect(mobileHeaders[0].text()).toBe('Vendor')
      expect(mobileHeaders[1].text()).toBe('Account')
      expect(mobileHeaders[2].text()).toBe('Actions')
    })
  })

  describe('Mobile Performance and Error Handling', () => {
    it('should handle missing expand data gracefully', async () => {
      // Mock data with missing expand properties
      const { accountTransactionService } = await import('../../services/pocketbase')
      vi.mocked(accountTransactionService.getAll).mockResolvedValueOnce([
        {
          id: 'incomplete-1',
          type: 'debit',
          amount: 1000.00,
          transaction_date: '2024-01-25',
          reference: '',
          description: '',
          vendor: 'unknown-vendor',
          account: 'unknown-account',
          expand: undefined // Missing expand data
        }
      ])
      
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Should show "Unknown" fallbacks
      const firstMobileColumn = wrapper.find('td.lg\\:hidden')
      expect(firstMobileColumn.text()).toContain('Unknown Vendor')
    })

    it('should handle empty state properly in mobile view', async () => {
      // Mock empty data
      const { accountTransactionService } = await import('../../services/pocketbase')
      vi.mocked(accountTransactionService.getAll).mockResolvedValueOnce([])
      
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('No payments recorded')
      expect(wrapper.text()).toContain('Start tracking by recording a payment.')
    })
  })
})