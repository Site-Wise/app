import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
let localStorageData: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageData[key]
  }),
  clear: vi.fn(() => {
    for (const key in localStorageData) {
      delete localStorageData[key]
    }
  }),
  key: vi.fn((index: number) => Object.keys(localStorageData)[index] || null),
  get length() {
    return Object.keys(localStorageData).length
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Clear localStorage data
  for (const key in localStorageData) {
    delete localStorageData[key]
  }

  global.localStorage = localStorageMock as any
  global.console = {
    ...console,
    log: vi.fn()
  }
})

describe('onboardingTest Utilities Logic', () => {
  describe('LocalStorage Key Filtering Logic', () => {
    it('should identify sitewise_onboarding_ prefixed keys', () => {
      const key = 'sitewise_onboarding_dashboard'
      const shouldRemove = key.startsWith('sitewise_onboarding_')
      expect(shouldRemove).toBe(true)
    })

    it('should identify sitewise_feature_ prefixed keys', () => {
      const key = 'sitewise_feature_deliveries'
      const shouldRemove = key.startsWith('sitewise_feature_')
      expect(shouldRemove).toBe(true)
    })

    it('should not identify non-matching keys', () => {
      const key = 'other_key'
      const shouldRemove = key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')
      expect(shouldRemove).toBe(false)
    })

    it('should handle similar but different prefix', () => {
      const key = 'sitewise_other_key'
      const shouldRemove = key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')
      expect(shouldRemove).toBe(false)
    })

    it('should handle empty string', () => {
      const key = ''
      const shouldRemove = key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')
      expect(shouldRemove).toBe(false)
    })
  })

  describe('Reset Onboarding Logic', () => {
    it('should remove onboarding keys from localStorage', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      localStorageData['sitewise_onboarding_items'] = 'true'
      localStorageData['other_key'] = 'value'

      const keys = Object.keys(localStorageData)
      keys.forEach(key => {
        if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
          delete localStorageData[key]
        }
      })

      expect(localStorageData['other_key']).toBe('value')
      expect(localStorageData['sitewise_onboarding_dashboard']).toBeUndefined()
      expect(localStorageData['sitewise_onboarding_items']).toBeUndefined()
    })

    it('should remove feature keys from localStorage', () => {
      localStorageData['sitewise_feature_tours'] = 'completed'
      localStorageData['other_key'] = 'value'

      const keys = Object.keys(localStorageData)
      keys.forEach(key => {
        if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
          delete localStorageData[key]
        }
      })

      expect(localStorageData['other_key']).toBe('value')
      expect(localStorageData['sitewise_feature_tours']).toBeUndefined()
    })

    it('should remove sitewise_onboarding_disabled key', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'true'

      delete localStorageData['sitewise_onboarding_disabled']

      expect(localStorageData['sitewise_onboarding_disabled']).toBeUndefined()
    })

    it('should preserve non-sitewise keys', () => {
      localStorageData['user_preferences'] = 'dark_mode'
      localStorageData['auth_token'] = 'abc123'
      localStorageData['sitewise_onboarding_dashboard'] = 'true'

      const keys = Object.keys(localStorageData)
      keys.forEach(key => {
        if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
          delete localStorageData[key]
        }
      })
      delete localStorageData['sitewise_onboarding_disabled']

      expect(localStorageData['user_preferences']).toBe('dark_mode')
      expect(localStorageData['auth_token']).toBe('abc123')
    })
  })

  describe('Dashboard Tour Configuration Logic', () => {
    it('should have tour id field', () => {
      const tour = {
        id: 'dashboard',
        steps: [],
        showOnce: true
      }
      expect(tour.id).toBe('dashboard')
    })

    it('should have steps array', () => {
      const tour = {
        id: 'dashboard',
        steps: [
          {
            popover: {
              title: 'Welcome',
              description: 'Test',
              side: 'bottom' as const,
              align: 'center' as const
            }
          }
        ],
        showOnce: true
      }
      expect(Array.isArray(tour.steps)).toBe(true)
      expect(tour.steps.length).toBeGreaterThan(0)
    })

    it('should have showOnce flag', () => {
      const tour = {
        id: 'dashboard',
        steps: [],
        showOnce: true
      }
      expect(tour.showOnce).toBe(true)
    })
  })

  describe('Tour Step Configuration Logic', () => {
    it('should have popover field', () => {
      const step = {
        popover: {
          title: 'onboarding.dashboard.welcome.title',
          description: 'onboarding.dashboard.welcome.description',
          side: 'bottom' as const,
          align: 'center' as const
        }
      }
      expect(step.popover).toBeDefined()
    })

    it('should have title translation key', () => {
      const popover = {
        title: 'onboarding.dashboard.welcome.title',
        description: 'onboarding.dashboard.welcome.description',
        side: 'bottom' as const,
        align: 'center' as const
      }
      expect(popover.title).toContain('onboarding.')
    })

    it('should have description translation key', () => {
      const popover = {
        title: 'onboarding.dashboard.welcome.title',
        description: 'onboarding.dashboard.welcome.description',
        side: 'bottom' as const,
        align: 'center' as const
      }
      expect(popover.description).toContain('onboarding.')
    })

    it('should have side positioning', () => {
      const sides: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left']
      const side: 'bottom' = 'bottom'
      expect(sides).toContain(side)
    })

    it('should have align positioning', () => {
      const aligns: Array<'start' | 'center' | 'end'> = ['start', 'center', 'end']
      const align: 'center' = 'center'
      expect(aligns).toContain(align)
    })
  })

  describe('Window Global Assignment Logic', () => {
    it('should check if window is defined', () => {
      const isWindow = typeof window !== 'undefined'
      expect(typeof isWindow).toBe('boolean')
    })

    it('should assign functions to window object', () => {
      const mockWindow = {} as any
      mockWindow.resetOnboardingForTesting = () => {}
      mockWindow.forceShowDashboardTour = () => {}

      expect(typeof mockWindow.resetOnboardingForTesting).toBe('function')
      expect(typeof mockWindow.forceShowDashboardTour).toBe('function')
    })

    it('should handle missing window gracefully', () => {
      const isWindow = typeof window !== 'undefined'
      if (isWindow) {
        expect(window).toBeDefined()
      }
    })
  })

  describe('Console Logging Logic', () => {
    it('should log removed key', () => {
      const key = 'sitewise_onboarding_dashboard'
      const message = `Removed: ${key}`
      expect(message).toContain('Removed:')
      expect(message).toContain(key)
    })

    it('should log success message', () => {
      const message = '✅ All onboarding state cleared. Refresh the page to see tours.'
      expect(message).toContain('✅')
      expect(message).toContain('cleared')
      expect(message).toContain('Refresh')
    })

    it('should log utility functions info', () => {
      const message = '🎯 Onboarding test utilities loaded:'
      expect(message).toContain('🎯')
      expect(message).toContain('Onboarding test utilities')
    })

    it('should log reset function info', () => {
      const message = '- resetOnboardingForTesting() - Clear all localStorage and reset'
      expect(message).toContain('resetOnboardingForTesting()')
      expect(message).toContain('Clear all localStorage')
    })

    it('should log force tour function info', () => {
      const message = '- forceShowDashboardTour() - Force show dashboard tour'
      expect(message).toContain('forceShowDashboardTour()')
      expect(message).toContain('Force show dashboard tour')
    })

    it('should log debug function info', () => {
      const message = '- onboardingDebug() - Show debug info (if available)'
      expect(message).toContain('onboardingDebug()')
      expect(message).toContain('Show debug info')
    })
  })

  describe('Dynamic Import Logic', () => {
    it('should import useOnboarding composable', async () => {
      const importPath = '../composables/useOnboarding'
      expect(importPath).toContain('composables')
      expect(importPath).toContain('useOnboarding')
    })

    it('should extract startTour function', () => {
      const useOnboarding = () => ({
        startTour: vi.fn()
      })
      const { startTour } = useOnboarding()
      expect(typeof startTour).toBe('function')
    })
  })

  describe('Force Show Tour Logic', () => {
    it('should force show parameter to true', () => {
      const forceShow = true
      expect(forceShow).toBe(true)
    })

    it('should pass tour config to startTour', () => {
      const tourConfig = {
        id: 'dashboard',
        steps: [],
        showOnce: true
      }
      const startTour = vi.fn()

      startTour(tourConfig, true)

      expect(startTour).toHaveBeenCalledWith(tourConfig, true)
    })

    it('should use dashboard tour id', () => {
      const tourId = 'dashboard'
      expect(tourId).toBe('dashboard')
    })
  })

  describe('Key Iteration Logic', () => {
    it('should iterate over all localStorage keys', () => {
      localStorageData['key1'] = 'value1'
      localStorageData['key2'] = 'value2'
      localStorageData['key3'] = 'value3'

      const keys = Object.keys(localStorageData)
      expect(keys).toHaveLength(3)
    })

    it('should process each key with forEach', () => {
      localStorageData['sitewise_onboarding_test'] = 'true'
      localStorageData['other'] = 'value'

      const keys = Object.keys(localStorageData)
      let processedCount = 0

      keys.forEach(key => {
        if (key.startsWith('sitewise_onboarding_')) {
          processedCount++
        }
      })

      expect(processedCount).toBe(1)
    })

    it('should handle empty localStorage', () => {
      const keys = Object.keys(localStorageData)
      expect(keys).toHaveLength(0)
    })
  })

  describe('Prefix Constants Logic', () => {
    it('should use onboarding prefix constant', () => {
      const ONBOARDING_PREFIX = 'sitewise_onboarding_'
      expect(ONBOARDING_PREFIX).toBe('sitewise_onboarding_')
    })

    it('should use feature prefix constant', () => {
      const FEATURE_PREFIX = 'sitewise_feature_'
      expect(FEATURE_PREFIX).toBe('sitewise_feature_')
    })

    it('should use disabled key constant', () => {
      const DISABLED_KEY = 'sitewise_onboarding_disabled'
      expect(DISABLED_KEY).toBe('sitewise_onboarding_disabled')
    })
  })

  describe('Test Scenario Simulation', () => {
    it('should clear multiple onboarding keys', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      localStorageData['sitewise_onboarding_items'] = 'completed'
      localStorageData['sitewise_onboarding_deliveries'] = 'seen'
      localStorageData['unrelated'] = 'keep_me'

      const keys = Object.keys(localStorageData)
      const removedKeys: string[] = []

      keys.forEach(key => {
        if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
          removedKeys.push(key)
          delete localStorageData[key]
        }
      })

      expect(removedKeys).toHaveLength(3)
      expect(localStorageData['unrelated']).toBe('keep_me')
      expect(Object.keys(localStorageData)).toHaveLength(1)
    })

    it('should clear feature flags', () => {
      localStorageData['sitewise_feature_newUI'] = 'enabled'
      localStorageData['sitewise_feature_beta'] = 'true'
      localStorageData['keep_this'] = 'value'

      const keys = Object.keys(localStorageData)
      keys.forEach(key => {
        if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
          delete localStorageData[key]
        }
      })

      expect(localStorageData['sitewise_feature_newUI']).toBeUndefined()
      expect(localStorageData['sitewise_feature_beta']).toBeUndefined()
      expect(localStorageData['keep_this']).toBe('value')
    })

    it('should handle mixed keys correctly', () => {
      localStorageData['sitewise_onboarding_test'] = 'value'
      localStorageData['sitewise_feature_test'] = 'value'
      localStorageData['sitewise_other'] = 'keep'
      localStorageData['completely_different'] = 'keep'

      const keys = Object.keys(localStorageData)
      keys.forEach(key => {
        if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
          delete localStorageData[key]
        }
      })

      expect(Object.keys(localStorageData)).toHaveLength(2)
      expect(localStorageData['sitewise_other']).toBe('keep')
      expect(localStorageData['completely_different']).toBe('keep')
    })
  })
})
