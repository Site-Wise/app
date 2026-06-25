import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  useModalState,
  handlePopState,
  resetModalStack,
  setHistoryIntegrationEnabled,
} from '../../composables/useModalState'

/**
 * Intent-based tests for the REAL useModalState module.
 *
 * useModalState is a module-level LIFO singleton with History-API back-button
 * integration. We therefore:
 *   - resetModalStack() in beforeEach to flush leaked stack/guard state
 *   - re-enable history integration in beforeEach (some tests disable it)
 *   - stub window.history.pushState/back with vi.fn() and RESTORE them in
 *     afterEach so no flakiness leaks across files.
 */

let pushStateSpy: ReturnType<typeof vi.spyOn>
let backSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // Clean module-level singleton state before each test.
  resetModalStack()
  setHistoryIntegrationEnabled(true)

  // Stub the History API. back() is a no-op spy (we never want a real
  // navigation, and happy-dom navigation is disabled anyway). pushState keeps
  // a working no-op so canUseHistory() still sees a function.
  pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
  backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})
})

afterEach(() => {
  // Restore real history methods + flush stack so nothing leaks.
  pushStateSpy.mockRestore()
  backSpy.mockRestore()
  resetModalStack()
  setHistoryIntegrationEnabled(true)
})

describe('useModalState - openModal', () => {
  it('pushes an entry onto the stack and reflects it in computed state', () => {
    const { openModal, isAnyModalOpen, openModalCount, isModalOpen } = useModalState()

    expect(isAnyModalOpen.value).toBe(false)
    expect(openModalCount.value).toBe(0)

    openModal('modal-a')

    expect(isAnyModalOpen.value).toBe(true)
    expect(openModalCount.value).toBe(1)
    expect(isModalOpen('modal-a').value).toBe(true)
    expect(isModalOpen('other').value).toBe(false)
  })

  it('calls history.pushState once when history integration is enabled', () => {
    const { openModal } = useModalState()

    openModal('modal-a')

    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    // State payload carries the modal id so handlePopState can recognise it.
    expect(pushStateSpy).toHaveBeenCalledWith({ swModal: 'modal-a' }, '')
  })

  it('does not call history.pushState when integration is disabled', () => {
    setHistoryIntegrationEnabled(false)
    const { openModal, openModalCount } = useModalState()

    openModal('modal-a')

    expect(pushStateSpy).not.toHaveBeenCalled()
    // Stack still tracks the modal even without history integration.
    expect(openModalCount.value).toBe(1)
  })

  it('stacks multiple modals in open order (LIFO stack)', () => {
    const { openModal, openModalCount, isModalOpen } = useModalState()

    openModal('a')
    openModal('b')
    openModal('c')

    expect(openModalCount.value).toBe(3)
    expect(isModalOpen('a').value).toBe(true)
    expect(isModalOpen('b').value).toBe(true)
    expect(isModalOpen('c').value).toBe(true)
    expect(pushStateSpy).toHaveBeenCalledTimes(3)
  })

  it('degrades gracefully when pushState throws (ownsHistoryEntry=false)', () => {
    pushStateSpy.mockImplementation(() => {
      throw new Error('restricted environment')
    })
    const { openModal, closeModal, openModalCount } = useModalState()

    expect(() => openModal('modal-a')).not.toThrow()
    expect(openModalCount.value).toBe(1)

    // Since pushState failed, ownsHistoryEntry is false → closing must NOT
    // call history.back().
    closeModal('modal-a')
    expect(backSpy).not.toHaveBeenCalled()
    expect(openModalCount.value).toBe(0)
  })
})

