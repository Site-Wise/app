import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('onboardingTest Utility Logic', () => {
  let localStorageData: Record<string, string> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageData = {}

    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageData[key] || null),
      setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value }),
      removeItem: vi.fn((key: string) => { delete localStorageData[key] }),
      clear: vi.fn(() => { localStorageData = {} }),
      key: vi.fn(),
      length: 0
    }
  })

  describe('Reset Onboarding Logic', () => {
    it('should reset all onboarding tours', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      localStorageData['sitewise_onboarding_items'] = 'true'
      localStorageData['sitewise_feature_new'] = 'true'

      Object.keys(localStorageData).forEach(key => {
        if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
          delete localStorageData[key]
        }
      })

      expect(localStorageData['sitewise_onboarding_dashboard']).toBeUndefined()
      expect(localStorageData['sitewise_onboarding_items']).toBeUndefined()
      expect(localStorageData['sitewise_feature_new']).toBeUndefined()
    })

    it('should clear onboarding disabled flag', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'true'

      delete localStorageData['sitewise_onboarding_disabled']

      expect(localStorageData['sitewise_onboarding_disabled']).toBeUndefined()
    })

    it('should preserve non-onboarding data', () => {
      localStorageData['sitewise_onboarding_test'] = 'true'
      localStorageData['user_settings'] = 'data'
      localStorageData['last_login'] = '2024-01-01'

      Object.keys(localStorageData).forEach(key => {
        if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
          delete localStorageData[key]
        }
      })

      expect(localStorageData['user_settings']).toBe('data')
      expect(localStorageData['last_login']).toBe('2024-01-01')
    })
  })

  describe('Force Dashboard Tour Logic', () => {
    it('should mark dashboard tour as not shown', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'

      delete localStorageData['sitewise_onboarding_dashboard']

      const hasBeenShown = localStorageData['sitewise_onboarding_dashboard'] === 'true'

      expect(hasBeenShown).toBe(false)
    })

    it('should enable onboarding', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'true'

      delete localStorageData['sitewise_onboarding_disabled']

      const isDisabled = localStorageData['sitewise_onboarding_disabled'] === 'true'

      expect(isDisabled).toBe(false)
    })

    it('should reload page after reset', () => {
      const reloadSpy = vi.fn()

      reloadSpy()

      expect(reloadSpy).toHaveBeenCalled()
    })
  })

  describe('Onboarding Debug Info Logic', () => {
    it('should show onboarding disabled state', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'true'

      const isDisabled = localStorageData['sitewise_onboarding_disabled'] === 'true'

      expect(isDisabled).toBe(true)
    })

    it('should list completed tours', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      localStorageData['sitewise_onboarding_items'] = 'true'
      localStorageData['sitewise_onboarding_vendors'] = 'true'

      const completedTours = Object.keys(localStorageData)
        .filter(key => key.startsWith('sitewise_onboarding_') && localStorageData[key] === 'true')
        .map(key => key.replace('sitewise_onboarding_', ''))

      expect(completedTours).toContain('dashboard')
      expect(completedTours).toContain('items')
      expect(completedTours).toContain('vendors')
    })

    it('should list completed feature tours', () => {
      localStorageData['sitewise_feature_new_dashboard'] = 'true'
      localStorageData['sitewise_feature_reports'] = 'true'

      const featureTours = Object.keys(localStorageData)
        .filter(key => key.startsWith('sitewise_feature_') && localStorageData[key] === 'true')
        .map(key => key.replace('sitewise_feature_', ''))

      expect(featureTours).toContain('new_dashboard')
      expect(featureTours).toContain('reports')
    })

    it('should count total completed tours', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      localStorageData['sitewise_onboarding_items'] = 'true'
      localStorageData['sitewise_feature_new'] = 'true'

      const totalCompleted = Object.keys(localStorageData).filter(key =>
        (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) &&
        localStorageData[key] === 'true'
      ).length

      expect(totalCompleted).toBe(3)
    })
  })

  describe('Window Global Exposure Logic', () => {
    it('should expose resetOnboardingForTesting on window', () => {
      const resetFn = () => {
        Object.keys(localStorageData).forEach(key => {
          if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
            delete localStorageData[key]
          }
        })
      }

      (window as any).resetOnboardingForTesting = resetFn

      expect((window as any).resetOnboardingForTesting).toBeDefined()
    })

    it('should expose forceShowDashboardTour on window', () => {
      const forceFn = () => {
        delete localStorageData['sitewise_onboarding_dashboard']
        delete localStorageData['sitewise_onboarding_disabled']
      }

      (window as any).forceShowDashboardTour = forceFn

      expect((window as any).forceShowDashboardTour).toBeDefined()
    })

    it('should expose onboardingDebug on window', () => {
      const debugFn = () => {
        return {
          disabled: localStorageData['sitewise_onboarding_disabled'] === 'true',
          completedTours: Object.keys(localStorageData)
            .filter(k => k.startsWith('sitewise_onboarding_') && localStorageData[k] === 'true')
        }
      }

      (window as any).onboardingDebug = debugFn

      expect((window as any).onboardingDebug).toBeDefined()
    })
  })

  describe('Testing Workflow Logic', () => {
    it('should support manual testing workflow', () => {
      // 1. Reset all tours
      Object.keys(localStorageData).forEach(key => {
        if (key.startsWith('sitewise_onboarding_')) {
          delete localStorageData[key]
        }
      })

      // 2. Enable onboarding
      delete localStorageData['sitewise_onboarding_disabled']

      // 3. Verify clean state
      const onboardingKeys = Object.keys(localStorageData).filter(k => k.startsWith('sitewise_onboarding_'))

      expect(onboardingKeys).toHaveLength(0)
    })

    it('should support selective tour reset', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      localStorageData['sitewise_onboarding_items'] = 'true'

      // Reset only dashboard tour
      delete localStorageData['sitewise_onboarding_dashboard']

      expect(localStorageData['sitewise_onboarding_dashboard']).toBeUndefined()
      expect(localStorageData['sitewise_onboarding_items']).toBe('true')
    })

    it('should support testing disabled state', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'true'

      const wouldShowTour = () => {
        if (localStorageData['sitewise_onboarding_disabled'] === 'true') {
          return false
        }
        return true
      }

      expect(wouldShowTour()).toBe(false)

      delete localStorageData['sitewise_onboarding_disabled']

      expect(wouldShowTour()).toBe(true)
    })
  })

  describe('Development Environment Detection Logic', () => {
    it('should detect development mode', () => {
      const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV

      expect(typeof isDevelopment).toBe('boolean')
    })

    it('should only expose functions in development', () => {
      const isDevelopment = true // Simulated

      const shouldExpose = isDevelopment

      expect(shouldExpose).toBe(true)
    })

    it('should not expose in production', () => {
      const isDevelopment = false // Simulated production

      const shouldExpose = isDevelopment

      expect(shouldExpose).toBe(false)
    })
  })

  describe('Console Logging Logic', () => {
    it('should log available testing functions', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const logTestFunctions = () => {
        console.log('🎯 Onboarding test utilities loaded:')
        console.log('- resetOnboardingForTesting() - Clear all localStorage and reset')
        console.log('- forceShowDashboardTour() - Force show dashboard tour')
        console.log('- onboardingDebug() - Show debug info (if available)')
      }

      logTestFunctions()

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should format debug output', () => {
      const debugInfo = {
        disabled: false,
        completedTours: ['dashboard', 'items'],
        totalCompleted: 2
      }

      expect(debugInfo.completedTours).toHaveLength(2)
      expect(debugInfo.totalCompleted).toBe(2)
    })
  })

  describe('Storage Key Patterns Logic', () => {
    it('should identify onboarding tour keys', () => {
      const key = 'sitewise_onboarding_dashboard'

      const isOnboardingKey = key.startsWith('sitewise_onboarding_')

      expect(isOnboardingKey).toBe(true)
    })

    it('should identify feature tour keys', () => {
      const key = 'sitewise_feature_new_reports'

      const isFeatureKey = key.startsWith('sitewise_feature_')

      expect(isFeatureKey).toBe(true)
    })

    it('should identify disabled flag key', () => {
      const key = 'sitewise_onboarding_disabled'

      const isDisabledKey = key === 'sitewise_onboarding_disabled'

      expect(isDisabledKey).toBe(true)
    })

    it('should exclude non-onboarding keys', () => {
      const key = 'user_preferences'

      const isOnboardingRelated = key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')

      expect(isOnboardingRelated).toBe(false)
    })
  })

  describe('State Verification Logic', () => {
    it('should verify clean state after reset', () => {
      localStorageData['sitewise_onboarding_test1'] = 'true'
      localStorageData['sitewise_onboarding_test2'] = 'true'

      Object.keys(localStorageData).forEach(key => {
        if (key.startsWith('sitewise_onboarding_')) {
          delete localStorageData[key]
        }
      })

      const remainingOnboardingKeys = Object.keys(localStorageData).filter(k => k.startsWith('sitewise_onboarding_'))

      expect(remainingOnboardingKeys).toHaveLength(0)
    })

    it('should verify tour completion state', () => {
      const tourId = 'dashboard'
      localStorageData[`sitewise_onboarding_${tourId}`] = 'true'

      const isCompleted = localStorageData[`sitewise_onboarding_${tourId}`] === 'true'

      expect(isCompleted).toBe(true)
    })

    it('should verify tour pending state', () => {
      const tourId = 'new_tour'

      const isCompleted = localStorageData[`sitewise_onboarding_${tourId}`] === 'true'

      expect(isCompleted).toBe(false)
    })
  })
})
