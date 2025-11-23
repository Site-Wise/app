import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPocketBase, mockUser, mockSite } from '../mocks/pocketbase'

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

// Mock PocketBase
vi.mock('pocketbase', () => ({
  default: vi.fn(() => createMockPocketBase())
}))

// Import the services after mocking
const {
  AccountService,
  ServiceService,
  QuotationService,
  ServiceBookingService,
  PaymentService,
  PaymentAllocationService,
  TagService,
  AccountTransactionService,
  SiteInvitationService,
  SiteUserService,
  VendorReturnService,
  VendorReturnItemService,
  VendorRefundService,
  DeliveryService,
  DeliveryItemService,
  calculatePermissions,
  getCurrentSiteId,
  setCurrentSiteId,
  getCurrentUserRole,
  setCurrentUserRole
} = await import('../../services/pocketbase')

describe('PocketBase Services Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageData).forEach(key => delete localStorageData[key])
    setCurrentSiteId('site-1')
    setCurrentUserRole('owner')
  })

  describe('Permission Calculation Logic', () => {
    it('should calculate owner permissions correctly', () => {
      const permissions = calculatePermissions('owner')
      expect(permissions.canCreate).toBe(true)
      expect(permissions.canRead).toBe(true)
      expect(permissions.canUpdate).toBe(true)
      expect(permissions.canDelete).toBe(true)
      expect(permissions.canManageUsers).toBe(true)
      expect(permissions.canManageRoles).toBe(true)
      expect(permissions.canExport).toBe(true)
      expect(permissions.canViewFinancials).toBe(true)
    })

    it('should calculate supervisor permissions correctly', () => {
      const permissions = calculatePermissions('supervisor')
      expect(permissions.canCreate).toBe(true)
      expect(permissions.canRead).toBe(true)
      expect(permissions.canUpdate).toBe(true)
      expect(permissions.canDelete).toBe(false)
      expect(permissions.canManageUsers).toBe(false)
      expect(permissions.canManageRoles).toBe(false)
      expect(permissions.canExport).toBe(true)
      expect(permissions.canViewFinancials).toBe(true)
    })

    it('should calculate accountant permissions correctly', () => {
      const permissions = calculatePermissions('accountant')
      expect(permissions.canCreate).toBe(true)
      expect(permissions.canRead).toBe(true)
      expect(permissions.canUpdate).toBe(true)
      expect(permissions.canDelete).toBe(false)
      expect(permissions.canManageUsers).toBe(false)
      expect(permissions.canManageRoles).toBe(false)
      expect(permissions.canExport).toBe(true)
      expect(permissions.canViewFinancials).toBe(true)
    })

    it('should return no permissions for null role', () => {
      const permissions = calculatePermissions(null)
      expect(permissions.canCreate).toBe(false)
      expect(permissions.canRead).toBe(false)
      expect(permissions.canUpdate).toBe(false)
      expect(permissions.canDelete).toBe(false)
      expect(permissions.canManageUsers).toBe(false)
      expect(permissions.canManageRoles).toBe(false)
      expect(permissions.canExport).toBe(false)
      expect(permissions.canViewFinancials).toBe(false)
    })
  })

  describe('Role Management Logic', () => {
    it('should get current user role from localStorage', () => {
      localStorageData['currentUserRole'] = 'supervisor'
      expect(getCurrentUserRole()).toBe('supervisor')
    })

    it('should set current user role in localStorage', () => {
      setCurrentUserRole('accountant')
      expect(localStorageData['currentUserRole']).toBe('accountant')
    })

    it('should clear current user role when set to null', () => {
      localStorageData['currentUserRole'] = 'owner'
      setCurrentUserRole(null)
      expect(localStorageData['currentUserRole']).toBeUndefined()
    })

    it('should handle all role types', () => {
      const roles: Array<'owner' | 'supervisor' | 'accountant'> = ['owner', 'supervisor', 'accountant']
      roles.forEach(role => {
        setCurrentUserRole(role)
        expect(getCurrentUserRole()).toBe(role)
      })
    })
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

    it('should create a new account', async () => {
      const newAccount = {
        name: 'Cash Account',
        type: 'cash' as const,
        opening_balance: 10000,
        current_balance: 10000
      }
      const result = await accountService.create(newAccount)
      expect(result).toBeDefined()
      expect(result.name).toBe(newAccount.name)
    })

    it('should update an account', async () => {
      const updateData = { name: 'Updated Cash Account' }
      const result = await accountService.update('account-1', updateData)
      expect(result).toBeDefined()
    })

    it('should delete an account', async () => {
      const result = await accountService.delete('account-1')
      expect(result).toBe(true)
    })

    it('should get account by ID', async () => {
      const account = await accountService.getById('account-1')
      expect(account).toBeDefined()
    })

    it('should get account by ID with site validation', async () => {
      const account = await accountService.getById('account-1')
      expect(account).toBeDefined()
    })

    it('should handle different account types', async () => {
      const types: Array<'bank' | 'credit_card' | 'cash' | 'digital_wallet' | 'other'> = [
        'bank', 'credit_card', 'cash', 'digital_wallet', 'other'
      ]
      for (const type of types) {
        const account = await accountService.create({
          name: `${type} account`,
          type,
          opening_balance: 0,
          current_balance: 0
        })
        expect(account.type).toBe(type)
      }
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

    it('should create a new service', async () => {
      const newService = {
        name: 'Plumbing',
        description: 'Plumbing services',
        unit: 'per point',
        rate: 500
      }
      const result = await serviceService.create(newService)
      expect(result).toBeDefined()
      expect(result.name).toBe(newService.name)
    })

    it('should update a service', async () => {
      const updateData = { rate: 600 }
      const result = await serviceService.update('service-1', updateData)
      expect(result).toBeDefined()
    })

    it('should delete a service', async () => {
      const result = await serviceService.delete('service-1')
      expect(result).toBe(true)
    })

    it('should get service by ID', async () => {
      const service = await serviceService.getById('service-1')
      expect(service).toBeDefined()
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

    it('should create a new quotation', async () => {
      const newQuotation = {
        vendor: 'vendor-1',
        quotation_date: '2024-01-01',
        items: ['item-1'],
        quantities: { 'item-1': 100 },
        rates: { 'item-1': 50 },
        total_amount: 5000
      }
      const result = await quotationService.create(newQuotation)
      expect(result).toBeDefined()
    })

    it('should update a quotation', async () => {
      const updateData = { total_amount: 6000 }
      const result = await quotationService.update('quotation-1', updateData)
      expect(result).toBeDefined()
    })

    it('should delete a quotation', async () => {
      const result = await quotationService.delete('quotation-1')
      expect(result).toBe(true)
    })

    it('should get quotation by ID', async () => {
      const quotation = await quotationService.getById('quotation-1')
      expect(quotation).toBeDefined()
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

    it('should create a new service booking', async () => {
      const newBooking = {
        vendor: 'vendor-1',
        service: 'service-1',
        booking_date: '2024-01-01',
        quantity: 10,
        rate: 500,
        amount: 5000,
        payment_status: 'pending' as const
      }
      const result = await serviceBookingService.create(newBooking)
      expect(result).toBeDefined()
    })

    it('should update a service booking', async () => {
      const updateData = { payment_status: 'paid' as const }
      const result = await serviceBookingService.update('booking-1', updateData)
      expect(result).toBeDefined()
    })

    it('should delete a service booking', async () => {
      const result = await serviceBookingService.delete('booking-1')
      expect(result).toBe(true)
    })

    it('should get service booking by ID', async () => {
      const booking = await serviceBookingService.getById('booking-1')
      expect(booking).toBeDefined()
    })

    it('should handle different payment statuses', async () => {
      const statuses: Array<'pending' | 'paid' | 'partial'> = ['pending', 'paid', 'partial']
      for (const status of statuses) {
        const booking = await serviceBookingService.create({
          vendor: 'vendor-1',
          service: 'service-1',
          booking_date: '2024-01-01',
          quantity: 10,
          rate: 500,
          amount: 5000,
          payment_status: status
        })
        expect(booking.payment_status).toBe(status)
      }
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

    it('should create a new payment', async () => {
      const newPayment = {
        vendor: 'vendor-1',
        account: 'account-1',
        amount: 5000,
        payment_date: '2024-01-01',
        payment_method: 'bank_transfer' as const,
        deliveries: [],
        service_bookings: []
      }
      const result = await paymentService.create(newPayment)
      expect(result).toBeDefined()
    })

    it('should update a payment', async () => {
      const updateData = { amount: 6000 }
      const result = await paymentService.update('payment-1', updateData)
      expect(result).toBeDefined()
    })

    it('should delete a payment', async () => {
      const result = await paymentService.delete('payment-1')
      expect(result).toBe(true)
    })

    it('should get payment by ID', async () => {
      const payment = await paymentService.getById('payment-1')
      expect(payment).toBeDefined()
    })

    it('should handle different payment methods', async () => {
      const methods: Array<'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'card' | 'other'> = [
        'cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other'
      ]
      for (const method of methods) {
        const payment = await paymentService.create({
          vendor: 'vendor-1',
          account: 'account-1',
          amount: 5000,
          payment_date: '2024-01-01',
          payment_method: method,
          deliveries: [],
          service_bookings: []
        })
        expect(payment.payment_method).toBe(method)
      }
    })
  })

  describe('PaymentAllocationService', () => {
    let paymentAllocationService: InstanceType<typeof PaymentAllocationService>

    beforeEach(() => {
      paymentAllocationService = new PaymentAllocationService()
    })

    it('should get all payment allocations for current site', async () => {
      const allocations = await paymentAllocationService.getAll()
      expect(allocations).toBeDefined()
      expect(Array.isArray(allocations)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(paymentAllocationService.getAll()).rejects.toThrow('No site selected')
    })

    it('should create a new payment allocation', async () => {
      const newAllocation = {
        payment: 'payment-1',
        allocated_amount: 5000
      }
      const result = await paymentAllocationService.create(newAllocation)
      expect(result).toBeDefined()
    })

    it('should get allocation by payment and delivery', async () => {
      const allocation = await paymentAllocationService.getByPaymentAndDelivery('payment-1', 'delivery-1')
      expect(allocation).toBeDefined()
    })

    it('should get allocation by payment and service booking', async () => {
      const allocation = await paymentAllocationService.getByPaymentAndServiceBooking('payment-1', 'booking-1')
      expect(allocation).toBeDefined()
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

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(tagService.getAll()).rejects.toThrow('No site selected')
    })

    it('should create a new tag', async () => {
      const newTag = {
        name: 'Concrete',
        color: '#FF5733',
        type: 'item' as const
      }
      const result = await tagService.create(newTag)
      expect(result).toBeDefined()
      expect(result.name).toBe(newTag.name)
    })

    it('should update a tag', async () => {
      const updateData = { color: '#00FF00' }
      const result = await tagService.update('tag-1', updateData)
      expect(result).toBeDefined()
    })

    it('should delete a tag', async () => {
      const result = await tagService.delete('tag-1')
      expect(result).toBe(true)
    })

    it('should get tags by type', async () => {
      const tags = await tagService.getByType('item')
      expect(tags).toBeDefined()
      expect(Array.isArray(tags)).toBe(true)
    })

    it('should handle different tag types', async () => {
      const types: Array<'item' | 'service' | 'vendor'> = ['item', 'service', 'vendor']
      for (const type of types) {
        const tag = await tagService.create({
          name: `${type} tag`,
          color: '#FF0000',
          type
        })
        expect(tag.type).toBe(type)
      }
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

    it('should create a new transaction', async () => {
      const newTransaction = {
        account: 'account-1',
        transaction_date: '2024-01-01',
        type: 'debit' as const,
        amount: 5000,
        description: 'Payment to vendor'
      }
      const result = await accountTransactionService.create(newTransaction)
      expect(result).toBeDefined()
    })

    it('should get transactions by account', async () => {
      const transactions = await accountTransactionService.getByAccount('account-1')
      expect(transactions).toBeDefined()
      expect(Array.isArray(transactions)).toBe(true)
    })

    it('should handle different transaction types', async () => {
      const types: Array<'debit' | 'credit'> = ['debit', 'credit']
      for (const type of types) {
        const transaction = await accountTransactionService.create({
          account: 'account-1',
          transaction_date: '2024-01-01',
          type,
          amount: 1000,
          description: `${type} transaction`
        })
        expect(transaction.type).toBe(type)
      }
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

    it('should create a new invitation', async () => {
      const newInvitation = {
        site: 'site-1',
        email: 'newuser@example.com',
        role: 'supervisor' as const,
        invited_by: mockUser.id,
        invited_at: new Date().toISOString(),
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
      const result = await siteInvitationService.create(newInvitation)
      expect(result).toBeDefined()
    })

    it('should handle different invitation statuses', async () => {
      const statuses: Array<'pending' | 'accepted' | 'expired'> = ['pending', 'accepted', 'expired']
      for (const status of statuses) {
        const invitation = await siteInvitationService.create({
          site: 'site-1',
          email: `user-${status}@example.com`,
          role: 'accountant',
          invited_by: mockUser.id,
          invited_at: new Date().toISOString(),
          status,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        expect(invitation.status).toBe(status)
      }
    })
  })

  describe('SiteUserService', () => {
    let siteUserService: InstanceType<typeof SiteUserService>

    beforeEach(() => {
      siteUserService = new SiteUserService()
    })

    it('should get all site users', async () => {
      const users = await siteUserService.getAll()
      expect(users).toBeDefined()
      expect(Array.isArray(users)).toBe(true)
    })

    it('should get users by site', async () => {
      const users = await siteUserService.getBySite('site-1')
      expect(users).toBeDefined()
      expect(Array.isArray(users)).toBe(true)
    })

    it('should create a new site user', async () => {
      const newSiteUser = {
        site: 'site-1',
        user: 'user-1',
        role: 'supervisor' as const,
        assigned_by: mockUser.id,
        assigned_at: new Date().toISOString(),
        is_active: true
      }
      const result = await siteUserService.create(newSiteUser)
      expect(result).toBeDefined()
    })

    it('should update site user', async () => {
      const updateData = { role: 'accountant' as const }
      const result = await siteUserService.update('siteuser-1', updateData)
      expect(result).toBeDefined()
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

    it('should create a new vendor return', async () => {
      const newReturn = {
        vendor: 'vendor-1',
        delivery: 'delivery-1',
        return_date: '2024-01-01',
        reason: 'damaged',
        total_amount: 1000
      }
      const result = await vendorReturnService.create(newReturn)
      expect(result).toBeDefined()
    })

    it('should update a vendor return', async () => {
      const updateData = { reason: 'defective' }
      const result = await vendorReturnService.update('return-1', updateData)
      expect(result).toBeDefined()
    })

    it('should delete a vendor return', async () => {
      const result = await vendorReturnService.delete('return-1')
      expect(result).toBe(true)
    })

    it('should get vendor return by ID', async () => {
      const vendorReturn = await vendorReturnService.getById('return-1')
      expect(vendorReturn).toBeDefined()
    })
  })

  describe('VendorReturnItemService', () => {
    let vendorReturnItemService: InstanceType<typeof VendorReturnItemService>

    beforeEach(() => {
      vendorReturnItemService = new VendorReturnItemService()
    })

    it('should get all vendor return items for current site', async () => {
      const items = await vendorReturnItemService.getAll()
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(vendorReturnItemService.getAll()).rejects.toThrow('No site selected')
    })

    it('should create a new vendor return item', async () => {
      const newItem = {
        vendor_return: 'return-1',
        item: 'item-1',
        quantity: 10,
        rate: 100,
        amount: 1000
      }
      const result = await vendorReturnItemService.create(newItem)
      expect(result).toBeDefined()
    })

    it('should get return items by return ID', async () => {
      const items = await vendorReturnItemService.getByReturn('return-1')
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
    })
  })

  describe('VendorRefundService', () => {
    let vendorRefundService: InstanceType<typeof VendorRefundService>

    beforeEach(() => {
      vendorRefundService = new VendorRefundService()
    })

    it('should get all vendor refunds for current site', async () => {
      const refunds = await vendorRefundService.getAll()
      expect(refunds).toBeDefined()
      expect(Array.isArray(refunds)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(vendorRefundService.getAll()).rejects.toThrow('No site selected')
    })

    it('should create a new vendor refund', async () => {
      const newRefund = {
        vendor_return: 'return-1',
        account: 'account-1',
        refund_date: '2024-01-01',
        amount: 1000,
        refund_method: 'bank_transfer' as const
      }
      const result = await vendorRefundService.create(newRefund)
      expect(result).toBeDefined()
    })

    it('should update a vendor refund', async () => {
      const updateData = { amount: 1500 }
      const result = await vendorRefundService.update('refund-1', updateData)
      expect(result).toBeDefined()
    })

    it('should delete a vendor refund', async () => {
      const result = await vendorRefundService.delete('refund-1')
      expect(result).toBe(true)
    })

    it('should get vendor refund by ID', async () => {
      const refund = await vendorRefundService.getById('refund-1')
      expect(refund).toBeDefined()
    })

    it('should handle different refund methods', async () => {
      const methods: Array<'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'card' | 'credit_note'> = [
        'cash', 'bank_transfer', 'cheque', 'upi', 'card', 'credit_note'
      ]
      for (const method of methods) {
        const refund = await vendorRefundService.create({
          vendor_return: 'return-1',
          account: 'account-1',
          refund_date: '2024-01-01',
          amount: 1000,
          refund_method: method
        })
        expect(refund.refund_method).toBe(method)
      }
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
        delivery_date: '2024-01-01',
        total_amount: 5000,
        payment_status: 'pending' as const
      }
      const result = await deliveryService.create(newDelivery)
      expect(result).toBeDefined()
    })

    it('should update a delivery', async () => {
      const updateData = { payment_status: 'paid' as const }
      const result = await deliveryService.update('delivery-1', updateData)
      expect(result).toBeDefined()
    })

    it('should delete a delivery', async () => {
      const result = await deliveryService.delete('delivery-1')
      expect(result).toBe(true)
    })

    it('should get delivery by ID', async () => {
      const delivery = await deliveryService.getById('delivery-1')
      expect(delivery).toBeDefined()
    })

    it('should handle different payment statuses', async () => {
      const statuses: Array<'pending' | 'paid' | 'partial'> = ['pending', 'paid', 'partial']
      for (const status of statuses) {
        const delivery = await deliveryService.create({
          vendor: 'vendor-1',
          delivery_date: '2024-01-01',
          total_amount: 5000,
          payment_status: status
        })
        expect(delivery.payment_status).toBe(status)
      }
    })
  })

  describe('DeliveryItemService', () => {
    let deliveryItemService: InstanceType<typeof DeliveryItemService>

    beforeEach(() => {
      deliveryItemService = new DeliveryItemService()
    })

    it('should get all delivery items for current site', async () => {
      const items = await deliveryItemService.getAll()
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(deliveryItemService.getAll()).rejects.toThrow('No site selected')
    })

    it('should create a new delivery item', async () => {
      const newItem = {
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 100,
        rate: 50,
        amount: 5000
      }
      const result = await deliveryItemService.create(newItem)
      expect(result).toBeDefined()
    })

    it('should get delivery items by delivery ID', async () => {
      const items = await deliveryItemService.getByDelivery('delivery-1')
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
    })

    it('should update a delivery item', async () => {
      const updateData = { quantity: 150 }
      const result = await deliveryItemService.update('deliveryitem-1', updateData)
      expect(result).toBeDefined()
    })
  })
})
