import { vi } from 'vitest'
import type { User, Site, Item, Vendor, Quotation, IncomingItem, Payment, ServiceBooking, SiteUser, SiteInvitation } from '../../services/pocketbase'

export const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  sites: ['site-1'],
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockSite: Site = {
  id: 'site-1',
  name: 'Test Construction Site',
  description: 'A test construction site',
  total_units: 100,
  total_planned_area: 50000,
  admin_user: 'user-1',
  users: ['user-1'],
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockItem: Item = {
  id: 'item-1',
  name: 'Steel Rebar',
  description: 'High-grade steel rebar',
  unit: 'kg',
  tags: ['tag-1', 'tag-2'],
  site: 'site-1',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockVendor: Vendor = {
  id: 'vendor-1',
  name: 'Steel Suppliers Inc',
  contact_person: 'John Doe',
  email: 'john@steelsuppliers.com',
  phone: '+1234567890',
  address: '123 Steel Street',
  tags: ['Steel', 'Metal'],
  site: 'site-1',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockQuotation: Quotation = {
  id: 'quotation-1',
  vendor: 'vendor-1',
  item: 'item-1',
  service: '',
  quotation_type: 'item',
  unit_price: 50,
  minimum_quantity: 100,
  valid_until: '2024-12-31',
  notes: 'Bulk discount available',
  status: 'pending',
  site: 'site-1',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockIncomingItem: IncomingItem = {
  id: 'incoming-1',
  item: 'item-1',
  vendor: 'vendor-1',
  quantity: 500,
  unit_price: 45,
  total_amount: 22500,
  delivery_date: '2024-01-15',
  photos: [],
  notes: 'Delivered on time',
  payment_status: 'pending',
  paid_amount: 0,
  site: 'site-1',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockServiceBooking: ServiceBooking = {
  id: 'booking-1',
  service: 'service-1',
  start_date: '2024-01-15',
  end_date: '2024-02-15',
  vendor: 'vendor-1',
  duration: 20,
  unit_rate: 45,
  total_amount: 22500,
  status: 'scheduled',
  completion_photos: [],
  notes: 'Delivered on time',
  payment_status: 'pending',
  paid_amount: 0,
  site: 'site-1',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockPayment: Payment = {
  id: 'payment-1',
  vendor: 'vendor-1',
  amount: 10000,
  account: 'account-1',
  payment_date: '2024-01-20',
  reference: 'CHK-001',
  notes: 'Partial payment',
  incoming_items: ['incoming-1'],
  service_bookings: ['booking-1'],
  site: 'site-1',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockSiteUser: SiteUser = {
  id: 'site-user-1',
  site: 'site-1',
  user: 'user-1',
  role: 'owner',
  assigned_by: 'user-1',
  assigned_at: '2024-01-01T00:00:00Z',
  is_active: true,
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockSiteInvitation: SiteInvitation = {
  id: 'invitation-1',
  site: 'site-1',
  email: 'invite@example.com',
  role: 'supervisor',
  invited_by: 'user-1',
  invited_at: '2024-01-01T00:00:00Z',
  status: 'pending',
  expires_at: '2024-01-08T00:00:00Z',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const createMockPocketBase = () => {
  const collections = new Map()
  
  // Initialize with mock data
  collections.set('users', [mockUser])
  collections.set('sites', [mockSite])
  collections.set('items', [mockItem])
  collections.set('vendors', [mockVendor])
  collections.set('quotations', [mockQuotation])
  collections.set('incoming_items', [mockIncomingItem])
  collections.set('payments', [mockPayment])
  collections.set('site_users', [mockSiteUser])
  collections.set('site_invitations', [mockSiteInvitation])
  collections.set('subscription_plans', [
    { id: 'plan-1', name: 'Free', is_active: true, features: { max_items: 1, max_vendors: 1, max_incoming_deliveries: 5, max_service_bookings: 5, max_payments: 5, max_sites: 1 }, price: 0, currency: 'INR' },
    { id: 'plan-2', name: 'Pro', is_active: true, features: { max_items: -1, max_vendors: -1, max_incoming_deliveries: -1, max_service_bookings: -1, max_payments: -1, max_sites: 3 }, price: 29.99, currency: 'INR' }
  ])
  collections.set('subscriptions', [])
  collections.set('site_subscriptions', [])
  collections.set('subscription_usage', [])
  
  return {
    authStore: {
      isValid: true,
      model: mockUser,
      record: mockUser,
      clear: vi.fn(),
    },
    collection: vi.fn((name: string) => ({
      getFullList: vi.fn().mockImplementation((options: any = {}) => {
        const items = collections.get(name) || []
        
        // Handle expansion for site_users collection
        if (name === 'site_users' && options.expand === 'site') {
          return Promise.resolve(items.map((siteUser: any) => ({
            ...siteUser,
            expand: {
              site: mockSite
            }
          })))
        }
        
        return Promise.resolve(items)
      }),
      getOne: vi.fn().mockImplementation((id: string) => {
        const items = collections.get(name) || []
        const item = items.find((item: any) => item.id === id)
        return Promise.resolve(item)
      }),
      create: vi.fn().mockImplementation((data: any) => {
        const newItem = { ...data, id: `${name}-${Date.now()}` }
        const items = collections.get(name) || []
        items.push(newItem)
        collections.set(name, items)
        return Promise.resolve(newItem)
      }),
      update: vi.fn().mockImplementation((id: string, data: any) => {
        const items = collections.get(name) || []
        const index = items.findIndex((item: any) => item.id === id)
        if (index !== -1) {
          items[index] = { ...items[index], ...data }
          collections.set(name, items)
          return Promise.resolve(items[index])
        }
        throw new Error('Item not found')
      }),
      delete: vi.fn().mockImplementation((id: string) => {
        const items = collections.get(name) || []
        const filteredItems = items.filter((item: any) => item.id !== id)
        collections.set(name, filteredItems)
        return Promise.resolve(true)
      }),
      getFirstListItem: vi.fn().mockImplementation((filter: string, _options?: any) => {
        const items = collections.get(name) || []
        // Simple filter parsing for testing
        if (filter.includes('name="Free"') || filter.includes("name='Free'")) {
          const freePlan = items.find((item: any) => item.name === 'Free')
          return Promise.resolve(freePlan)
        }
        if (filter.includes('is_active=true') && name === 'subscription_plans') {
          const activePlan = items.find((item: any) => item.is_active === true)
          return Promise.resolve(activePlan)
        }
        // Return null for site_subscriptions and subscription_usage by default (no subscription exists)
        if (name === 'site_subscriptions' || name === 'subscription_usage') {
          return Promise.resolve(null)
        }
        return Promise.resolve(items[0] || null)
      }),
      authWithPassword: vi.fn().mockResolvedValue({
        record: mockUser,
        token: 'mock-token'
      }),
    })),
    autoCancellation: vi.fn(),
    baseUrl: 'http://localhost:8090'
  }
}

// Mock service instances
export const mockAuthService = {
  currentUser: mockUser,
  isAuthenticated: true,
  login: vi.fn().mockResolvedValue({ record: mockUser, token: 'mock-token' }),
  register: vi.fn().mockResolvedValue(mockUser),
  logout: vi.fn(),
  getCurrentUserWithRoles: vi.fn().mockResolvedValue({
    ...mockUser,
    siteRoles: [{ site: 'site-1', siteName: 'Test Site', role: 'owner', isActive: true }]
  })
}

export const mockSiteUserService = {
  getAll: vi.fn().mockResolvedValue([mockSiteUser]),
  getBySite: vi.fn().mockResolvedValue([mockSiteUser]),
  getByUser: vi.fn().mockResolvedValue([mockSiteUser]),
  getUserRoleForSite: vi.fn().mockResolvedValue('owner'),
  assignRole: vi.fn().mockResolvedValue(mockSiteUser),
  updateRole: vi.fn().mockResolvedValue(mockSiteUser),
  deactivateRole: vi.fn().mockResolvedValue(mockSiteUser),
  delete: vi.fn().mockResolvedValue(true)
}

export const mockSiteInvitationService = {
  getAll: vi.fn().mockResolvedValue([mockSiteInvitation]),
  getBySite: vi.fn().mockResolvedValue([mockSiteInvitation]),
  create: vi.fn().mockResolvedValue(mockSiteInvitation),
  updateStatus: vi.fn().mockResolvedValue(mockSiteInvitation),
  delete: vi.fn().mockResolvedValue(true)
}

export const mockSiteService = {
  getAll: vi.fn().mockResolvedValue([mockSite]),
  getById: vi.fn().mockResolvedValue(mockSite),
  create: vi.fn().mockResolvedValue(mockSite),
  update: vi.fn().mockResolvedValue(mockSite),
  delete: vi.fn().mockResolvedValue(true),
  addUserToSite: vi.fn().mockResolvedValue(undefined),
  removeUserFromSite: vi.fn().mockResolvedValue(undefined),
  changeUserRole: vi.fn().mockResolvedValue(undefined)
}

// Site context functions
export const getCurrentSiteId = vi.fn().mockReturnValue('site-1')
export const setCurrentSiteId = vi.fn()
export const getCurrentUserRole = vi.fn().mockReturnValue('owner')
export const setCurrentUserRole = vi.fn()
export const calculatePermissions = vi.fn().mockReturnValue({
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: true,
  canManageUsers: true,
  canManageRoles: true,
  canExport: true,
  canViewFinancials: true
})

// Mock additional services
export const mockItemService = {
  getAll: vi.fn().mockResolvedValue([mockItem]),
  getById: vi.fn().mockResolvedValue(mockItem),
  create: vi.fn().mockResolvedValue(mockItem),
  update: vi.fn().mockResolvedValue(mockItem),
  delete: vi.fn().mockResolvedValue(true)
}

export const mockVendorService = {
  getAll: vi.fn().mockResolvedValue([mockVendor]),
  getById: vi.fn().mockResolvedValue(mockVendor),
  create: vi.fn().mockResolvedValue(mockVendor),
  update: vi.fn().mockResolvedValue(mockVendor),
  delete: vi.fn().mockResolvedValue(true)
}

export const mockIncomingItemService = {
  getAll: vi.fn().mockResolvedValue([mockIncomingItem]),
  getById: vi.fn().mockResolvedValue(mockIncomingItem),
  create: vi.fn().mockResolvedValue(mockIncomingItem),
  update: vi.fn().mockResolvedValue(mockIncomingItem),
  delete: vi.fn().mockResolvedValue(true)
}

export const mockServiceBookingService = {
  getAll: vi.fn().mockResolvedValue([mockServiceBooking]),
  getById: vi.fn().mockResolvedValue(mockServiceBooking),
  create: vi.fn().mockResolvedValue(mockServiceBooking),
  update: vi.fn().mockResolvedValue(mockServiceBooking),
  delete: vi.fn().mockResolvedValue(true)
}

export const mockPaymentService = {
  getAll: vi.fn().mockResolvedValue([mockPayment]),
  getById: vi.fn().mockResolvedValue(mockPayment),
  create: vi.fn().mockResolvedValue(mockPayment),
  update: vi.fn().mockResolvedValue(mockPayment),
  delete: vi.fn().mockResolvedValue(true)
}

export const mockAccountService = {
  getAll: vi.fn().mockResolvedValue([]),
  getById: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue(true)
}

export const mockTagService = {
  getAll: vi.fn().mockResolvedValue([
    { id: 'tag-1', name: 'Construction', color: '#ef4444', type: 'item_category', site: 'site-1', usage_count: 5 },
    { id: 'tag-2', name: 'Material', color: '#22c55e', type: 'item_category', site: 'site-1', usage_count: 3 }
  ]),
  getBySite: vi.fn().mockResolvedValue([]),
  getByName: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({ id: 'tag-new', name: 'New Tag', color: '#3b82f6', type: 'custom', site: 'site-1', usage_count: 1 }),
  findOrCreate: vi.fn().mockResolvedValue({ id: 'tag-new', name: 'New Tag', color: '#3b82f6', type: 'custom', site: 'site-1', usage_count: 1 }),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue(true),
  incrementUsage: vi.fn().mockResolvedValue(undefined)
}

// PocketBase instance
export const pb = {
  collection: vi.fn(() => ({
    getFullList: vi.fn().mockResolvedValue([]),
    getOne: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({})
  }))
}

// Export services
export const authService = mockAuthService
export const siteService = mockSiteService
export const siteUserService = mockSiteUserService
export const siteInvitationService = mockSiteInvitationService
export const itemService = mockItemService
export const vendorService = mockVendorService
export const incomingItemService = mockIncomingItemService
export const serviceBookingService = mockServiceBookingService
export const paymentService = mockPaymentService
export const accountService = mockAccountService
export const tagService = mockTagService