describe('useModalState - closeModal (programmatic path)', () => {
  it('removes the entry and calls history.back() once for an owned entry', () => {
    const { openModal, closeModal, openModalCount } = useModalState()

    openModal('modal-a')
    closeModal('modal-a')

    expect(openModalCount.value).toBe(0)
    expect(backSpy).toHaveBeenCalledTimes(1)
  })

  it('is idempotent: closing an unknown id is a no-op and never calls history.back()', () => {
    const { openModal, closeModal, openModalCount } = useModalState()

    openModal('modal-a')
    closeModal('does-not-exist')

    expect(openModalCount.value).toBe(1)
    expect(backSpy).not.toHaveBeenCalled()
  })

  it('closing an already-closed id a second time is a no-op (no extra history.back)', () => {
    const { openModal, closeModal, openModalCount } = useModalState()

    openModal('modal-a')
    closeModal('modal-a')
    expect(backSpy).toHaveBeenCalledTimes(1)

    closeModal('modal-a')
    expect(backSpy).toHaveBeenCalledTimes(1) // unchanged
    expect(openModalCount.value).toBe(0)
  })

  it('does not call history.back() when the entry does not own a history entry', () => {
    setHistoryIntegrationEnabled(false)
    const { openModal, closeModal, openModalCount } = useModalState()

    openModal('modal-a') // ownsHistoryEntry = false (integration disabled)
    closeModal('modal-a')

    expect(backSpy).not.toHaveBeenCalled()
    expect(openModalCount.value).toBe(0)
  })

  it('closes a middle entry in a deep stack without affecting the others', () => {
    const { openModal, closeModal, isModalOpen, openModalCount } = useModalState()

    openModal('a')
    openModal('b')
    openModal('c')

    closeModal('b')

    expect(openModalCount.value).toBe(2)
    expect(isModalOpen('a').value).toBe(true)
    expect(isModalOpen('b').value).toBe(false)
    expect(isModalOpen('c').value).toBe(true)
    expect(backSpy).toHaveBeenCalledTimes(1)
  })
})

describe('useModalState - handlePopState (hardware/browser back)', () => {
  it('closes the TOP entry and runs its close callback', () => {
    const { openModal, openModalCount } = useModalState()
    const closeCb = vi.fn()

    openModal('modal-a', closeCb)
    handlePopState()

    expect(closeCb).toHaveBeenCalledTimes(1)
    expect(openModalCount.value).toBe(0)
  })

  it('does NOT call history.back() again when the close callback re-enters closeModal (isHandlingPopState guard)', () => {
    const { openModal, closeModal, openModalCount } = useModalState()
    // Realistic view callback: flips local state AND calls closeModal(id).
    const closeCb = vi.fn(() => closeModal('modal-a'))

    openModal('modal-a', closeCb)
    expect(backSpy).not.toHaveBeenCalled()

    handlePopState()

    expect(closeCb).toHaveBeenCalledTimes(1)
    // The re-entrant closeModal must NOT trigger history.back (browser already
    // consumed the entry).
    expect(backSpy).not.toHaveBeenCalled()
    expect(openModalCount.value).toBe(0)
  })

  it('pops the top entry defensively even when no close callback is provided', () => {
    const { openModal, openModalCount } = useModalState()

    openModal('modal-a') // no close callback
    handlePopState()

    expect(openModalCount.value).toBe(0)
    expect(backSpy).not.toHaveBeenCalled()
  })

  it('is a pass-through no-op when the stack is empty', () => {
    const { openModalCount } = useModalState()

    expect(() => handlePopState()).not.toThrow()
    expect(openModalCount.value).toBe(0)
    expect(backSpy).not.toHaveBeenCalled()
  })

  it('swallows the echo popstate from our own programmatic history.back()', () => {
    const { openModal, closeModal, openModalCount } = useModalState()
    const closeCb = vi.fn()

    // Two modals so we can prove the echo does NOT close the second one.
    openModal('a')
    openModal('b', closeCb)

    // Programmatic close of top entry 'b' → sets isProgrammaticClose, calls back().
    closeModal('b')
    expect(backSpy).toHaveBeenCalledTimes(1)
    expect(openModalCount.value).toBe(1) // only 'b' gone

    // The browser now fires the echo popstate for our own back(): it must be
    // swallowed and must NOT pop 'a'.
    handlePopState()

    expect(openModalCount.value).toBe(1)
    expect(closeCb).not.toHaveBeenCalled()
  })
})

describe('useModalState - nested / stacked LIFO popstate behaviour', () => {
  it('closes B then A in LIFO order across successive popstates, history stays consistent', () => {
    const { openModal, closeModal, isModalOpen, openModalCount } = useModalState()

    const closeA = vi.fn(() => closeModal('a'))
    const closeB = vi.fn(() => closeModal('b'))

    openModal('a', closeA)
    openModal('b', closeB)
    expect(openModalCount.value).toBe(2)

    // First back press closes the innermost (top) modal B.
    handlePopState()
    expect(closeB).toHaveBeenCalledTimes(1)
    expect(closeA).not.toHaveBeenCalled()
    expect(isModalOpen('b').value).toBe(false)
    expect(isModalOpen('a').value).toBe(true)
    expect(openModalCount.value).toBe(1)

    // Second back press closes A.
    handlePopState()
    expect(closeA).toHaveBeenCalledTimes(1)
    expect(openModalCount.value).toBe(0)

    // Neither hardware-back path ever called history.back() itself.
    expect(backSpy).not.toHaveBeenCalled()
  })
})

