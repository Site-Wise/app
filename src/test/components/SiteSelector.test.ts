import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import SiteSelector from '../../components/SiteSelector.vue'
import { mockSite } from '../mocks/pocketbase'

const mockSelectSite = vi.fn()
const mockCreateSite = vi.fn()
const mockUpdateSite = vi.fn()

// Mock the useSite composable
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    currentSite: computed(() => mockSite),
    userSites: computed(() => [mockSite, { 
      ...mockSite, 
      id: 'site-2', 
      name: 'Other Site',
      isOwner: true 
    }]),
    selectSite: mockSelectSite,
    createSite: mockCreateSite,
    updateSite: mockUpdateSite,
    isCurrentUserAdmin: computed(() => true)
  })
}))

describe('SiteSelector', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.dispatchEvent
    window.dispatchEvent = vi.fn()
    // Mock window.alert
    window.alert = vi.fn()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Basic Rendering', () => {
    it('should render site selector button', () => {
      wrapper = mount(SiteSelector)
      
      expect(wrapper.find('button').exists()).toBe(true)
      expect(wrapper.text()).toContain(mockSite.name)
    })

    it('should show dropdown when clicked', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      
      expect(wrapper.find('.absolute').exists()).toBe(true)
    })

    it('should display current site information', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      
      expect(wrapper.text()).toContain(mockSite.name)
      expect(wrapper.text()).toContain(`${mockSite.total_units} units`)
      expect(wrapper.text()).toContain(`${mockSite.total_planned_area.toLocaleString()} sqft`)
    })

    it('should show other sites in dropdown', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      
      expect(wrapper.text()).toContain('Other Site')
    })

    it('should show manage button for admin users', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      
      const manageButtons = wrapper.findAll('[title="Manage Site"]')
      expect(manageButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Site Selection', () => {
    it('should call selectSite when other site is clicked', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      
      // Find other site option and click it
      const otherSiteOption = wrapper.find('.group.px-3.py-2.hover\\:bg-gray-50')
      if (otherSiteOption.exists()) {
        await otherSiteOption.trigger('click')
        
        expect(mockSelectSite).toHaveBeenCalledWith('site-2')
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'site-changed' })
        )
      }
    })

    it('should close dropdown after site selection', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      expect(wrapper.find('.absolute').exists()).toBe(true)
      
      // Simulate site selection
      const otherSiteOption = wrapper.find('.group.px-3.py-2.hover\\:bg-gray-50')
      if (otherSiteOption.exists()) {
        await otherSiteOption.trigger('click')
        await wrapper.vm.$nextTick()
        
        // Dropdown should be closed
        expect(wrapper.vm.dropdownOpen).toBe(false)
      }
    })
  })

  describe('Create Site Modal', () => {
    it('should show create site modal when create button is clicked', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      
      const createButton = wrapper.find('button:contains("Create New Site")')
      expect(createButton.exists()).toBe(true)
      
      await createButton.trigger('click')
      
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
      expect(wrapper.text()).toContain('Create New Site')
    })

    it('should close dropdown when create modal opens', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      expect(wrapper.vm.dropdownOpen).toBe(true)
      
      const createButton = wrapper.find('button:contains("Create New Site")')
      await createButton.trigger('click')
      
      expect(wrapper.vm.dropdownOpen).toBe(false)
      expect(wrapper.vm.showCreateModal).toBe(true)
    })

    it('should handle site creation form submission', async () => {
      wrapper = mount(SiteSelector)
      
      // Open create modal
      await wrapper.find('button').trigger('click')
      const createButton = wrapper.find('button:contains("Create New Site")')
      await createButton.trigger('click')
      
      // Fill form
      await wrapper.find('input[placeholder="Enter site name"]').setValue('New Test Site')
      await wrapper.find('textarea').setValue('A new test site description')
      await wrapper.find('input[placeholder="0"]').setValue('150')
      await wrapper.findAll('input[placeholder="0"]')[1].setValue('75000')
      
      // Submit form
      await wrapper.find('form').trigger('submit')
      
      expect(mockCreateSite).toHaveBeenCalledWith({
        name: 'New Test Site',
        description: 'A new test site description',
        total_units: 150,
        total_planned_area: 75000
      })
    })

    it('should show loading state during site creation', async () => {
      mockCreateSite.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      wrapper = mount(SiteSelector)
      
      // Open modal and submit form
      await wrapper.find('button').trigger('click')
      const createButton = wrapper.find('button:contains("Create New Site")')
      await createButton.trigger('click')
      
      await wrapper.find('input[placeholder="Enter site name"]').setValue('Test Site')
      await wrapper.find('input[placeholder="0"]').setValue('50')
      await wrapper.findAll('input[placeholder="0"]')[1].setValue('25000')
      
      const submitButton = wrapper.find('button[type="submit"]')
      await submitButton.trigger('click')
      
      expect(wrapper.vm.createLoading).toBe(true)
      expect(submitButton.attributes('disabled')).toBeDefined()
    })

    it('should close modal and reset form after successful creation', async () => {
      mockCreateSite.mockResolvedValue(mockSite)
      
      wrapper = mount(SiteSelector)
      
      // Open modal and submit
      await wrapper.find('button').trigger('click')
      const createButton = wrapper.find('button:contains("Create New Site")')
      await createButton.trigger('click')
      
      await wrapper.find('input[placeholder="Enter site name"]').setValue('Test Site')
      await wrapper.find('form').trigger('submit')
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showCreateModal).toBe(false)
      expect(wrapper.vm.createForm.name).toBe('')
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'site-changed' })
      )
    })

    it('should cancel modal when cancel button is clicked', async () => {
      wrapper = mount(SiteSelector)
      
      // Open modal
      await wrapper.find('button').trigger('click')
      const createButton = wrapper.find('button:contains("Create New Site")')
      await createButton.trigger('click')
      
      // Fill some data
      await wrapper.find('input[placeholder="Enter site name"]').setValue('Test')
      
      // Cancel
      const cancelButton = wrapper.find('button:contains("Cancel")')
      await cancelButton.trigger('click')
      
      expect(wrapper.vm.showCreateModal).toBe(false)
      expect(wrapper.vm.createForm.name).toBe('') // Form should be reset
    })
  })

  describe('Manage Site Modal', () => {
    it('should open manage modal when manage button is clicked', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      
      const manageButton = wrapper.find('[title="Manage Site"]')
      await manageButton.trigger('click')
      
      expect(wrapper.vm.showManageModal).toBe(true)
      expect(wrapper.vm.managingSite).toEqual(mockSite)
      expect(wrapper.text()).toContain('Manage Site')
    })

    it('should populate edit form with current site data', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      const manageButton = wrapper.find('[title="Manage Site"]')
      await manageButton.trigger('click')
      
      expect(wrapper.vm.editForm.name).toBe(mockSite.name)
      expect(wrapper.vm.editForm.total_units).toBe(mockSite.total_units)
      expect(wrapper.vm.editForm.total_planned_area).toBe(mockSite.total_planned_area)
    })

    it('should handle site update form submission', async () => {
      wrapper = mount(SiteSelector)
      
      // Open manage modal
      await wrapper.find('button').trigger('click')
      const manageButton = wrapper.find('[title="Manage Site"]')
      await manageButton.trigger('click')
      
      // Update form - find manage modal form
      const manageModal = wrapper.find('.fixed.inset-0.bg-black.bg-opacity-50')
      const nameInput = manageModal.find('input[type="text"]')
      await nameInput.setValue('Updated Site Name')
      
      // Submit form
      const updateForm = manageModal.find('form')
      await updateForm.trigger('submit')
      
      expect(mockUpdateSite).toHaveBeenCalledWith(mockSite.id, expect.objectContaining({
        name: 'Updated Site Name'
      }))
    })

    it('should show loading state during site update', async () => {
      mockUpdateSite.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      wrapper = mount(SiteSelector)
      
      // Open modal and submit
      await wrapper.find('button').trigger('click')
      const manageButton = wrapper.find('[title="Manage Site"]')
      await manageButton.trigger('click')
      
      const manageModal = wrapper.find('.fixed.inset-0.bg-black.bg-opacity-50')
      const updateForm = manageModal.find('form')
      if (updateForm.exists()) {
        await updateForm.trigger('submit')
      }
      
      expect(wrapper.vm.updateLoading).toBe(true)
    })

    it('should handle update errors gracefully', async () => {
      mockUpdateSite.mockRejectedValue(new Error('Update failed'))
      
      wrapper = mount(SiteSelector)
      
      // Open modal and submit
      await wrapper.find('button').trigger('click')
      const manageButton = wrapper.find('[title="Manage Site"]')
      await manageButton.trigger('click')
      
      const manageModal = wrapper.find('.fixed.inset-0.bg-black.bg-opacity-50')
      const updateForm = manageModal.find('form')
      if (updateForm.exists()) {
        await updateForm.trigger('submit')
      }
      
      await wrapper.vm.$nextTick()
      
      expect(window.alert).toHaveBeenCalledWith('Failed to update site. Please try again.')
    })

    it('should display site stats in manage modal', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      const manageButton = wrapper.find('[title="Manage Site"]')
      await manageButton.trigger('click')
      
      expect(wrapper.text()).toContain('Current Site Stats')
      expect(wrapper.text()).toContain('Team Members')
      expect(wrapper.text()).toContain('Created')
      expect(wrapper.text()).toContain('Units')
    })

    it('should close manage modal and reset form', async () => {
      wrapper = mount(SiteSelector)
      
      // Open modal
      await wrapper.find('button').trigger('click')
      const manageButton = wrapper.find('[title="Manage Site"]')
      await manageButton.trigger('click')
      
      // Close modal
      const manageModal = wrapper.find('.fixed.inset-0.bg-black.bg-opacity-50')
      const cancelButton = manageModal.find('button:contains("Cancel")')
      if (cancelButton.exists()) {
        await cancelButton.trigger('click')
      }
      
      expect(wrapper.vm.showManageModal).toBe(false)
      expect(wrapper.vm.managingSite).toBe(null)
      expect(wrapper.vm.editForm.name).toBe('')
    })
  })

  describe('Click Outside Handling', () => {
    it('should close dropdown when clicking outside', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      expect(wrapper.vm.dropdownOpen).toBe(true)
      
      // Simulate click outside
      const outsideEvent = new Event('click')
      Object.defineProperty(outsideEvent, 'target', {
        value: document.body,
        enumerable: true
      })
      
      document.dispatchEvent(outsideEvent)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.dropdownOpen).toBe(false)
    })

    it('should not close dropdown when clicking inside', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      expect(wrapper.vm.dropdownOpen).toBe(true)
      
      // Simulate click inside
      const insideEvent = new Event('click')
      Object.defineProperty(insideEvent, 'target', {
        value: wrapper.element,
        enumerable: true
      })
      
      document.dispatchEvent(insideEvent)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.dropdownOpen).toBe(true)
    })
  })

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      wrapper = mount(SiteSelector)
      
      const result = wrapper.vm.formatDate('2024-01-01T00:00:00Z')
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should handle invalid dates', () => {
      wrapper = mount(SiteSelector)
      
      const result = wrapper.vm.formatDate(null)
      expect(result).toBe('N/A')
    })
  })

  describe('Permissions', () => {
    it('should show manage button only for current user admin', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      
      // Should show manage button for current site
      const currentSiteManageButton = wrapper.find('.border-b [title="Manage Site"]')
      expect(currentSiteManageButton.exists()).toBe(true)
    })

    it('should show manage button for sites where user is owner', async () => {
      wrapper = mount(SiteSelector)
      
      await wrapper.find('button').trigger('click')
      
      // Should show manage button for other sites where user is owner
      const ownerManageButtons = wrapper.findAll('.group [title="Manage Site"]')
      expect(ownerManageButtons.length).toBeGreaterThan(0)
    })
  })
})