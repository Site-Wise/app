import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTheme } from '../../composables/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('should initialize with system theme by default', () => {
    const { theme } = useTheme()
    
    expect(theme.value).toBe('system')
  })

  it('should set light theme', () => {
    const { setTheme, theme, isDark } = useTheme()
    
    setTheme('light')
    
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should set dark theme', () => {
    const { setTheme, theme, isDark } = useTheme()
    
    setTheme('dark')
    
    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should follow system preference when set to system', () => {
    const { setTheme, isDark } = useTheme()
    
    // Mock system preference for dark mode
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    
    setTheme('system')
    
    // Should follow system preference (mocked as dark)
    expect(isDark.value).toBe(true)
  })

  it('should load saved theme from localStorage', () => {
    localStorage.setItem('theme', 'dark')
    
    const { initializeTheme, theme } = useTheme()
    initializeTheme()
    
    expect(theme.value).toBe('dark')
  })

  it('should ignore invalid theme from localStorage', () => {
    localStorage.setItem('theme', 'invalid-theme')
    
    const { initializeTheme, theme } = useTheme()
    initializeTheme()
    
    expect(theme.value).toBe('system')
  })
})