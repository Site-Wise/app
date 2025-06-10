import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  AuthService, 
  ItemService, 
  VendorService, 
  SiteService,
  getCurrentSiteId,
  setCurrentSiteId
} from '../../services/pocketbase'
import { createMockPocketBase, mockUser, mockSite, mockItem, mockVendor } from '../mocks/pocketbase'

// Mock PocketBase
vi.mock('pocketbase', () => ({
  default: vi.fn(() => createMockPocketBase())
}))

describe('PocketBase Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Site Context Management', () => {
    it('should get current site ID from localStorage', () => {
      localStorage.setItem('currentSiteId', 'site-1')
      expect(getCurrentSiteId()).toBe('site-1')
    })

    it('should set current site ID in localStorage', () => {
      setCurrentSiteId('site-2')
      expect(localStorage.setItem).toHaveBeenCalledWith('currentSiteId', 'site-2')
    })

    it('should clear current site ID when set to null', () => {
      setCurrentSiteId(null)
      expect(localStorage.removeItem).toHaveBeenCalledWith('currentSiteId')
    })
  })

  describe('AuthService', () => {
    let authService: AuthService

    beforeEach(() => {
      authService = new AuthService()
    })

    it('should login successfully', async () => {
      const result = await authService.login('test@example.com', 'password')
      expect(result.record).toEqual(mockUser)
    })

    it('should register a new user', async () => {
      const result = await authService.register('new@example.com', 'password', 'New User')
      expect(result).toBeDefined()
    })

    it('should logout and clear site', () => {
      setCurrentSiteId('site-1')
      authService.logout()
      expect(getCurrentSiteId()).toBeNull()
    })

    it('should return current user when authenticated', () => {
      const user = authService.currentUser
      expect(user).toEqual(mockUser)
    })

    it('should return null when not authenticated', () => {
      const mockPB = createMockPocketBase()
      mockPB.authStore.isValid = false
      mockPB.authStore.model = null as any
      
      const service = new AuthService()
      expect(service.currentUser).toBeNull()
    })
  })

  describe('SiteService', () => {
    let siteService: SiteService

    beforeEach(() => {
      siteService = new SiteService()
      setCurrentSiteId('site-1')
    })

    it('should get all sites for user', async () => {
      const sites = await siteService.getAll()
      expect(sites).toHaveLength(1)
      expect(sites[0]).toEqual(mockSite)
    })

    it('should get site by ID', async () => {
      const site = await siteService.getById('site-1')
      expect(site).toEqual(mockSite)
    })

    it('should create a new site', async () => {
      const newSiteData = {
        name: 'New Site',
        description: 'A new construction site',
        total_units: 50,
        total_planned_area: 25000
      }
      
      const result = await siteService.create(newSiteData)
      expect(result.name).toBe(newSiteData.name)
      expect(result.admin_user).toBe(mockUser.id)
    })

    it('should update a site', async () => {
      const updateData = { name: 'Updated Site Name' }
      const result = await siteService.update('site-1', updateData)
      expect(result.name).toBe(updateData.name)
    })

    it('should delete a site', async () => {
      const result = await siteService.delete('site-1')
      expect(result).toBe(true)
    })
  })

  describe('ItemService', () => {
    let itemService: ItemService

    beforeEach(() => {
      itemService = new ItemService()
      setCurrentSiteId('site-1')
    })

    it('should get all items for current site', async () => {
      const items = await itemService.getAll()
      expect(items).toHaveLength(1)
      expect(items[0]).toEqual(mockItem)
    })

    it('should throw error when no site selected', async () => {
      setCurrentSiteId(null)
      await expect(itemService.getAll()).rejects.toThrow('No site selected')
    })

    it('should create a new item', async () => {
      const newItemData = {
        name: 'Concrete',
        description: 'High-grade concrete',
        unit: 'm³',
        quantity: 100,
        category: 'Concrete'
      }
      
      const result = await itemService.create(newItemData)
      expect(result.name).toBe(newItemData.name)
      expect(result.site).toBe('site-1')
    })

    it('should update an item', async () => {
      const updateData = { quantity: 1500 }
      const result = await itemService.update('item-1', updateData)
      expect(result.quantity).toBe(updateData.quantity)
    })

    it('should delete an item', async () => {
      const result = await itemService.delete('item-1')
      expect(result).toBe(true)
    })
  })

  describe('VendorService', () => {
    let vendorService: VendorService

    beforeEach(() => {
      vendorService = new VendorService()
      setCurrentSiteId('site-1')
    })

    it('should get all vendors for current site', async () => {
      const vendors = await vendorService.getAll()
      expect(vendors).toHaveLength(1)
      expect(vendors[0]).toEqual(mockVendor)
    })

    it('should create a new vendor', async () => {
      const newVendorData = {
        name: 'Concrete Suppliers Ltd',
        contact_person: 'Jane Smith',
        email: 'jane@concrete.com',
        phone: '+1987654321',
        address: '456 Concrete Ave',
        tags: ['Concrete', 'Cement']
      }
      
      const result = await vendorService.create(newVendorData)
      expect(result.name).toBe(newVendorData.name)
      expect(result.site).toBe('site-1')
    })

    it('should update a vendor', async () => {
      const updateData = { phone: '+1111111111' }
      const result = await vendorService.update('vendor-1', updateData)
      expect(result.phone).toBe(updateData.phone)
    })

    it('should delete a vendor', async () => {
      const result = await vendorService.delete('vendor-1')
      expect(result).toBe(true)
    })
  })
})