import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../../App.vue'
import LoginView from '../../views/LoginView.vue'
import SiteSelectionView from '../../views/SiteSelectionView.vue'
import DashboardView from '../../views/DashboardView.vue'

// Mock all the services and composables
vi.mock('../../services/pocketbase', () => ({
  authService: {
    isAuthenticated: false,
    currentUser: null,
    login: vi.fn(),
    logout: vi.fn()
  },
  getCurrentSiteId: vi.fn(() => null),
  setCurrentSiteId: vi.fn(),
  siteService: {
    getAll: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: { value: false },
    user: { value: null },
    login: vi.fn(),
    logout: vi.fn()
  })
}))

vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    hasSiteAccess: { value: false },
    loadUserSites: vi.fn()
  })
}))

describe('Authentication Flow Integration', () => {
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/login', component: LoginView },
        { path: '/select-site', component: SiteSelectionView },
        { path: '/', component: DashboardView }
      ]
    })
  })

  it('should show login view when not authenticated', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: {
          'AppLayout': true,
          'SiteSelectionView': true
        }
      }
    })
    
    await router.push('/login')
    await wrapper.vm.$nextTick()
    
    expect(wrapper.findComponent(LoginView).exists()).toBe(true)
  })

  it('should show site selection when authenticated but no site access', async () => {
    // Mock authenticated state
    const { useAuth } = await import('../../composables/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: { value: true },
      user: { value: { id: 'user-1', name: 'Test User' } },
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshAuth: vi.fn()
    } as any)
    
    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: {
          'AppLayout': true,
          'SiteSelectionView': true
        }
      }
    })
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('SiteSelectionView-stub').exists()).toBe(true)
  })

  it('should show app layout when authenticated and has site access', async () => {
    // Mock authenticated state with site access
    const { useAuth } = await import('../../composables/useAuth')
    const { useSite } = await import('../../composables/useSite')
    
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: { value: true },
      user: { value: { id: 'user-1', name: 'Test User' } },
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshAuth: vi.fn()
    } as any)
    
    vi.mocked(useSite).mockReturnValue({
      hasSiteAccess: { value: true },
      loadUserSites: vi.fn(),
      currentSite: { value: { id: 'site-1', name: 'Test Site' } },
      userSites: { value: [] },
      isLoading: { value: false },
      isCurrentUserAdmin: { value: true },
      selectSite: vi.fn(),
      createSite: vi.fn(),
      updateSite: vi.fn(),
      addUserToSite: vi.fn(),
      removeUserFromSite: vi.fn()
    } as any)
    
    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: {
          'AppLayout': true,
          'SiteSelectionView': true
        }
      }
    })
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('AppLayout-stub').exists()).toBe(true)
  })
})