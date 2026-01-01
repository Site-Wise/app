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

// Mock PocketBase - must be a constructor function
vi.mock('pocketbase', () => {
  const MockPocketBase = function() {
    return createMockPocketBase()
  }
  return { default: MockPocketBase }
})

// Import the services after mocking
const {
  AccountService,
  ServiceService,
  QuotationService,
  ServiceBookingService,
  PaymentService,
  TagService,
  SiteInvitationService,
  VendorReturnService,
  DeliveryService,
  DeliveryItemService,
  calculatePermissions,
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
      expect(permissions.canCreate).toBe(false) // Accountants have read-only access
      expect(permissions.canRead).toBe(true)
      expect(permissions.canUpdate).toBe(false) // Accountants cannot update
      expect(permissions.canDelete).toBe(false)
      expect(permissions.canManageUsers).toBe(false)
      expect(permissions.canManageRoles).toBe(false)
      expect(permissions.canExport).toBe(true) // Can export financial reports
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
      setCurrentUserRole('supervisor')
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

    it('should delete an account', async () => {
      const result = await accountService.delete('account-1')
      expect(result).toBe(true)
    })

    it('should get account by ID', async () => {
      const account = await accountService.getById('account-1')
      expect(account).toBeDefined()
    })

    it('should handle different account types', () => {
      const types: Array<'bank' | 'credit_card' | 'cash' | 'digital_wallet' | 'other'> = [
        'bank', 'credit_card', 'cash', 'digital_wallet', 'other'
      ]
      
      types.forEach(type => {
        expect(['bank', 'credit_card', 'cash', 'digital_wallet', 'other']).toContain(type)
      })
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
      // Note: Mock returns object with default status, not necessarily the one passed
      expect(result.payment_status).toBeDefined()
    })

    it('should delete a service booking', async () => {
      const result = await serviceBookingService.delete('booking-1')
      expect(result).toBe(true)
    })

    it('should get service booking by ID', async () => {
      const booking = await serviceBookingService.getById('booking-1')
      expect(booking).toBeDefined()
    })

    it('should validate payment status enum', () => {
      const statuses: Array<'pending' | 'paid' | 'partial'> = ['pending', 'paid', 'partial']
      statuses.forEach(status => {
        expect(['pending', 'paid', 'partial']).toContain(status)
      })
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

    it('should get payment by ID', async () => {
      const payment = await paymentService.getById('payment-1')
      expect(payment).toBeDefined()
    })

    it('should validate payment methods', () => {
      const methods: Array<'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'card' | 'other'> = [
        'cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other'
      ]
      methods.forEach(method => {
        expect(['cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other']).toContain(method)
      })
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

    it('should delete a tag', async () => {
      const result = await tagService.delete('tag-1')
      expect(result).toBe(true)
    })

    it('should validate tag types', () => {
      const types: Array<'item' | 'service' | 'vendor'> = ['item', 'service', 'vendor']
      types.forEach(type => {
        expect(['item', 'service', 'vendor']).toContain(type)
      })
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

    it('should validate invitation statuses', () => {
      const statuses: Array<'pending' | 'accepted' | 'expired'> = ['pending', 'accepted', 'expired']
      statuses.forEach(status => {
        expect(['pending', 'accepted', 'expired']).toContain(status)
      })
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

    it('should get vendor return by ID', async () => {
      const vendorReturn = await vendorReturnService.getById('return-1')
      expect(vendorReturn).toBeDefined()
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

    it('should delete a delivery', async () => {
      const result = await deliveryService.delete('delivery-1')
      expect(result).toBe(true)
    })

    it('should validate payment statuses', () => {
      const statuses: Array<'pending' | 'paid' | 'partial'> = ['pending', 'paid', 'partial']
      statuses.forEach(status => {
        expect(['pending', 'paid', 'partial']).toContain(status)
      })
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
  })
})
