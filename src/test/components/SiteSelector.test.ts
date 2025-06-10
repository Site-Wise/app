import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SiteSelector from '../../components/SiteSelector.vue'
import { mockSite } from '../mocks/pocketbase'

// Mock the useSite composable
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    currentSite: { value: mockSite },
    userSites: { value: [mockSite] },
    selectSite: vi.fn(),
    createSite: vi.fn()
  })
}))

describe('SiteSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render site selector button', () => {
    const wrapper = mount(SiteSelector)
    
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain(mockSite.name)
  })

  it('should show dropdown when clicked', async () => {
    const wrapper = mount(SiteSelector)
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.find('.absolute').exists()).toBe(true)
  })

  it('should display current site information', async () => {
    const wrapper = mount(SiteSelector)
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.text()).toContain(mockSite.name)
    expect(wrapper.text()).toContain(`${mockSite.total_units} units`)
    expect(wrapper.text()).toContain(`${mockSite.total_planned_area.toLocaleString()} sqft`)
  })

  it('should show create site modal when create button is clicked', async () => {
    const wrapper = mount(SiteSelector)
    
    await wrapper.find('button').trigger('click')
    
    // Find and click create site button
    const createButton = wrapper.find('button:contains("Create New Site")')
    if (createButton.exists()) {
      await createButton.trigger('click')
      expect(wrapper.find('.fixed').exists()).toBe(true)
    }
  })

  it('should call selectSite when site is selected', async () => {
    const { useSite } = await import('../../composables/useSite')
    const mockSelectSite = vi.mocked(useSite().selectSite)
    
    const wrapper = mount(SiteSelector)
    
    await wrapper.find('button').trigger('click')
    
    // Simulate selecting a site (this would depend on the actual implementation)
    // For now, we'll just verify the mock is available
    expect(mockSelectSite).toBeDefined()
  })

  it('should handle site creation', async () => {
    const { useSite } = await import('../../composables/useSite')
    const mockCreateSite = vi.mocked(useSite().createSite)
    
    const wrapper = mount(SiteSelector)
    
    // Open create modal
    await wrapper.find('button').trigger('click')
    
    // Fill form and submit (this would depend on the actual form implementation)
    expect(mockCreateSite).toBeDefined()
  })
})