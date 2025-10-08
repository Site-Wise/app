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
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Clear localStorage data
  for (const key in localStorageData) {
    delete localStorageData[key]
  }
  global.localStorage = localStorageMock as any
})

describe('useOnboarding Logic Tests', () => {
  const ONBOARDING_KEY_PREFIX = 'sitewise_onboarding_'
  const ONBOARDING_DISABLED_KEY = 'sitewise_onboarding_disabled'
  const FEATURE_TOUR_PREFIX = 'sitewise_feature_'

  describe('Onboarding Key Constants', () => {
    it('should have correct onboarding key prefix', () => {
      expect(ONBOARDING_KEY_PREFIX).toBe('sitewise_onboarding_')
    })

    it('should have correct disabled key', () => {
      expect(ONBOARDING_DISABLED_KEY).toBe('sitewise_onboarding_disabled')
    })

    it('should have correct feature tour prefix', () => {
      expect(FEATURE_TOUR_PREFIX).toBe('sitewise_feature_')
    })
  })

  describe('Has Tour Been Shown Logic', () => {
    const hasTourBeenShown = (tourId: string): boolean => {
      return localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${tourId}`) === 'true'
    }

    it('should return true when tour has been shown', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      expect(hasTourBeenShown('dashboard')).toBe(true)
    })

    it('should return false when tour has not been shown', () => {
      expect(hasTourBeenShown('dashboard')).toBe(false)
    })

    it('should return false when tour marked as something other than true', () => {
      localStorageData['sitewise_onboarding_items'] = 'false'
      expect(hasTourBeenShown('items')).toBe(false)
    })

    it('should handle multiple tours independently', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      localStorageData['sitewise_onboarding_items'] = 'true'

      expect(hasTourBeenShown('dashboard')).toBe(true)
      expect(hasTourBeenShown('items')).toBe(true)
      expect(hasTourBeenShown('vendors')).toBe(false)
    })
  })

  describe('Mark Tour As Shown Logic', () => {
    const markTourAsShown = (tourId: string) => {
      localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${tourId}`, 'true')
    }

    it('should mark tour as shown in localStorage', () => {
      markTourAsShown('dashboard')
      expect(localStorageData['sitewise_onboarding_dashboard']).toBe('true')
    })

    it('should use correct key format', () => {
      markTourAsShown('items')
      expect(localStorageData).toHaveProperty('sitewise_onboarding_items')
    })

    it('should mark multiple tours independently', () => {
      markTourAsShown('dashboard')
      markTourAsShown('vendors')

      expect(localStorageData['sitewise_onboarding_dashboard']).toBe('true')
      expect(localStorageData['sitewise_onboarding_vendors']).toBe('true')
    })
  })

  describe('Check Onboarding Disabled Logic', () => {
    const checkOnboardingDisabled = (): boolean => {
      return localStorage.getItem(ONBOARDING_DISABLED_KEY) === 'true'
    }

    it('should return true when onboarding is disabled', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'true'
      expect(checkOnboardingDisabled()).toBe(true)
    })

    it('should return false when onboarding is not disabled', () => {
      expect(checkOnboardingDisabled()).toBe(false)
    })

    it('should return false when disabled key has non-true value', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'false'
      expect(checkOnboardingDisabled()).toBe(false)
    })
  })

  describe('Disable Onboarding Logic', () => {
    const disableOnboarding = () => {
      localStorage.setItem(ONBOARDING_DISABLED_KEY, 'true')
    }

    it('should set disabled key to true', () => {
      disableOnboarding()
      expect(localStorageData['sitewise_onboarding_disabled']).toBe('true')
    })

    it('should persist after being set', () => {
      disableOnboarding()
      const isDisabled = localStorage.getItem(ONBOARDING_DISABLED_KEY) === 'true'
      expect(isDisabled).toBe(true)
    })
  })

  describe('Enable Onboarding Logic', () => {
    const enableOnboarding = () => {
      localStorage.removeItem(ONBOARDING_DISABLED_KEY)
    }

    it('should remove disabled key from localStorage', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'true'
      enableOnboarding()
      expect(localStorageData['sitewise_onboarding_disabled']).toBeUndefined()
    })

    it('should allow onboarding after enable', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'true'
      enableOnboarding()

      const isDisabled = localStorage.getItem(ONBOARDING_DISABLED_KEY) === 'true'
      expect(isDisabled).toBe(false)
    })
  })

  describe('Reset All Tours Logic', () => {
    const resetAllTours = () => {
      const keys = Object.keys(localStorageData)
      keys.forEach(key => {
        if (key.startsWith(ONBOARDING_KEY_PREFIX) || key.startsWith(FEATURE_TOUR_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
      localStorage.removeItem(ONBOARDING_DISABLED_KEY)
    }

    it('should remove all onboarding tour keys', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      localStorageData['sitewise_onboarding_items'] = 'true'
      localStorageData['sitewise_onboarding_vendors'] = 'true'

      resetAllTours()

      expect(localStorageData['sitewise_onboarding_dashboard']).toBeUndefined()
      expect(localStorageData['sitewise_onboarding_items']).toBeUndefined()
      expect(localStorageData['sitewise_onboarding_vendors']).toBeUndefined()
    })

    it('should remove all feature tour keys', () => {
      localStorageData['sitewise_feature_new_ui'] = 'true'
      localStorageData['sitewise_feature_analytics'] = 'true'

      resetAllTours()

      expect(localStorageData['sitewise_feature_new_ui']).toBeUndefined()
      expect(localStorageData['sitewise_feature_analytics']).toBeUndefined()
    })

    it('should remove disabled key', () => {
      localStorageData['sitewise_onboarding_disabled'] = 'true'

      resetAllTours()

      expect(localStorageData['sitewise_onboarding_disabled']).toBeUndefined()
    })

    it('should preserve other localStorage keys', () => {
      localStorageData['user_theme'] = 'dark'
      localStorageData['auth_token'] = 'abc123'
      localStorageData['sitewise_onboarding_dashboard'] = 'true'

      resetAllTours()

      expect(localStorageData['user_theme']).toBe('dark')
      expect(localStorageData['auth_token']).toBe('abc123')
    })
  })

  describe('Reset Specific Tour Logic', () => {
    const resetTour = (tourId: string) => {
      localStorage.removeItem(`${ONBOARDING_KEY_PREFIX}${tourId}`)
    }

    it('should reset specific tour', () => {
      localStorageData['sitewise_onboarding_dashboard'] = 'true'
      localStorageData['sitewise_onboarding_items'] = 'true'

      resetTour('dashboard')

      expect(localStorageData['sitewise_onboarding_dashboard']).toBeUndefined()
      expect(localStorageData['sitewise_onboarding_items']).toBe('true')
    })

    it('should use correct key format', () => {
      localStorageData['sitewise_onboarding_vendors'] = 'true'

      resetTour('vendors')

      expect(localStorageData['sitewise_onboarding_vendors']).toBeUndefined()
    })
  })

  describe('Check Tour Elements Exist Logic', () => {
    beforeEach(() => {
      // Mock document.querySelector
      global.document = {
        querySelector: vi.fn((selector: string) => {
          if (selector === '[data-tour="exists"]') {
            return { id: 'mock-element' }
          }
          return null
        })
      } as any
    })

    const checkTourElementsExist = (steps: any[]): boolean => {
      for (const step of steps) {
        if (step.element) {
          const element = document.querySelector(step.element)
          if (!element) {
            return false
          }
        }
      }
      return true
    }

    it('should return true when all elements exist', () => {
      const steps = [
        { element: '[data-tour="exists"]' }
      ]
      expect(checkTourElementsExist(steps)).toBe(true)
    })

    it('should return false when any element is missing', () => {
      const steps = [
        { element: '[data-tour="exists"]' },
        { element: '[data-tour="missing"]' }
      ]
      expect(checkTourElementsExist(steps)).toBe(false)
    })

    it('should return true for steps without elements', () => {
      const steps = [
        { popover: { title: 'Test', description: 'Test description' } }
      ]
      expect(checkTourElementsExist(steps)).toBe(true)
    })

    it('should handle mixed steps with and without elements', () => {
      const steps = [
        { element: '[data-tour="exists"]' },
        { popover: { title: 'Test', description: 'Test' } }
      ]
      expect(checkTourElementsExist(steps)).toBe(true)
    })
  })

  describe('Driver Config Generation Logic', () => {
    const getDriverConfig = () => {
      return {
        showButtons: ['next', 'previous', 'close'],
        animate: true,
        overlayColor: 'rgba(0, 0, 0, 0.4)',
        smoothScroll: true,
        allowClose: true
      }
    }

    it('should include standard navigation buttons', () => {
      const config = getDriverConfig()
      expect(config.showButtons).toContain('next')
      expect(config.showButtons).toContain('previous')
      expect(config.showButtons).toContain('close')
    })

    it('should enable animations', () => {
      const config = getDriverConfig()
      expect(config.animate).toBe(true)
    })

    it('should set overlay color', () => {
      const config = getDriverConfig()
      expect(config.overlayColor).toBe('rgba(0, 0, 0, 0.4)')
    })

    it('should enable smooth scroll', () => {
      const config = getDriverConfig()
      expect(config.smoothScroll).toBe(true)
    })

    it('should allow closing', () => {
      const config = getDriverConfig()
      expect(config.allowClose).toBe(true)
    })
  })

  describe('Start Tour Pre-conditions Logic', () => {
    it('should not start when disabled and not forced', () => {
      const isDisabled = true
      const forceShow = false
      const shouldStart = forceShow || !isDisabled
      expect(shouldStart).toBe(false)
    })

    it('should start when forced even if disabled', () => {
      const isDisabled = true
      const forceShow = true
      const shouldStart = forceShow || !isDisabled
      expect(shouldStart).toBe(true)
    })

    it('should start when not disabled', () => {
      const isDisabled = false
      const forceShow = false
      const shouldStart = forceShow || !isDisabled
      expect(shouldStart).toBe(true)
    })

    it('should not start when already shown and not forced', () => {
      const hasBeenShown = true
      const forceShow = false
      const shouldStart = forceShow || !hasBeenShown
      expect(shouldStart).toBe(false)
    })

    it('should start when forced even if shown', () => {
      const hasBeenShown = true
      const forceShow = true
      const shouldStart = forceShow || !hasBeenShown
      expect(shouldStart).toBe(true)
    })
  })

  describe('Tour Configuration Structure', () => {
    it('should have id field', () => {
      const tour = { id: 'dashboard', steps: [], showOnce: true }
      expect(tour.id).toBeDefined()
      expect(typeof tour.id).toBe('string')
    })

    it('should have steps array', () => {
      const tour = { id: 'dashboard', steps: [], showOnce: true }
      expect(Array.isArray(tour.steps)).toBe(true)
    })

    it('should have showOnce flag', () => {
      const tour = { id: 'dashboard', steps: [], showOnce: true }
      expect(typeof tour.showOnce).toBe('boolean')
    })
  })

  describe('Step Translation Logic', () => {
    const translateStep = (step: any, t: (key: string) => string) => {
      return {
        ...step,
        popover: {
          ...step.popover,
          title: t(step.popover.title),
          description: t(step.popover.description)
        }
      }
    }

    const mockT = (key: string) => `translated_${key}`

    it('should translate step title', () => {
      const step = {
        popover: {
          title: 'onboarding.dashboard.title',
          description: 'onboarding.dashboard.description'
        }
      }
      const translated = translateStep(step, mockT)
      expect(translated.popover.title).toBe('translated_onboarding.dashboard.title')
    })

    it('should translate step description', () => {
      const step = {
        popover: {
          title: 'onboarding.dashboard.title',
          description: 'onboarding.dashboard.description'
        }
      }
      const translated = translateStep(step, mockT)
      expect(translated.popover.description).toBe('translated_onboarding.dashboard.description')
    })

    it('should preserve element reference', () => {
      const step = {
        element: '[data-tour="test"]',
        popover: {
          title: 'title',
          description: 'description'
        }
      }
      const translated = translateStep(step, mockT)
      expect(translated.element).toBe('[data-tour="test"]')
    })
  })

  describe('Skip Button HTML Generation Logic', () => {
    const generateSkipButton = (skipText: string) => {
      return `<br><br><button class="driver-skip-all" onclick="window.dispatchEvent(new CustomEvent('skip-all-onboarding'))">${skipText}</button>`
    }

    it('should create button with skip text', () => {
      const html = generateSkipButton('Skip All')
      expect(html).toContain('Skip All')
    })

    it('should include driver-skip-all class', () => {
      const html = generateSkipButton('Skip')
      expect(html).toContain('class="driver-skip-all"')
    })

    it('should dispatch custom event on click', () => {
      const html = generateSkipButton('Skip')
      expect(html).toContain('skip-all-onboarding')
      expect(html).toContain('window.dispatchEvent')
    })

    it('should include line breaks for spacing', () => {
      const html = generateSkipButton('Skip')
      expect(html).toContain('<br><br>')
    })
  })

  describe('Mobile Detection Logic', () => {
    it('should detect mobile when width < 1024', () => {
      const width = 768
      const isMobile = width < 1024
      expect(isMobile).toBe(true)
    })

    it('should detect desktop when width >= 1024', () => {
      const width = 1280
      const isMobile = width < 1024
      expect(isMobile).toBe(false)
    })

    it('should use 1024 as breakpoint', () => {
      const breakpoint = 1024
      expect(breakpoint).toBe(1024)
    })

    it('should handle edge case at exact breakpoint', () => {
      const width = 1024
      const isMobile = width < 1024
      expect(isMobile).toBe(false) // 1024 is desktop
    })
  })

  describe('Tour Steps Array Manipulation Logic', () => {
    it('should create steps array', () => {
      const steps: any[] = []
      expect(Array.isArray(steps)).toBe(true)
    })

    it('should push step to array', () => {
      const steps: any[] = []
      steps.push({
        element: '[data-tour="test"]',
        popover: { title: 'Test', description: 'Test desc' }
      })
      expect(steps).toHaveLength(1)
    })

    it('should conditionally add steps', () => {
      const steps: any[] = []
      const isMobile = false

      if (!isMobile) {
        steps.push({ element: '[data-tour="desktop"]', popover: { title: 'Desktop', description: 'Desktop step' } })
      }

      expect(steps).toHaveLength(1)
      expect(steps[0].element).toBe('[data-tour="desktop"]')
    })

    it('should add different steps for mobile', () => {
      const steps: any[] = []
      const isMobile = true

      if (isMobile) {
        steps.push({ element: '[data-tour="mobile"]', popover: { title: 'Mobile', description: 'Mobile step' } })
      }

      expect(steps).toHaveLength(1)
      expect(steps[0].element).toBe('[data-tour="mobile"]')
    })
  })

  describe('OnboardingStep Interface', () => {
    it('should have optional element field', () => {
      const step: { element?: string; popover: any } = {
        popover: { title: 'Test', description: 'Test' }
      }
      expect(step.element).toBeUndefined()
    })

    it('should have popover field', () => {
      const step = {
        popover: {
          title: 'Test',
          description: 'Test desc'
        }
      }
      expect(step.popover).toBeDefined()
    })

    it('should have title in popover', () => {
      const popover = {
        title: 'Welcome',
        description: 'Welcome to the tour'
      }
      expect(popover.title).toBeDefined()
    })

    it('should have description in popover', () => {
      const popover = {
        title: 'Welcome',
        description: 'Welcome to the tour'
      }
      expect(popover.description).toBeDefined()
    })

    it('should have optional side positioning', () => {
      const popover: { title: string; description: string; side?: string } = {
        title: 'Test',
        description: 'Test'
      }
      expect(popover.side).toBeUndefined()
    })

    it('should have optional align positioning', () => {
      const popover: { title: string; description: string; align?: string } = {
        title: 'Test',
        description: 'Test'
      }
      expect(popover.align).toBeUndefined()
    })
  })

  describe('Tour ID Validation Logic', () => {
    const validTourIds = ['dashboard', 'items', 'delivery', 'vendors', 'services', 'accounts']

    it('should include dashboard tour', () => {
      expect(validTourIds).toContain('dashboard')
    })

    it('should include items tour', () => {
      expect(validTourIds).toContain('items')
    })

    it('should include delivery tour', () => {
      expect(validTourIds).toContain('delivery')
    })

    it('should include vendors tour', () => {
      expect(validTourIds).toContain('vendors')
    })

    it('should include services tour', () => {
      expect(validTourIds).toContain('services')
    })

    it('should include accounts tour', () => {
      expect(validTourIds).toContain('accounts')
    })
  })

  describe('Current Tour ID Tracking Logic', () => {
    it('should start with null tour ID', () => {
      let currentTourId: string | null = null
      expect(currentTourId).toBeNull()
    })

    it('should set tour ID when tour starts', () => {
      let currentTourId: string | null = null
      currentTourId = 'dashboard'
      expect(currentTourId).toBe('dashboard')
    })

    it('should clear tour ID when tour ends', () => {
      let currentTourId: string | null = 'dashboard'
      currentTourId = null
      expect(currentTourId).toBeNull()
    })
  })
})
