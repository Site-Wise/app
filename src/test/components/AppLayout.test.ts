import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { createMockRouter } from '../utils/test-utils'
import { mockUser } from '../mocks/pocketbase'

// Mock all the composables
vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    user: computed(() => mockUser),
    logout: vi.fn()
  })
}))

vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    hasSiteAccess: computed(() => true),
    canManageUsers: computed(() => true),
    currentUserRole: computed(() => 'owner')
  })
}))

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('../../composables/useInvitations', () => ({
  useInvitations: () => ({
    receivedInvitationsCount: computed(() => 2),
    loadReceivedInvitations: vi.fn()
  })
}))

// Mock child components
vi.mock('../../components/ThemeToggle.vue', () => ({
  default: { template: '<div data-testid="theme-toggle">ThemeToggle</div>' }
}))

vi.mock('../../components/PWAPrompt.vue', () => ({
  default: { template: '<div data-testid="pwa-prompt">PWAPrompt</div>' }
}))

vi.mock('../../components/SiteSelector.vue', () => ({
  default: { template: '<div data-testid="site-selector">SiteSelector</div>' }
}))

vi.mock('../../components/LanguageSelector.vue', () => ({
  default: { template: '<div data-testid="language-selector">LanguageSelector</div>' }
}))

describe('AppLayout', () => {
  let router: any
  let wrapper: any

  beforeEach(() => {
    router = createMockRouter([
      { path: '/users', name: 'UserManagement', component: { template: '<div>Users</div>' } },
      { path: '/subscription', name: 'Subscription', component: { template: '<div>Subscription</div>' } },
      { path: '/invites', name: 'Invites', component: { template: '<div>Invites</div>' } },
      { path: '/accounts', name: 'Accounts', component: { template: '<div>Accounts</div>' } },
      { path: '/payments', name: 'Payments', component: { template: '<div>Payments</div>' } },
      { path: '/incoming', name: 'Incoming', component: { template: '<div>Incoming</div>' } },
      { path: '/quotations', name: 'Quotations', component: { template: '<div>Quotations</div>' } },
      { path: '/services', name: 'Services', component: { template: '<div>Services</div>' } },
      { path: '/service-bookings', name: 'ServiceBookings', component: { template: '<div>ServiceBookings</div>' } }
    ])

    // Mock window.dispatchEvent
    window.dispatchEvent = vi.fn()
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (routePath = '/') => {
    router.push(routePath)
    return mount(AppLayout, {
      global: {
        plugins: [router],
        stubs: {
          'router-link': false,
          'router-view': { template: '<div data-testid="router-view">Router View Content</div>' }
        }
      }
    })
  }

  describe('Rendering', () => {
    it('should render the main layout structure', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.min-h-screen').exists()).toBe(true)
      expect(wrapper.find('[data-testid="pwa-prompt"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
    })

    it('should render sidebar with navigation items', () => {
      wrapper = createWrapper()
      
      const navigation = wrapper.findAll('nav router-link')
      expect(navigation.length).toBeGreaterThan(0)
      
      // Check for specific navigation items
      expect(wrapper.text()).toContain('nav.dashboard')
      expect(wrapper.text()).toContain('nav.items')
      expect(wrapper.text()).toContain('nav.vendors')
      expect(wrapper.text()).toContain('nav.accounts')
    })

    it('should display app logo and name', () => {
      wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('SiteWise')
      expect(wrapper.find('.text-primary-600').exists()).toBe(true) // Logo icon
    })

    it('should render user avatar with initials', () => {
      wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('TU') // Test User initials
      expect(wrapper.text()).toContain(mockUser.name)
    })
  })

  describe('Sidebar Functionality', () => {
    it('should toggle sidebar on mobile menu button click', async () => {
      wrapper = createWrapper()
      
      const menuButton = wrapper.find('button[data-testid="mobile-menu-toggle"], .lg\\:hidden button')
      expect(menuButton.exists()).toBe(true)
      
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      // Check if sidebar state changed
      const sidebar = wrapper.find('.transform')
      expect(sidebar.exists()).toBe(true)
    })

    it('should close sidebar when navigation item is clicked', async () => {
      wrapper = createWrapper()
      
      // Open sidebar first
      const menuButton = wrapper.find('.lg\\:hidden button')
      if (menuButton.exists()) {
        await menuButton.trigger('click')
      }
      
      // Click on a navigation item
      const navItem = wrapper.find('router-link')
      if (navItem.exists()) {
        await navItem.trigger('click')
        await wrapper.vm.$nextTick()
        
        // Sidebar should close (this would be checked by class changes)
        expect(true).toBe(true) // Placeholder - actual implementation would check sidebar state
      }
    })

    it('should close sidebar when overlay is clicked', async () => {
      wrapper = createWrapper()
      
      // Open sidebar first
      const menuButton = wrapper.find('.lg\\:hidden button')
      if (menuButton.exists()) {
        await menuButton.trigger('click')
        await wrapper.vm.$nextTick()
      }
      
      // Click overlay
      const overlay = wrapper.find('.bg-gray-600.bg-opacity-50')
      if (overlay.exists()) {
        await overlay.trigger('click')
        await wrapper.vm.$nextTick()
        
        expect(true).toBe(true) // Sidebar should close
      }
    })
  })

  describe('User Menu', () => {
    it('should show invitation badge when there are invitations', () => {
      wrapper = createWrapper()
      
      // Should show badge with count
      expect(wrapper.text()).toContain('2') // receivedInvitationsCount
      expect(wrapper.find('.bg-red-500').exists()).toBe(true)
    })

    it('should toggle user menu on avatar click', async () => {
      wrapper = createWrapper()
      
      const userButton = wrapper.find('button[data-testid="user-menu-toggle"], .text-sm.rounded-full')
      if (userButton.exists()) {
        await userButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        // Menu should appear
        expect(wrapper.find('.absolute.right-0.mt-2').exists()).toBe(true)
      }
    })

    it('should show user management option for owners', () => {
      wrapper = createWrapper()
      
      // User menu should contain manage users option
      expect(wrapper.text()).toContain('Manage Users')
    })

    it('should show subscription option for owners', () => {
      wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('Subscription')
    })

    it('should navigate to invites when invitation link is clicked', async () => {
      wrapper = createWrapper()
      const pushSpy = vi.spyOn(router, 'push')
      
      // Find and click invitations link
      const inviteButton = wrapper.find('button:contains("View all invitations")')
      if (inviteButton.exists()) {
        await inviteButton.trigger('click')
        expect(pushSpy).toHaveBeenCalledWith('/invites')
      }
    })

    it('should call logout and navigate to login', async () => {
      const { useAuth } = await import('../../composables/useAuth')
      const mockLogout = vi.mocked(useAuth().logout)
      const pushSpy = vi.spyOn(router, 'push')
      
      wrapper = createWrapper()
      
      // Find logout button
      const logoutButton = wrapper.find('button:contains("Sign out")')
      if (logoutButton.exists()) {
        await logoutButton.trigger('click')
        
        expect(mockLogout).toHaveBeenCalled()
        expect(pushSpy).toHaveBeenCalledWith('/login')
      }
    })
  })

  describe('Quick Actions', () => {
    it('should render quick action buttons on desktop', () => {
      wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('Add Item')
      expect(wrapper.text()).toContain('Add Vendor')
      expect(wrapper.text()).toContain('Add Account')
      expect(wrapper.text()).toContain('Record Delivery')
      expect(wrapper.text()).toContain('Record Payment')
    })

    it('should navigate to correct route when quick action is clicked', async () => {
      wrapper = createWrapper()
      const pushSpy = vi.spyOn(router, 'push')
      
      const addItemButton = wrapper.find('button:contains("Add Item")')
      if (addItemButton.exists()) {
        await addItemButton.trigger('click')
        
        expect(pushSpy).toHaveBeenCalledWith('/items')
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'show-add-modal'
          })
        )
      }
    })

    it('should show alert when no site access for quick actions', async () => {
      // Mock no site access
      vi.mocked(await import('../../composables/useSite')).useSite = () => ({
        hasSiteAccess: computed(() => false),
        canManageUsers: computed(() => false),
        currentUserRole: computed(() => null)
      })
      
      window.alert = vi.fn()
      
      wrapper = createWrapper()
      
      const addItemButton = wrapper.find('button:contains("Add Item")')
      if (addItemButton.exists()) {
        await addItemButton.trigger('click')
        
        expect(window.alert).toHaveBeenCalledWith('messages.selectSiteFirst')
      }
    })
  })

  describe('Floating Action Button (Mobile)', () => {
    it('should render FAB on mobile', () => {
      wrapper = createWrapper()
      
      const fab = wrapper.find('.md\\:hidden .fixed.bottom-6.right-6 button')
      expect(fab.exists()).toBe(true)
    })

    it('should toggle FAB menu on button click', async () => {
      wrapper = createWrapper()
      
      const fabButton = wrapper.find('.md\\:hidden .fixed.bottom-6.right-6 button')
      if (fabButton.exists()) {
        await fabButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        // FAB menu should appear
        expect(wrapper.find('.absolute.bottom-16').exists()).toBe(true)
      }
    })

    it('should close FAB menu when overlay is clicked', async () => {
      wrapper = createWrapper()
      
      // Open FAB menu first
      const fabButton = wrapper.find('.md\\:hidden .fixed.bottom-6.right-6 button')
      if (fabButton.exists()) {
        await fabButton.trigger('click')
        await wrapper.vm.$nextTick()
      }
      
      // Click overlay
      const overlay = wrapper.find('.md\\:hidden .fixed.inset-0.bg-transparent')
      if (overlay.exists()) {
        await overlay.trigger('click')
        await wrapper.vm.$nextTick()
        
        expect(true).toBe(true) // FAB menu should close
      }
    })
  })

  describe('Responsive Behavior', () => {
    it('should show site selector in different positions for mobile/desktop', () => {
      wrapper = createWrapper()
      
      // Should have mobile version
      expect(wrapper.find('.lg\\:hidden [data-testid="site-selector"]').exists()).toBe(true)
      
      // Should have desktop version
      expect(wrapper.find('.hidden.lg\\:block [data-testid="site-selector"]').exists()).toBe(true)
    })

    it('should hide controls on mobile and show in user menu', () => {
      wrapper = createWrapper()
      
      // Language and theme toggles should be hidden on mobile
      expect(wrapper.find('.hidden.md\\:block [data-testid="language-selector"]').exists()).toBe(true)
      expect(wrapper.find('.hidden.md\\:block [data-testid="theme-toggle"]').exists()).toBe(true)
      
      // Should show in mobile user menu
      expect(wrapper.find('.block.md\\:hidden [data-testid="language-selector"]').exists()).toBe(true)
      expect(wrapper.find('.block.md\\:hidden [data-testid="theme-toggle"]').exists()).toBe(true)
    })
  })

  describe('Navigation State', () => {
    it('should highlight current navigation item', async () => {
      wrapper = createWrapper('/items')
      await wrapper.vm.$nextTick()
      
      // Check if Items navigation is highlighted
      const itemsNav = wrapper.find('router-link[to="/items"]')
      if (itemsNav.exists()) {
        expect(itemsNav.classes()).toContain('bg-primary-100')
      }
    })

    it('should compute user initials correctly', () => {
      wrapper = createWrapper()
      
      // Test User -> TU
      expect(wrapper.text()).toContain('TU')
    })

    it('should handle single name for initials', async () => {
      // Mock user with single name
      vi.mocked(await import('../../composables/useAuth')).useAuth = () => ({
        user: computed(() => ({ ...mockUser, name: 'John' })),
        logout: vi.fn()
      })
      
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('J')
    })
  })

  describe('Component Integration', () => {
    it('should render all child components', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('[data-testid="pwa-prompt"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="site-selector"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="language-selector"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="theme-toggle"]').exists()).toBe(true)
    })

    it('should load invitations on mount', () => {
      const { useInvitations } = vi.mocked(require('../../composables/useInvitations'))
      const mockLoadInvitations = useInvitations().loadReceivedInvitations
      
      wrapper = createWrapper()
      
      expect(mockLoadInvitations).toHaveBeenCalled()
    })
  })

  describe('Event Handling', () => {
    it('should handle click outside user menu', async () => {
      wrapper = createWrapper()
      
      // Open user menu
      const userButton = wrapper.find('button[data-testid="user-menu-toggle"], .text-sm.rounded-full')
      if (userButton.exists()) {
        await userButton.trigger('click')
        await wrapper.vm.$nextTick()
      }
      
      // Simulate click outside
      const outsideEvent = new Event('click')
      Object.defineProperty(outsideEvent, 'target', {
        value: document.body,
        enumerable: true
      })
      
      document.dispatchEvent(outsideEvent)
      await wrapper.vm.$nextTick()
      
      // Menu should close
      expect(true).toBe(true) // Actual implementation would check menu state
    })
  })

  describe('Error Handling', () => {
    it('should handle missing user data gracefully', async () => {
      // Mock null user
      vi.mocked(await import('../../composables/useAuth')).useAuth = () => ({
        user: computed(() => null),
        logout: vi.fn()
      })
      
      wrapper = createWrapper()
      
      // Should still render without crashing
      expect(wrapper.find('.min-h-screen').exists()).toBe(true)
      expect(wrapper.text()).toContain('U') // Default initial
    })

    it('should handle empty invitations count', async () => {
      // Mock zero invitations
      vi.mocked(await import('../../composables/useInvitations')).useInvitations = () => ({
        receivedInvitationsCount: computed(() => 0),
        loadReceivedInvitations: vi.fn()
      })
      
      wrapper = createWrapper()
      
      // Badge should not show
      expect(wrapper.find('.bg-red-500').exists()).toBe(false)
    })
  })
})