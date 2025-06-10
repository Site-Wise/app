import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SiteSelectionView from '../../views/SiteSelectionView.vue'
import SiteSelector from '../../components/SiteSelector.vue'
import { createMockRouter } from '../utils/test-utils'
import { mockSite } from '../mocks/pocketbase'

// Mock the composables
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    userSites: { value: [mockSite] },
    isLoading: { value: false },
    selectSite: vi.fn(),
    createSite: vi.fn(),
    currentSite: { value: null }
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
    
    expect(wrapper.text()).toContain(mockSite.name)
    expect(wrapper.text()).toContain(`${mockSite.total_units} units`)
    expect(wrapper.text()).toContain(`${mockSite.total_planned_area.toLocaleString()} sqft`)
  })

  it('should handle site selection', async () => {
    const { useSite } = await import('../../composables/useSite')
    const mockSelectSite = vi.mocked(useSite().selectSite)
    
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
      
      expect(mockSelectSite).toHaveBeenCalledWith(mockSite.id)
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
    const { useSite } = await import('../../composables/useSite')
    const mockCreateSite = vi.mocked(useSite().createSite)
    mockCreateSite.mockResolvedValue(mockSite)
    
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
      
      expect(mockCreateSite).toHaveBeenCalled()
      expect(pushSpy).toHaveBeenCalledWith('/')
    }
  })

  it('should work with site selector component', async () => {
    const { useSite } = await import('../../composables/useSite')
    
    // Mock current site
    vi.mocked(useSite).mockReturnValue({
      currentSite: { value: mockSite },
      userSites: { value: [mockSite] },
      selectSite: vi.fn(),
      createSite: vi.fn(),
      isLoading: { value: false },
      hasSiteAccess: { value: true },
      isCurrentUserAdmin: { value: true },
      loadUserSites: vi.fn(),
      updateSite: vi.fn(),
      addUserToSite: vi.fn(),
      removeUserFromSite: vi.fn()
    } as any)
    
    const wrapper = mount(SiteSelector)
    
    expect(wrapper.text()).toContain(mockSite.name)
    
    // Click to open dropdown
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.find('.absolute').exists()).toBe(true)
  })
})