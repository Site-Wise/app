import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSite } from '../../composables/useSite'
import { mockSite } from '../mocks/pocketbase'

// Mock the site service
vi.mock('../../services/pocketbase', () => ({
  siteService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addUserToSite: vi.fn(),
    removeUserFromSite: vi.fn(),
    changeUserRole: vi.fn()
  },
  siteUserService: {
    getUserRoleForSite: vi.fn().mockResolvedValue('owner'),
    getBySite: vi.fn().mockResolvedValue([])
  },
  authService: {
    currentUser: { id: 'user-1', name: 'Test User' }
  },
  getCurrentSiteId: vi.fn(),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn().mockReturnValue('owner'),
  setCurrentUserRole: vi.fn()
}))

describe('useSite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load user sites', async () => {
    const { loadUserSites, userSites } = useSite()
    const { siteService } = await import('../../services/pocketbase')
    
    vi.mocked(siteService.getAll).mockResolvedValue([mockSite])
    
    await loadUserSites()
    
    expect(userSites.value).toEqual([{
      ...mockSite,
      userRole: 'owner',
      isOwner: true
    }])
    expect(siteService.getAll).toHaveBeenCalled()
  })

  it('should select a site', async () => {
    const { selectSite, currentSite } = useSite()
    const { setCurrentSiteId } = await import('../../services/pocketbase')
    
    // Mock the userSites ref to have the site
    const { loadUserSites } = useSite()
    const { siteService } = await import('../../services/pocketbase')
    vi.mocked(siteService.getAll).mockResolvedValue([mockSite])
    await loadUserSites()
    
    await selectSite('site-1')
    
    expect(currentSite.value).toEqual({
      ...mockSite,
      userRole: 'owner',
      isOwner: true
    })
    expect(setCurrentSiteId).toHaveBeenCalledWith('site-1')
  })

  it('should create a new site', async () => {
    const { createSite } = useSite()
    const { siteService } = await import('../../services/pocketbase')
    
    const newSiteData = {
      name: 'New Site',
      description: 'A new site',
      total_units: 50,
      total_planned_area: 25000
    }
    
    vi.mocked(siteService.create).mockResolvedValue({ ...mockSite, ...newSiteData })
    
    const result = await createSite(newSiteData)
    
    expect(result.name).toBe(newSiteData.name)
    expect(siteService.create).toHaveBeenCalledWith(newSiteData)
  })

  it('should update a site', async () => {
    const { updateSite } = useSite()
    const { siteService } = await import('../../services/pocketbase')
    
    const updateData = { name: 'Updated Site' }
    const updatedSite = { ...mockSite, ...updateData }
    
    vi.mocked(siteService.update).mockResolvedValue(updatedSite)
    
    const result = await updateSite('site-1', updateData)
    
    expect(result.name).toBe(updateData.name)
    expect(siteService.update).toHaveBeenCalledWith('site-1', updateData)
  })

  it('should check if user has site access', () => {
    const { hasSiteAccess, currentSite } = useSite()
    
    // currentSite might be loaded, so check the actual value
    if (currentSite.value) {
      expect(hasSiteAccess.value).toBe(true)
    } else {
      expect(hasSiteAccess.value).toBe(false)
    }
  })

  it('should add user to site', async () => {
    const { addUserToSite } = useSite()
    const { siteService } = await import('../../services/pocketbase')
    
    await addUserToSite('user-2', 'site-1')
    
    expect(siteService.addUserToSite).toHaveBeenCalledWith('user-2', 'site-1', 'supervisor')
  })

  it('should remove user from site', async () => {
    const { removeUserFromSite } = useSite()
    const { siteService } = await import('../../services/pocketbase')
    
    await removeUserFromSite('user-2', 'site-1')
    
    expect(siteService.removeUserFromSite).toHaveBeenCalledWith('user-2', 'site-1')
  })
})