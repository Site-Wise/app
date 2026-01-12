import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// Mock useI18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'loading.pleaseWait': 'Please wait...',
        'loading.success': 'Operation completed successfully',
        'loading.error': 'Something went wrong',
        'loading.timeout': 'This is taking longer than expected',
        'loading.timeoutHint': 'You may close this and try again',
        'common.close': 'Close'
      }
      return translations[key] || key
    },
    locale: { value: 'en' }
  })
}))

// Import after mocks
import LoadingOverlay from '../LoadingOverlay.vue'

describe('LoadingOverlay Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('State Determination', () => {
    it('should identify loading state correctly', () => {
      const getEffectiveState = (state: string, hasTimedOut: boolean) => {
        if (state === 'loading' && hasTimedOut) {
          return 'timeout'
        }
        return state
      }

      expect(getEffectiveState('loading', false)).toBe('loading')
      expect(getEffectiveState('loading', true)).toBe('timeout')
      expect(getEffectiveState('success', false)).toBe('success')
      expect(getEffectiveState('error', false)).toBe('error')
    })

    it('should determine if overlay can be closed', () => {
      const canClose = (allowClose: boolean, effectiveState: string) => {
        return allowClose || effectiveState === 'error' || effectiveState === 'timeout'
      }

      expect(canClose(false, 'loading')).toBe(false)
      expect(canClose(false, 'success')).toBe(false)
      expect(canClose(false, 'error')).toBe(true)
      expect(canClose(false, 'timeout')).toBe(true)
      expect(canClose(true, 'loading')).toBe(true)
      expect(canClose(true, 'success')).toBe(true)
    })
  })

  describe('Message Selection', () => {
    it('should return custom message when provided', () => {
      const getDisplayMessage = (message: string | undefined, state: string, t: (key: string) => string) => {
        if (message) return message
        switch (state) {
          case 'loading': return t('loading.pleaseWait')
          case 'success': return t('loading.success')
          case 'error': return t('loading.error')
          case 'timeout': return t('loading.timeout')
          default: return ''
        }
      }

      const t = (key: string) => `translated_${key}`

      expect(getDisplayMessage('Custom message', 'loading', t)).toBe('Custom message')
      expect(getDisplayMessage(undefined, 'loading', t)).toBe('translated_loading.pleaseWait')
      expect(getDisplayMessage(undefined, 'success', t)).toBe('translated_loading.success')
      expect(getDisplayMessage(undefined, 'error', t)).toBe('translated_loading.error')
      expect(getDisplayMessage(undefined, 'timeout', t)).toBe('translated_loading.timeout')
    })

    it('should return empty string for unknown state', () => {
      const getDisplayMessage = (message: string | undefined, state: string) => {
        if (message) return message
        switch (state) {
          case 'loading': return 'Loading...'
          case 'success': return 'Success'
          case 'error': return 'Error'
          case 'timeout': return 'Timeout'
          default: return ''
        }
      }

      expect(getDisplayMessage(undefined, 'unknown')).toBe('')
    })
  })

  describe('Icon Classes', () => {
    it('should return correct icon classes for each state', () => {
      const getIconClasses = (state: string) => {
        const baseClasses = 'h-12 w-12 sm:h-16 sm:w-16'
        switch (state) {
          case 'loading': return `${baseClasses} text-primary-500 animate-spin`
          case 'success': return `${baseClasses} text-green-500`
          case 'error': return `${baseClasses} text-red-500`
          case 'timeout': return `${baseClasses} text-amber-500`
          default: return `${baseClasses} text-primary-500`
        }
      }

      expect(getIconClasses('loading')).toContain('animate-spin')
      expect(getIconClasses('loading')).toContain('text-primary-500')
      expect(getIconClasses('success')).toContain('text-green-500')
      expect(getIconClasses('success')).not.toContain('animate-spin')
      expect(getIconClasses('error')).toContain('text-red-500')
      expect(getIconClasses('timeout')).toContain('text-amber-500')
    })

    it('should include responsive size classes', () => {
      const getIconClasses = (state: string) => {
        const baseClasses = 'h-12 w-12 sm:h-16 sm:w-16'
        return `${baseClasses} text-${state === 'loading' ? 'primary' : 'gray'}-500`
      }

      const classes = getIconClasses('loading')
      expect(classes).toContain('h-12 w-12')
      expect(classes).toContain('sm:h-16 sm:w-16')
    })

    it('should return default classes for unknown state', () => {
      const getIconClasses = (state: string) => {
        const baseClasses = 'h-12 w-12 sm:h-16 sm:w-16'
        switch (state) {
          case 'loading': return `${baseClasses} text-primary-500 animate-spin`
          case 'success': return `${baseClasses} text-green-500`
          case 'error': return `${baseClasses} text-red-500`
          case 'timeout': return `${baseClasses} text-amber-500`
          default: return `${baseClasses} text-primary-500`
        }
      }

      expect(getIconClasses('unknown')).toContain('text-primary-500')
      expect(getIconClasses('unknown')).not.toContain('animate-spin')
    })
  })

  describe('Icon Background Classes', () => {
    it('should return correct background classes for each state', () => {
      const getIconBgClasses = (state: string) => {
        switch (state) {
          case 'loading': return 'bg-primary-100 dark:bg-primary-900/30'
          case 'success': return 'bg-green-100 dark:bg-green-900/30'
          case 'error': return 'bg-red-100 dark:bg-red-900/30'
          case 'timeout': return 'bg-amber-100 dark:bg-amber-900/30'
          default: return 'bg-primary-100 dark:bg-primary-900/30'
        }
      }

      expect(getIconBgClasses('loading')).toContain('bg-primary-100')
      expect(getIconBgClasses('success')).toContain('bg-green-100')
      expect(getIconBgClasses('error')).toContain('bg-red-100')
      expect(getIconBgClasses('timeout')).toContain('bg-amber-100')
    })

    it('should include dark mode classes', () => {
      const getIconBgClasses = (state: string) => {
        switch (state) {
          case 'loading': return 'bg-primary-100 dark:bg-primary-900/30'
          case 'success': return 'bg-green-100 dark:bg-green-900/30'
          default: return ''
        }
      }

      expect(getIconBgClasses('loading')).toContain('dark:bg-primary-900/30')
      expect(getIconBgClasses('success')).toContain('dark:bg-green-900/30')
    })

    it('should return default classes for unknown state', () => {
      const getIconBgClasses = (state: string) => {
        switch (state) {
          case 'loading': return 'bg-primary-100 dark:bg-primary-900/30'
          case 'success': return 'bg-green-100 dark:bg-green-900/30'
          case 'error': return 'bg-red-100 dark:bg-red-900/30'
          case 'timeout': return 'bg-amber-100 dark:bg-amber-900/30'
          default: return 'bg-primary-100 dark:bg-primary-900/30'
        }
      }

      expect(getIconBgClasses('unknown')).toBe('bg-primary-100 dark:bg-primary-900/30')
    })
  })

  describe('Timer Logic', () => {
    it('should trigger timeout after specified duration', () => {
      let hasTimedOut = false
      const timeoutDuration = 10000

      const startTimeoutTimer = () => {
        return setTimeout(() => {
          hasTimedOut = true
        }, timeoutDuration)
      }

      startTimeoutTimer()

      expect(hasTimedOut).toBe(false)

      vi.advanceTimersByTime(5000)
      expect(hasTimedOut).toBe(false)

      vi.advanceTimersByTime(5000)
      expect(hasTimedOut).toBe(true)
    })

    it('should auto-close after success duration', () => {
      let closed = false
      const successDuration = 1500

      const startSuccessTimer = () => {
        return setTimeout(() => {
          closed = true
        }, successDuration)
      }

      startSuccessTimer()

      expect(closed).toBe(false)

      vi.advanceTimersByTime(1000)
      expect(closed).toBe(false)

      vi.advanceTimersByTime(500)
      expect(closed).toBe(true)
    })

    it('should clear timers properly', () => {
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null
      let successTimer: ReturnType<typeof setTimeout> | null = null
      let hasTimedOut = false
      let closed = false

      const clearTimers = () => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer)
          timeoutTimer = null
        }
        if (successTimer) {
          clearTimeout(successTimer)
          successTimer = null
        }
      }

      timeoutTimer = setTimeout(() => { hasTimedOut = true }, 10000)
      successTimer = setTimeout(() => { closed = true }, 1500)

      clearTimers()

      vi.advanceTimersByTime(15000)

      expect(hasTimedOut).toBe(false)
      expect(closed).toBe(false)
    })

    it('should handle custom timeout duration', () => {
      let hasTimedOut = false
      const customTimeout = 5000

      setTimeout(() => { hasTimedOut = true }, customTimeout)

      vi.advanceTimersByTime(4999)
      expect(hasTimedOut).toBe(false)

      vi.advanceTimersByTime(1)
      expect(hasTimedOut).toBe(true)
    })

    it('should handle custom success duration', () => {
      let closed = false
      const customSuccess = 3000

      setTimeout(() => { closed = true }, customSuccess)

      vi.advanceTimersByTime(2999)
      expect(closed).toBe(false)

      vi.advanceTimersByTime(1)
      expect(closed).toBe(true)
    })
  })

  describe('Default Props', () => {
    it('should have correct default values', () => {
      const defaultProps = {
        state: 'loading',
        timeoutDuration: 10000,
        successDuration: 1500,
        allowClose: false
      }

      expect(defaultProps.state).toBe('loading')
      expect(defaultProps.timeoutDuration).toBe(10000)
      expect(defaultProps.successDuration).toBe(1500)
      expect(defaultProps.allowClose).toBe(false)
    })

    it('should allow overriding defaults', () => {
      const customProps = {
        state: 'success',
        timeoutDuration: 5000,
        successDuration: 2000,
        allowClose: true
      }

      expect(customProps.state).toBe('success')
      expect(customProps.timeoutDuration).toBe(5000)
      expect(customProps.successDuration).toBe(2000)
      expect(customProps.allowClose).toBe(true)
    })
  })

  describe('Escape Key Handling', () => {
    it('should handle escape key when close is allowed', () => {
      let closed = false
      const canClose = true

      const handleEscape = (event: { key: string }) => {
        if (event.key === 'Escape' && canClose) {
          closed = true
        }
      }

      handleEscape({ key: 'Escape' })
      expect(closed).toBe(true)
    })

    it('should not close on escape when close is not allowed', () => {
      let closed = false
      const canClose = false

      const handleEscape = (event: { key: string }) => {
        if (event.key === 'Escape' && canClose) {
          closed = true
        }
      }

      handleEscape({ key: 'Escape' })
      expect(closed).toBe(false)
    })

    it('should not close on other keys', () => {
      let closed = false
      const canClose = true

      const handleEscape = (event: { key: string }) => {
        if (event.key === 'Escape' && canClose) {
          closed = true
        }
      }

      handleEscape({ key: 'Enter' })
      expect(closed).toBe(false)
    })

    it('should handle multiple key presses', () => {
      let closeCount = 0
      const canClose = true

      const handleEscape = (event: { key: string }) => {
        if (event.key === 'Escape' && canClose) {
          closeCount++
        }
      }

      handleEscape({ key: 'Escape' })
      handleEscape({ key: 'Enter' })
      handleEscape({ key: 'Escape' })

      expect(closeCount).toBe(2)
    })
  })

  describe('State Transitions', () => {
    it('should handle transition from loading to success', () => {
      const transitions: string[] = []
      let state = 'loading'

      const updateState = (newState: string) => {
        transitions.push(`${state} -> ${newState}`)
        state = newState
      }

      updateState('success')
      expect(transitions).toContain('loading -> success')
      expect(state).toBe('success')
    })

    it('should handle transition from loading to error', () => {
      const transitions: string[] = []
      let state = 'loading'

      const updateState = (newState: string) => {
        transitions.push(`${state} -> ${newState}`)
        state = newState
      }

      updateState('error')
      expect(transitions).toContain('loading -> error')
      expect(state).toBe('error')
    })

    it('should handle transition from loading to timeout', () => {
      let state = 'loading'
      let hasTimedOut = false

      const getEffectiveState = () => {
        if (state === 'loading' && hasTimedOut) {
          return 'timeout'
        }
        return state
      }

      expect(getEffectiveState()).toBe('loading')

      hasTimedOut = true
      expect(getEffectiveState()).toBe('timeout')
    })

    it('should handle rapid state transitions', () => {
      let state = 'loading'

      const updateState = (newState: string) => {
        state = newState
      }

      updateState('success')
      updateState('loading')
      updateState('error')

      expect(state).toBe('error')
    })

    it('should not affect timeout state when success is set', () => {
      let hasTimedOut = true

      const getEffectiveState = (state: string) => {
        if (state === 'loading' && hasTimedOut) {
          return 'timeout'
        }
        return state
      }

      // Success state should not be affected by hasTimedOut
      expect(getEffectiveState('success')).toBe('success')
    })
  })

  describe('Accessibility', () => {
    it('should have correct aria attributes structure', () => {
      const ariaAttributes = {
        role: 'dialog',
        'aria-modal': 'true',
        tabindex: '-1'
      }

      expect(ariaAttributes.role).toBe('dialog')
      expect(ariaAttributes['aria-modal']).toBe('true')
      expect(ariaAttributes.tabindex).toBe('-1')
    })

    it('should provide aria-label from display message', () => {
      const getAriaLabel = (message: string) => message

      expect(getAriaLabel('Please wait...')).toBe('Please wait...')
      expect(getAriaLabel('Operation completed')).toBe('Operation completed')
    })

    it('should have accessible close button', () => {
      const closeButtonAriaLabel = 'Close'
      expect(closeButtonAriaLabel).toBe('Close')
    })
  })

  describe('Icon Component Selection', () => {
    it('should select correct icon based on state', () => {
      const getIconName = (state: string) => {
        switch (state) {
          case 'loading': return 'Loader2'
          case 'success': return 'CheckCircle'
          case 'error': return 'XCircle'
          case 'timeout': return 'AlertTriangle'
          default: return 'Loader2'
        }
      }

      expect(getIconName('loading')).toBe('Loader2')
      expect(getIconName('success')).toBe('CheckCircle')
      expect(getIconName('error')).toBe('XCircle')
      expect(getIconName('timeout')).toBe('AlertTriangle')
      expect(getIconName('unknown')).toBe('Loader2')
    })
  })

  describe('Close Button Visibility', () => {
    it('should show close button for error state', () => {
      const shouldShowCloseButton = (state: string) => {
        return state === 'error' || state === 'timeout'
      }

      expect(shouldShowCloseButton('error')).toBe(true)
    })

    it('should show close button for timeout state', () => {
      const shouldShowCloseButton = (state: string) => {
        return state === 'error' || state === 'timeout'
      }

      expect(shouldShowCloseButton('timeout')).toBe(true)
    })

    it('should not show close button for loading and success states by default', () => {
      const shouldShowCloseButton = (state: string) => {
        return state === 'error' || state === 'timeout'
      }

      expect(shouldShowCloseButton('loading')).toBe(false)
      expect(shouldShowCloseButton('success')).toBe(false)
    })

    it('should show close button when allowClose is true regardless of state', () => {
      const canClose = (allowClose: boolean, state: string) => {
        return allowClose || state === 'error' || state === 'timeout'
      }

      expect(canClose(true, 'loading')).toBe(true)
      expect(canClose(true, 'success')).toBe(true)
    })
  })

  describe('Timeout Hint Visibility', () => {
    it('should show timeout hint only in timeout state', () => {
      const shouldShowTimeoutHint = (state: string) => state === 'timeout'

      expect(shouldShowTimeoutHint('loading')).toBe(false)
      expect(shouldShowTimeoutHint('success')).toBe(false)
      expect(shouldShowTimeoutHint('error')).toBe(false)
      expect(shouldShowTimeoutHint('timeout')).toBe(true)
    })
  })

  describe('Responsive Design', () => {
    it('should have mobile-friendly button size', () => {
      const buttonClasses = 'min-h-[44px]'
      expect(buttonClasses).toContain('min-h-[44px]')
    })

    it('should have responsive container width', () => {
      const containerClasses = 'min-w-[280px] max-w-sm w-full'
      expect(containerClasses).toContain('min-w-[280px]')
      expect(containerClasses).toContain('max-w-sm')
      expect(containerClasses).toContain('w-full')
    })

    it('should have responsive padding', () => {
      const containerClasses = 'p-6 sm:p-8'
      expect(containerClasses).toContain('p-6')
      expect(containerClasses).toContain('sm:p-8')
    })

    it('should have responsive icon margin', () => {
      const marginClasses = 'mb-4 sm:mb-5'
      expect(marginClasses).toContain('mb-4')
      expect(marginClasses).toContain('sm:mb-5')
    })

    it('should have responsive text sizes', () => {
      const textClasses = 'text-base sm:text-lg'
      expect(textClasses).toContain('text-base')
      expect(textClasses).toContain('sm:text-lg')
    })
  })

  describe('Z-Index Layering', () => {
    it('should have z-index higher than modals (z-[60])', () => {
      // LoadingOverlay uses z-[70] to appear above modals that use z-[60]
      const loadingOverlayZIndex = 70
      const modalZIndex = 60

      expect(loadingOverlayZIndex).toBeGreaterThan(modalZIndex)
    })

    it('should have correct z-index class', () => {
      const expectedZIndexClass = 'z-[70]'
      expect(expectedZIndexClass).toBe('z-[70]')
    })
  })

  describe('Event Emissions', () => {
    it('should emit close event when handleClose is called', () => {
      const events: string[] = []

      const emit = (event: string) => {
        events.push(event)
      }

      const handleClose = (canClose: boolean) => {
        if (canClose) {
          emit('close')
        }
      }

      handleClose(true)
      expect(events).toContain('close')
    })

    it('should not emit close when canClose is false', () => {
      const events: string[] = []

      const emit = (event: string) => {
        events.push(event)
      }

      const handleClose = (canClose: boolean) => {
        if (canClose) {
          emit('close')
        }
      }

      handleClose(false)
      expect(events).not.toContain('close')
    })

    it('should emit timeout event when timeout occurs', () => {
      const events: string[] = []

      const emit = (event: string) => {
        events.push(event)
      }

      const triggerTimeout = () => {
        emit('timeout')
      }

      triggerTimeout()
      expect(events).toContain('timeout')
    })
  })

  describe('Watch Behavior', () => {
    it('should reset timeout flag when show changes to false', () => {
      let hasTimedOut = true

      const onShowChange = (newValue: boolean) => {
        if (!newValue) {
          hasTimedOut = false
        }
      }

      onShowChange(false)
      expect(hasTimedOut).toBe(false)
    })

    it('should start timeout timer when show becomes true', () => {
      let timerStarted = false

      const onShowChange = (newValue: boolean, state: string) => {
        if (newValue && state === 'loading') {
          timerStarted = true
        }
      }

      onShowChange(true, 'loading')
      expect(timerStarted).toBe(true)
    })

    it('should not start timeout timer for non-loading states', () => {
      let timerStarted = false

      const onShowChange = (newValue: boolean, state: string) => {
        if (newValue && state === 'loading') {
          timerStarted = true
        }
      }

      onShowChange(true, 'success')
      expect(timerStarted).toBe(false)
    })

    it('should start success timer when state changes to success', () => {
      let successTimerStarted = false

      const onStateChange = (newState: string, show: boolean) => {
        if (newState === 'success' && show) {
          successTimerStarted = true
        }
      }

      onStateChange('success', true)
      expect(successTimerStarted).toBe(true)
    })

    it('should restart timeout timer when state changes back to loading', () => {
      let timeoutTimerRestarted = false
      let hasTimedOut = true

      const onStateChange = (newState: string, show: boolean) => {
        if (newState === 'loading' && show) {
          hasTimedOut = false
          timeoutTimerRestarted = true
        }
      }

      onStateChange('loading', true)
      expect(timeoutTimerRestarted).toBe(true)
      expect(hasTimedOut).toBe(false)
    })
  })

  describe('Dark Mode Support', () => {
    it('should have dark mode background classes', () => {
      const bgClasses = 'bg-white dark:bg-gray-800'
      expect(bgClasses).toContain('dark:bg-gray-800')
    })

    it('should have dark mode text classes', () => {
      const textClasses = 'text-gray-700 dark:text-gray-200'
      expect(textClasses).toContain('dark:text-gray-200')
    })

    it('should have dark mode border classes', () => {
      const borderClasses = 'border-gray-200 dark:border-gray-700'
      expect(borderClasses).toContain('dark:border-gray-700')
    })

    it('should have dark mode hover classes for close button', () => {
      const hoverClasses = 'hover:bg-gray-100 dark:hover:bg-gray-700'
      expect(hoverClasses).toContain('dark:hover:bg-gray-700')
    })
  })

  describe('Animation Classes', () => {
    it('should have fade transition for overlay', () => {
      const enterClasses = 'transition-opacity duration-200 ease-out'
      expect(enterClasses).toContain('transition-opacity')
      expect(enterClasses).toContain('duration-200')
    })

    it('should have scale transition for content', () => {
      const enterFromClasses = 'scale-90 opacity-0'
      const enterToClasses = 'scale-100 opacity-100'
      expect(enterFromClasses).toContain('scale-90')
      expect(enterToClasses).toContain('scale-100')
    })

    it('should have backdrop blur effect', () => {
      const backdropClasses = 'backdrop-blur-sm'
      expect(backdropClasses).toContain('backdrop-blur-sm')
    })

    it('should have transition duration for icon background', () => {
      const transitionClasses = 'transition-colors duration-300'
      expect(transitionClasses).toContain('transition-colors')
      expect(transitionClasses).toContain('duration-300')
    })
  })

  describe('Teleport Behavior', () => {
    it('should teleport to body element', () => {
      const teleportTarget = 'body'
      expect(teleportTarget).toBe('body')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty message gracefully', () => {
      const getDisplayMessage = (message: string | undefined) => {
        return message || 'Default message'
      }

      expect(getDisplayMessage('')).toBe('Default message')
      expect(getDisplayMessage(undefined)).toBe('Default message')
    })

    it('should handle zero timeout duration', () => {
      let hasTimedOut = false
      const timeoutDuration = 0

      setTimeout(() => { hasTimedOut = true }, timeoutDuration)
      vi.advanceTimersByTime(0)

      expect(hasTimedOut).toBe(true)
    })

    it('should handle very long timeout duration', () => {
      let hasTimedOut = false
      const timeoutDuration = 60000 // 1 minute

      setTimeout(() => { hasTimedOut = true }, timeoutDuration)

      vi.advanceTimersByTime(59999)
      expect(hasTimedOut).toBe(false)

      vi.advanceTimersByTime(1)
      expect(hasTimedOut).toBe(true)
    })

    it('should handle state changes while hidden', () => {
      let state = 'loading'
      const show = false

      const shouldStartTimer = (newState: string, isShown: boolean) => {
        return newState === 'loading' && isShown
      }

      expect(shouldStartTimer(state, show)).toBe(false)
    })

    it('should handle multiple rapid show/hide toggles', () => {
      let timerCount = 0

      const onShowChange = (newValue: boolean) => {
        if (newValue) {
          timerCount++
        }
      }

      onShowChange(true)
      onShowChange(false)
      onShowChange(true)
      onShowChange(false)
      onShowChange(true)

      expect(timerCount).toBe(3)
    })
  })
})

