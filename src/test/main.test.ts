import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock all dependencies before importing main
const mockCreateApp = vi.fn()
const mockCreatePinia = vi.fn()
const mockUse = vi.fn()
const mockMount = vi.fn()
const mockInitializeTheme = vi.fn()
const mockCurrentLanguage = { value: 'en' }

// Mock Vue
vi.mock('vue', () => ({
  createApp: mockCreateApp
}))

// Mock Pinia
vi.mock('pinia', () => ({
  createPinia: mockCreatePinia
}))

// Mock App component
vi.mock('../App.vue', () => ({
  default: {}
}))

// Mock router
vi.mock('../router', () => ({
  default: {}
}))

// Mock composables
vi.mock('../composables/useTheme', () => ({
  useTheme: () => ({
    initializeTheme: mockInitializeTheme
  })
}))

vi.mock('../composables/useI18n', () => ({
  useI18n: () => ({
    currentLanguage: mockCurrentLanguage
  })
}))

// Mock CSS import
vi.mock('../style.css', () => ({}))

describe('main.ts', () => {
  const mockApp = {
    use: mockUse,
    mount: mockMount
  }
  const mockPinia = {}

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mocks
    mockCreateApp.mockReturnValue(mockApp)
    mockCreatePinia.mockReturnValue(mockPinia)
    
    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: { lang: '' },
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('should initialize the Vue application correctly', async () => {
    // Import main.ts to trigger initialization
    await import('../main')

    // Verify createApp was called
    expect(mockCreateApp).toHaveBeenCalledTimes(1)
    
    // Verify Pinia was created
    expect(mockCreatePinia).toHaveBeenCalledTimes(1)
    
    // Verify theme was initialized
    expect(mockInitializeTheme).toHaveBeenCalledTimes(1)
    
    // Verify language was set on document
    expect(document.documentElement.lang).toBe('en')
    
    // Verify app.use was called with pinia and router
    expect(mockUse).toHaveBeenCalledTimes(2)
    expect(mockUse).toHaveBeenCalledWith(mockPinia)
    
    // Verify app was mounted
    expect(mockMount).toHaveBeenCalledTimes(1)
    expect(mockMount).toHaveBeenCalledWith('#app')
  })

  it('should set document language from i18n', async () => {
    // Test with different language
    mockCurrentLanguage.value = 'hi'
    
    await import('../main')
    
    expect(document.documentElement.lang).toBe('hi')
  })

  it('should initialize theme before mounting', async () => {
    await import('../main')
    
    // Verify initializeTheme was called before mount
    expect(mockInitializeTheme).toHaveBeenCalledBefore(mockMount as any)
  })

  it('should handle theme initialization properly', async () => {
    // Test that theme initialization is called
    mockInitializeTheme.mockClear()
    
    await import('../main')
    
    expect(mockInitializeTheme).toHaveBeenCalledTimes(1)
    expect(mockInitializeTheme).toHaveBeenCalledWith()
  })

  it('should setup plugins in correct order', async () => {
    await import('../main')
    
    // Verify plugins were added in correct order
    const useCalls = mockUse.mock.calls
    expect(useCalls).toHaveLength(2)
    
    // First call should be pinia
    expect(useCalls[0][0]).toBe(mockPinia)
    
    // Second call should be router (we can't easily verify the exact router object)
    expect(useCalls[1]).toHaveLength(1)
  })
})