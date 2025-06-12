import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock i18n composable - must be at the top
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'accounts.title': 'Accounts',
        'accounts.subtitle': 'Manage payment accounts and track balances',
        'accounts.addAccount': 'Add Account',
        'accounts.editAccount': 'Edit Account',
        'accounts.deleteAccount': 'Delete Account',
        'accounts.accountName': 'Account Name',
        'accounts.accountType': 'Account Type',
        'accounts.accountNumber': 'Account Number',
        'accounts.bankName': 'Bank Name',
        'accounts.openingBalance': 'Opening Balance',
        'accounts.currentBalance': 'Current Balance',
        'accounts.isActive': 'Account is active',
        'accounts.totalBalance': 'Total Balance',
        'accounts.activeAccounts': 'Active Accounts',
        'accounts.lowBalance': 'Low Balance',
        'accounts.noAccounts': 'No accounts',
        'accounts.getStarted': 'Get started by adding a payment account.',
        'accounts.accountTypes.bank': 'Bank Account',
        'accounts.accountTypes.creditCard': 'Credit Card',
        'accounts.accountTypes.cash': 'Cash',
        'accounts.accountTypes.digitalWallet': 'Digital Wallet',
        'accounts.accountTypes.other': 'Other',
        'common.inactive': 'Inactive',
        'common.type': 'Type',
        'common.account': 'Account',
        'common.description': 'Description',
        'common.update': 'Update',
        'common.create': 'Create',
        'common.cancel': 'Cancel',
        'forms.enterAccountName': 'Enter account name',
        'forms.selectAccountType': 'Select account type',
        'forms.enterAccountNumber': 'Enter account number',
        'forms.enterBankName': 'Enter bank name',
        'forms.enterOpeningBalance': 'Enter opening balance',
        'forms.enterDescription': 'Enter description',
        'messages.confirmDelete': 'Are you sure you want to delete this {item}?',
        'messages.cannotUndo': 'This action cannot be undone'
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

vi.mock('../../services/pocketbase', () => {
  const mockAccount = {
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
  
  return {
    accountService: {
      getAll: vi.fn().mockResolvedValue([mockAccount]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
})

// Import dependencies after all mocks
import AccountsView from '../../views/AccountsView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('AccountsView', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    const router = createMockRouter()
    
    wrapper = mount(AccountsView, {
      global: {
        plugins: [router],
        stubs: {
          'router-link': true
        }
      }
    })
  })

  it('should render accounts page title', () => {
    expect(wrapper.find('h1').text()).toBe('Accounts')
  })

  it('should render add account button', () => {
    const addButton = wrapper.find('button:contains("Add Account")')
    expect(addButton.exists()).toBe(true)
  })

  it('should display accounts in grid', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Test Bank Account')
    expect(wrapper.text()).toContain('5000.00')
    expect(wrapper.text()).toContain('Test Bank')
  })

  it('should show add modal when add button is clicked', async () => {
    const addButton = wrapper.find('button:contains("Add Account")')
    await addButton.trigger('click')
    
    expect(wrapper.find('.fixed').exists()).toBe(true)
    expect(wrapper.text()).toContain('Add Account')
  })

  it('should handle account creation', async () => {
    const { accountService } = await import('../../services/pocketbase')
    const mockCreate = vi.mocked(accountService.create)
    mockCreate.mockResolvedValue({
      id: 'account-2',
      name: 'New Account',
      type: 'bank',
      account_number: '0987654321',
      bank_name: 'New Bank',
      current_balance: 1000,
      opening_balance: 1000,
      is_active: true,
      site: 'site-1',
      description: '',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })
    
    // Open add modal
    const addButton = wrapper.find('button:contains("Add Account")')
    await addButton.trigger('click')
    
    // Fill form
    await wrapper.find('input[placeholder="Enter account name"]').setValue('New Account')
    await wrapper.find('select').setValue('bank')
    await wrapper.find('input[type="number"]').setValue('1000')
    
    // Submit form
    await wrapper.find('form').trigger('submit')
    
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'New Account',
      type: 'bank',
      account_number: '',
      bank_name: '',
      description: '',
      is_active: true,
      opening_balance: 1000
    })
  })

  it('should handle account editing', async () => {
    const { accountService } = await import('../../services/pocketbase')
    const mockUpdate = vi.mocked(accountService.update)
    mockUpdate.mockResolvedValue({
      id: 'account-1',
      name: 'Updated Account',
      type: 'bank',
      account_number: '1234567890',
      bank_name: 'Test Bank',
      current_balance: 5000,
      opening_balance: 10000,
      is_active: true,
      site: 'site-1',
      description: '',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })
    
    // Wait for accounts to load
    await wrapper.vm.$nextTick()
    
    // Find and click edit button
    const editButton = wrapper.find('button[title="Edit"]')
    if (editButton.exists()) {
      await editButton.trigger('click')
      
      expect(wrapper.text()).toContain('Edit Account')
    }
  })

  it('should handle account deletion', async () => {
    const { accountService } = await import('../../services/pocketbase')
    const mockDelete = vi.mocked(accountService.delete)
    mockDelete.mockResolvedValue(true)
    
    // Mock window.confirm
    window.confirm = vi.fn(() => true)
    
    // Wait for accounts to load
    await wrapper.vm.$nextTick()
    
    // Find and click delete button
    const deleteButton = wrapper.find('button[title="Delete"]')
    if (deleteButton.exists()) {
      await deleteButton.trigger('click')
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalledWith('account-1')
    }
  })

  it('should display balance summaries', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Total Balance')
    expect(wrapper.text()).toContain('Active Accounts')
    expect(wrapper.text()).toContain('Low Balance')
  })

  it('should handle site change event', async () => {
    const { accountService } = await import('../../services/pocketbase')
    
    // Clear previous calls
    vi.clearAllMocks()
    
    // Trigger site change event
    window.dispatchEvent(new CustomEvent('site-changed'))
    
    await wrapper.vm.$nextTick()
    
    expect(accountService.getAll).toHaveBeenCalled()
  })
})