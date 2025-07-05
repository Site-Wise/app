import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPocketBase } from '../mocks/pocketbase'

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

// Create extended mock with cross-site data
const createCrossSiteMockPocketBase = () => {
  const mockPb = createMockPocketBase()
  const collections = new Map()
  
  // Site 1 data
  const site1Data = {
    items: [{ id: 'item-site1', name: 'Site 1 Item', site: 'site-1' }],
    vendors: [{ id: 'vendor-site1', name: 'Site 1 Vendor', site: 'site-1' }],
    accounts: [{ id: 'account-site1', name: 'Site 1 Account', site: 'site-1' }],
    services: [{ id: 'service-site1', name: 'Site 1 Service', site: 'site-1' }],
    quotations: [{ id: 'quotation-site1', vendor: 'vendor-site1', site: 'site-1' }],
    payments: [{ id: 'payment-site1', vendor: 'vendor-site1', site: 'site-1' }],
    tags: [{ id: 'tag-site1', name: 'Site 1 Tag', site: 'site-1' }],
    account_transactions: [{ id: 'transaction-site1', account: 'account-site1', site: 'site-1' }],
    service_bookings: [{ id: 'booking-site1', service: 'service-site1', site: 'site-1' }],
    vendor_returns: [{ id: 'return-site1', vendor: 'vendor-site1', site: 'site-1' }],
    vendor_refunds: [{ id: 'refund-site1', vendor: 'vendor-site1', site: 'site-1' }],
    vendor_credit_notes: [{ id: 'credit-site1', vendor: 'vendor-site1', site: 'site-1' }],
    deliveries: [{ id: 'delivery-site1', vendor: 'vendor-site1', site: 'site-1' }]
  }

  // Site 2 data
  const site2Data = {
    items: [{ id: 'item-site2', name: 'Site 2 Item', site: 'site-2' }],
    vendors: [{ id: 'vendor-site2', name: 'Site 2 Vendor', site: 'site-2' }],
    accounts: [{ id: 'account-site2', name: 'Site 2 Account', site: 'site-2' }],
    services: [{ id: 'service-site2', name: 'Site 2 Service', site: 'site-2' }],
    quotations: [{ id: 'quotation-site2', vendor: 'vendor-site2', site: 'site-2' }],
    payments: [{ id: 'payment-site2', vendor: 'vendor-site2', site: 'site-2' }],
    tags: [{ id: 'tag-site2', name: 'Site 2 Tag', site: 'site-2' }],
    account_transactions: [{ id: 'transaction-site2', account: 'account-site2', site: 'site-2' }],
    service_bookings: [{ id: 'booking-site2', service: 'service-site2', site: 'site-2' }],
    vendor_returns: [{ id: 'return-site2', vendor: 'vendor-site2', site: 'site-2' }],
    vendor_refunds: [{ id: 'refund-site2', vendor: 'vendor-site2', site: 'site-2' }],
    vendor_credit_notes: [{ id: 'credit-site2', vendor: 'vendor-site2', site: 'site-2' }],
    deliveries: [{ id: 'delivery-site2', vendor: 'vendor-site2', site: 'site-2' }]
  }

  // Combine all data
  Object.keys(site1Data).forEach(collection => {
    collections.set(collection, [...site1Data[collection], ...site2Data[collection]])
  })

  // Add sites collection (not site-filtered)
  collections.set('sites', [
    { id: 'site-1', name: 'Site 1', admin_user: 'user-1' },
    { id: 'site-2', name: 'Site 2', admin_user: 'user-1' }
  ])

  // Override collection method to handle site filtering
  const originalCollection = mockPb.collection
  mockPb.collection = vi.fn((name: string) => ({
    ...originalCollection(name),
    getFullList: vi.fn().mockImplementation((options: any = {}) => {
      const items = collections.get(name) || []
      
      // Apply site filter
      if (options.filter && options.filter.includes('site=')) {
        const siteMatch = options.filter.match(/site="([^"]+)"/)
        if (siteMatch) {
          const siteId = siteMatch[1]
          return Promise.resolve(items.filter((item: any) => item.site === siteId))
        }
      }
      
      return Promise.resolve(items)
    }),
    getOne: vi.fn().mockImplementation((id: string, options: any = {}) => {
      const items = collections.get(name) || []
      let item = items.find((item: any) => item.id === id)
      
      // Apply site filter for getOne
      if (item && options.filter && options.filter.includes('site=')) {
        const siteMatch = options.filter.match(/site="([^"]+)"/)
        if (siteMatch) {
          const siteId = siteMatch[1]
          if (item.site !== siteId) {
            return Promise.reject(new Error('Not found or access denied'))
          }
        }
      }
      
      if (!item) {
        return Promise.reject(new Error('Not found'))
      }
      
      return Promise.resolve(item)
    }),
    create: vi.fn().mockImplementation((data: any) => {
      const newItem = { ...data, id: `${name}-${Date.now()}` }
      const items = collections.get(name) || []
      items.push(newItem)
      collections.set(name, items)
      return Promise.resolve(newItem)
    })
  }))

  return mockPb
}

