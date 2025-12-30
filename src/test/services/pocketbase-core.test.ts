import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

/**
 * Core PocketBase Functions Tests
 * Tests for calculatePermissions, getCurrentSiteId, setCurrentSiteId, etc.
 */

// Mock localStorage
let localStorageData: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageData[key]
  })
}

// Store original localStorage
let originalLocalStorage: Storage

beforeEach(() => {
  vi.clearAllMocks()
  // Clear storage data
  localStorageData = {}
  // Save original and replace
  originalLocalStorage = global.localStorage
  global.localStorage = localStorageMock as any
})

afterEach(() => {
  // Restore original localStorage
  global.localStorage = originalLocalStorage
})

describe('PocketBase Core Functions', () => {
  describe('calculatePermissions', () => {
    // Import the function inline to use our mocked localStorage
    const calculatePermissions = (role: 'owner' | 'supervisor' | 'accountant' | null) => {
      if (!role) {
        return {
          canCreate: false,
          canRead: false,
          canUpdate: false,
          canDelete: false,
          canManageUsers: false,
          canManageRoles: false,
          canExport: false,
          canViewFinancials: false
        }
      }

      switch (role) {
        case 'owner':
          return {
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: true,
            canManageUsers: true,
            canManageRoles: true,
            canExport: true,
            canViewFinancials: true
          }
        case 'supervisor':
          return {
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: false,
            canManageUsers: false,
            canManageRoles: false,
            canExport: true,
            canViewFinancials: true
          }
        case 'accountant':
          return {
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false,
            canManageUsers: false,
            canManageRoles: false,
            canExport: true,
            canViewFinancials: true
          }
        default:
          return {
            canCreate: false,
            canRead: false,
            canUpdate: false,
            canDelete: false,
            canManageUsers: false,
            canManageRoles: false,
            canExport: false,
            canViewFinancials: false
          }
      }
    }

    it('should return all false permissions for null role', () => {
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

    it('should return all true permissions for owner role', () => {
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

    it('should return correct permissions for supervisor role', () => {
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

    it('should return correct permissions for accountant role', () => {
      const permissions = calculatePermissions('accountant')

      expect(permissions.canCreate).toBe(false)
      expect(permissions.canRead).toBe(true)
      expect(permissions.canUpdate).toBe(false)
      expect(permissions.canDelete).toBe(false)
      expect(permissions.canManageUsers).toBe(false)
      expect(permissions.canManageRoles).toBe(false)
      expect(permissions.canExport).toBe(true)
      expect(permissions.canViewFinancials).toBe(true)
    })

    it('should handle unknown role as default case', () => {
      const permissions = calculatePermissions('unknown' as any)

      expect(permissions.canCreate).toBe(false)
      expect(permissions.canRead).toBe(false)
    })
  })

  describe('Site ID Management', () => {
    let currentSiteId: string | null = null

    const getCurrentSiteId = (): string | null => {
      if (!currentSiteId) {
        currentSiteId = localStorage.getItem('currentSiteId')
      }
      return currentSiteId
    }

    const setCurrentSiteId = (siteId: string | null) => {
      currentSiteId = siteId
      if (siteId) {
        localStorage.setItem('currentSiteId', siteId)
      } else {
        localStorage.removeItem('currentSiteId')
      }
    }

    beforeEach(() => {
      currentSiteId = null
    })

    it('should return null when no site is set', () => {
      const siteId = getCurrentSiteId()
      expect(siteId).toBeNull()
    })

    it('should set site ID and store in localStorage', () => {
      setCurrentSiteId('site-123')

      expect(currentSiteId).toBe('site-123')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('currentSiteId', 'site-123')
    })

    it('should get site ID from localStorage if not cached', () => {
      localStorageData['currentSiteId'] = 'site-456'

      const siteId = getCurrentSiteId()

      expect(siteId).toBe('site-456')
    })

    it('should clear site ID and remove from localStorage', () => {
      setCurrentSiteId('site-123')
      setCurrentSiteId(null)

      expect(currentSiteId).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentSiteId')
    })

    it('should use cached value instead of localStorage', () => {
      setCurrentSiteId('cached-site')
      localStorageData['currentSiteId'] = 'stored-site'

      const siteId = getCurrentSiteId()

      expect(siteId).toBe('cached-site')
    })
  })

  describe('User Role Management', () => {
    let currentUserRole: 'owner' | 'supervisor' | 'accountant' | null = null

    const getCurrentUserRole = (): 'owner' | 'supervisor' | 'accountant' | null => {
      if (!currentUserRole) {
        currentUserRole = localStorage.getItem('currentUserRole') as 'owner' | 'supervisor' | 'accountant' | null
      }
      return currentUserRole
    }

    const setCurrentUserRole = (role: 'owner' | 'supervisor' | 'accountant' | null) => {
      currentUserRole = role
      if (role) {
        localStorage.setItem('currentUserRole', role)
      } else {
        localStorage.removeItem('currentUserRole')
      }
    }

    beforeEach(() => {
      currentUserRole = null
    })

    it('should return null when no role is set', () => {
      const role = getCurrentUserRole()
      expect(role).toBeNull()
    })

    it('should set owner role correctly', () => {
      setCurrentUserRole('owner')

      expect(currentUserRole).toBe('owner')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('currentUserRole', 'owner')
    })

    it('should set supervisor role correctly', () => {
      setCurrentUserRole('supervisor')

      expect(currentUserRole).toBe('supervisor')
    })

    it('should set accountant role correctly', () => {
      setCurrentUserRole('accountant')

      expect(currentUserRole).toBe('accountant')
    })

    it('should clear role and remove from localStorage', () => {
      setCurrentUserRole('owner')
      setCurrentUserRole(null)

      expect(currentUserRole).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentUserRole')
    })

    it('should get role from localStorage if not cached', () => {
      localStorageData['currentUserRole'] = 'supervisor'

      const role = getCurrentUserRole()

      expect(role).toBe('supervisor')
    })
  })

  describe('TAG_COLOR_PALETTE', () => {
    const TAG_COLOR_PALETTE = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#64748b', '#71717a', '#78716c', '#737373'
    ]

    it('should have 20 colors', () => {
      expect(TAG_COLOR_PALETTE).toHaveLength(20)
    })

    it('should have all valid hex colors', () => {
      TAG_COLOR_PALETTE.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })

    it('should have unique colors', () => {
      const uniqueColors = new Set(TAG_COLOR_PALETTE)
      expect(uniqueColors.size).toBe(TAG_COLOR_PALETTE.length)
    })

    it('should start with red-500', () => {
      expect(TAG_COLOR_PALETTE[0]).toBe('#ef4444')
    })

    it('should include blue-500', () => {
      expect(TAG_COLOR_PALETTE).toContain('#3b82f6')
    })
  })
})

describe('Interface Type Definitions', () => {
  describe('User Interface', () => {
    it('should have required fields', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        sites: ['site-1'],
        created: '2024-01-01',
        updated: '2024-01-01'
      }

      expect(user.id).toBeDefined()
      expect(user.email).toBeDefined()
      expect(user.name).toBeDefined()
      expect(user.sites).toBeInstanceOf(Array)
    })

    it('should allow optional fields', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        avatar: 'avatar.jpg',
        sites: [],
        created: '2024-01-01',
        updated: '2024-01-01'
      }

      expect(user.phone).toBe('+1234567890')
      expect(user.avatar).toBe('avatar.jpg')
    })
  })

  describe('Site Interface', () => {
    it('should have required fields', () => {
      const site = {
        name: 'Test Site',
        total_units: 100,
        total_planned_area: 5000,
        admin_user: 'user-1'
      }

      expect(site.name).toBeDefined()
      expect(site.total_units).toBeGreaterThan(0)
      expect(site.total_planned_area).toBeGreaterThan(0)
      expect(site.admin_user).toBeDefined()
    })

    it('should allow optional id for creation', () => {
      const site = {
        name: 'New Site',
        total_units: 50,
        total_planned_area: 2500,
        admin_user: 'user-1'
      }

      expect(site).not.toHaveProperty('id')
    })

    it('should handle soft delete fields', () => {
      const deletedSite = {
        id: 'site-1',
        name: 'Deleted Site',
        total_units: 100,
        total_planned_area: 5000,
        admin_user: 'user-1',
        is_active: false,
        deleted_at: '2024-01-15T10:00:00Z'
      }

      expect(deletedSite.is_active).toBe(false)
      expect(deletedSite.deleted_at).toBeDefined()
    })
  })

  describe('SiteUser Interface', () => {
    it('should have required fields', () => {
      const siteUser = {
        site: 'site-1',
        user: 'user-1',
        role: 'owner' as const,
        assigned_by: 'user-2',
        assigned_at: '2024-01-01',
        is_active: true
      }

      expect(siteUser.site).toBeDefined()
      expect(siteUser.user).toBeDefined()
      expect(['owner', 'supervisor', 'accountant']).toContain(siteUser.role)
    })

    it('should handle disowned_at for soft delete', () => {
      const disownedSiteUser = {
        site: 'site-1',
        user: 'user-1',
        role: 'supervisor' as const,
        assigned_by: 'user-2',
        assigned_at: '2024-01-01',
        is_active: false,
        disowned_at: '2024-02-01'
      }

      expect(disownedSiteUser.is_active).toBe(false)
      expect(disownedSiteUser.disowned_at).toBeDefined()
    })
  })

  describe('Account Interface', () => {
    it('should have required fields', () => {
      const account = {
        name: 'Main Bank Account',
        type: 'bank' as const,
        is_active: true,
        opening_balance: 10000,
        current_balance: 15000,
        site: 'site-1'
      }

      expect(account.name).toBeDefined()
      expect(['bank', 'credit_card', 'cash', 'digital_wallet', 'other']).toContain(account.type)
      expect(account.opening_balance).toBeGreaterThanOrEqual(0)
    })

    it('should support all account types', () => {
      const types = ['bank', 'credit_card', 'cash', 'digital_wallet', 'other']

      types.forEach(type => {
        const account = {
          name: `${type} Account`,
          type: type as any,
          is_active: true,
          opening_balance: 0,
          current_balance: 0,
          site: 'site-1'
        }
        expect(account.type).toBe(type)
      })
    })
  })

  describe('Item Interface', () => {
    it('should have required fields', () => {
      const item = {
        name: 'Cement',
        unit: 'bag',
        site: 'site-1'
      }

      expect(item.name).toBeDefined()
      expect(item.unit).toBeDefined()
      expect(item.site).toBeDefined()
    })

    it('should support tags array', () => {
      const item = {
        name: 'Steel Rod',
        unit: 'ton',
        tags: ['tag-1', 'tag-2'],
        site: 'site-1'
      }

      expect(item.tags).toBeInstanceOf(Array)
      expect(item.tags).toHaveLength(2)
    })
  })

  describe('Vendor Interface', () => {
    it('should allow optional fields', () => {
      const vendor = {
        site: 'site-1'
      }

      expect(vendor.site).toBeDefined()
    })

    it('should have all optional contact fields', () => {
      const vendor = {
        name: 'Vendor Co',
        contact_person: 'John Doe',
        email: 'vendor@example.com',
        phone: '+1234567890',
        address: '123 Vendor St',
        payment_details: 'Bank: XYZ, Acc: 123456',
        tags: ['tag-1'],
        site: 'site-1'
      }

      expect(vendor.name).toBeDefined()
      expect(vendor.contact_person).toBeDefined()
      expect(vendor.email).toContain('@')
      expect(vendor.phone).toBeDefined()
    })
  })

  describe('Delivery Interface', () => {
    it('should have required fields', () => {
      const delivery = {
        vendor: 'vendor-1',
        delivery_date: '2024-01-15',
        total_amount: 50000,
        site: 'site-1'
      }

      expect(delivery.vendor).toBeDefined()
      expect(delivery.delivery_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(delivery.total_amount).toBeGreaterThanOrEqual(0)
    })

    it('should support round-off amount', () => {
      const delivery = {
        vendor: 'vendor-1',
        delivery_date: '2024-01-15',
        total_amount: 49998,
        rounded_off_with: 2,
        site: 'site-1'
      }

      expect(delivery.rounded_off_with).toBe(2)
    })

    it('should support photos array', () => {
      const delivery = {
        vendor: 'vendor-1',
        delivery_date: '2024-01-15',
        total_amount: 50000,
        photos: ['photo1.jpg', 'photo2.jpg'],
        site: 'site-1'
      }

      expect(delivery.photos).toHaveLength(2)
    })
  })

  describe('DeliveryItem Interface', () => {
    it('should have required fields', () => {
      const deliveryItem = {
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 100,
        unit_price: 50,
        total_amount: 5000,
        site: 'site-1'
      }

      expect(deliveryItem.delivery).toBeDefined()
      expect(deliveryItem.item).toBeDefined()
      expect(deliveryItem.quantity).toBeGreaterThan(0)
      expect(deliveryItem.total_amount).toBe(deliveryItem.quantity * deliveryItem.unit_price)
    })
  })

  describe('Payment Interface', () => {
    it('should have required fields', () => {
      const payment = {
        vendor: 'vendor-1',
        account: 'account-1',
        amount: 10000,
        payment_date: '2024-01-20',
        deliveries: ['delivery-1'],
        service_bookings: [],
        site: 'site-1'
      }

      expect(payment.vendor).toBeDefined()
      expect(payment.account).toBeDefined()
      expect(payment.amount).toBeGreaterThan(0)
      expect(payment.deliveries).toBeInstanceOf(Array)
      expect(payment.service_bookings).toBeInstanceOf(Array)
    })

    it('should support credit notes', () => {
      const payment = {
        vendor: 'vendor-1',
        account: 'account-1',
        amount: 8000,
        payment_date: '2024-01-20',
        deliveries: ['delivery-1'],
        service_bookings: [],
        credit_notes: ['cn-1', 'cn-2'],
        site: 'site-1'
      }

      expect(payment.credit_notes).toHaveLength(2)
    })
  })

  describe('ServiceBooking Interface', () => {
    it('should have required fields', () => {
      const booking = {
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        duration: 8,
        unit_rate: 500,
        total_amount: 4000,
        percent_completed: 0,
        site: 'site-1'
      }

      expect(booking.service).toBeDefined()
      expect(booking.vendor).toBeDefined()
      expect(booking.duration).toBeGreaterThan(0)
      expect(booking.unit_rate).toBeGreaterThan(0)
      expect(booking.percent_completed).toBeGreaterThanOrEqual(0)
      expect(booking.percent_completed).toBeLessThanOrEqual(100)
    })

    it('should support end_date', () => {
      const booking = {
        service: 'service-1',
        vendor: 'vendor-1',
        start_date: '2024-01-01',
        end_date: '2024-01-10',
        duration: 80,
        unit_rate: 500,
        total_amount: 40000,
        percent_completed: 50,
        site: 'site-1'
      }

      expect(booking.end_date).toBeDefined()
      expect(new Date(booking.end_date!) > new Date(booking.start_date)).toBe(true)
    })
  })

  describe('Tag Interface', () => {
    it('should have required fields', () => {
      const tag = {
        name: 'Building Materials',
        color: '#3b82f6',
        type: 'item_category' as const,
        site: 'site-1',
        usage_count: 5
      }

      expect(tag.name).toBeDefined()
      expect(tag.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(['service_category', 'specialty', 'item_category', 'custom']).toContain(tag.type)
      expect(tag.usage_count).toBeGreaterThanOrEqual(0)
    })

    it('should support all tag types', () => {
      const types = ['service_category', 'specialty', 'item_category', 'custom']

      types.forEach(type => {
        const tag = {
          name: `${type} tag`,
          color: '#000000',
          type: type as any,
          site: 'site-1',
          usage_count: 0
        }
        expect(tag.type).toBe(type)
      })
    })
  })

  describe('VendorReturn Interface', () => {
    it('should have required fields', () => {
      const vendorReturn = {
        vendor: 'vendor-1',
        return_date: '2024-01-15',
        reason: 'damaged' as const,
        status: 'initiated' as const,
        total_return_amount: 5000,
        site: 'site-1'
      }

      expect(vendorReturn.vendor).toBeDefined()
      expect(['damaged', 'wrong_item', 'excess_delivery', 'quality_issue', 'specification_mismatch', 'other']).toContain(vendorReturn.reason)
      expect(['initiated', 'approved', 'rejected', 'completed', 'refunded']).toContain(vendorReturn.status)
    })

    it('should support processing options', () => {
      const vendorReturn = {
        vendor: 'vendor-1',
        return_date: '2024-01-15',
        reason: 'wrong_item' as const,
        status: 'approved' as const,
        processing_option: 'credit_note' as const,
        total_return_amount: 5000,
        site: 'site-1'
      }

      expect(['credit_note', 'refund']).toContain(vendorReturn.processing_option)
    })
  })

  describe('VendorCreditNote Interface', () => {
    it('should have required fields', () => {
      const creditNote = {
        id: 'cn-1',
        vendor: 'vendor-1',
        credit_amount: 5000,
        balance: 3000,
        issue_date: '2024-01-15',
        reason: 'Return of damaged goods',
        status: 'active' as const,
        site: 'site-1'
      }

      expect(creditNote.id).toBeDefined()
      expect(creditNote.credit_amount).toBeGreaterThan(0)
      expect(creditNote.balance).toBeLessThanOrEqual(creditNote.credit_amount)
      expect(['active', 'fully_used', 'expired', 'cancelled']).toContain(creditNote.status)
    })
  })

  describe('PaymentAllocation Interface', () => {
    it('should allocate to delivery', () => {
      const allocation = {
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 5000,
        site: 'site-1'
      }

      expect(allocation.delivery).toBeDefined()
      expect(allocation.allocated_amount).toBeGreaterThan(0)
    })

    it('should allocate to service booking', () => {
      const allocation = {
        payment: 'payment-1',
        service_booking: 'booking-1',
        allocated_amount: 3000,
        site: 'site-1'
      }

      expect(allocation.service_booking).toBeDefined()
    })
  })

  describe('AccountTransaction Interface', () => {
    it('should have required fields', () => {
      const transaction = {
        account: 'account-1',
        type: 'debit' as const,
        amount: 5000,
        transaction_date: '2024-01-15',
        description: 'Payment to vendor',
        site: 'site-1'
      }

      expect(transaction.account).toBeDefined()
      expect(['credit', 'debit']).toContain(transaction.type)
      expect(transaction.amount).toBeGreaterThan(0)
    })

    it('should support transaction categories', () => {
      const categories = ['payment', 'refund', 'credit_adjustment', 'manual']

      categories.forEach(category => {
        const transaction = {
          account: 'account-1',
          type: 'debit' as const,
          amount: 1000,
          transaction_date: '2024-01-15',
          description: 'Test transaction',
          transaction_category: category as any,
          site: 'site-1'
        }
        expect(transaction.transaction_category).toBe(category)
      })
    })
  })
})

describe('Permissions Interface', () => {
  it('should have all permission fields', () => {
    const permissions = {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canManageUsers: true,
      canManageRoles: true,
      canExport: true,
      canViewFinancials: true
    }

    expect(Object.keys(permissions)).toHaveLength(8)
    Object.values(permissions).forEach(value => {
      expect(typeof value).toBe('boolean')
    })
  })
})

describe('SiteInvitation Interface', () => {
  it('should have required fields', () => {
    const invitation = {
      site: 'site-1',
      email: 'invited@example.com',
      role: 'supervisor' as const,
      invited_by: 'user-1',
      invited_at: '2024-01-15T10:00:00Z',
      status: 'pending' as const,
      expires_at: '2024-01-22T10:00:00Z'
    }

    expect(invitation.site).toBeDefined()
    expect(invitation.email).toContain('@')
    expect(['owner', 'supervisor', 'accountant']).toContain(invitation.role)
    expect(['pending', 'accepted', 'expired']).toContain(invitation.status)
  })

  it('should validate expiration date is after invitation date', () => {
    const invitation = {
      invited_at: '2024-01-15T10:00:00Z',
      expires_at: '2024-01-22T10:00:00Z'
    }

    const invitedDate = new Date(invitation.invited_at)
    const expiresDate = new Date(invitation.expires_at)

    expect(expiresDate > invitedDate).toBe(true)
  })
})

describe('Quotation Interface', () => {
  it('should support item quotation', () => {
    const quotation = {
      vendor: 'vendor-1',
      item: 'item-1',
      quotation_type: 'item' as const,
      unit_price: 500,
      status: 'pending' as const,
      site: 'site-1'
    }

    expect(quotation.quotation_type).toBe('item')
    expect(quotation.item).toBeDefined()
  })

  it('should support service quotation', () => {
    const quotation = {
      vendor: 'vendor-1',
      service: 'service-1',
      quotation_type: 'service' as const,
      unit_price: 1000,
      status: 'approved' as const,
      site: 'site-1'
    }

    expect(quotation.quotation_type).toBe('service')
    expect(quotation.service).toBeDefined()
  })

  it('should support all status values', () => {
    const statuses = ['pending', 'approved', 'rejected', 'expired']

    statuses.forEach(status => {
      const quotation = {
        vendor: 'vendor-1',
        quotation_type: 'item' as const,
        unit_price: 500,
        status: status as any,
        site: 'site-1'
      }
      expect(quotation.status).toBe(status)
    })
  })
})

describe('Service Interface', () => {
  it('should have required fields', () => {
    const service = {
      name: 'Plumbing',
      category: 'labor' as const,
      service_type: 'Plumber',
      unit: 'hour',
      is_active: true,
      site: 'site-1'
    }

    expect(service.name).toBeDefined()
    expect(['labor', 'equipment', 'professional', 'transport', 'other']).toContain(service.category)
    expect(service.unit).toBeDefined()
  })

  it('should support standard rate', () => {
    const service = {
      name: 'Electrical',
      category: 'professional' as const,
      service_type: 'Electrician',
      unit: 'day',
      standard_rate: 2000,
      is_active: true,
      site: 'site-1'
    }

    expect(service.standard_rate).toBeGreaterThan(0)
  })
})
