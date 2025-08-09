import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../utils/test-setup'
import InvitesView from '../../views/InvitesView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock i18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'users.invitations': 'Invitations',
        'users.manageInvitations': 'Manage your site invitations and join new construction projects',
        'common.pending': 'Pending',
        'users.loadingInvitations': 'Loading invitations...',
        'users.noInvitations': 'No invitations',
        'users.noInvitationsMessage': 'You don\'t have any pending invitations at the moment',
        'nav.dashboard': 'Dashboard',
        'users.constructionSite': 'Construction Site',
        'users.noDescriptionAvailable': 'No description available',
        'common.unknown': 'Unknown',
        'users.roles.owner': 'Owner',
        'users.roles.supervisor': 'Supervisor',
        'users.roles.accountant': 'Accountant',
        'site.totalUnits': 'Total Units',
        'users.areaSqft': 'Area (sq.ft)',
        'users.yourRole': 'Your Role',
        'users.roleDescriptions.ownerFull': 'Full access to all features and settings',
        'users.roleDescriptions.supervisorFull': 'Manage day-to-day operations and deliveries',
        'users.roleDescriptions.accountantFull': 'Handle financial records and payments',
        'users.roleDescriptionNotAvailable': 'Role description not available',
        'common.expired': 'Expired',
        'users.daysLeft': ' days left',
        'users.hoursLeft': ' hours left',
        'users.expiresSoon': 'Expires soon',
        'users.accepting': 'Accepting...',
        'users.accept': 'Accept',
        'users.declining': 'Declining...',
        'users.decline': 'Decline',
        'users.invitationAccepted': 'Invitation accepted successfully',
        'users.failedToAcceptInvitation': 'Failed to accept invitation',
        'users.confirmDeclineInvitation': 'Are you sure you want to decline this invitation?',
        'users.invitationDeclined': 'Invitation declined',
        'users.failedToDeclineInvitation': 'Failed to decline invitation'
      }
      return translations[key] || key
    }
  })
}))

// Mock useInvitations composable
const mockInvitations = [
  {
    id: 'inv-1',
    site: 'site-1',
    role: 'supervisor',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    expand: {
      site: {
        id: 'site-1',
        name: 'Test Construction Site',
        description: 'A large residential complex',
        total_units: 100,
        total_planned_area: 50000
      },
      invited_by: {
        id: 'user-1',
        name: 'John Doe'
      }
    }
  },
  {
    id: 'inv-2',
    site: 'site-2',
    role: 'accountant',
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    expand: {
      site: {
        id: 'site-2',
        name: 'Office Building Project',
        description: 'Commercial office space',
        total_units: 50,
        total_planned_area: 25000
      },
      invited_by: {
        id: 'user-2',
        name: 'Jane Smith'
      }
    }
  }
]

const mockLoadReceivedInvitations = vi.fn()
const mockAcceptInvitation = vi.fn()
const mockRejectInvitation = vi.fn()

// Create reactive mocks that can be controlled in tests
const { ref } = require('vue')
const mockInvitationsRef = ref(mockInvitations)
const mockIsLoadingRef = ref(false)
const mockCanDeleteRef = ref(true)

vi.mock('../../composables/useInvitations', () => ({
  useInvitations: () => ({
    receivedInvitations: mockInvitationsRef,
    isLoading: mockIsLoadingRef,
    loadReceivedInvitations: mockLoadReceivedInvitations,
    acceptInvitation: mockAcceptInvitation,
    rejectInvitation: mockRejectInvitation
  })
}))

// Mock usePermissions composable
vi.mock('../../composables/usePermissions', () => ({
  usePermissions: () => ({
    canDelete: mockCanDeleteRef
  })
}))

// Mock Lucide icons
vi.mock('lucide-vue-next', () => ({
  Mail: { template: '<span>Mail</span>' },
  Clock: { template: '<span>Clock</span>' },
  Loader2: { template: '<span>Loader2</span>' },
  Building: { template: '<span>Building</span>' },
  Home: { template: '<span>Home</span>' },
  Square: { template: '<span>Square</span>' },
  CheckCircle: { template: '<span>CheckCircle</span>' },
  X: { template: '<span>X</span>' },
  ArrowLeft: { template: '<span>ArrowLeft</span>' }
}))