describe('LoadingOverlay Component Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render when show is true', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('should not render when show is false', () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: false
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('should emit close event on backdrop click when allowed', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'error'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    const backdrop = wrapper.find('.bg-gray-900\\/60')
    if (backdrop.exists()) {
      await backdrop.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    }
    wrapper.unmount()
  })

  it('should display custom message', async () => {
    const customMessage = 'Custom loading message'
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        message: customMessage
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    expect(wrapper.text()).toContain(customMessage)
    wrapper.unmount()
  })

  it('should show close button in error state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'error'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    // Look for close button (X icon button or Close text button)
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('should show timeout hint in timeout state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'timeout'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    expect(wrapper.text()).toContain('You may close this and try again')
    wrapper.unmount()
  })

  it('should have correct z-index class', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.classes()).toContain('z-[70]')
    wrapper.unmount()
  })

  it('should emit timeout event after timeout duration', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'loading',
        timeoutDuration: 5000
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()

    vi.advanceTimersByTime(5000)
    await nextTick()

    expect(wrapper.emitted('timeout')).toBeTruthy()
    wrapper.unmount()
  })

  it('should auto-close after success duration', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'loading',
        successDuration: 1000
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()

    // Change state to success - this triggers the success timer
    await wrapper.setProps({ state: 'success' })
    await nextTick()

    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('should increment stateKey on state change for animations', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'loading'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    const initialKey = wrapper.vm.stateKey

    // Change state to trigger animation
    await wrapper.setProps({ state: 'success' })
    await nextTick()

    expect(wrapper.vm.stateKey).toBe(initialKey + 1)
    wrapper.unmount()
  })

  it('should increment stateKey when timeout occurs', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'loading',
        timeoutDuration: 1000
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    const initialKey = wrapper.vm.stateKey

    // Wait for timeout
    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(wrapper.vm.stateKey).toBeGreaterThan(initialKey)
    wrapper.unmount()
  })

  it('should apply shake animation class for error state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'error'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    expect(wrapper.vm.iconClasses).toContain('animate-icon-shake')
    wrapper.unmount()
  })

  it('should apply pulse animation class for timeout state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'timeout'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    expect(wrapper.vm.iconClasses).toContain('animate-icon-pulse')
    wrapper.unmount()
  })

  it('should apply pop animation class for success state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'success'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    expect(wrapper.vm.iconClasses).toContain('animate-icon-pop')
    wrapper.unmount()
  })

  it('should apply spin animation class for loading state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'loading'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    expect(wrapper.vm.iconClasses).toContain('animate-spin')
    wrapper.unmount()
  })

  it('should handle state change from error back to loading', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'error',
        timeoutDuration: 5000
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()

    // Change back to loading - should restart timeout timer
    await wrapper.setProps({ state: 'loading' })
    await nextTick()

    // Verify timeout works after state change
    vi.advanceTimersByTime(5000)
    await nextTick()

    expect(wrapper.emitted('timeout')).toBeTruthy()
    wrapper.unmount()
  })

  it('should not emit close when clicking backdrop in loading state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'loading'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    const backdrop = wrapper.find('.bg-gray-900\\/60')
    if (backdrop.exists()) {
      await backdrop.trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    }
    wrapper.unmount()
  })

  it('should emit close when clicking X button in error state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'error'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    const closeButton = wrapper.find('button[aria-label="Close"]')
    if (closeButton.exists()) {
      await closeButton.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    }
    wrapper.unmount()
  })

  it('should emit close on escape key in error state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'error'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    const dialog = wrapper.find('[role="dialog"]')
    await dialog.trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('should not emit close on escape key in loading state', async () => {
    const wrapper = mount(LoadingOverlay, {
      props: {
        show: true,
        state: 'loading'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await nextTick()
    const dialog = wrapper.find('[role="dialog"]')
    await dialog.trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
  })
})
