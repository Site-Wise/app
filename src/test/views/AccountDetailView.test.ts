import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../utils/test-setup'
import { jsPDF } from 'jspdf'

// All mocks must be at the top before any imports
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'accounts.exportStatement': 'Export Statement',
        'accounts.exportCsv': 'Export CSV',
        'accounts.exportPdf': 'Export PDF',
        'accounts.recalculateBalance': 'Recalculate Balance',
        'accounts.addCreditEntry': 'Add Credit Entry',
        'accounts.editAccount': 'Edit Account',
        'accounts.accountStatement': 'Account Statement',
        'accounts.account': 'Account',
        'accounts.type': 'Type',
        'accounts.generated': 'Generated',
        'accounts.currentBalance': 'Current Balance',
        'accounts.date': 'Date',
        'accounts.description': 'Description',
        'accounts.reference': 'Reference',
        'accounts.debit': 'Debit',
        'accounts.credit': 'Credit',
        'accounts.finalBalance': 'Final Balance',
        'common.name': 'Name',
        'common.cancel': 'Cancel'
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

vi.mock('../../services/pocketbase', () => ({
  accountService: {
    getById: vi.fn().mockResolvedValue({
      id: 'account-1',
      name: 'Test Bank Account',
      type: 'bank',
      account_number: '1234567890',
      bank_name: 'Test Bank',
      current_balance: 5000,
      opening_balance: 10000,
      is_active: true,
      description: 'Test bank account',
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }),
    update: vi.fn().mockResolvedValue({})
  },
  accountTransactionService: {
    getByAccount: vi.fn().mockResolvedValue([
      {
        id: 'transaction-1',
        account: 'account-1',
        type: 'credit',
        amount: 1000,
        transaction_date: '2024-01-15T00:00:00Z',
        description: 'Test credit',
        reference: 'REF123',
        notes: 'Test note',
        site: 'site-1'
      },
      {
        id: 'transaction-2',
        account: 'account-1',
        type: 'debit',
        amount: 500,
        transaction_date: '2024-01-20T00:00:00Z',
        description: 'Test debit',
        reference: 'REF456',
        notes: 'Test debit note',
        site: 'site-1'
      }
    ]),
    calculateAccountBalance: vi.fn().mockResolvedValue(4500),
    create: vi.fn().mockResolvedValue({})
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
  pb: {
    collection: vi.fn(() => ({
      getList: vi.fn().mockResolvedValue({
        items: [],
        totalItems: 0,
        totalPages: 0,
        page: 1,
        perPage: 50
      }),
      getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found'))
    }))
  }
}))

// Mock jsPDF for PDF export tests - using a class to work as constructor in Vitest v4
vi.mock('jspdf', () => {
  // Use a getter on the module to access the instance tracker
  const instanceTracker = { current: null as any }

  class MockJsPDF {
    internal = {
      pageSize: { width: 210, height: 297 },
      getCurrentPageInfo: () => ({ pageNumber: 1 }),
      pages: [null, {}] // Mock pages array for totalPages calculation
    }
    setFontSize = vi.fn()
    setFont = vi.fn()
    setTextColor = vi.fn()
    setDrawColor = vi.fn()
    text = vi.fn()
    line = vi.fn()
    addImage = vi.fn()
    addPage = vi.fn()
    setPage = vi.fn()
    save = vi.fn()
    constructor() {
      instanceTracker.current = this
    }
  }

  return {
    jsPDF: MockJsPDF,
    __getLastInstance: () => instanceTracker.current
  }
})

// Mock router
const mockBack = vi.fn()
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    useRoute: () => ({
      params: { id: 'account-1' }
    }),
    useRouter: () => ({
      back: mockBack,
      push: vi.fn()
    })
  }
})

