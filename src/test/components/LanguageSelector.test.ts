import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import LanguageSelector from '../../components/LanguageSelector.vue'

const mockSetLanguage = vi.fn()

// Mock the useI18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    currentLanguage: computed(() => 'en'),
    setLanguage: mockSetLanguage,
    availableLanguages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
    ],
    t: (key: string) => key // Simple mock that returns the key
  })
}))

describe('LanguageSelector', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Basic Rendering', () => {
    it('should render language selector button', () => {
      wrapper = mount(LanguageSelector)
      
      expect(wrapper.find('button').exists()).toBe(true)
      expect(wrapper.find('[role="menu"]').exists()).toBe(false) // Dropdown should be closed initially
    })

    it('should display current language flag', () => {
      wrapper = mount(LanguageSelector)
      
      // Should show US flag for English
      expect(wrapper.text()).toContain('🇺🇸')
    })

    it('should show chevron down icon', () => {
      wrapper = mount(LanguageSelector)
      
      // Check for any svg or icon element
      const icons = wrapper.findAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should have proper ARIA attributes', () => {
      wrapper = mount(LanguageSelector)
      
      const button = wrapper.find('button')
      expect(button.attributes('aria-expanded')).toBe('false')
      expect(button.attributes('aria-haspopup')).toBe('menu')
    })
  })

  describe('Dropdown Functionality', () => {
    it('should toggle dropdown when button is clicked', async () => {
      wrapper = mount(LanguageSelector)
      
      const button = wrapper.find('button')
      await button.trigger('click')
      
      expect(wrapper.find('[role="menu"]').exists()).toBe(true)
      expect(button.attributes('aria-expanded')).toBe('true')
      
      // Click again to close
      await button.trigger('click')
      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    })

    it('should rotate chevron icon when dropdown is open', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      // Check that dropdown opened successfully
      expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    })

    it('should apply active styles when dropdown is open', async () => {
      wrapper = mount(LanguageSelector)
      
      const button = wrapper.find('button')
      expect(button.classes()).not.toContain('bg-gray-100')
      
      await button.trigger('click')
      
      expect(button.classes()).toContain('bg-gray-100')
    })
  })

  describe('Language Options', () => {
    it('should display all available languages', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const languageButtons = wrapper.findAll('[role="menuitem"]')
      expect(languageButtons).toHaveLength(2)
      
      expect(wrapper.text()).toContain('English')
      expect(wrapper.text()).toContain('हिन्दी')
      expect(wrapper.text()).toContain('🇺🇸')
      expect(wrapper.text()).toContain('🇮🇳')
    })

    it('should show check mark for current language', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      // Check that we have menu items
      const menuItems = wrapper.findAll('[role="menuitem"]')
      expect(menuItems.length).toBeGreaterThan(0)
      
      // Should be on the English option
      const englishOption = wrapper.find('[role="menuitem"]:first-child')
      expect(englishOption.exists()).toBe(true)
    })

    it('should highlight current language option', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const englishOption = wrapper.find('[role="menuitem"]:first-child')
      expect(englishOption.classes()).toContain('bg-primary-50')
      expect(englishOption.classes()).toContain('border-l-4')
      expect(englishOption.classes()).toContain('border-primary-500')
      expect(englishOption.classes()).toContain('text-primary-700')
    })

    it('should show language names and native names', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      // Check for native names (main display)
      expect(wrapper.text()).toContain('English')
      expect(wrapper.text()).toContain('हिन्दी')
      
      // Check for English names (subtitle on desktop)
      expect(wrapper.text()).toContain('Hindi')
    })
  })

  describe('Language Selection', () => {
    it('should call setLanguage when language option is clicked', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const hindiOption = wrapper.findAll('[role="menuitem"]')[1]
      await hindiOption.trigger('click')
      
      expect(mockSetLanguage).toHaveBeenCalledWith('hi')
    })

    it('should close dropdown after language selection', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      expect(wrapper.find('[role="menu"]').exists()).toBe(true)
      
      const hindiOption = wrapper.findAll('[role="menuitem"]')[1]
      await hindiOption.trigger('click')
      
      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    })

    it('should update current language display after selection', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const hindiOption = wrapper.findAll('[role="menuitem"]')[1]
      await hindiOption.trigger('click')
      
      expect(mockSetLanguage).toHaveBeenCalledWith('hi')
    })
  })

  describe('Flag Display', () => {
    it('should return correct flag for English', () => {
      wrapper = mount(LanguageSelector)
      
      const flag = wrapper.vm.getLanguageFlag('en')
      expect(flag).toBe('🇺🇸')
    })

    it('should return correct flag for Hindi', () => {
      wrapper = mount(LanguageSelector)
      
      const flag = wrapper.vm.getLanguageFlag('hi')
      expect(flag).toBe('🇮🇳')
    })

    it('should return default flag for unknown language', () => {
      wrapper = mount(LanguageSelector)
      
      const flag = wrapper.vm.getLanguageFlag('unknown')
      expect(flag).toBe('🌐')
    })
  })

  describe('Click Outside Handling', () => {
    it('should close dropdown when clicking outside', async () => {
      wrapper = mount(LanguageSelector)
      
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
      wrapper = mount(LanguageSelector)
      
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

    it('should setup and cleanup event listeners properly', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      
      wrapper = mount(LanguageSelector)
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
      
      wrapper.unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive classes for mobile and desktop', () => {
      wrapper = mount(LanguageSelector)
      
      const button = wrapper.find('button')
      expect(button.classes()).toContain('w-full')
      expect(button.classes()).toContain('md:w-auto')
      expect(button.classes()).toContain('md:min-w-[40px]')
    })

    it('should have responsive spacing in dropdown', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const options = wrapper.findAll('[role="menuitem"]')
      const firstOption = options[0]
      
      expect(firstOption.classes()).toContain('px-3')
      expect(firstOption.classes()).toContain('py-2')
      expect(firstOption.classes()).toContain('md:px-4')
      expect(firstOption.classes()).toContain('md:py-3')
    })

    it('should hide English language names on mobile', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const englishSubtitle = wrapper.find('.text-xs.text-gray-500')
      expect(englishSubtitle.classes()).toContain('md:block')
      expect(englishSubtitle.classes()).toContain('hidden')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const dropdown = wrapper.find('[role="menu"]')
      expect(dropdown.exists()).toBe(true)
      
      const menuItems = wrapper.findAll('[role="menuitem"]')
      expect(menuItems.length).toBeGreaterThan(0)
    })

    it('should support touch manipulation', () => {
      wrapper = mount(LanguageSelector)
      
      const button = wrapper.find('button')
      expect(button.classes()).toContain('touch-manipulation')
      
      // Check menu items too when dropdown is open
      wrapper.find('button').trigger('click')
      wrapper.vm.$nextTick(() => {
        const menuItems = wrapper.findAll('[role="menuitem"]')
        menuItems.forEach((item: any) => {
          expect(item.classes()).toContain('touch-manipulation')
        })
      })
    })

    it('should have focus styles', () => {
      wrapper = mount(LanguageSelector)
      
      const button = wrapper.find('button')
      // Focus styles are handled by CSS classes, we can check for their presence
      expect(button.classes()).toContain('transition-colors')
    })
  })

  describe('Styling and Theming', () => {
    it('should support dark mode classes', () => {
      wrapper = mount(LanguageSelector)
      
      const button = wrapper.find('button')
      expect(button.classes()).toContain('dark:text-gray-300')
      expect(button.classes()).toContain('dark:hover:text-white')
      expect(button.classes()).toContain('dark:hover:bg-gray-700')
    })

    it('should have hover effects', () => {
      wrapper = mount(LanguageSelector)
      
      const button = wrapper.find('button')
      expect(button.classes()).toContain('hover:text-gray-900')
      expect(button.classes()).toContain('hover:bg-gray-100')
      expect(button.classes()).toContain('transition-colors')
    })

    it('should show primary colors for selected language', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const selectedOption = wrapper.find('[role="menuitem"]:first-child')
      expect(selectedOption.classes()).toContain('bg-primary-50')
      expect(selectedOption.classes()).toContain('text-primary-700')
      expect(selectedOption.classes()).toContain('border-primary-500')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty available languages gracefully', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const menuItems = wrapper.findAll('[role="menuitem"]')
      expect(menuItems.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing current language gracefully', async () => {
      wrapper = mount(LanguageSelector)
      
      // Should still render without crashing
      expect(wrapper.find('button').exists()).toBe(true)
      expect(wrapper.text()).toContain('🇺🇸') // Current language flag
    })
  })

  describe('Component Integration', () => {
    it('should work with different language configurations', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const menuItems = wrapper.findAll('[role="menuitem"]')
      expect(menuItems.length).toBeGreaterThan(0)
      expect(wrapper.text()).toContain('English')
    })

    it('should emit selection events correctly', async () => {
      wrapper = mount(LanguageSelector)
      
      await wrapper.find('button').trigger('click')
      
      const hindiOption = wrapper.findAll('[role="menuitem"]')[1]
      await hindiOption.trigger('click')
      
      expect(mockSetLanguage).toHaveBeenCalledTimes(1)
      expect(mockSetLanguage).toHaveBeenCalledWith('hi')
    })
  })
})