describe('useModalState - setHistoryIntegrationEnabled / canUseHistory', () => {
  it('disabling integration skips both pushState and back() (Tauri desktop path)', () => {
    setHistoryIntegrationEnabled(false)
    const { openModal, closeModal, openModalCount } = useModalState()

    openModal('a')
    openModal('b')
    closeModal('b')
    closeModal('a')

    expect(pushStateSpy).not.toHaveBeenCalled()
    expect(backSpy).not.toHaveBeenCalled()
    expect(openModalCount.value).toBe(0)
  })

  it('re-enabling integration restores the pushState/back path', () => {
    setHistoryIntegrationEnabled(false)
    const first = useModalState()
    first.openModal('a')
    expect(pushStateSpy).not.toHaveBeenCalled()
    first.closeModal('a')

    setHistoryIntegrationEnabled(true)
    const { openModal, closeModal } = useModalState()
    openModal('b')
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    closeModal('b')
    expect(backSpy).toHaveBeenCalledTimes(1)
  })

  it('degrades gracefully when the History API pushState is absent', () => {
    // Simulate a partial/SSR-like History API where pushState is not a function.
    // (pushState may live on the prototype, so we override the property to a
    // non-function value rather than delete it.)
    const pushDescriptor = Object.getOwnPropertyDescriptor(window.history, 'pushState')
    pushStateSpy.mockRestore()
    Object.defineProperty(window.history, 'pushState', {
      configurable: true,
      writable: true,
      value: undefined,
    })

    try {
      const { openModal, closeModal, openModalCount } = useModalState()
      expect(() => openModal('a')).not.toThrow()
      // canUseHistory() is false → no ownership → close must not call back().
      closeModal('a')
      expect(backSpy).not.toHaveBeenCalled()
      expect(openModalCount.value).toBe(0)
    } finally {
      // Restore the original pushState so afterEach and other tests are clean.
      if (pushDescriptor) {
        Object.defineProperty(window.history, 'pushState', pushDescriptor)
      } else {
        delete (window.history as any).pushState
      }
    }
  })
})

describe('useModalState - resetModalStack', () => {
  it('flushes the stack and resets state', () => {
    const { openModal, isAnyModalOpen, openModalCount } = useModalState()

    openModal('a')
    openModal('b')
    expect(openModalCount.value).toBe(2)

    resetModalStack()

    expect(openModalCount.value).toBe(0)
    expect(isAnyModalOpen.value).toBe(false)
  })

  it('is a no-op on an empty stack', () => {
    const { openModalCount } = useModalState()
    expect(() => resetModalStack()).not.toThrow()
    expect(openModalCount.value).toBe(0)
  })

  it('resets the guard flags so a subsequent programmatic close still calls history.back()', () => {
    const { openModal, closeModal } = useModalState()

    // Put the module into a programmatic-close state, then reset mid-flight.
    openModal('a')
    closeModal('a') // sets isProgrammaticClose = true (echo popstate not yet delivered)
    expect(backSpy).toHaveBeenCalledTimes(1)

    resetModalStack() // clears isProgrammaticClose / isHandlingPopState

    // After reset, a brand-new modal close must behave normally (back called again).
    openModal('b')
    closeModal('b')
    expect(backSpy).toHaveBeenCalledTimes(2)
  })

  it('keeps the singleton shared across separate useModalState() callers', () => {
    const a = useModalState()
    const b = useModalState()

    a.openModal('shared')
    // Second instance observes the same module-level stack.
    expect(b.isAnyModalOpen.value).toBe(true)
    expect(b.openModalCount.value).toBe(1)
    expect(b.isModalOpen('shared').value).toBe(true)

    b.closeModal('shared')
    expect(a.openModalCount.value).toBe(0)
  })
})

describe('useModalState - composable surface', () => {
  it('exposes the expected API', () => {
    const api = useModalState()
    expect(typeof api.openModal).toBe('function')
    expect(typeof api.closeModal).toBe('function')
    expect(typeof api.isModalOpen).toBe('function')
    expect(typeof api.handlePopState).toBe('function')
    expect(typeof api.resetModalStack).toBe('function')
    expect(api.isAnyModalOpen).toHaveProperty('value')
    expect(api.openModalCount).toHaveProperty('value')
  })
})
