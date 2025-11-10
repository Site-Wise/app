import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock useOnboarding
vi.mock('../../composables/useOnboarding', () => ({
  useOnboarding: vi.fn()
}))

describe('useFeatureTourExample Logic', () => {
  let mockShowFeatureTour: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockShowFeatureTour = vi.fn()

    const { useOnboarding } = vi.mocked(await import('../../composables/useOnboarding'))
    useOnboarding.mockReturnValue({
      showFeatureTour: mockShowFeatureTour,
      isOnboardingDisabled: { value: false },
      disableOnboarding: vi.fn(),
      enableOnboarding: vi.fn(),
      shouldShowTour: vi.fn(),
      markTourAsShown: vi.fn(),
      resetTour: vi.fn(),
      resetAllTours: vi.fn()
    })
  })

  describe('Tally Export Feature Tour Logic', () => {
    it('should call showFeatureTour with correct tour ID', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      expect(mockShowFeatureTour).toHaveBeenCalledTimes(1)
      const callArgs = mockShowFeatureTour.mock.calls[0]
      expect(callArgs[0]).toBe('tally_export_beta')
    })

    it('should define tour with correct number of steps', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]
      expect(steps).toHaveLength(2)
    })

    it('should have intro step without element selector', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]
      expect(steps[0].element).toBeUndefined()
      expect(steps[0].popover).toBeDefined()
    })

    it('should have intro step with correct popover configuration', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]
      const introStep = steps[0]

      expect(introStep.popover.title).toBe('features.tallyExport.intro.title')
      expect(introStep.popover.description).toBe('features.tallyExport.intro.description')
      expect(introStep.popover.side).toBe('bottom')
      expect(introStep.popover.align).toBe('center')
    })

    it('should have second step with export dropdown selector', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]
      const exportStep = steps[1]

      expect(exportStep.element).toBe('[data-tour="export-dropdown"]')
    })

    it('should have export dropdown step with correct popover', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]
      const exportStep = steps[1]

      expect(exportStep.popover.title).toBe('features.tallyExport.button.title')
      expect(exportStep.popover.description).toBe('features.tallyExport.button.description')
      expect(exportStep.popover.side).toBe('left')
    })

    it('should use correct translation keys for tally export', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]

      const allTranslationKeys = steps.flatMap((step: any) => [
        step.popover?.title,
        step.popover?.description
      ]).filter(Boolean)

      expect(allTranslationKeys.every((key: string) => key.startsWith('features.tallyExport'))).toBe(true)
    })
  })

  describe('Payment Enhancements Feature Tour Logic', () => {
    it('should call showFeatureTour with correct tour ID', async () => {
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showPaymentEnhancementsFeatureTour()

      expect(mockShowFeatureTour).toHaveBeenCalledTimes(1)
      const callArgs = mockShowFeatureTour.mock.calls[0]
      expect(callArgs[0]).toBe('payment_enhancements_v2')
    })

    it('should define tour with correct number of steps', async () => {
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showPaymentEnhancementsFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]
      expect(steps).toHaveLength(2)
    })

    it('should have payment button step as first step', async () => {
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showPaymentEnhancementsFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]
      const paymentStep = steps[0]

      expect(paymentStep.element).toBe('[data-tour="payment-button"]')
      expect(paymentStep.popover.title).toBe('features.paymentEnhancements.button.title')
      expect(paymentStep.popover.description).toBe('features.paymentEnhancements.button.description')
      expect(paymentStep.popover.side).toBe('left')
    })

    it('should have credit notes step as second step', async () => {
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showPaymentEnhancementsFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]
      const creditStep = steps[1]

      expect(creditStep.element).toBe('[data-tour="credit-notes"]')
      expect(creditStep.popover.title).toBe('features.paymentEnhancements.creditNotes.title')
      expect(creditStep.popover.description).toBe('features.paymentEnhancements.creditNotes.description')
      expect(creditStep.popover.side).toBe('top')
    })

    it('should use correct translation keys for payment enhancements', async () => {
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showPaymentEnhancementsFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]

      const allTranslationKeys = steps.flatMap((step: any) => [
        step.popover?.title,
        step.popover?.description
      ]).filter(Boolean)

      expect(allTranslationKeys.every((key: string) => key.startsWith('features.paymentEnhancements'))).toBe(true)
    })

    it('should all steps have element selectors', async () => {
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showPaymentEnhancementsFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]

      expect(steps.every((step: any) => step.element)).toBe(true)
    })
  })

  describe('Tour Step Structure Validation', () => {
    it('should validate tally export step structure', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]

      steps.forEach((step: any) => {
        expect(step.popover).toBeDefined()
        expect(step.popover.title).toBeDefined()
        expect(step.popover.description).toBeDefined()
        expect(step.popover.side).toBeDefined()
      })
    })

    it('should validate payment enhancements step structure', async () => {
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showPaymentEnhancementsFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]

      steps.forEach((step: any) => {
        expect(step.element).toBeDefined()
        expect(step.popover).toBeDefined()
        expect(step.popover.title).toBeDefined()
        expect(step.popover.description).toBeDefined()
        expect(step.popover.side).toBeDefined()
      })
    })

    it('should use valid popover side values', async () => {
      const { showTallyExportFeatureTour, showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      const validSides = ['top', 'bottom', 'left', 'right']

      showTallyExportFeatureTour()
      let callArgs = mockShowFeatureTour.mock.calls[0]
      let steps = callArgs[1]
      steps.forEach((step: any) => {
        expect(validSides).toContain(step.popover.side)
      })

      mockShowFeatureTour.mockClear()

      showPaymentEnhancementsFeatureTour()
      callArgs = mockShowFeatureTour.mock.calls[0]
      steps = callArgs[1]
      steps.forEach((step: any) => {
        expect(validSides).toContain(step.popover.side)
      })
    })

    it('should use valid popover align values when specified', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      const validAligns = ['start', 'center', 'end']

      showTallyExportFeatureTour()
      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]

      steps.forEach((step: any) => {
        if (step.popover.align) {
          expect(validAligns).toContain(step.popover.align)
        }
      })
    })
  })

  describe('Data Tour Selector Patterns', () => {
    it('should use data-tour attribute selectors', async () => {
      const { showTallyExportFeatureTour, showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()
      let callArgs = mockShowFeatureTour.mock.calls[0]
      let steps = callArgs[1]

      const tallySelectors = steps
        .map((step: any) => step.element)
        .filter(Boolean)

      tallySelectors.forEach((selector: string) => {
        expect(selector).toMatch(/\[data-tour="[^"]+"\]/)
      })

      mockShowFeatureTour.mockClear()

      showPaymentEnhancementsFeatureTour()
      callArgs = mockShowFeatureTour.mock.calls[0]
      steps = callArgs[1]

      const paymentSelectors = steps
        .map((step: any) => step.element)
        .filter(Boolean)

      paymentSelectors.forEach((selector: string) => {
        expect(selector).toMatch(/\[data-tour="[^"]+"\]/)
      })
    })

    it('should use unique data-tour values', async () => {
      const { showTallyExportFeatureTour, showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()
      const tallyCallArgs = mockShowFeatureTour.mock.calls[0]
      const tallySteps = tallyCallArgs[1]
      const tallySelectors = tallySteps.map((step: any) => step.element).filter(Boolean)

      mockShowFeatureTour.mockClear()

      showPaymentEnhancementsFeatureTour()
      const paymentCallArgs = mockShowFeatureTour.mock.calls[0]
      const paymentSteps = paymentCallArgs[1]
      const paymentSelectors = paymentSteps.map((step: any) => step.element).filter(Boolean)

      const allSelectors = [...tallySelectors, ...paymentSelectors]
      const uniqueSelectors = new Set(allSelectors)

      expect(uniqueSelectors.size).toBe(allSelectors.length)
    })
  })

  describe('Feature Tour IDs', () => {
    it('should use unique tour IDs for different features', async () => {
      const { showTallyExportFeatureTour, showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()
      const tallyTourId = mockShowFeatureTour.mock.calls[0][0]

      mockShowFeatureTour.mockClear()

      showPaymentEnhancementsFeatureTour()
      const paymentTourId = mockShowFeatureTour.mock.calls[0][0]

      expect(tallyTourId).not.toBe(paymentTourId)
    })

    it('should use descriptive tour ID naming convention', async () => {
      const { showTallyExportFeatureTour, showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()
      const tallyTourId = mockShowFeatureTour.mock.calls[0][0]
      expect(tallyTourId).toContain('tally')
      expect(tallyTourId).toContain('export')

      mockShowFeatureTour.mockClear()

      showPaymentEnhancementsFeatureTour()
      const paymentTourId = mockShowFeatureTour.mock.calls[0][0]
      expect(paymentTourId).toContain('payment')
      expect(paymentTourId).toContain('enhancements')
    })

    it('should use snake_case for tour IDs', async () => {
      const { showTallyExportFeatureTour, showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()
      const tallyTourId = mockShowFeatureTour.mock.calls[0][0]
      expect(tallyTourId).toMatch(/^[a-z_0-9]+$/)

      mockShowFeatureTour.mockClear()

      showPaymentEnhancementsFeatureTour()
      const paymentTourId = mockShowFeatureTour.mock.calls[0][0]
      expect(paymentTourId).toMatch(/^[a-z_0-9]+$/)
    })
  })

  describe('useOnboarding Integration', () => {
    it('should call useOnboarding from tally export tour', async () => {
      const { useOnboarding } = vi.mocked(await import('../../composables/useOnboarding'))
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      expect(useOnboarding).toHaveBeenCalled()
    })

    it('should call useOnboarding from payment enhancements tour', async () => {
      const { useOnboarding } = vi.mocked(await import('../../composables/useOnboarding'))
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showPaymentEnhancementsFeatureTour()

      expect(useOnboarding).toHaveBeenCalled()
    })

    it('should call showFeatureTour method from useOnboarding', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      expect(mockShowFeatureTour).toHaveBeenCalled()
      expect(typeof mockShowFeatureTour).toBe('function')
    })
  })

  describe('Translation Key Patterns', () => {
    it('should follow features.{featureName}.{section}.{field} pattern', async () => {
      const { showTallyExportFeatureTour, showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      const featureKeyPattern = /^features\.[a-zA-Z]+\.[a-zA-Z]+\.(title|description)$/

      showTallyExportFeatureTour()
      let callArgs = mockShowFeatureTour.mock.calls[0]
      let steps = callArgs[1]
      steps.forEach((step: any) => {
        expect(step.popover.title).toMatch(featureKeyPattern)
        expect(step.popover.description).toMatch(featureKeyPattern)
      })

      mockShowFeatureTour.mockClear()

      showPaymentEnhancementsFeatureTour()
      callArgs = mockShowFeatureTour.mock.calls[0]
      steps = callArgs[1]
      steps.forEach((step: any) => {
        expect(step.popover.title).toMatch(featureKeyPattern)
        expect(step.popover.description).toMatch(featureKeyPattern)
      })
    })

    it('should have both title and description keys for each step', async () => {
      const { showTallyExportFeatureTour, showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()
      let callArgs = mockShowFeatureTour.mock.calls[0]
      let steps = callArgs[1]
      steps.forEach((step: any) => {
        expect(step.popover.title).toBeDefined()
        expect(step.popover.description).toBeDefined()
        expect(step.popover.title.endsWith('.title')).toBe(true)
        expect(step.popover.description.endsWith('.description')).toBe(true)
      })

      mockShowFeatureTour.mockClear()

      showPaymentEnhancementsFeatureTour()
      callArgs = mockShowFeatureTour.mock.calls[0]
      steps = callArgs[1]
      steps.forEach((step: any) => {
        expect(step.popover.title).toBeDefined()
        expect(step.popover.description).toBeDefined()
        expect(step.popover.title.endsWith('.title')).toBe(true)
        expect(step.popover.description.endsWith('.description')).toBe(true)
      })
    })
  })

  describe('Step Order and Flow Logic', () => {
    it('should have intro step before specific element steps in tally tour', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]

      // First step should not have element (intro)
      expect(steps[0].element).toBeUndefined()
      // Second step should have element
      expect(steps[1].element).toBeDefined()
    })

    it('should follow logical UI flow in payment tour', async () => {
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      showPaymentEnhancementsFeatureTour()

      const callArgs = mockShowFeatureTour.mock.calls[0]
      const steps = callArgs[1]

      // All steps should have elements
      steps.forEach((step: any) => {
        expect(step.element).toBeDefined()
      })

      // Payment button should come before credit notes
      expect(steps[0].element).toContain('payment-button')
      expect(steps[1].element).toContain('credit-notes')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should not throw error when calling tally export tour', async () => {
      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      expect(() => showTallyExportFeatureTour()).not.toThrow()
    })

    it('should not throw error when calling payment enhancements tour', async () => {
      const { showPaymentEnhancementsFeatureTour } = await import('../../composables/useFeatureTourExample')

      expect(() => showPaymentEnhancementsFeatureTour()).not.toThrow()
    })

    it('should handle case when useOnboarding returns different structure', async () => {
      const alternateShowFeatureTour = vi.fn()
      const { useOnboarding } = vi.mocked(await import('../../composables/useOnboarding'))
      useOnboarding.mockReturnValue({
        showFeatureTour: alternateShowFeatureTour,
        isOnboardingDisabled: { value: false },
        disableOnboarding: vi.fn(),
        enableOnboarding: vi.fn(),
        shouldShowTour: vi.fn(),
        markTourAsShown: vi.fn(),
        resetTour: vi.fn(),
        resetAllTours: vi.fn()
      })

      const { showTallyExportFeatureTour } = await import('../../composables/useFeatureTourExample')

      showTallyExportFeatureTour()

      expect(alternateShowFeatureTour).toHaveBeenCalled()
    })
  })

  describe('Module Exports', () => {
    it('should export showTallyExportFeatureTour function', async () => {
      const module = await import('../../composables/useFeatureTourExample')

      expect(module.showTallyExportFeatureTour).toBeDefined()
      expect(typeof module.showTallyExportFeatureTour).toBe('function')
    })

    it('should export showPaymentEnhancementsFeatureTour function', async () => {
      const module = await import('../../composables/useFeatureTourExample')

      expect(module.showPaymentEnhancementsFeatureTour).toBeDefined()
      expect(typeof module.showPaymentEnhancementsFeatureTour).toBe('function')
    })

    it('should export exactly two functions', async () => {
      const module = await import('../../composables/useFeatureTourExample')

      const exportedFunctions = Object.keys(module).filter(
        key => typeof module[key as keyof typeof module] === 'function'
      )

      expect(exportedFunctions).toHaveLength(2)
    })
  })
})