// Mock PocketBase
vi.mock('pocketbase', () => ({
  default: vi.fn(() => createCrossSiteMockPocketBase())
}))

describe('Cross-Site Access Prevention Integration Tests', () => {
  let services: any
  
  beforeEach(async () => {
    vi.clearAllMocks()
    Object.keys(localStorageData).forEach(key => delete localStorageData[key])
    
    // Import services after mocking
    services = await import('../../services/pocketbase')
    
    // Set default user role as owner
    services.setCurrentUserRole('owner')
  })

  describe('Site Isolation - getById() Methods', () => {
    beforeEach(() => {
      // Set current site to site-1
      services.setCurrentSiteId('site-1')
    })

    it('should allow access to records from current site', async () => {
      const itemService = new services.ItemService()
      const vendorService = new services.VendorService()
      const accountService = new services.AccountService()
      
      // Should be able to access site-1 records
      const item = await itemService.getById('item-site1')
      const vendor = await vendorService.getById('vendor-site1')
      const account = await accountService.getById('account-site1')
      
      expect(item).toBeTruthy()
      expect(item?.site).toBe('site-1')
      expect(vendor).toBeTruthy()
      expect(vendor?.site).toBe('site-1')
      expect(account).toBeTruthy()
      expect(account?.site).toBe('site-1')
    })

    it('should deny access to records from other sites', async () => {
      const itemService = new services.ItemService()
      const vendorService = new services.VendorService()
      const accountService = new services.AccountService()
      
      // Should NOT be able to access site-2 records
      const item = await itemService.getById('item-site2')
      const vendor = await vendorService.getById('vendor-site2')
      const account = await accountService.getById('account-site2')
      
      expect(item).toBeNull()
      expect(vendor).toBeNull()
      expect(account).toBeNull()
    })

    it('should test all services with getById() methods', async () => {
      // Test each service individually
      const itemService = new services.ItemService()
      const vendorService = new services.VendorService()
      const accountService = new services.AccountService()
      const serviceService = new services.ServiceService()
      const quotationService = new services.QuotationService()
      const paymentService = new services.PaymentService()
      const tagService = new services.TagService()
      const transactionService = new services.AccountTransactionService()
      const bookingService = new services.ServiceBookingService()
      const returnService = new services.VendorReturnService()
      const refundService = new services.VendorRefundService()
      const creditService = services.vendorCreditNoteService // This is an instance, not a class
      const deliveryService = new services.DeliveryService()

      // All should return null for cross-site access (except DeliveryService which throws)
      expect(await itemService.getById('item-site2')).toBeNull()
      expect(await vendorService.getById('vendor-site2')).toBeNull()
      expect(await accountService.getById('account-site2')).toBeNull()
      expect(await serviceService.getById('service-site2')).toBeNull()
      expect(await quotationService.getById('quotation-site2')).toBeNull()
      expect(await paymentService.getById('payment-site2')).toBeNull()
      expect(await tagService.getById('tag-site2')).toBeNull()
      expect(await transactionService.getById('transaction-site2')).toBeNull()
      expect(await bookingService.getById('booking-site2')).toBeNull()
      expect(await returnService.getById('return-site2')).toBeNull()
      expect(await refundService.getById('refund-site2')).toBeNull()
      expect(await creditService.getById('credit-site2')).toBeNull()
      
      // DeliveryService throws error instead of returning null
      await expect(deliveryService.getById('delivery-site2')).rejects.toThrow()
    })
  })

  describe('Site Isolation - getAll() Methods', () => {
    it('should only return records from current site', async () => {
      // Test with site-1
      services.setCurrentSiteId('site-1')
      
      const itemService = new services.ItemService()
      const vendorService = new services.VendorService()
      
      const site1Items = await itemService.getAll()
      const site1Vendors = await vendorService.getAll()
      
      expect(site1Items).toHaveLength(1)
      expect(site1Items[0].site).toBe('site-1')
      expect(site1Vendors).toHaveLength(1)
      expect(site1Vendors[0].site).toBe('site-1')
      
      // Switch to site-2
      services.setCurrentSiteId('site-2')
      
      const site2Items = await itemService.getAll()
      const site2Vendors = await vendorService.getAll()
      
      expect(site2Items).toHaveLength(1)
      expect(site2Items[0].site).toBe('site-2')
      expect(site2Vendors).toHaveLength(1)
      expect(site2Vendors[0].site).toBe('site-2')
    })
  })

  describe('Site Assignment - create() Methods', () => {
    beforeEach(() => {
      services.setCurrentSiteId('site-1')
    })

    it('should automatically assign current site to new records', async () => {
      const itemService = new services.ItemService()
      const vendorService = new services.VendorService()
      
      const newItem = await itemService.create({
        name: 'New Item',
        description: 'Test item',
        unit: 'piece',
        tags: []
      })
      
      const newVendor = await vendorService.create({
        name: 'New Vendor',
        contact_person: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Test St',
        tags: []
      })
      
      expect(newItem.site).toBe('site-1')
      expect(newVendor.site).toBe('site-1')
    })

    it('should throw error when no site is selected', async () => {
      services.setCurrentSiteId(null)
      
      const itemService = new services.ItemService()
      
      await expect(itemService.create({
        name: 'New Item',
        description: 'Test item',
        unit: 'piece',
        tags: []
      })).rejects.toThrow('No site selected')
    })
  })

  describe('Role-Based Access Control', () => {
    beforeEach(() => {
      services.setCurrentSiteId('site-1')
    })

    it('should allow owner full access', async () => {
      services.setCurrentUserRole('owner')
      
      const itemService = new services.ItemService()
      
      // Should be able to create
      await expect(itemService.create({
        name: 'Owner Item',
        description: 'Test item',
        unit: 'piece',
        tags: []
      })).resolves.toBeTruthy()
      
      // Should be able to update (tested indirectly through permissions)
      const permissions = services.calculatePermissions('owner')
      expect(permissions.canCreate).toBe(true)
      expect(permissions.canUpdate).toBe(true)
      expect(permissions.canDelete).toBe(true)
    })

    it('should restrict supervisor permissions', async () => {
      services.setCurrentUserRole('supervisor')
      
      const permissions = services.calculatePermissions('supervisor')
      expect(permissions.canCreate).toBe(true)
      expect(permissions.canUpdate).toBe(true)
      expect(permissions.canDelete).toBe(false) // Cannot delete
      expect(permissions.canManageUsers).toBe(false)
    })

    it('should restrict accountant to read-only', async () => {
      services.setCurrentUserRole('accountant')
      
      const itemService = new services.ItemService()
      
      // Should NOT be able to create
      await expect(itemService.create({
        name: 'Accountant Item',
        description: 'Test item',
        unit: 'piece',
        tags: []
      })).rejects.toThrow('Permission denied: Cannot create items')
      
      const permissions = services.calculatePermissions('accountant')
      expect(permissions.canCreate).toBe(false)
      expect(permissions.canUpdate).toBe(false)
      expect(permissions.canDelete).toBe(false)
      expect(permissions.canRead).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing site ID for getById', async () => {
      services.setCurrentSiteId(null)
      
      const itemService = new services.ItemService()
      
      await expect(itemService.getById('item-site1')).rejects.toThrow('No site selected')
    })

    it('should handle missing site ID for getAll', async () => {
      services.setCurrentSiteId(null)
      
      const itemService = new services.ItemService()
      
      await expect(itemService.getAll()).rejects.toThrow('No site selected')
    })

    it('should handle invalid site IDs', async () => {
      services.setCurrentSiteId('invalid-site')
      
      const itemService = new services.ItemService()
      
      const items = await itemService.getAll()
      expect(items).toHaveLength(0)
      
      const item = await itemService.getById('item-site1')
      expect(item).toBeNull()
    })
  })

  describe('Services That Should Work Across Sites', () => {
    it('should allow SiteService to work without site context', async () => {
      services.setCurrentSiteId(null)
      
      const siteService = new services.SiteService()
      
      // SiteService should work without current site (manages sites themselves)
      await expect(siteService.getById('site-1')).resolves.toBeTruthy()
    })

    it('should allow AuthService to work without site context', async () => {
      services.setCurrentSiteId(null)
      
      const authService = new services.AuthService()
      
      // AuthService should work without current site (user authentication)
      expect(authService.isAuthenticated).toBeDefined()
      expect(authService.currentUser).toBeTruthy()
    })
  })
})