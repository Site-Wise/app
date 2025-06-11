import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTheme } from '../../composables/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock localStorage to always return null initially
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    })
    
    document.documentElement.classList.remove('dark')
    
    // Reset theme to system
    const { setTheme } = useTheme()
    setTheme('system')
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
    const { setTheme, isDark, initializeTheme } = useTheme()
    
    // Mock system preference for dark mode
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    
    setTheme('system')
    
    // Initialize theme to update system preference
    initializeTheme()
    
    // Should follow system preference (mocked as dark)
    expect(isDark.value).toBe(true)
  })

  it('should load saved theme from localStorage', () => {
    // Create a fresh localStorage mock for this test
    const localStorageData: Record<string, string> = { 'theme': 'dark' }
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageData[key] || null),
        setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value }),
        removeItem: vi.fn((key: string) => { delete localStorageData[key] }),
        clear: vi.fn(() => { Object.keys(localStorageData).forEach(key => delete localStorageData[key]) })
      },
      writable: true
    })
    
    const { initializeTheme, theme } = useTheme()
    initializeTheme()
    
    expect(theme.value).toBe('dark')
  })

  it('should ignore invalid theme from localStorage', () => {
    // Create a fresh localStorage mock with invalid theme
    const localStorageData: Record<string, string> = { 'theme': 'invalid-theme' }
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageData[key] || null),
        setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value }),
        removeItem: vi.fn((key: string) => { delete localStorageData[key] }),
        clear: vi.fn(() => { Object.keys(localStorageData).forEach(key => delete localStorageData[key]) })
      },
      writable: true
    })
    
    const { initializeTheme, theme } = useTheme()
    initializeTheme()
    
    expect(theme.value).toBe('system')
  })
})