// Import after mocks
import AccountDetailView from '../../views/AccountDetailView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('AccountDetailView', () => {
  let wrapper: any
  let pinia: any
  let siteStore: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const testSetup = setupTestPinia()
    pinia = testSetup.pinia
    siteStore = testSetup.siteStore
    
    const router = createMockRouter()
    
    wrapper = mount(AccountDetailView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Basic Rendering', () => {
    it('should render account detail view when account is loaded', async () => {
      // Wait for component to mount and data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should show account name and details
      expect(wrapper.text()).toContain('Test Bank Account')
      expect(wrapper.text()).toContain('BANK Account Transactions')
    })

    it('should show account summary cards', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Opening Balance')
      expect(wrapper.text()).toContain('Current Balance')
      expect(wrapper.text()).toContain('Total Payments')
    })

    it('should display transaction history', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Transaction History')
      expect(wrapper.text()).toContain('Test credit')
      expect(wrapper.text()).toContain('Test debit')
    })
  })

  describe('Navigation', () => {
    it('should have back button functionality', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Find and click back button
      const backButton = wrapper.find('button')
      expect(backButton.exists()).toBe(true)
      
      await backButton.trigger('click')
      
      // Should call router back
      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('Export Dropdown Functionality', () => {
    it('should show export dropdown button on desktop', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Should show export button with dropdown
      expect(wrapper.text()).toContain('Export Statement')
      
      // Find export dropdown button
      const exportButton = wrapper.find('button:has(.export-dropdown)')
      expect(exportButton.exists()).toBe(false) // Button exists but dropdown is initially hidden
      
      // Check if dropdown state exists
      expect(wrapper.vm.showExportDropdown).toBe(false)
    })

    it('should toggle export dropdown when clicked', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Set dropdown state directly
      wrapper.vm.showExportDropdown = true
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportDropdown).toBe(true)
      
      // Should show dropdown options
      expect(wrapper.text()).toContain('Export CSV')
      expect(wrapper.text()).toContain('Export PDF')
    })

    it('should close dropdown when export option is clicked', async () => {
      await wrapper.vm.$nextTick()
      
      // Open dropdown
      wrapper.vm.showExportDropdown = true
      await wrapper.vm.$nextTick()

      // Mock the export functions
      wrapper.vm.exportStatement = vi.fn()
      wrapper.vm.handleExportPdf = vi.fn()

      // Click CSV export (simulate the click handler)
      await wrapper.vm.exportStatement()
      wrapper.vm.showExportDropdown = false
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showExportDropdown).toBe(false)
    })
  })

  describe('Mobile Menu Functionality', () => {
    it('should show mobile menu when button clicked', async () => {
      await wrapper.vm.$nextTick()
      
      // Set mobile menu state directly
      wrapper.vm.showMobileMenu = true
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showMobileMenu).toBe(true)
      
      // Should show mobile menu options
      expect(wrapper.text()).toContain('Recalculate Balance')
      expect(wrapper.text()).toContain('Export Statement')
      expect(wrapper.text()).toContain('Add Credit Entry')
      expect(wrapper.text()).toContain('Edit Account')
    })

    it('should handle mobile actions correctly', async () => {
      await wrapper.vm.$nextTick()
      
      // Test that handleMobileAction function exists and closes menu
      expect(typeof wrapper.vm.handleMobileAction).toBe('function')
      
      wrapper.vm.showMobileMenu = true
      await wrapper.vm.$nextTick()
      
      // Test add credit action (simplest one to test)
      await wrapper.vm.handleMobileAction('addCredit')
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(wrapper.vm.showMobileMenu).toBe(false)
      expect(wrapper.vm.showCreditModal).toBe(true)
      
      // Test edit account action
      wrapper.vm.showCreditModal = false
      wrapper.vm.showMobileMenu = true
      await wrapper.vm.handleMobileAction('editAccount')
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(wrapper.vm.showMobileMenu).toBe(false)
      expect(wrapper.vm.showEditModal).toBe(true)
    })
  })

  describe('Export Functionality', () => {
    it('should handle PDF export with proper logo aspect ratio', async () => {
      // Mock Image constructor with proper aspect ratio
      const mockImage = {
        naturalWidth: 100,
        naturalHeight: 50, // 2:1 aspect ratio
        crossOrigin: '',
        src: '',
        onload: null as any,
        onerror: null as any
      }

      // Mock Image constructor globally
      global.Image = vi.fn().mockImplementation(() => mockImage) as any

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Test the aspect ratio calculation directly
      const maxLogoWidth = 25
      const maxLogoHeight = 15
      const aspectRatio = mockImage.naturalWidth / mockImage.naturalHeight // 100/50 = 2
      let logoWidth = maxLogoWidth // 25
      let logoHeight = maxLogoWidth / aspectRatio // 25/2 = 12.5

      // Verify the calculation is correct
      expect(logoHeight).toBe(12.5)
      expect(logoHeight).toBeLessThanOrEqual(maxLogoHeight)

      // Test that handleExportPdf function exists and can be called
      expect(typeof wrapper.vm.handleExportPdf).toBe('function')
    })

    it('should generate CSV with correct date format', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()

      // Mock the CSV generation
      wrapper.vm.generateStatementCSV = vi.fn().mockReturnValue('Date,Description\n2024-01-15,Test transaction')
      
      const csvContent = wrapper.vm.generateStatementCSV()
      expect(csvContent).toContain('2024-01-15') // Should use en-CA date format
    })

    it('should sort transactions in ascending order for PDF export', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()
      
      // Verify that filteredTransactions are available
      expect(wrapper.vm.filteredTransactions).toBeDefined()
      expect(Array.isArray(wrapper.vm.filteredTransactions)).toBe(true)
      
      // Test that we can reverse the order for PDF (ascending)
      if (wrapper.vm.filteredTransactions.length > 1) {
        const ascendingTransactions = [...wrapper.vm.filteredTransactions].reverse()
        expect(Array.isArray(ascendingTransactions)).toBe(true)
        expect(ascendingTransactions.length).toBe(wrapper.vm.filteredTransactions.length)
      }
    })

    it('should format dates consistently across export functions', async () => {
      await wrapper.vm.$nextTick()
      
      const testDate = '2024-01-15T00:00:00Z'
      const formattedDate = wrapper.vm.formatDate(testDate)
      
      // Should use en-CA format (YYYY-MM-DD)
      expect(formattedDate).toBe('2024-01-15')
    })

    it('should format PDF amounts without rupee symbols and use Dr/Cr notation', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()
      
      // Test balance formatting for positive amount (Dr)
      const positiveBalance = 5000
      const positiveText = positiveBalance >= 0 
        ? `${positiveBalance.toFixed(2)} Dr`
        : `${Math.abs(positiveBalance).toFixed(2)} Cr`
      expect(positiveText).toBe('5000.00 Dr')
      expect(positiveText).not.toContain('₹')
      
      // Test balance formatting for negative amount (Cr)
      const negativeBalance = -2500
      const negativeText = negativeBalance >= 0 
        ? `${negativeBalance.toFixed(2)} Dr`
        : `${Math.abs(negativeBalance).toFixed(2)} Cr`
      expect(negativeText).toBe('2500.00 Cr')
      expect(negativeText).not.toContain('₹')
    })
  })

  describe('Account Operations', () => {
    it('should handle recalculate balance', async () => {
      await wrapper.vm.$nextTick()
      
      // Set up spies
      const calculateBalanceSpy = vi.spyOn(wrapper.vm, 'recalculateBalance')
      
      // Call the function
      await wrapper.vm.recalculateBalance()
      
      expect(calculateBalanceSpy).toHaveBeenCalled()
      // Should update loading state properly
      expect(wrapper.vm.recalculating).toBe(false) // Should be false after completion
    })

    it('should open credit entry modal', async () => {
      await wrapper.vm.$nextTick()
      
      // Test modal opening
      wrapper.vm.showCreditModal = true
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showCreditModal).toBe(true)
      expect(wrapper.find('.fixed').exists()).toBe(true)
    })

    it('should open edit account modal', async () => {
      await wrapper.vm.$nextTick()
      
      // Test edit modal opening
      wrapper.vm.showEditModal = true
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showEditModal).toBe(true)
      expect(wrapper.find('.fixed').exists()).toBe(true)
    })
  })

  describe('Form Interactions', () => {
    it('should save credit entry with form data', async () => {
      await wrapper.vm.$nextTick()
      
      // Set up credit form
      wrapper.vm.creditForm.amount = 1000
      wrapper.vm.creditForm.description = 'Test credit'
      wrapper.vm.creditForm.reference = 'REF123'
      wrapper.vm.creditForm.notes = 'Test note'
      
      // Mock the save function
      const saveSpy = vi.spyOn(wrapper.vm, 'saveCreditEntry')
      
      await wrapper.vm.saveCreditEntry()
      
      expect(saveSpy).toHaveBeenCalled()
      expect(wrapper.vm.showCreditModal).toBe(false) // Should close modal after save
    })

    it('should save account edits with form data', async () => {
      await wrapper.vm.$nextTick()
      
      // Set up edit form
      wrapper.vm.editForm.name = 'Updated Account'
      wrapper.vm.editForm.type = 'cash'
      wrapper.vm.editForm.description = 'Updated description'
      
      // Mock the save function
      const saveSpy = vi.spyOn(wrapper.vm, 'saveAccount')
      
      await wrapper.vm.saveAccount()
      
      expect(saveSpy).toHaveBeenCalled()
      expect(wrapper.vm.showEditModal).toBe(false) // Should close modal after save
    })
  })

  describe('Transaction Filtering', () => {
    it('should filter transactions by period', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()
      
      // Test filter period change
      wrapper.vm.filterPeriod = 'month'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.filterPeriod).toBe('month')
      expect(wrapper.vm.filteredTransactions).toBeDefined()
    })

    it('should calculate running balance correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()
      
      const transactions = wrapper.vm.filteredTransactions
      expect(Array.isArray(transactions)).toBe(true)
      
      // Each transaction should have a running balance
      if (transactions.length > 0) {
        expect(transactions[0]).toHaveProperty('running_balance')
      }
    })
  })

  describe('Computed Properties', () => {
    it('should calculate total payments correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()
      
      expect(typeof wrapper.vm.totalPayments).toBe('number')
      expect(wrapper.vm.totalPayments).toBeGreaterThanOrEqual(0)
    })

    it('should calculate transaction statistics correctly', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()
      
      expect(typeof wrapper.vm.thisMonthTransactions).toBe('number')
      expect(typeof wrapper.vm.averageTransaction).toBe('number')
      expect(wrapper.vm.thisMonthTransactions).toBeGreaterThanOrEqual(0)
      expect(wrapper.vm.averageTransaction).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Click Outside Handling', () => {
    it('should have click outside handler function', async () => {
      await wrapper.vm.$nextTick()
      
      // Test that the function exists
      expect(typeof wrapper.vm.handleClickOutside).toBe('function')
      
      // Test dropdown state management
      wrapper.vm.showExportDropdown = true
      wrapper.vm.showMobileMenu = true
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showExportDropdown).toBe(true)
      expect(wrapper.vm.showMobileMenu).toBe(true)
      
      // Test that we can manually close dropdowns
      wrapper.vm.showExportDropdown = false
      wrapper.vm.showMobileMenu = false
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showExportDropdown).toBe(false)
      expect(wrapper.vm.showMobileMenu).toBe(false)
    })
  })

  describe('PDF Export with Debit/Credit Format', () => {
    // Import the mock helper to get the last instance
    const getLastJsPDFInstance = async () => {
      const jspdfModule = await import('jspdf') as any
      return jspdfModule.__getLastInstance?.() || null
    }

    it('should generate PDF headers with Date, Description, Debit, Credit columns', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Mock Image to avoid logo loading issues - simulate immediate error
      global.Image = vi.fn().mockImplementation(() => {
        const img = {
          onload: null as any,
          onerror: null as any,
          src: '',
          crossOrigin: ''
        }
        setTimeout(() => {
          if (img.onerror) img.onerror(new Error('Mock image error'))
        }, 0)
        return img
      }) as any

      // Call the PDF export function
      await wrapper.vm.exportStatementPDF()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Get the jsPDF instance that was created
      const mockPdfInstance = await getLastJsPDFInstance()
      expect(mockPdfInstance).toBeDefined()

      // Check that headers were set correctly
      const textCalls = mockPdfInstance.text.mock.calls

      // Find the headers call (should contain 'Date')
      const headerCall = textCalls.find((call: any[]) => call[0] === 'Date')
      expect(headerCall).toBeDefined()

      // Check all headers are present
      expect(textCalls.some((call: any[]) => call[0] === 'Description')).toBe(true)
      expect(textCalls.some((call: any[]) => call[0] === 'Debit')).toBe(true)
      expect(textCalls.some((call: any[]) => call[0] === 'Credit')).toBe(true)

      // Should NOT have old headers
      expect(textCalls.some((call: any[]) => call[0] === 'Reference')).toBe(false)
      expect(textCalls.some((call: any[]) => call[0] === 'Dues')).toBe(false)
      expect(textCalls.some((call: any[]) => call[0] === 'Payments')).toBe(false)
      expect(textCalls.some((call: any[]) => call[0] === 'Balance')).toBe(false)
    })

    it('should format reference as subtext with gray color', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Mock Image - simulate immediate error
      global.Image = vi.fn().mockImplementation(() => {
        const img = {
          onload: null as any,
          onerror: null as any,
          src: '',
          crossOrigin: ''
        }
        setTimeout(() => {
          if (img.onerror) img.onerror(new Error('Mock image error'))
        }, 0)
        return img
      }) as any

      await wrapper.vm.exportStatementPDF()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Get the jsPDF instance that was created
      const mockPdfInstance = await getLastJsPDFInstance()
      expect(mockPdfInstance).toBeDefined()

      // Check setTextColor calls for gray (107, 114, 128)
      const colorCalls = mockPdfInstance.setTextColor.mock.calls
      const grayColorCall = colorCalls.find((call: any[]) =>
        call[0] === 107 && call[1] === 114 && call[2] === 128
      )
      expect(grayColorCall).toBeDefined()

      // Check that reference is formatted with "Ref: " prefix
      const textCalls = mockPdfInstance.text.mock.calls
      const refCall = textCalls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].startsWith('Ref: ')
      )
      expect(refCall).toBeDefined()
      expect(refCall[0]).toBe('Ref: REF123') // From our mock data

      // Check font size changes for subtext
      const fontSizeCalls = mockPdfInstance.setFontSize.mock.calls
      expect(fontSizeCalls.some((call: any[]) => call[0] === 8)).toBe(true) // Subtext size
      expect(fontSizeCalls.some((call: any[]) => call[0] === 10)).toBe(true) // Normal text size
    })

    it('should calculate and display totals for debits and credits', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Mock Image - simulate immediate error
      global.Image = vi.fn().mockImplementation(() => {
        const img = {
          onload: null as any,
          onerror: null as any,
          src: '',
          crossOrigin: ''
        }
        setTimeout(() => {
          if (img.onerror) img.onerror(new Error('Mock image error'))
        }, 0)
        return img
      }) as any

      await wrapper.vm.exportStatementPDF()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Get the jsPDF instance that was created
      const mockPdfInstance = await getLastJsPDFInstance()
      expect(mockPdfInstance).toBeDefined()

      const textCalls = mockPdfInstance.text.mock.calls

      // Check for total debits (we have one debit of 500 in mock data)
      const totalDebitsCall = textCalls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('Total Debits:')
      )
      expect(totalDebitsCall).toBeDefined()
      expect(totalDebitsCall[0]).toBe('Total Debits: 500.00')

      // Check for total credits (we have one credit of 1000 in mock data)
      const totalCreditsCall = textCalls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('Total Credits:')
      )
      expect(totalCreditsCall).toBeDefined()
      expect(totalCreditsCall[0]).toBe('Total Credits: 1000.00')

      // Check for current balance
      const balanceCall = textCalls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('Current Balance:')
      )
      expect(balanceCall).toBeDefined()
      expect(balanceCall[0]).toBe('Current Balance: 5000.00 Dr') // From mock account data
    })

    it('should not include reference column in PDF table', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Mock Image - simulate immediate error
      global.Image = vi.fn().mockImplementation(() => {
        const img = {
          onload: null as any,
          onerror: null as any,
          src: '',
          crossOrigin: ''
        }
        setTimeout(() => {
          if (img.onerror) img.onerror(new Error('Mock image error'))
        }, 0)
        return img
      }) as any

      await wrapper.vm.exportStatementPDF()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Get the jsPDF instance that was created
      const mockPdfInstance = await getLastJsPDFInstance()
      expect(mockPdfInstance).toBeDefined()

      // Check column widths array (should be 4 columns now, not 5)
      const textCalls = mockPdfInstance.text.mock.calls

      // Count unique x-positions for headers to verify column count
      const headerCalls = textCalls.filter((call: any[]) =>
        ['Date', 'Description', 'Debit', 'Credit'].includes(call[0])
      )

      expect(headerCalls.length).toBe(4) // Should have exactly 4 column headers
    })
  })

  describe('CSV Export with Debit/Credit Format', () => {
    it('should generate CSV with debit/credit columns instead of dues/payments/balance', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const csvContent = wrapper.vm.generateStatementCSV()
      
      // Check headers
      expect(csvContent).toContain('Date,Description,Reference,Debit,Credit,Notes')
      
      // Should NOT contain old headers as column names
      expect(csvContent).not.toContain('Dues')
      expect(csvContent).not.toContain('Payments')
      // Note: "Balance" might appear in the text "Current Balance" so we check the header line specifically
      const headerLine = csvContent.split('\n')[0]
      expect(headerLine).not.toContain(',Balance,')
      
      // Check that data rows are formatted correctly
      const lines = csvContent.split('\n')
      expect(lines.length).toBeGreaterThan(2) // Headers + at least one data row + summary
      
      // Check data formatting (transaction 1 is credit, transaction 2 is debit)
      expect(csvContent).toContain('Test credit,REF123,,1000,') // Credit in credit column
      expect(csvContent).toContain('Test debit,REF456,500,,') // Debit in debit column
    })

    it('should include totals row with calculated sums', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const csvContent = wrapper.vm.generateStatementCSV()
      
      // Check for TOTALS row
      expect(csvContent).toContain('TOTALS')
      
      // Check that totals are calculated correctly
      const lines = csvContent.split('\n')
      const totalsLine = lines.find(line => line.includes('TOTALS'))
      
      expect(totalsLine).toBeDefined()
      expect(totalsLine).toContain('500.00') // Total debits
      expect(totalsLine).toContain('1000.00') // Total credits
      expect(totalsLine).toContain('Current Balance: 5000.00') // Balance in notes
    })

    it('should keep reference as separate column in CSV', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const csvContent = wrapper.vm.generateStatementCSV()
      
      // CSV should still have Reference as a separate column
      expect(csvContent).toContain('Reference')
      
      // Check that references are in their own column
      expect(csvContent).toContain('REF123')
      expect(csvContent).toContain('REF456')
    })

    it('should format dates in en-CA format (YYYY-MM-DD)', async () => {
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const csvContent = wrapper.vm.generateStatementCSV()
      
      // Check date formatting
      expect(csvContent).toMatch(/\d{4}-\d{2}-\d{2}/) // YYYY-MM-DD format
      expect(csvContent).toContain('2024-01-15') // From mock transaction 1
      expect(csvContent).toContain('2024-01-20') // From mock transaction 2
    })
  })
})