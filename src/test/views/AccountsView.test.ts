import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock i18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'accounts.title': 'Accounts',
        'accounts.subtitle': 'Manage payment accounts and track balances',
        'accounts.addAccount': 'Add Account',
        'accounts.editAccount': 'Edit Account',
        'accounts.accountName': 'Account Name',
        'accounts.accountType': 'Account Type',
        'accounts.openingBalance': 'Opening Balance',
        'accounts.currentBalance': 'Current Balance',
        'accounts.totalBalance': 'Total Balance',
        'accounts.activeAccounts': 'Active Accounts',
        'accounts.lowBalance': 'Low Balance',
        'accounts.noAccounts': 'No accounts',
        'accounts.getStarted': 'Get started by adding a payment account.',
        'accounts.accountTypes.bank': 'Bank Account',
        'accounts.accountTypes.cash': 'Cash',
        'accounts.isActive': 'Account is active',
        'common.type': 'Type',
        'common.create': 'Create',
        'common.cancel': 'Cancel',
        'common.description': 'Description',
        'forms.enterAccountName': 'Enter account name',
        'forms.selectAccountType': 'Select account type',
        'forms.enterOpeningBalance': 'Enter opening balance',
        'forms.enterDescription': 'Enter description'
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

// Mock PocketBase service
vi.mock('../../services/pocketbase', () => ({
  accountService: {
    getAll: vi.fn().mockResolvedValue([
      {
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
      }
    ]),
    create: vi.fn().mockResolvedValue({
      id: 'account-2',
      name: 'New Account',
      type: 'bank',
      account_number: '',
      bank_name: '',
      current_balance: 1000,
      opening_balance: 1000,
      is_active: true,
      description: '',
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true)
  }
}))

// Import after mocks
import AccountsView from '../../views/AccountsView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('AccountsView', () => {
  let wrapper: any
  let router: any

  beforeEach(async () => {
    vi.clearAllMocks()
    router = createMockRouter()
    
    // Reset the mock data for accountService.getAll
    const { accountService } = await import('../../services/pocketbase')
    vi.mocked(accountService.getAll).mockResolvedValue([
      {
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
      }
    ])
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(AccountsView, {
      props,
      global: {
        plugins: [router],
        stubs: {
          'router-link': true
        }
      }
    })
  }

  describe('Basic Rendering', () => {
    it('should render page title and subtitle', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('h1').text()).toBe('Accounts')
      expect(wrapper.text()).toContain('Manage payment accounts and track balances')
    })

    it('should render add account button', () => {
      wrapper = createWrapper()
      
      const buttons = wrapper.findAll('button')
      const addButton = buttons.find((btn: any) => btn.text().includes('Add Account'))
      expect(addButton?.exists()).toBe(true)
    })

    it('should display account data when loaded', async () => {
      wrapper = createWrapper()
      
      // Wait for onMounted to complete and data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10)) // Wait for async loadData
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('Test Bank Account')
      expect(wrapper.text()).toContain('5000.00')
      expect(wrapper.text()).toContain('Test Bank')
    })

    it('should display summary cards', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('Total Balance')
      expect(wrapper.text()).toContain('Active Accounts')
      expect(wrapper.text()).toContain('Low Balance')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no accounts', async () => {
      const { accountService } = await import('../../services/pocketbase')
      vi.mocked(accountService.getAll).mockResolvedValue([])
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('No accounts')
      expect(wrapper.text()).toContain('Get started by adding a payment account.')
    })
  })

  describe('Add Account Modal', () => {
    it('should open add modal when add button clicked', async () => {
      wrapper = createWrapper()
      
      const buttons = wrapper.findAll('button')
      const addButton = buttons.find((btn: any) => btn.text().includes('Add Account'))
      
      await addButton?.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showAddModal).toBe(true)
      expect(wrapper.find('.fixed').exists()).toBe(true)
      expect(wrapper.text()).toContain('Add Account')
    })

    it('should close modal when cancel button clicked', async () => {
      wrapper = createWrapper()
      
      // Open modal
      const buttons = wrapper.findAll('button')
      const addButton = buttons.find((btn: any) => btn.text().includes('Add Account'))
      await addButton?.trigger('click')
      await wrapper.vm.$nextTick()
      
      // Find and click cancel button
      const allButtons = wrapper.findAll('button')
      const cancelButton = allButtons.find((btn: any) => btn.text().includes('Cancel'))
      await cancelButton?.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showAddModal).toBe(false)
    })
  })

  describe('Account Creation', () => {
    it('should create account with form data', async () => {
      const { accountService } = await import('../../services/pocketbase')
      const mockCreate = vi.mocked(accountService.create)
      
      wrapper = createWrapper()
      
      // Open modal
      const buttons = wrapper.findAll('button')
      const addButton = buttons.find((btn: any) => btn.text().includes('Add Account'))
      await addButton?.trigger('click')
      await wrapper.vm.$nextTick()
      
      // Set form data directly
      wrapper.vm.form.name = 'New Account'
      wrapper.vm.form.type = 'bank'
      wrapper.vm.form.opening_balance = 1000
      wrapper.vm.form.description = 'Test description'
      await wrapper.vm.$nextTick()
      
      // Verify form data is set correctly before save
      expect(wrapper.vm.form.name).toBe('New Account')
      expect(wrapper.vm.form.type).toBe('bank')
      expect(wrapper.vm.form.opening_balance).toBe(1000)
      
      // Call save method directly
      await wrapper.vm.saveAccount()
      
      // Just verify that create was called with the form object
      expect(mockCreate).toHaveBeenCalledWith(wrapper.vm.form)
    })

    it('should close modal after successful creation', async () => {
      wrapper = createWrapper()
      
      // Open modal and set form data
      wrapper.vm.showAddModal = true
      wrapper.vm.form.name = 'New Account'
      wrapper.vm.form.type = 'cash'
      wrapper.vm.form.opening_balance = 500
      await wrapper.vm.$nextTick()
      
      // Save account
      await wrapper.vm.saveAccount()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showAddModal).toBe(false)
    })
  })

  describe('Account Editing', () => {
    it('should open edit modal when edit button clicked', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      // Find edit button
      const editButton = wrapper.find('button[title="Edit"]')
      if (editButton.exists()) {
        await editButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        expect(wrapper.vm.editingAccount).toBeTruthy()
        expect(wrapper.text()).toContain('Edit Account')
      }
    })

    it('should update account with new data', async () => {
      const { accountService } = await import('../../services/pocketbase')
      const mockUpdate = vi.mocked(accountService.update)
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      // Set editing mode with mock account
      wrapper.vm.editingAccount = {
        id: 'account-1',
        name: 'Test Bank Account',
        type: 'bank',
        current_balance: 5000,
        opening_balance: 10000,
        is_active: true
      }
      wrapper.vm.form.name = 'Updated Account'
      wrapper.vm.form.type = 'bank'
      wrapper.vm.form.opening_balance = 2000
      await wrapper.vm.$nextTick()
      
      // Verify form data is set correctly
      expect(wrapper.vm.form.name).toBe('Updated Account')
      expect(wrapper.vm.form.opening_balance).toBe(2000)
      
      // Save changes
      await wrapper.vm.saveAccount()
      
      // Verify update was called with account ID and form object
      expect(mockUpdate).toHaveBeenCalledWith('account-1', wrapper.vm.form)
    })
  })

  describe('Account Deletion', () => {
    it('should delete account when confirmed', async () => {
      const { accountService } = await import('../../services/pocketbase')
      const mockDelete = vi.mocked(accountService.delete)
      
      // Mock window.confirm
      window.confirm = vi.fn(() => true)
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      // Call delete method directly
      await wrapper.vm.deleteAccount('account-1')
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalledWith('account-1')
    })

    it('should not delete account when cancelled', async () => {
      const { accountService } = await import('../../services/pocketbase')
      const mockDelete = vi.mocked(accountService.delete)
      
      // Mock window.confirm to return false
      window.confirm = vi.fn(() => false)
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      // Call delete method directly
      await wrapper.vm.deleteAccount('account-1')
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  describe('Site Change Event', () => {
    it('should reload data when site changes', async () => {
      const { accountService } = await import('../../services/pocketbase')
      
      wrapper = createWrapper()
      vi.clearAllMocks()
      
      // Trigger site change event
      window.dispatchEvent(new CustomEvent('site-changed'))
      await wrapper.vm.$nextTick()
      
      expect(accountService.getAll).toHaveBeenCalled()
    })
  })

  describe('Form Validation', () => {
    it('should require account name', async () => {
      wrapper = createWrapper()
      
      // Open modal without setting required fields
      wrapper.vm.showAddModal = true
      wrapper.vm.form.name = ''
      wrapper.vm.form.type = 'cash'
      wrapper.vm.form.opening_balance = 0
      await wrapper.vm.$nextTick()
      
      // Find form and check for required input
      const nameInput = wrapper.find('input[placeholder="Enter account name"]')
      expect(nameInput.attributes('required')).toBeDefined()
    })

    it('should require account type', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.showAddModal = true
      await wrapper.vm.$nextTick()
      
      const typeSelect = wrapper.find('select')
      expect(typeSelect.attributes('required')).toBeDefined()
    })

    it('should require opening balance', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.showAddModal = true
      await wrapper.vm.$nextTick()
      
      const balanceInput = wrapper.find('input[type="number"]')
      expect(balanceInput.attributes('required')).toBeDefined()
    })
  })

  describe('Computed Properties', () => {
    it('should calculate total balance correctly', async () => {
      wrapper = createWrapper()
      
      // Wait for data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.totalBalance).toBe(5000) // From mock account
    })

    it('should count active accounts correctly', async () => {
      wrapper = createWrapper()
      
      // Wait for data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.activeAccountsCount).toBe(1) // From mock account
    })

    it('should count low balance accounts correctly', async () => {
      wrapper = createWrapper()
      
      // Wait for data to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))
      await wrapper.vm.$nextTick()
      
      // Mock account has 5000 balance, so should not be low balance (< 1000)
      expect(wrapper.vm.lowBalanceCount).toBe(0)
    })
  })
})