// Mock PocketBase for Pinia
vi.mock('../../services/pocketbase', () => ({
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
  setCurrentUserRole: vi.fn(),
  calculatePermissions: vi.fn().mockReturnValue({
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canManageRoles: true,
    canExport: true,
    canViewFinancials: true
  })
}))

describe('InvitesView', () => {
  let wrapper: any
  let pinia: any
  let router: any

  const createWrapper = (customMocks = {}) => {
    router = createMockRouter()
    
    return mount(InvitesView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true
        }
      }
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { pinia: testPinia } = setupTestPinia()
    pinia = testPinia
    
    // Reset reactive mock values to defaults
    mockInvitationsRef.value = mockInvitations
    mockIsLoadingRef.value = false
    mockCanDeleteRef.value = true
    
    // Reset mocks
    mockLoadReceivedInvitations.mockClear()
    mockAcceptInvitation.mockResolvedValue(true)
    mockRejectInvitation.mockResolvedValue(true)
    
    // Mock window methods
    window.alert = vi.fn()
    window.confirm = vi.fn(() => true)
    
    wrapper = createWrapper()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Basic Rendering', () => {
    it('should render the page title and description', () => {
      expect(wrapper.text()).toContain('Invitations')
      expect(wrapper.text()).toContain('Manage your site invitations and join new construction projects')
    })

    it('should show pending invitations count', () => {
      expect(wrapper.text()).toContain('Pending')
      expect(wrapper.text()).toContain('2') // 2 mock invitations
    })

    it('should call loadReceivedInvitations on mount', () => {
      expect(mockLoadReceivedInvitations).toHaveBeenCalled()
    })
  })

  describe('Invitations Display', () => {
    it('should display all invitations', () => {
      expect(wrapper.text()).toContain('Test Construction Site')
      expect(wrapper.text()).toContain('Office Building Project')
    })

    it('should show invitation details', () => {
      expect(wrapper.text()).toContain('A large residential complex')
      expect(wrapper.text()).toContain('Commercial office space')
      expect(wrapper.text()).toContain('100') // total units
      expect(wrapper.text()).toContain('50,000') // formatted area
    })

    it('should display inviter information', () => {
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('Jane Smith')
    })

    it('should show role badges', () => {
      expect(wrapper.text()).toContain('Supervisor')
      expect(wrapper.text()).toContain('Accountant')
    })

    it('should display time left for invitations', () => {
      expect(wrapper.text()).toContain('days left')
      expect(wrapper.text()).toContain('hours left')
    })

    it('should show role descriptions', () => {
      expect(wrapper.text()).toContain('Manage day-to-day operations and deliveries')
      expect(wrapper.text()).toContain('Handle financial records and payments')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no invitations', async () => {
      // Set empty invitations array
      mockInvitationsRef.value = []
      
      const emptyWrapper = createWrapper()
      await emptyWrapper.vm.$nextTick()
      
      expect(emptyWrapper.text()).toContain('No invitations')
      expect(emptyWrapper.text()).toContain('You don\'t have any pending invitations at the moment')
      expect(emptyWrapper.text()).toContain('Dashboard')
      
      emptyWrapper.unmount()
    })

    it('should navigate to dashboard when clicking button in empty state', async () => {
      // Set empty invitations array
      mockInvitationsRef.value = []
      
      const emptyWrapper = createWrapper()
      await emptyWrapper.vm.$nextTick()
      
      const routerPushSpy = vi.spyOn(router, 'push')
      const dashboardButton = emptyWrapper.find('button')
      await dashboardButton.trigger('click')
      
      expect(routerPushSpy).toHaveBeenCalledWith('/dashboard')
      
      emptyWrapper.unmount()
    })
  })

  describe('Loading State', () => {
    it('should show loading state', async () => {
      // Set loading state
      mockIsLoadingRef.value = true
      mockInvitationsRef.value = []
      
      const loadingWrapper = createWrapper()
      await loadingWrapper.vm.$nextTick()
      
      expect(loadingWrapper.text()).toContain('Loading invitations...')
      
      loadingWrapper.unmount()
    })
  })

  describe('Accept Invitation', () => {
    it('should accept invitation when clicking accept button', async () => {
      const acceptButtons = wrapper.findAll('button').filter((btn: any) => btn.text().includes('Accept'))
      expect(acceptButtons.length).toBe(2)
      
      await acceptButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(mockAcceptInvitation).toHaveBeenCalledWith('inv-1')
    })

    it('should show loading state while accepting', async () => {
      mockAcceptInvitation.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      const acceptButtons = wrapper.findAll('button').filter((btn: any) => btn.text().includes('Accept'))
      acceptButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('Accepting...')
      
      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    it('should show success message after accepting', async () => {
      const acceptButtons = wrapper.findAll('button').filter((btn: any) => btn.text().includes('Accept'))
      await acceptButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(window.alert).toHaveBeenCalledWith('Invitation accepted successfully')
    })

    it('should handle accept error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockAcceptInvitation.mockRejectedValue(new Error('Accept failed'))
      
      const acceptButtons = wrapper.findAll('button').filter((btn: any) => btn.text().includes('Accept'))
      await acceptButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(consoleSpy).toHaveBeenCalledWith('Error accepting invitation:', expect.any(Error))
      expect(window.alert).toHaveBeenCalledWith('Accept failed')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Decline Invitation', () => {
    it('should ask for confirmation before declining', async () => {
      const declineButtons = wrapper.findAll('button').filter((btn: any) => btn.text().includes('Decline'))
      expect(declineButtons.length).toBe(2)
      
      await declineButtons[0].trigger('click')
      
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to decline this invitation?')
    })

    it('should decline invitation when confirmed', async () => {
      window.confirm = vi.fn(() => true)
      
      const declineButtons = wrapper.findAll('button').filter((btn: any) => btn.text().includes('Decline'))
      await declineButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(mockRejectInvitation).toHaveBeenCalledWith('inv-1')
      expect(window.alert).toHaveBeenCalledWith('Invitation declined')
    })

    it('should not decline when user cancels confirmation', async () => {
      window.confirm = vi.fn(() => false)
      
      const declineButtons = wrapper.findAll('button').filter((btn: any) => btn.text().includes('Decline'))
      await declineButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(mockRejectInvitation).not.toHaveBeenCalled()
    })

    it('should show loading state while declining', async () => {
      window.confirm = vi.fn(() => true)
      mockRejectInvitation.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      const declineButtons = wrapper.findAll('button').filter((btn: any) => btn.text().includes('Decline'))
      declineButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('Declining...')
      
      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    it('should handle decline error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      window.confirm = vi.fn(() => true)
      mockRejectInvitation.mockRejectedValue(new Error('Decline failed'))
      
      const declineButtons = wrapper.findAll('button').filter((btn: any) => btn.text().includes('Decline'))
      await declineButtons[0].trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(consoleSpy).toHaveBeenCalledWith('Error declining invitation:', expect.any(Error))
      expect(window.alert).toHaveBeenCalledWith('Failed to decline invitation')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Utility Functions', () => {
    it('should get correct initials from name', () => {
      expect(wrapper.vm.getInviterInitials('John Doe')).toBe('JD')
      expect(wrapper.vm.getInviterInitials('Jane')).toBe('J')
      expect(wrapper.vm.getInviterInitials()).toBe('U')
    })

    it('should format numbers correctly', () => {
      expect(wrapper.vm.formatNumber(50000)).toBe('50,000')
      expect(wrapper.vm.formatNumber(1000)).toBe('1,000')
    })

    it('should get correct role badge class', () => {
      expect(wrapper.vm.getRoleBadgeClass('owner')).toContain('bg-blue-100')
      expect(wrapper.vm.getRoleBadgeClass('supervisor')).toContain('bg-green-100')
      expect(wrapper.vm.getRoleBadgeClass('accountant')).toContain('bg-amber-100')
    })

    it('should format time left correctly', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const nearDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      const pastDate = new Date(Date.now() - 1000).toISOString()
      
      expect(wrapper.vm.formatTimeLeft(futureDate)).toContain('days left')
      expect(wrapper.vm.formatTimeLeft(nearDate)).toContain('hours left')
      expect(wrapper.vm.formatTimeLeft(pastDate)).toBe('Expired')
    })
  })

  describe('Permissions', () => {
    it('should disable decline button when user cannot delete', async () => {
      // Set canDelete to false
      mockCanDeleteRef.value = false
      
      const restrictedWrapper = createWrapper()
      await restrictedWrapper.vm.$nextTick()
      
      const declineButtons = restrictedWrapper.findAll('button').filter((btn: any) => btn.text().includes('Decline'))
      expect(declineButtons[0].attributes('disabled')).toBeDefined()
      
      restrictedWrapper.unmount()
    })
  })
})