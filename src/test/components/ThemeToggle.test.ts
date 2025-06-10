import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemeToggle from '../../components/ThemeToggle.vue'

// Mock the useTheme composable
vi.mock('../../composables/useTheme', () => ({
  useTheme: () => ({
    theme: { value: 'system' },
    isDark: { value: false },
    setTheme: vi.fn()
  })
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render theme toggle button', () => {
    const wrapper = mount(ThemeToggle)
    
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('should show dropdown when clicked', async () => {
    const wrapper = mount(ThemeToggle)
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.find('.absolute').exists()).toBe(true)
  })

  it('should display theme options', async () => {
    const wrapper = mount(ThemeToggle)
    
    await wrapper.find('button').trigger('click')
    
    const options = wrapper.findAll('button')
    expect(options.length).toBeGreaterThan(1) // Main button + option buttons
  })

  it('should call setTheme when option is selected', async () => {
    const { useTheme } = await import('../../composables/useTheme')
    const mockSetTheme = vi.mocked(useTheme().setTheme)
    
    const wrapper = mount(ThemeToggle)
    
    await wrapper.find('button').trigger('click')
    
    // Find and click a theme option (assuming there are option buttons)
    const options = wrapper.findAll('button')
    if (options.length > 1) {
      await options[1].trigger('click')
      expect(mockSetTheme).toHaveBeenCalled()
    }
  })

  it('should close dropdown when clicking outside', async () => {
    const wrapper = mount(ThemeToggle)
    
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.absolute').exists()).toBe(true)
    
    // Simulate click outside
    document.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.absolute').exists()).toBe(false)
  })
})