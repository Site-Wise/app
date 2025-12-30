import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock localStorage
const localStorageData: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageData[key] || null),
    setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value }),
    removeItem: vi.fn((key: string) => { delete localStorageData[key] }),
    clear: vi.fn(() => { Object.keys(localStorageData).forEach(key => delete localStorageData[key]) })
  },
  writable: true
})

// Mock data
const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test User' }
const mockSite = { id: 'site-1', name: 'Test Site', admin_user: 'user-1' }
const mockItem = { id: 'item-1', name: 'Steel', unit: 'kg', site: 'site-1' }
const mockVendor = { id: 'vendor-1', name: 'Vendor Inc', site: 'site-1' }
const mockAccount = { id: 'account-1', name: 'Cash', type: 'cash', current_balance: 1000, opening_balance: 1000, site: 'site-1' }
const mockDelivery = { id: 'delivery-1', vendor: 'vendor-1', total_amount: 1000, site: 'site-1' }
const mockDeliveryItem = { id: 'di-1', delivery: 'delivery-1', item: 'item-1', quantity: 10, unit_price: 100, total_amount: 1000, site: 'site-1' }
const mockPayment = { id: 'payment-1', vendor: 'vendor-1', amount: 500, account: 'account-1', site: 'site-1' }
const mockService = { id: 'service-1', name: 'Plumbing', unit: 'per point', site: 'site-1' }
const mockServiceBooking = { id: 'booking-1', service: 'service-1', vendor: 'vendor-1', total_amount: 500, site: 'site-1' }
const mockTag = { id: 'tag-1', name: 'Steel', color: '#ff0000', type: 'item_category', usage_count: 5, site: 'site-1' }
const mockQuotation = { id: 'quot-1', vendor: 'vendor-1', item: 'item-1', unit_price: 50, site: 'site-1' }
const mockSiteUser = { id: 'su-1', site: 'site-1', user: 'user-1', role: 'owner', is_active: true }
const mockSiteInvitation = { id: 'inv-1', site: 'site-1', email: 'invite@test.com', role: 'supervisor', status: 'pending' }
const mockVendorReturn = { id: 'vr-1', vendor: 'vendor-1', total_return_amount: 200, status: 'approved', site: 'site-1' }
const mockVendorReturnItem = { id: 'vri-1', vendor_return: 'vr-1', delivery_item: 'di-1', quantity: 2, site: 'site-1' }
const mockAccountTransaction = { id: 'at-1', account: 'account-1', amount: 100, type: 'credit', site: 'site-1' }
const mockPaymentAllocation = { id: 'pa-1', payment: 'payment-1', delivery: 'delivery-1', amount: 500 }
const mockCreditNote = { id: 'cn-1', vendor: 'vendor-1', credit_amount: 100, balance: 100, status: 'active', site: 'site-1' }

