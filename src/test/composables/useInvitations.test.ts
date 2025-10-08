import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useInvitations } from '../../composables/useInvitations'

// Mock the services
vi.mock('../../services/pocketbase', () => ({
  siteInvitationService: {
    getBySite: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn()
  },
  authService: {
    currentUser: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      sites: ['site-1'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }
  },
  siteUserService: {
    getUserRoleForSite: vi.fn(),
    getBySite: vi.fn()
  },
  pb: {
    collection: vi.fn(),
    authStore: { 
      isValid: true,
      record: { 
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      }
    }
  }
}))

describe('useInvitations', () => {
  let mockSiteInvitationService: any
  let mockSiteUserService: any
  let mockPb: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { siteInvitationService, siteUserService, pb, authService } = await import('../../services/pocketbase')
    mockSiteInvitationService = vi.mocked(siteInvitationService)
    mockSiteUserService = vi.mocked(siteUserService)
    mockPb = vi.mocked(pb)

    // Reset auth service to have a valid user
    vi.mocked(authService).currentUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      sites: ['site-1'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }
  })

  describe('sendInvitation', () => {
    it('should successfully send invitation to new user', async () => {
      const { sendInvitation } = useInvitations()
      
      // Mock no existing site members
      mockSiteUserService.getBySite.mockResolvedValue([])
      
      // Mock no existing invitations
      mockSiteInvitationService.getBySite.mockResolvedValue([])
      
      // Mock successful invitation creation
      const mockInvitation = {
        id: 'inv-1',
        email: 'newuser@example.com',
        role: 'supervisor',
        site: 'site-1',
        status: 'pending',
        invited_by: 'user-1',
        invited_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-08T00:00:00Z'
      }
      mockSiteInvitationService.create.mockResolvedValue(mockInvitation)
      
      const result = await sendInvitation('site-1', 'newuser@example.com', 'supervisor')
      
      expect(result).toEqual(mockInvitation)
      expect(mockSiteInvitationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          site: 'site-1',
          email: 'newuser@example.com',
          role: 'supervisor',
          invited_by: 'user-1',
          status: 'pending'
        })
      )
    })

    it('should prevent inviting existing site members', async () => {
      const { sendInvitation } = useInvitations()
      
      // Mock siteUserService.getBySite to return existing member
      mockSiteUserService.getBySite.mockResolvedValue([
        {
          id: 'site-user-1',
          site: 'site-1',
          user: 'user-2',
          role: 'owner',
          is_active: true,
          assigned_by: 'user-1',
          assigned_at: '2024-01-01T00:00:00Z',
          expand: {
            user: {
              id: 'user-2',
              email: 'existinguser@example.com',
              name: 'Existing User'
            }
          }
        }
      ])
      
      // Attempt to send invitation should throw error
      await expect(
        sendInvitation('site-1', 'existinguser@example.com', 'supervisor')
      ).rejects.toThrow('existinguser@example.com is already a member of this site with the role: owner')
      
      // Should not create invitation
      expect(mockSiteInvitationService.create).not.toHaveBeenCalled()
    })

    it('should prevent duplicate pending invitations', async () => {
      const { sendInvitation } = useInvitations()
      
      // Mock no existing site members
      mockSiteUserService.getBySite.mockResolvedValue([])
      
      // Mock existing pending invitation
      const existingInvitation = {
        id: 'inv-1',
        email: 'pendinguser@example.com',
        role: 'supervisor',
        site: 'site-1',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 1 day from now
      }
      mockSiteInvitationService.getBySite.mockResolvedValue([existingInvitation])
      
      // Attempt to send invitation should throw error
      await expect(
        sendInvitation('site-1', 'pendinguser@example.com', 'supervisor')
      ).rejects.toThrow('An active invitation already exists for pendinguser@example.com')
      
      // Should not create invitation
      expect(mockSiteInvitationService.create).not.toHaveBeenCalled()
    })

    it('should allow inviting user when existing invitation is expired', async () => {
      const { sendInvitation } = useInvitations()
      
      // Mock no existing site members
      mockSiteUserService.getBySite.mockResolvedValue([])
      
      // Mock expired invitation
      const expiredInvitation = {
        id: 'inv-1',
        email: 'expireduser@example.com',
        role: 'supervisor',
        site: 'site-1',
        status: 'pending',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      }
      mockSiteInvitationService.getBySite.mockResolvedValue([expiredInvitation])
      
      // Mock successful invitation creation
      const mockInvitation = {
        id: 'inv-2',
        email: 'expireduser@example.com',
        role: 'supervisor',
        site: 'site-1',
        status: 'pending',
        invited_by: 'user-1',
        invited_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-08T00:00:00Z'
      }
      mockSiteInvitationService.create.mockResolvedValue(mockInvitation)
      
      const result = await sendInvitation('site-1', 'expireduser@example.com', 'supervisor')
      
      expect(result).toEqual(mockInvitation)
      expect(mockSiteInvitationService.create).toHaveBeenCalled()
    })

    it('should allow inviting user who is not a site member', async () => {
      const { sendInvitation } = useInvitations()
      
      // Mock no existing site members with this email
      mockSiteUserService.getBySite.mockResolvedValue([])
      
      // Mock no existing invitations
      mockSiteInvitationService.getBySite.mockResolvedValue([])
      
      // Mock successful invitation creation
      const mockInvitation = {
        id: 'inv-1',
        email: 'newuser@example.com',
        role: 'supervisor',
        site: 'site-1',
        status: 'pending',
        invited_by: 'user-1',
        invited_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-08T00:00:00Z'
      }
      mockSiteInvitationService.create.mockResolvedValue(mockInvitation)
      
      const result = await sendInvitation('site-1', 'newuser@example.com', 'supervisor')
      
      expect(result).toEqual(mockInvitation)
      expect(mockSiteInvitationService.create).toHaveBeenCalled()
    })

    it('should handle email case insensitivity', async () => {
      const { sendInvitation } = useInvitations()
      
      // Mock existing site member with lowercase email
      mockSiteUserService.getBySite.mockResolvedValue([
        {
          id: 'site-user-1',
          site: 'site-1',
          user: 'user-2',
          role: 'owner',
          is_active: true,
          assigned_by: 'user-1',
          assigned_at: '2024-01-01T00:00:00Z',
          expand: {
            user: {
              id: 'user-2',
              email: 'user@example.com',
              name: 'Existing User'
            }
          }
        }
      ])
      
      // Attempt to send invitation with uppercase email should throw error
      await expect(
        sendInvitation('site-1', 'User@EXAMPLE.COM', 'supervisor')
      ).rejects.toThrow('user@example.com is already a member of this site with the role: owner')
      
      // Should check via siteUserService
      expect(mockSiteUserService.getBySite).toHaveBeenCalledWith('site-1')
    })

    it('should prevent users from inviting themselves', async () => {
      const { sendInvitation } = useInvitations()
      
      // Attempt to send invitation to self should throw error
      await expect(
        sendInvitation('site-1', 'test@example.com', 'supervisor')
      ).rejects.toThrow('You cannot send an invitation to yourself')
      
      // Should not check for existing members or create invitation
      expect(mockSiteUserService.getBySite).not.toHaveBeenCalled()
      expect(mockSiteInvitationService.create).not.toHaveBeenCalled()
    })

    it('should prevent self-invitation with different email casing', async () => {
      const { sendInvitation } = useInvitations()
      
      // Attempt to send invitation to self with uppercase email should throw error
      await expect(
        sendInvitation('site-1', 'TEST@EXAMPLE.COM', 'supervisor')
      ).rejects.toThrow('You cannot send an invitation to yourself')
      
      // Should not check for existing members or create invitation
      expect(mockSiteUserService.getBySite).not.toHaveBeenCalled()
      expect(mockSiteInvitationService.create).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      const { sendInvitation } = useInvitations()

      // Mock no authenticated user
      const { authService } = await import('../../services/pocketbase')
      vi.mocked(authService).currentUser = null

      await expect(
        sendInvitation('site-1', 'test@example.com', 'supervisor')
      ).rejects.toThrow('User not authenticated')
    })
  })

  describe('loadSiteInvitations', () => {
    it('should load pending invitations for a site', async () => {
      const { loadSiteInvitations, pendingInvitations } = useInvitations()

      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'user1@example.com',
          role: 'supervisor',
          site: 'site-1',
          status: 'pending' as const,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'inv-2',
          email: 'user2@example.com',
          role: 'accountant',
          site: 'site-1',
          status: 'pending' as const,
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        }
      ]

      mockSiteInvitationService.getBySite.mockResolvedValue(mockInvitations)

      await loadSiteInvitations('site-1')

      expect(mockSiteInvitationService.getBySite).toHaveBeenCalledWith('site-1')
      expect(pendingInvitations.value.length).toBe(2)
    })

    it('should filter out non-pending invitations', async () => {
      const { loadSiteInvitations, pendingInvitations } = useInvitations()

      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'user1@example.com',
          role: 'supervisor',
          site: 'site-1',
          status: 'pending' as const,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'inv-2',
          email: 'user2@example.com',
          role: 'accountant',
          site: 'site-1',
          status: 'accepted' as const,
          expires_at: new Date().toISOString()
        }
      ]

      mockSiteInvitationService.getBySite.mockResolvedValue(mockInvitations)

      await loadSiteInvitations('site-1')

      expect(pendingInvitations.value.length).toBe(1)
      expect(pendingInvitations.value[0].status).toBe('pending')
    })
  })

  describe('loadReceivedInvitations', () => {
    it('should load invitations for current user', async () => {
      const { loadReceivedInvitations, receivedInvitations } = useInvitations()

      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'test@example.com',
          role: 'supervisor',
          site: 'site-1',
          status: 'pending' as const,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      mockSiteInvitationService.getAll.mockResolvedValue(mockInvitations)
      mockSiteUserService.getUserRoleForSite.mockResolvedValue(null)

      await loadReceivedInvitations()

      expect(mockSiteInvitationService.getAll).toHaveBeenCalled()
      expect(receivedInvitations.value.length).toBe(1)
    })

    it('should filter out invitations for sites user is already member of', async () => {
      const { loadReceivedInvitations, receivedInvitations } = useInvitations()

      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'test@example.com',
          role: 'supervisor',
          site: 'site-1',
          status: 'pending' as const,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'inv-2',
          email: 'test@example.com',
          role: 'accountant',
          site: 'site-2',
          status: 'pending' as const,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      mockSiteInvitationService.getAll.mockResolvedValue(mockInvitations)
      mockSiteUserService.getUserRoleForSite
        .mockResolvedValueOnce('owner') // Already member of site-1
        .mockResolvedValueOnce(null) // Not member of site-2

      await loadReceivedInvitations()

      expect(receivedInvitations.value.length).toBe(1)
      expect(receivedInvitations.value[0].site).toBe('site-2')
    })
  })

  describe('acceptInvitation', () => {
    it('should accept a valid invitation', async () => {
      const { acceptInvitation, loadReceivedInvitations, receivedInvitations } = useInvitations()

      const mockInvitation = {
        id: 'inv-1',
        email: 'test@example.com',
        role: 'supervisor',
        site: 'site-1',
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      mockSiteInvitationService.getAll.mockResolvedValue([mockInvitation])
      mockSiteUserService.getUserRoleForSite.mockResolvedValue(null)

      await loadReceivedInvitations()

      mockSiteInvitationService.updateStatus.mockResolvedValue(mockInvitation)
      mockSiteUserService.getUserRoleForSite.mockResolvedValue(null)

      const result = await acceptInvitation('inv-1')

      expect(mockSiteInvitationService.updateStatus).toHaveBeenCalledWith('inv-1', 'accepted')
      expect(result).toEqual(mockInvitation)
    })

    it('should throw error if invitation not found', async () => {
      const { acceptInvitation } = useInvitations()

      await expect(
        acceptInvitation('nonexistent-inv')
      ).rejects.toThrow('Invitation not found')
    })

    it('should throw error if user already a member', async () => {
      const { acceptInvitation, loadReceivedInvitations } = useInvitations()

      const mockInvitation = {
        id: 'inv-1',
        email: 'test@example.com',
        role: 'supervisor',
        site: 'site-1',
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      mockSiteInvitationService.getAll.mockResolvedValue([mockInvitation])
      mockSiteUserService.getUserRoleForSite.mockResolvedValue(null)

      await loadReceivedInvitations()

      mockSiteUserService.getUserRoleForSite.mockResolvedValue('owner')

      await expect(
        acceptInvitation('inv-1')
      ).rejects.toThrow('You are already a member of this site')
    })
  })

  describe('rejectInvitation', () => {
    it('should delete invitation', async () => {
      const { rejectInvitation } = useInvitations()

      mockSiteInvitationService.delete.mockResolvedValue(true)
      mockSiteInvitationService.getAll.mockResolvedValue([])

      await rejectInvitation('inv-1')

      expect(mockSiteInvitationService.delete).toHaveBeenCalledWith('inv-1')
    })
  })

  describe('cancelInvitation', () => {
    it('should cancel invitation and reload', async () => {
      const { cancelInvitation, loadSiteInvitations, pendingInvitations } = useInvitations()

      const mockInvitation = {
        id: 'inv-1',
        email: 'user@example.com',
        role: 'supervisor',
        site: 'site-1',
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      mockSiteInvitationService.getBySite.mockResolvedValue([mockInvitation])
      await loadSiteInvitations('site-1')

      mockSiteInvitationService.delete.mockResolvedValue(true)
      mockSiteInvitationService.getBySite.mockResolvedValue([])

      await cancelInvitation('inv-1')

      expect(mockSiteInvitationService.delete).toHaveBeenCalledWith('inv-1')
    })
  })

  describe('Computed Properties', () => {
    it('should compute hasReceivedInvitations', async () => {
      const { loadReceivedInvitations, hasReceivedInvitations } = useInvitations()

      mockSiteInvitationService.getAll.mockResolvedValue([])
      await loadReceivedInvitations()
      expect(hasReceivedInvitations.value).toBe(false)

      const mockInvitation = {
        id: 'inv-1',
        email: 'test@example.com',
        role: 'supervisor',
        site: 'site-1',
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      mockSiteInvitationService.getAll.mockResolvedValue([mockInvitation])
      mockSiteUserService.getUserRoleForSite.mockResolvedValue(null)
      await loadReceivedInvitations()

      expect(hasReceivedInvitations.value).toBe(true)
    })

    it('should compute receivedInvitationsCount', async () => {
      const { loadReceivedInvitations, receivedInvitationsCount } = useInvitations()

      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'test@example.com',
          role: 'supervisor',
          site: 'site-1',
          status: 'pending' as const,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'inv-2',
          email: 'test@example.com',
          role: 'accountant',
          site: 'site-2',
          status: 'pending' as const,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      mockSiteInvitationService.getAll.mockResolvedValue(mockInvitations)
      mockSiteUserService.getUserRoleForSite.mockResolvedValue(null)
      await loadReceivedInvitations()

      expect(receivedInvitationsCount.value).toBe(2)
    })
  })
})