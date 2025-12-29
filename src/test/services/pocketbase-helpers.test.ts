import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock localStorage with a fresh object for each test
let localStorageData: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageData[key] }),
  clear: vi.fn(() => { localStorageData = {} })
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock PocketBase - using a class for proper constructor behavior in Vitest v4
vi.mock('pocketbase', () => {
  class MockPocketBase {
    authStore = {
      isValid: true,
      model: { id: 'user-1', email: 'test@example.com' },
      record: { id: 'user-1', email: 'test@example.com' },
      clear: vi.fn(),
    }
    baseUrl = 'http://localhost:8090'

    collection = vi.fn(() => ({
      getFullList: vi.fn().mockResolvedValue([]),
      getOne: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
    }))

    autoCancellation = vi.fn()
  }

  return { default: MockPocketBase }
})

// Import the helper functions after mocking
const {
  getCurrentSiteId,
  getCurrentUserRole,
  setCurrentSiteId,
  setCurrentUserRole,
  calculatePermissions
} = await import('../../services/pocketbase')

describe('PocketBase Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear the object without reassigning
    for (const key in localStorageData) {
      delete localStorageData[key]
    }
  })

  afterEach(() => {
    // Clear the object without reassigning
    for (const key in localStorageData) {
      delete localStorageData[key]
    }
  })

  describe('Site ID Management', () => {
    it('should get and set current site ID', () => {
      setCurrentSiteId('site-123')
      expect(getCurrentSiteId()).toBe('site-123')
    })

    it('should set current site ID in localStorage', () => {
      setCurrentSiteId('site-456')
      expect(getCurrentSiteId()).toBe('site-456')
    })

    it('should clear current site ID when set to null', () => {
      setCurrentSiteId('site-789')
      setCurrentSiteId(null)
      expect(getCurrentSiteId()).toBeNull()
    })

    it('should handle multiple site ID changes', () => {
      setCurrentSiteId('site-1')
      expect(getCurrentSiteId()).toBe('site-1')
      
      setCurrentSiteId('site-2')
      expect(getCurrentSiteId()).toBe('site-2')
      
      setCurrentSiteId(null)
      expect(getCurrentSiteId()).toBeNull()
    })
  })

  describe('User Role Management', () => {
    it('should get and set current user role', () => {
      setCurrentUserRole('supervisor')
      expect(getCurrentUserRole()).toBe('supervisor')
    })

    it('should set current user role in localStorage', () => {
      setCurrentUserRole('accountant')
      expect(getCurrentUserRole()).toBe('accountant')
    })

    it('should clear current user role when set to null', () => {
      setCurrentUserRole('owner')
      setCurrentUserRole(null)
      expect(getCurrentUserRole()).toBeNull()
    })

    it('should handle all valid role types', () => {
      setCurrentUserRole('owner')
      expect(getCurrentUserRole()).toBe('owner')

      setCurrentUserRole('supervisor')
      expect(getCurrentUserRole()).toBe('supervisor')

      setCurrentUserRole('accountant')
      expect(getCurrentUserRole()).toBe('accountant')

      setCurrentUserRole(null)
      expect(getCurrentUserRole()).toBeNull()
    })
  })

  describe('calculatePermissions', () => {
    describe('Owner Role Permissions', () => {
      it('should grant all permissions for owner role', () => {
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

      it('should allow owner to perform all CRUD operations', () => {
        const permissions = calculatePermissions('owner')
        expect(permissions.canCreate && permissions.canRead &&
               permissions.canUpdate && permissions.canDelete).toBe(true)
      })

      it('should allow owner to manage users and roles', () => {
        const permissions = calculatePermissions('owner')
        expect(permissions.canManageUsers && permissions.canManageRoles).toBe(true)
      })
    })

    describe('Supervisor Role Permissions', () => {
      it('should grant limited permissions for supervisor role', () => {
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

      it('should not allow supervisor to delete records', () => {
        const permissions = calculatePermissions('supervisor')
        expect(permissions.canDelete).toBe(false)
      })

      it('should not allow supervisor to manage users or roles', () => {
        const permissions = calculatePermissions('supervisor')
        expect(permissions.canManageUsers).toBe(false)
        expect(permissions.canManageRoles).toBe(false)
      })

      it('should allow supervisor to view and export data', () => {
        const permissions = calculatePermissions('supervisor')
        expect(permissions.canRead && permissions.canExport &&
               permissions.canViewFinancials).toBe(true)
      })
    })

    describe('Accountant Role Permissions', () => {
      it('should grant read-only permissions for accountant role', () => {
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

      it('should not allow accountant to modify data', () => {
        const permissions = calculatePermissions('accountant')
        expect(permissions.canCreate || permissions.canUpdate ||
               permissions.canDelete).toBe(false)
      })

      it('should allow accountant to view and export financial data', () => {
        const permissions = calculatePermissions('accountant')
        expect(permissions.canRead && permissions.canExport &&
               permissions.canViewFinancials).toBe(true)
      })

      it('should not allow accountant to manage users or roles', () => {
        const permissions = calculatePermissions('accountant')
        expect(permissions.canManageUsers).toBe(false)
        expect(permissions.canManageRoles).toBe(false)
      })
    })

    describe('Null/Invalid Role Permissions', () => {
      it('should deny all permissions for null role', () => {
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

      it('should return all false permissions for null role', () => {
        const permissions = calculatePermissions(null)
        const allPermissions = Object.values(permissions)
        expect(allPermissions.every(p => p === false)).toBe(true)
      })
    })

    describe('Permission Consistency', () => {
      it('should maintain permission hierarchy (owner > supervisor > accountant)', () => {
        const ownerPerms = calculatePermissions('owner')
        const supervisorPerms = calculatePermissions('supervisor')
        const accountantPerms = calculatePermissions('accountant')

        expect(ownerPerms.canCreate >= supervisorPerms.canCreate).toBe(true)
        expect(ownerPerms.canUpdate >= supervisorPerms.canUpdate).toBe(true)
        expect(supervisorPerms.canCreate > accountantPerms.canCreate).toBe(true)
        expect(supervisorPerms.canUpdate > accountantPerms.canUpdate).toBe(true)
      })

      it('should ensure read permission is granted to all authenticated roles', () => {
        expect(calculatePermissions('owner').canRead).toBe(true)
        expect(calculatePermissions('supervisor').canRead).toBe(true)
        expect(calculatePermissions('accountant').canRead).toBe(true)
        expect(calculatePermissions(null).canRead).toBe(false)
      })

      it('should ensure export permission for roles that need financial data', () => {
        expect(calculatePermissions('owner').canExport).toBe(true)
        expect(calculatePermissions('supervisor').canExport).toBe(true)
        expect(calculatePermissions('accountant').canExport).toBe(true)
      })
    })

    describe('Permission Edge Cases', () => {
      it('should handle permission checks for batch operations', () => {
        const ownerPerms = calculatePermissions('owner')
        expect(ownerPerms.canCreate && ownerPerms.canUpdate &&
               ownerPerms.canDelete).toBe(true)
      })

      it('should differentiate between viewing and modifying financials', () => {
        const accountantPerms = calculatePermissions('accountant')
        expect(accountantPerms.canViewFinancials).toBe(true)
        expect(accountantPerms.canUpdate).toBe(false)
      })

      it('should ensure user management is owner-only', () => {
        expect(calculatePermissions('owner').canManageUsers).toBe(true)
        expect(calculatePermissions('supervisor').canManageUsers).toBe(false)
        expect(calculatePermissions('accountant').canManageUsers).toBe(false)
        expect(calculatePermissions(null).canManageUsers).toBe(false)
      })

      it('should ensure role management is owner-only', () => {
        expect(calculatePermissions('owner').canManageRoles).toBe(true)
        expect(calculatePermissions('supervisor').canManageRoles).toBe(false)
        expect(calculatePermissions('accountant').canManageRoles).toBe(false)
        expect(calculatePermissions(null).canManageRoles).toBe(false)
      })
    })
  })

  describe('Integration: Site and Role Management', () => {
    it('should independently manage site ID and user role', () => {
      setCurrentSiteId('site-1')
      setCurrentUserRole('owner')

      expect(getCurrentSiteId()).toBe('site-1')
      expect(getCurrentUserRole()).toBe('owner')

      setCurrentSiteId('site-2')
      expect(getCurrentSiteId()).toBe('site-2')
      expect(getCurrentUserRole()).toBe('owner')
    })

    it('should clear site ID without affecting user role', () => {
      setCurrentSiteId('site-1')
      setCurrentUserRole('supervisor')

      setCurrentSiteId(null)

      expect(getCurrentSiteId()).toBeNull()
      expect(getCurrentUserRole()).toBe('supervisor')
    })

    it('should clear user role without affecting site ID', () => {
      setCurrentSiteId('site-1')
      setCurrentUserRole('accountant')

      setCurrentUserRole(null)

      expect(getCurrentSiteId()).toBe('site-1')
      expect(getCurrentUserRole()).toBeNull()
    })

    it('should handle complete session teardown', () => {
      setCurrentSiteId('site-1')
      setCurrentUserRole('owner')

      setCurrentSiteId(null)
      setCurrentUserRole(null)

      expect(getCurrentSiteId()).toBeNull()
      expect(getCurrentUserRole()).toBeNull()
    })

    it('should handle site and role changes in rapid succession', () => {
      for (let i = 1; i <= 5; i++) {
        setCurrentSiteId(`site-${i}`)
        setCurrentUserRole(i % 3 === 0 ? 'owner' : i % 3 === 1 ? 'supervisor' : 'accountant')
      }

      expect(getCurrentSiteId()).toBe('site-5')
      expect(getCurrentUserRole()).toBe('accountant')
    })
  })
})