// Create collections map
const createCollections = () => {
  const collections = new Map<string, any[]>()
  collections.set('users', [mockUser])
  collections.set('sites', [mockSite])
  collections.set('items', [{ ...mockItem, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('vendors', [{ ...mockVendor, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('accounts', [{ ...mockAccount, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('deliveries', [{ ...mockDelivery, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('delivery_items', [{ ...mockDeliveryItem, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('payments', [{ ...mockPayment, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('services', [{ ...mockService, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('service_bookings', [{ ...mockServiceBooking, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('tags', [{ ...mockTag, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('quotations', [{ ...mockQuotation, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('site_users', [{ ...mockSiteUser, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('site_invitations', [{ ...mockSiteInvitation, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('vendor_returns', [{ ...mockVendorReturn, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('vendor_return_items', [{ ...mockVendorReturnItem, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('account_transactions', [{ ...mockAccountTransaction, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('payment_allocations', [{ ...mockPaymentAllocation, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('vendor_credit_notes', [{ ...mockCreditNote, created: '2024-01-01', updated: '2024-01-01' }])
  collections.set('credit_note_usage', [])
  collections.set('vendor_refunds', [])
  return collections
}

let collections = createCollections()

// Mock PocketBase
vi.mock('pocketbase', () => {
  const MockPocketBase = function(this: any) {
    this.authStore = {
      isValid: true,
      model: mockUser,
      record: mockUser,
      clear: vi.fn(),
      token: 'mock-token'
    }

    this.collection = vi.fn((name: string) => ({
      getFullList: vi.fn().mockImplementation(async (options: any = {}) => {
        const items = collections.get(name) || []
        if (options.filter) {
          // Simple site filter
          if (options.filter.includes('site=')) {
            let filtered = items.filter((item: any) => item.site === 'site-1')
            // Filter by service_booking if specified
            const serviceBookingMatch = options.filter.match(/service_booking="([^"]+)"/)
            if (serviceBookingMatch) {
              filtered = filtered.filter((item: any) => item.service_booking === serviceBookingMatch[1])
            }
            // Filter by delivery if specified
            const deliveryMatch = options.filter.match(/delivery="([^"]+)"/)
            if (deliveryMatch) {
              filtered = filtered.filter((item: any) => item.delivery === deliveryMatch[1])
            }
            // Filter by payment if specified
            const paymentMatch = options.filter.match(/payment="([^"]+)"/)
            if (paymentMatch) {
              filtered = filtered.filter((item: any) => item.payment === paymentMatch[1])
            }
            return filtered
          }
        }
        return items
      }),
      getOne: vi.fn().mockImplementation(async (id: string) => {
        const items = collections.get(name) || []
        const item = items.find((item: any) => item.id === id)
        if (!item) throw new Error('Record not found')
        return item
      }),
      getFirstListItem: vi.fn().mockImplementation(async (filter: string, _options?: any) => {
        const items = collections.get(name) || []
        if (items.length === 0) throw new Error('Record not found')
        return items[0]
      }),
      create: vi.fn().mockImplementation(async (data: any) => {
        const newItem = { ...data, id: `${name}-${Date.now()}`, created: '2024-01-01', updated: '2024-01-01' }
        const items = collections.get(name) || []
        items.push(newItem)
        collections.set(name, items)
        return newItem
      }),
      update: vi.fn().mockImplementation(async (id: string, data: any) => {
        const items = collections.get(name) || []
        const index = items.findIndex((item: any) => item.id === id)
        if (index !== -1) {
          items[index] = { ...items[index], ...data, updated: '2024-01-02' }
          return items[index]
        }
        throw new Error('Record not found')
      }),
      delete: vi.fn().mockImplementation(async (id: string) => {
        const items = collections.get(name) || []
        const filtered = items.filter((item: any) => item.id !== id)
        collections.set(name, filtered)
        return true
      }),
      authWithPassword: vi.fn().mockResolvedValue({
        record: mockUser,
        token: 'mock-token'
      }),
      requestPasswordReset: vi.fn().mockResolvedValue(true),
      confirmPasswordReset: vi.fn().mockResolvedValue(true)
    }))

    this.autoCancellation = vi.fn()
    this.baseUrl = 'http://localhost:8090'
    return this
  }

  return { default: MockPocketBase }
})

// Import services after mocking
const {
  ItemService,
  VendorService,
  DeliveryService,
  DeliveryItemService,
  PaymentService,
  TagService,
  AccountTransactionService,
  SiteInvitationService,
  setCurrentSiteId,
  setCurrentUserRole,
  getCurrentSiteId,
  getCurrentUserRole,
  calculatePermissions
} = await import('../../services/pocketbase')

describe('PocketBase All Services Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageData).forEach(key => delete localStorageData[key])
    collections = createCollections()
    setCurrentSiteId('site-1')
    setCurrentUserRole('owner')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('ItemService', () => {
    let itemService: InstanceType<typeof ItemService>

    beforeEach(() => {
      itemService = new ItemService()
    })

    it('should get all items for current site', async () => {
      const items = await itemService.getAll()
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(itemService.getAll()).rejects.toThrow('No site selected')
    })

    it('should create a new item with owner role', async () => {
      const newItem = { name: 'Cement', unit: 'bag', description: 'Portland cement' }
      const result = await itemService.create(newItem)
      expect(result).toBeDefined()
      expect(result.name).toBe('Cement')
    })

    it('should reject create when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      const newItem = { name: 'Cement', unit: 'bag' }
      await expect(itemService.create(newItem)).rejects.toThrow('Permission denied')
    })

    it('should update an item', async () => {
      const result = await itemService.update('item-1', { name: 'Updated Steel' })
      expect(result).toBeDefined()
    })

    it('should reject update when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      await expect(itemService.update('item-1', { name: 'X' })).rejects.toThrow('Permission denied')
    })

    it('should delete an item', async () => {
      const result = await itemService.delete('item-1')
      expect(result).toBe(true)
    })

    it('should reject delete when user lacks permission', async () => {
      setCurrentUserRole('supervisor') // Supervisors can't delete
      await expect(itemService.delete('item-1')).rejects.toThrow('Permission denied')
    })
  })

  describe('VendorService', () => {
    let vendorService: InstanceType<typeof VendorService>

    beforeEach(() => {
      vendorService = new VendorService()
    })

    it('should get all vendors for current site', async () => {
      const vendors = await vendorService.getAll()
      expect(vendors).toBeDefined()
      expect(Array.isArray(vendors)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(vendorService.getAll()).rejects.toThrow('No site selected')
    })

    it('should create a new vendor', async () => {
      const newVendor = { name: 'New Vendor', contact_person: 'John' }
      const result = await vendorService.create(newVendor)
      expect(result).toBeDefined()
      expect(result.name).toBe('New Vendor')
    })

    it('should update a vendor', async () => {
      const result = await vendorService.update('vendor-1', { name: 'Updated Vendor' })
      expect(result).toBeDefined()
    })

    it('should delete a vendor', async () => {
      const result = await vendorService.delete('vendor-1')
      expect(result).toBe(true)
    })
  })

  describe('DeliveryService', () => {
    let deliveryService: InstanceType<typeof DeliveryService>

    beforeEach(() => {
      deliveryService = new DeliveryService()
    })

    it('should get all deliveries for current site', async () => {
      const deliveries = await deliveryService.getAll()
      expect(deliveries).toBeDefined()
      expect(Array.isArray(deliveries)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(deliveryService.getAll()).rejects.toThrow('No site selected')
    })

    it('should create a new delivery', async () => {
      const newDelivery = {
        vendor: 'vendor-1',
        delivery_date: '2024-01-15',
        total_amount: 5000
      }
      const result = await deliveryService.create(newDelivery)
      expect(result).toBeDefined()
    })

    it('should update a delivery', async () => {
      const result = await deliveryService.update('delivery-1', { notes: 'Updated' })
      expect(result).toBeDefined()
    })
  })

  describe('DeliveryItemService', () => {
    let deliveryItemService: InstanceType<typeof DeliveryItemService>

    beforeEach(() => {
      deliveryItemService = new DeliveryItemService()
    })

    it('should get all delivery items for a delivery', async () => {
      const items = await deliveryItemService.getByDelivery('delivery-1')
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
    })

    it('should create a new delivery item', async () => {
      const newItem = {
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 100,
        unit_price: 50,
        total_amount: 5000
      }
      const result = await deliveryItemService.create(newItem)
      expect(result).toBeDefined()
    })
  })

  describe('PaymentService', () => {
    let paymentService: InstanceType<typeof PaymentService>

    beforeEach(() => {
      paymentService = new PaymentService()
    })

    it('should get all payments for current site', async () => {
      const payments = await paymentService.getAll()
      expect(payments).toBeDefined()
      expect(Array.isArray(payments)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(paymentService.getAll()).rejects.toThrow('No site selected')
    })
  })

  describe('TagService', () => {
    let tagService: InstanceType<typeof TagService>

    beforeEach(() => {
      tagService = new TagService()
    })

    it('should get all tags for current site', async () => {
      const tags = await tagService.getAll()
      expect(tags).toBeDefined()
      expect(Array.isArray(tags)).toBe(true)
    })

    it('should get tags by site', async () => {
      const tags = await tagService.getBySite('site-1')
      expect(tags).toBeDefined()
      expect(Array.isArray(tags)).toBe(true)
    })

    it('should create a new tag', async () => {
      const result = await tagService.create('New Tag', 'custom')
      expect(result).toBeDefined()
      expect(result.name).toBe('New Tag')
    })

    it('should update a tag', async () => {
      const result = await tagService.update('tag-1', { name: 'Updated Tag' })
      expect(result).toBeDefined()
    })

    it('should delete a tag', async () => {
      const result = await tagService.delete('tag-1')
      expect(result).toBe(true)
    })

    it('should increment tag usage', async () => {
      await tagService.incrementUsage('tag-1')
      // No error means success
    })
  })

  describe('AccountTransactionService', () => {
    let accountTransactionService: InstanceType<typeof AccountTransactionService>

    beforeEach(() => {
      accountTransactionService = new AccountTransactionService()
    })

    it('should get all transactions for current site', async () => {
      const transactions = await accountTransactionService.getAll()
      expect(transactions).toBeDefined()
      expect(Array.isArray(transactions)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(accountTransactionService.getAll()).rejects.toThrow('No site selected')
    })

    it('should get transactions by account', async () => {
      const transactions = await accountTransactionService.getByAccount('account-1')
      expect(transactions).toBeDefined()
      expect(Array.isArray(transactions)).toBe(true)
    })
  })

  describe('SiteInvitationService', () => {
    let siteInvitationService: InstanceType<typeof SiteInvitationService>

    beforeEach(() => {
      siteInvitationService = new SiteInvitationService()
    })

    it('should get all invitations for current site', async () => {
      const invitations = await siteInvitationService.getAll()
      expect(invitations).toBeDefined()
      expect(Array.isArray(invitations)).toBe(true)
    })

    it('should still work when no site selected (retrieves all)', async () => {
      setCurrentSiteId(null)
      // SiteInvitationService.getAll doesn't require a site context
      const invitations = await siteInvitationService.getAll()
      expect(invitations).toBeDefined()
    })

    it('should get invitations by site', async () => {
      const invitations = await siteInvitationService.getBySite('site-1')
      expect(invitations).toBeDefined()
      expect(Array.isArray(invitations)).toBe(true)
    })

    it('should create a new invitation', async () => {
      const newInvitation = {
        email: 'newuser@test.com',
        role: 'supervisor' as const
      }
      const result = await siteInvitationService.create(newInvitation)
      expect(result).toBeDefined()
    })
  })

  describe('Permission-based access control', () => {
    it('owner should have all permissions', () => {
      setCurrentUserRole('owner')
      const perms = calculatePermissions(getCurrentUserRole())
      expect(perms.canCreate).toBe(true)
      expect(perms.canRead).toBe(true)
      expect(perms.canUpdate).toBe(true)
      expect(perms.canDelete).toBe(true)
      expect(perms.canManageUsers).toBe(true)
    })

    it('supervisor should not be able to delete', () => {
      setCurrentUserRole('supervisor')
      const perms = calculatePermissions(getCurrentUserRole())
      expect(perms.canCreate).toBe(true)
      expect(perms.canRead).toBe(true)
      expect(perms.canUpdate).toBe(true)
      expect(perms.canDelete).toBe(false)
      expect(perms.canManageUsers).toBe(false)
    })

    it('accountant should have read-only access', () => {
      setCurrentUserRole('accountant')
      const perms = calculatePermissions(getCurrentUserRole())
      expect(perms.canCreate).toBe(false)
      expect(perms.canRead).toBe(true)
      expect(perms.canUpdate).toBe(false)
      expect(perms.canDelete).toBe(false)
      expect(perms.canManageUsers).toBe(false)
    })

    it('null role should have no permissions', () => {
      setCurrentUserRole(null)
      const perms = calculatePermissions(getCurrentUserRole())
      expect(perms.canCreate).toBe(false)
      expect(perms.canRead).toBe(false)
      expect(perms.canUpdate).toBe(false)
      expect(perms.canDelete).toBe(false)
    })
  })

  describe('Site context management', () => {
    it('should set and get site ID', () => {
      setCurrentSiteId('site-2')
      expect(getCurrentSiteId()).toBe('site-2')
    })

    it('should set and get user role', () => {
      setCurrentUserRole('supervisor')
      expect(getCurrentUserRole()).toBe('supervisor')
    })

    it('should clear site ID when set to null', () => {
      setCurrentSiteId('site-1')
      setCurrentSiteId(null)
      const result = getCurrentSiteId()
      expect(result === null || result === undefined).toBe(true)
    })
  })
})

// Import additional services
const {
  AccountService,
  ServiceService,
  QuotationService,
  ServiceBookingService,
  VendorReturnService,
  PaymentAllocationService,
  SiteUserService,
  SiteService
} = await import('../../services/pocketbase')

describe('Additional PocketBase Services Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    collections = createCollections()
    setCurrentSiteId('site-1')
    setCurrentUserRole('owner')
  })

  describe('AccountService', () => {
    let accountService: InstanceType<typeof AccountService>

    beforeEach(() => {
      accountService = new AccountService()
    })

    it('should get all accounts for current site', async () => {
      const accounts = await accountService.getAll()
      expect(accounts).toBeDefined()
      expect(Array.isArray(accounts)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(accountService.getAll()).rejects.toThrow('No site selected')
    })

    it('should get account by ID', async () => {
      const account = await accountService.getById('account-1')
      expect(account).toBeDefined()
    })

    it('should return null for non-existent account', async () => {
      const account = await accountService.getById('nonexistent')
      expect(account).toBeNull()
    })

    it('should create a new account', async () => {
      const newAccount = {
        name: 'Savings Account',
        type: 'bank' as const,
        opening_balance: 5000
      }
      const result = await accountService.create(newAccount)
      expect(result).toBeDefined()
      expect(result.name).toBe('Savings Account')
    })

    it('should reject create when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      const newAccount = { name: 'Test', type: 'cash' as const, opening_balance: 100 }
      await expect(accountService.create(newAccount)).rejects.toThrow('Permission denied')
    })

    it('should update an account', async () => {
      const result = await accountService.update('account-1', { name: 'Updated Account' })
      expect(result).toBeDefined()
    })

    it('should reject update when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      await expect(accountService.update('account-1', { name: 'X' })).rejects.toThrow('Permission denied')
    })

    it('should delete an account', async () => {
      const result = await accountService.delete('account-1')
      expect(result).toBe(true)
    })

    it('should reject delete when user lacks permission', async () => {
      setCurrentUserRole('supervisor')
      await expect(accountService.delete('account-1')).rejects.toThrow('Permission denied')
    })
  })

  describe('ServiceService', () => {
    let serviceService: InstanceType<typeof ServiceService>

    beforeEach(() => {
      serviceService = new ServiceService()
    })

    it('should get all services for current site', async () => {
      const services = await serviceService.getAll()
      expect(services).toBeDefined()
      expect(Array.isArray(services)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(serviceService.getAll()).rejects.toThrow('No site selected')
    })

    it('should get service by ID', async () => {
      const service = await serviceService.getById('service-1')
      expect(service).toBeDefined()
    })

    it('should return null for non-existent service', async () => {
      const service = await serviceService.getById('nonexistent')
      expect(service).toBeNull()
    })

    it('should create a new service', async () => {
      const newService = {
        name: 'Electrical Work',
        unit: 'per point',
        description: 'Electrical wiring service'
      }
      const result = await serviceService.create(newService)
      expect(result).toBeDefined()
      expect(result.name).toBe('Electrical Work')
    })

    it('should reject create when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      const newService = { name: 'Test', unit: 'hour' }
      await expect(serviceService.create(newService)).rejects.toThrow('Permission denied')
    })

    it('should update a service', async () => {
      const result = await serviceService.update('service-1', { name: 'Updated Service' })
      expect(result).toBeDefined()
    })

    it('should reject update when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      await expect(serviceService.update('service-1', { name: 'X' })).rejects.toThrow('Permission denied')
    })

    it('should delete a service', async () => {
      const result = await serviceService.delete('service-1')
      expect(result).toBe(true)
    })

    it('should reject delete when user lacks permission', async () => {
      setCurrentUserRole('supervisor')
      await expect(serviceService.delete('service-1')).rejects.toThrow('Permission denied')
    })
  })

  describe('QuotationService', () => {
    let quotationService: InstanceType<typeof QuotationService>

    beforeEach(() => {
      quotationService = new QuotationService()
    })

    it('should get all quotations for current site', async () => {
      const quotations = await quotationService.getAll()
      expect(quotations).toBeDefined()
      expect(Array.isArray(quotations)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(quotationService.getAll()).rejects.toThrow('No site selected')
    })

    it('should get quotation by ID', async () => {
      const quotation = await quotationService.getById('quot-1')
      expect(quotation).toBeDefined()
    })

    it('should return null for non-existent quotation', async () => {
      const quotation = await quotationService.getById('nonexistent')
      expect(quotation).toBeNull()
    })

    it('should create a new quotation', async () => {
      const newQuotation = {
        vendor: 'vendor-1',
        item: 'item-1',
        quotation_type: 'item' as const,
        unit_price: 150,
        valid_until: '2024-12-31'
      }
      const result = await quotationService.create(newQuotation)
      expect(result).toBeDefined()
    })

    it('should reject create when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      const newQuotation = { vendor: 'vendor-1', item: 'item-1', quotation_type: 'item' as const, unit_price: 100 }
      await expect(quotationService.create(newQuotation)).rejects.toThrow('Permission denied')
    })

    it('should update a quotation', async () => {
      const result = await quotationService.update('quot-1', { unit_price: 200 })
      expect(result).toBeDefined()
    })

    it('should reject update when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      await expect(quotationService.update('quot-1', { unit_price: 300 })).rejects.toThrow('Permission denied')
    })

    it('should delete a quotation', async () => {
      const result = await quotationService.delete('quot-1')
      expect(result).toBe(true)
    })

    it('should reject delete when user lacks permission', async () => {
      setCurrentUserRole('supervisor')
      await expect(quotationService.delete('quot-1')).rejects.toThrow('Permission denied')
    })
  })

  describe('ServiceBookingService', () => {
    let serviceBookingService: InstanceType<typeof ServiceBookingService>

    beforeEach(() => {
      serviceBookingService = new ServiceBookingService()
    })

    it('should get all service bookings for current site', async () => {
      const bookings = await serviceBookingService.getAll()
      expect(bookings).toBeDefined()
      expect(Array.isArray(bookings)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(serviceBookingService.getAll()).rejects.toThrow('No site selected')
    })

    it('should get service booking by ID', async () => {
      const booking = await serviceBookingService.getById('booking-1')
      expect(booking).toBeDefined()
    })

    it('should return null for non-existent booking', async () => {
      const booking = await serviceBookingService.getById('nonexistent')
      expect(booking).toBeNull()
    })

    it('should create a new service booking', async () => {
      const newBooking = {
        service: 'service-1',
        vendor: 'vendor-1',
        booking_date: '2024-01-15',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000
      }
      const result = await serviceBookingService.create(newBooking)
      expect(result).toBeDefined()
    })

    it('should reject create when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      const newBooking = { service: 'service-1', vendor: 'vendor-1', booking_date: '2024-01-15', quantity: 10, unit_price: 100, total_amount: 1000 }
      await expect(serviceBookingService.create(newBooking)).rejects.toThrow('Permission denied')
    })

    it('should update a service booking', async () => {
      const result = await serviceBookingService.update('booking-1', { notes: 'Updated' })
      expect(result).toBeDefined()
    })

    it('should reject update when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      await expect(serviceBookingService.update('booking-1', { notes: 'X' })).rejects.toThrow('Permission denied')
    })

    it('should check for allocations before deleting a service booking', async () => {
      // The service checks for payment allocations before allowing delete
      // This tests the business logic that prevents deleting bookings with payments
      await expect(serviceBookingService.delete('booking-1')).rejects.toThrow('Cannot delete service booking')
    })

    it('should reject delete when user lacks permission', async () => {
      setCurrentUserRole('supervisor')
      await expect(serviceBookingService.delete('booking-1')).rejects.toThrow('Permission denied')
    })
  })

  describe('VendorReturnService', () => {
    let vendorReturnService: InstanceType<typeof VendorReturnService>

    beforeEach(() => {
      vendorReturnService = new VendorReturnService()
    })

    it('should get all vendor returns for current site', async () => {
      const returns = await vendorReturnService.getAll()
      expect(returns).toBeDefined()
      expect(Array.isArray(returns)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(vendorReturnService.getAll()).rejects.toThrow('No site selected')
    })

    it('should get vendor return by ID', async () => {
      const vendorReturn = await vendorReturnService.getById('vr-1')
      expect(vendorReturn).toBeDefined()
    })

    it('should return null for non-existent return', async () => {
      const vendorReturn = await vendorReturnService.getById('nonexistent')
      expect(vendorReturn).toBeNull()
    })

    it('should get returns by vendor', async () => {
      const returns = await vendorReturnService.getByVendor('vendor-1')
      expect(returns).toBeDefined()
      expect(Array.isArray(returns)).toBe(true)
    })

    it('should reject create when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      const newReturn = { vendor: 'vendor-1', return_date: '2024-01-15', reason: 'Defective' }
      await expect(vendorReturnService.create(newReturn)).rejects.toThrow('Permission denied')
    })

    it('should update a vendor return', async () => {
      const result = await vendorReturnService.update('vr-1', { notes: 'Updated' })
      expect(result).toBeDefined()
    })

    it('should reject update when user lacks permission', async () => {
      setCurrentUserRole('accountant')
      await expect(vendorReturnService.update('vr-1', { notes: 'X' })).rejects.toThrow('Permission denied')
    })
  })

  describe('PaymentAllocationService', () => {
    let paymentAllocationService: InstanceType<typeof PaymentAllocationService>

    beforeEach(() => {
      paymentAllocationService = new PaymentAllocationService()
    })

    it('should get allocations by payment', async () => {
      const allocations = await paymentAllocationService.getByPayment('payment-1')
      expect(allocations).toBeDefined()
      expect(Array.isArray(allocations)).toBe(true)
    })

    it('should get allocations by delivery', async () => {
      const allocations = await paymentAllocationService.getByDelivery('delivery-1')
      expect(allocations).toBeDefined()
      expect(Array.isArray(allocations)).toBe(true)
    })

    it('should create a new payment allocation', async () => {
      const newAllocation = {
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 500,
        site: 'site-1'
      }
      const result = await paymentAllocationService.create(newAllocation)
      expect(result).toBeDefined()
    })
  })

  describe('SiteUserService', () => {
    let siteUserService: InstanceType<typeof SiteUserService>

    beforeEach(() => {
      siteUserService = new SiteUserService()
    })

    it('should get site users by site', async () => {
      const users = await siteUserService.getBySite('site-1')
      expect(users).toBeDefined()
      expect(Array.isArray(users)).toBe(true)
    })

    it('should get site users by user', async () => {
      const sites = await siteUserService.getByUser('user-1')
      expect(sites).toBeDefined()
      expect(Array.isArray(sites)).toBe(true)
    })
  })

  describe('SiteService', () => {
    let siteService: InstanceType<typeof SiteService>

    beforeEach(() => {
      siteService = new SiteService()
    })

    it('should get site by ID', async () => {
      const site = await siteService.getById('site-1')
      expect(site).toBeDefined()
    })

    it('should return null for non-existent site', async () => {
      const site = await siteService.getById('nonexistent')
      expect(site).toBeNull()
    })

    it('should create a new site', async () => {
      const newSite = {
        name: 'New Construction Site',
        description: 'A new project',
        total_units: 50,
        total_planned_area: 2500,
        admin_user: 'user-1'
      }
      const result = await siteService.create(newSite)
      expect(result).toBeDefined()
      expect(result.name).toBe('New Construction Site')
    })

    it('should update a site', async () => {
      const result = await siteService.update('site-1', { name: 'Updated Site Name' })
      expect(result).toBeDefined()
    })
  })

  describe('SiteInvitationService extended', () => {
    let siteInvitationService: InstanceType<typeof SiteInvitationService>

    beforeEach(() => {
      siteInvitationService = new SiteInvitationService()
    })

    it('should update invitation status', async () => {
      const result = await siteInvitationService.updateStatus('inv-1', 'accepted')
      expect(result).toBeDefined()
    })

    it('should delete an invitation', async () => {
      const result = await siteInvitationService.delete('inv-1')
      expect(result).toBe(true)
    })
  })
})

// Import even more services - use exported instances for classes not exported
const {
  vendorCreditNoteService,
  creditNoteUsageService,
  VendorRefundService,
  AuthService
} = await import('../../services/pocketbase')

describe('VendorCreditNoteService Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    collections = createCollections()
    setCurrentSiteId('site-1')
    setCurrentUserRole('owner')
  })

  it('should get all credit notes for current site', async () => {
    const notes = await vendorCreditNoteService.getAll()
    expect(notes).toBeDefined()
    expect(Array.isArray(notes)).toBe(true)
  })

  it('should throw error when no site selected', async () => {
    setCurrentSiteId(null)
    await expect(vendorCreditNoteService.getAll()).rejects.toThrow('No site selected')
  })

  it('should get credit notes by vendor', async () => {
    const notes = await vendorCreditNoteService.getByVendor('vendor-1')
    expect(notes).toBeDefined()
    expect(Array.isArray(notes)).toBe(true)
  })

  it('should get credit notes by return', async () => {
    const notes = await vendorCreditNoteService.getByReturn('vr-1')
    expect(notes).toBeDefined()
    expect(Array.isArray(notes)).toBe(true)
  })

  it('should get credit note by ID', async () => {
    const note = await vendorCreditNoteService.getById('cn-1')
    expect(note).toBeDefined()
  })

  it('should return null for non-existent credit note', async () => {
    const note = await vendorCreditNoteService.getById('nonexistent')
    expect(note).toBeNull()
  })

  it('should create a new credit note', async () => {
    const newNote = {
      vendor: 'vendor-1',
      credit_amount: 1000,
      balance: 1000,
      issue_date: '2024-01-15',
      reason: 'Return refund',
      status: 'active' as const
    }
    const result = await vendorCreditNoteService.create(newNote)
    expect(result).toBeDefined()
  })

  it('should reject create when user lacks permission', async () => {
    setCurrentUserRole('accountant')
    const newNote = { vendor: 'vendor-1', credit_amount: 1000, balance: 1000, status: 'active' as const }
    await expect(vendorCreditNoteService.create(newNote)).rejects.toThrow('Permission denied')
  })

  it('should update a credit note', async () => {
    const result = await vendorCreditNoteService.update('cn-1', { status: 'fully_used' })
    expect(result).toBeDefined()
  })

  it('should reject update when user lacks permission', async () => {
    setCurrentUserRole('accountant')
    await expect(vendorCreditNoteService.update('cn-1', { status: 'active' })).rejects.toThrow('Permission denied')
  })

  it('should delete a credit note', async () => {
    const result = await vendorCreditNoteService.delete('cn-1')
    expect(result).toBe(true)
  })

  it('should reject delete when user lacks permission', async () => {
    setCurrentUserRole('supervisor')
    await expect(vendorCreditNoteService.delete('cn-1')).rejects.toThrow('Permission denied')
  })
})

describe('CreditNoteUsageService Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    collections = createCollections()
    setCurrentSiteId('site-1')
    setCurrentUserRole('owner')
  })

  it('should get usage by credit note', async () => {
    const usage = await creditNoteUsageService.getByCreditNote('cn-1')
    expect(usage).toBeDefined()
    expect(Array.isArray(usage)).toBe(true)
  })

  it('should get usage by payment', async () => {
    const usage = await creditNoteUsageService.getByPayment('payment-1')
    expect(usage).toBeDefined()
    expect(Array.isArray(usage)).toBe(true)
  })

  it('should create a new usage record', async () => {
    const newUsage = {
      credit_note: 'cn-1',
      payment: 'payment-1',
      vendor: 'vendor-1',
      used_amount: 500,
      used_date: '2024-01-15'
    }
    const result = await creditNoteUsageService.create(newUsage)
    expect(result).toBeDefined()
  })
})

describe('VendorRefundService Tests', () => {
  let vendorRefundService: InstanceType<typeof VendorRefundService>

  beforeEach(() => {
    vi.clearAllMocks()
    collections = createCollections()
    setCurrentSiteId('site-1')
    setCurrentUserRole('owner')
    vendorRefundService = new VendorRefundService()
  })

  it('should get all refunds for current site', async () => {
    const refunds = await vendorRefundService.getAll()
    expect(refunds).toBeDefined()
    expect(Array.isArray(refunds)).toBe(true)
  })

  it('should throw error when no site selected', async () => {
    setCurrentSiteId(null)
    await expect(vendorRefundService.getAll()).rejects.toThrow('No site selected')
  })

  it('should get refund by ID', async () => {
    const refund = await vendorRefundService.getById('refund-1')
    expect(refund).toBeDefined()
  })

  it('should return null for non-existent refund', async () => {
    const refund = await vendorRefundService.getById('nonexistent')
    expect(refund).toBeNull()
  })

  it('should get refunds by return', async () => {
    const refunds = await vendorRefundService.getByReturn('vr-1')
    expect(refunds).toBeDefined()
    expect(Array.isArray(refunds)).toBe(true)
  })

  it('should reject create when user lacks permission', async () => {
    // VendorRefundService.create has complex dependencies on VendorReturn updates
    // Test that permission check happens first
    setCurrentUserRole('accountant')
    const newRefund = {
      vendor: 'vendor-1',
      return_id: 'vr-1',
      account: 'account-1',
      amount: 500,
      refund_date: '2024-01-15'
    }
    await expect(vendorRefundService.create(newRefund)).rejects.toThrow('Permission denied')
  })
})

describe('AuthService Tests', () => {
  let authService: InstanceType<typeof AuthService>

  beforeEach(() => {
    vi.clearAllMocks()
    collections = createCollections()
    authService = new AuthService()
  })

  it('should get current user when logged in', () => {
    const user = authService.currentUser
    expect(user).toBeDefined()
    expect(user?.id).toBe('user-1')
  })

  it('should check if user is authenticated', () => {
    const isAuthenticated = authService.isAuthenticated
    expect(isAuthenticated).toBe(true)
  })

  it('should logout and clear auth store', () => {
    authService.logout()
    // After logout, site and role should be cleared
    const siteId = getCurrentSiteId()
    const role = getCurrentUserRole()
    expect(siteId === null || siteId === undefined).toBe(true)
    expect(role === null || role === undefined).toBe(true)
  })
})
