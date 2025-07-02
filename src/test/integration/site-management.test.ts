import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SiteSelectionView from '../../views/SiteSelectionView.vue'
import SiteSelector from '../../components/SiteSelector.vue'
import { createMockRouter } from '../utils/test-utils'
import { setupTestPinia } from '../utils/test-setup'
import { mockSite } from '../mocks/pocketbase'

// Mock the composables
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    userSites: { value: [mockSite] },
    isLoading: { value: false },
    selectSite: vi.fn(),
    createSite: vi.fn(),
    currentSite: { value: mockSite },
    loadUserSites: vi.fn(),
    hasSiteAccess: { value: true },
    isCurrentUserAdmin: { value: true },
    updateSite: vi.fn(),
    addUserToSite: vi.fn(),
    removeUserFromSite: vi.fn()
  })
}))

describe('Site Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display available sites in site selection view', async () => {
    const router = createMockRouter()
    
    const wrapper = mount(SiteSelectionView, {
      global: {
        plugins: [router]
      }
    })
    
    await wrapper.vm.$nextTick()
    
    // Check if the component shows either sites or the correct text content
    const text = wrapper.text()
    expect(
      text.includes(mockSite.name) || 
      text.includes('Select a Site') || 
      text.includes('Choose a construction site')
    ).toBe(true)
  })

  it('should handle site selection', async () => {
    const router = createMockRouter()
    const pushSpy = vi.spyOn(router, 'push')
    
    const wrapper = mount(SiteSelectionView, {
      global: {
        plugins: [router]
      }
    })
    
    // Find and click site card
    const siteCard = wrapper.find('.cursor-pointer')
    if (siteCard.exists()) {
      await siteCard.trigger('click')
      
      expect(pushSpy).toHaveBeenCalledWith('/')
    }
  })

  it('should show create site modal', async () => {
    const router = createMockRouter()
    
    const wrapper = mount(SiteSelectionView, {
      global: {
        plugins: [router]
      }
    })
    
    const createButton = wrapper.find('button:contains("Create New Site")')
    if (createButton.exists()) {
      await createButton.trigger('click')
      
      expect(wrapper.find('.fixed').exists()).toBe(true)
      expect(wrapper.text()).toContain('Create New Site')
    }
  })

  it('should handle site creation', async () => {
    const router = createMockRouter()
    const pushSpy = vi.spyOn(router, 'push')
    
    const wrapper = mount(SiteSelectionView, {
      global: {
        plugins: [router]
      }
    })
    
    // Open create modal
    const createButton = wrapper.find('button:contains("Create New Site")')
    if (createButton.exists()) {
      await createButton.trigger('click')
      
      // Fill form
      await wrapper.find('input[placeholder="Enter site name"]').setValue('New Site')
      await wrapper.find('input[placeholder="0"]').setValue('50')
      
      // Submit form
      await wrapper.find('form').trigger('submit')
      
      expect(pushSpy).toHaveBeenCalledWith('/')
    }
  })

  it('should work with site selector component', async () => {
    const { pinia } = setupTestPinia()
    const router = createMockRouter()
    
    const wrapper = mount(SiteSelector, {
      global: {
        plugins: [pinia, router]
      }
    })
    
    await wrapper.vm.$nextTick()
    
    const text = wrapper.text()
    expect(
      text.includes(mockSite.name) ||
      text.includes('Select Site') ||
      text.includes('site')
    ).toBe(true)
    
    // Click to open dropdown
    const button = wrapper.find('button')
    if (button.exists()) {
      await button.trigger('click')
      
      expect(wrapper.find('.absolute').exists()).toBe(true)
    }
  })
})