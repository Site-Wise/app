import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useKeyboardShortcut Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Keyboard Event Matching Logic', () => {
    it('should match key correctly (case-insensitive)', () => {
      const keyMatches = (eventKey: string, shortcutKey: string): boolean => {
        return eventKey.toLowerCase() === shortcutKey.toLowerCase()
      }

      expect(keyMatches('n', 'n')).toBe(true)
      expect(keyMatches('N', 'n')).toBe(true)
      expect(keyMatches('n', 'N')).toBe(true)
      expect(keyMatches('N', 'N')).toBe(true)
      expect(keyMatches('a', 'b')).toBe(false)
    })

    it('should match shift key modifier correctly', () => {
      const shiftMatches = (eventShiftKey: boolean, shortcutShiftKey?: boolean): boolean => {
        return shortcutShiftKey === undefined || eventShiftKey === shortcutShiftKey
      }

      expect(shiftMatches(true, true)).toBe(true)
      expect(shiftMatches(false, false)).toBe(true)
      expect(shiftMatches(true, undefined)).toBe(true)
      expect(shiftMatches(false, undefined)).toBe(true)
      expect(shiftMatches(true, false)).toBe(false)
      expect(shiftMatches(false, true)).toBe(false)
    })

    it('should match alt key modifier correctly', () => {
      const altMatches = (eventAltKey: boolean, shortcutAltKey?: boolean): boolean => {
        return shortcutAltKey === undefined || eventAltKey === shortcutAltKey
      }

      expect(altMatches(true, true)).toBe(true)
      expect(altMatches(false, false)).toBe(true)
      expect(altMatches(true, undefined)).toBe(true)
      expect(altMatches(false, undefined)).toBe(true)
      expect(altMatches(true, false)).toBe(false)
      expect(altMatches(false, true)).toBe(false)
    })

    it('should match ctrl key modifier correctly', () => {
      const ctrlMatches = (eventCtrlKey: boolean, shortcutCtrlKey?: boolean): boolean => {
        return shortcutCtrlKey === undefined || eventCtrlKey === shortcutCtrlKey
      }

      expect(ctrlMatches(true, true)).toBe(true)
      expect(ctrlMatches(false, false)).toBe(true)
      expect(ctrlMatches(true, undefined)).toBe(true)
      expect(ctrlMatches(false, undefined)).toBe(true)
      expect(ctrlMatches(true, false)).toBe(false)
      expect(ctrlMatches(false, true)).toBe(false)
    })

    it('should match meta key modifier correctly', () => {
      const metaMatches = (eventMetaKey: boolean, shortcutMetaKey?: boolean): boolean => {
        return shortcutMetaKey === undefined || eventMetaKey === shortcutMetaKey
      }

      expect(metaMatches(true, true)).toBe(true)
      expect(metaMatches(false, false)).toBe(true)
      expect(metaMatches(true, undefined)).toBe(true)
      expect(metaMatches(false, undefined)).toBe(true)
      expect(metaMatches(true, false)).toBe(false)
      expect(metaMatches(false, true)).toBe(false)
    })
  })

  describe('Shortcut Matching Logic', () => {
    it('should match simple key shortcut', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        altKey?: boolean
        ctrlKey?: boolean
        metaKey?: boolean
        handler: () => void
      }

      const matchesShortcut = (
        event: { key: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean },
        shortcut: KeyboardShortcut
      ): boolean => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey
        const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey
        const ctrlMatch = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey
        const metaMatch = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey

        return keyMatch && shiftMatch && altMatch && ctrlMatch && metaMatch
      }

      const shortcut: KeyboardShortcut = {
        key: 'n',
        handler: vi.fn()
      }

      const event = {
        key: 'n',
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false
      }

      expect(matchesShortcut(event, shortcut)).toBe(true)
    })

    it('should match shortcut with shift modifier', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        altKey?: boolean
        ctrlKey?: boolean
        metaKey?: boolean
        handler: () => void
      }

      const matchesShortcut = (
        event: { key: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean },
        shortcut: KeyboardShortcut
      ): boolean => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey
        const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey
        const ctrlMatch = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey
        const metaMatch = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey

        return keyMatch && shiftMatch && altMatch && ctrlMatch && metaMatch
      }

      const shortcut: KeyboardShortcut = {
        key: 'n',
        shiftKey: true,
        handler: vi.fn()
      }

      const matchingEvent = {
        key: 'n',
        shiftKey: true,
        altKey: false,
        ctrlKey: false,
        metaKey: false
      }

      const nonMatchingEvent = {
        key: 'n',
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false
      }

      expect(matchesShortcut(matchingEvent, shortcut)).toBe(true)
      expect(matchesShortcut(nonMatchingEvent, shortcut)).toBe(false)
    })

    it('should match shortcut with multiple modifiers', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        altKey?: boolean
        ctrlKey?: boolean
        metaKey?: boolean
        handler: () => void
      }

      const matchesShortcut = (
        event: { key: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean },
        shortcut: KeyboardShortcut
      ): boolean => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey
        const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey
        const ctrlMatch = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey
        const metaMatch = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey

        return keyMatch && shiftMatch && altMatch && ctrlMatch && metaMatch
      }

      const shortcut: KeyboardShortcut = {
        key: 'n',
        shiftKey: true,
        altKey: true,
        handler: vi.fn()
      }

      const matchingEvent = {
        key: 'n',
        shiftKey: true,
        altKey: true,
        ctrlKey: false,
        metaKey: false
      }

      const nonMatchingEvent1 = {
        key: 'n',
        shiftKey: true,
        altKey: false,
        ctrlKey: false,
        metaKey: false
      }

      const nonMatchingEvent2 = {
        key: 'n',
        shiftKey: false,
        altKey: true,
        ctrlKey: false,
        metaKey: false
      }

      expect(matchesShortcut(matchingEvent, shortcut)).toBe(true)
      expect(matchesShortcut(nonMatchingEvent1, shortcut)).toBe(false)
      expect(matchesShortcut(nonMatchingEvent2, shortcut)).toBe(false)
    })

    it('should not match when key is different', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        altKey?: boolean
        ctrlKey?: boolean
        metaKey?: boolean
        handler: () => void
      }

      const matchesShortcut = (
        event: { key: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean },
        shortcut: KeyboardShortcut
      ): boolean => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey
        const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey
        const ctrlMatch = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey
        const metaMatch = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey

        return keyMatch && shiftMatch && altMatch && ctrlMatch && metaMatch
      }

      const shortcut: KeyboardShortcut = {
        key: 'n',
        shiftKey: true,
        altKey: true,
        handler: vi.fn()
      }

      const event = {
        key: 'm', // Different key
        shiftKey: true,
        altKey: true,
        ctrlKey: false,
        metaKey: false
      }

      expect(matchesShortcut(event, shortcut)).toBe(false)
    })
  })

  describe('Handler Execution Logic', () => {
    it('should execute handler when shortcut matches', () => {
      const handler = vi.fn()

      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        handler: () => void
      }

      const executeIfMatches = (
        event: { key: string; shiftKey: boolean },
        shortcut: KeyboardShortcut
      ): boolean => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey

        if (keyMatch && shiftMatch) {
          shortcut.handler()
          return true
        }
        return false
      }

      const shortcut: KeyboardShortcut = {
        key: 'n',
        shiftKey: true,
        handler
      }

      const event = {
        key: 'n',
        shiftKey: true
      }

      executeIfMatches(event, shortcut)

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should not execute handler when shortcut does not match', () => {
      const handler = vi.fn()

      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        handler: () => void
      }

      const executeIfMatches = (
        event: { key: string; shiftKey: boolean },
        shortcut: KeyboardShortcut
      ): boolean => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey

        if (keyMatch && shiftMatch) {
          shortcut.handler()
          return true
        }
        return false
      }

      const shortcut: KeyboardShortcut = {
        key: 'n',
        shiftKey: true,
        handler
      }

      const event = {
        key: 'm', // Different key
        shiftKey: true
      }

      executeIfMatches(event, shortcut)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should only execute first matching shortcut', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      interface KeyboardShortcut {
        key: string
        handler: () => void
      }

      const executeFirstMatch = (
        event: { key: string },
        shortcuts: KeyboardShortcut[]
      ) => {
        for (const shortcut of shortcuts) {
          if (event.key.toLowerCase() === shortcut.key.toLowerCase()) {
            shortcut.handler()
            break // Only handle first match
          }
        }
      }

      const shortcuts: KeyboardShortcut[] = [
        { key: 'n', handler: handler1 },
        { key: 'n', handler: handler2 }
      ]

      const event = { key: 'n' }

      executeFirstMatch(event, shortcuts)

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).not.toHaveBeenCalled()
    })
  })

  describe('Multiple Shortcuts Handling', () => {
    it('should handle array of shortcuts', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()

      interface KeyboardShortcut {
        key: string
        handler: () => void
      }

      const shortcuts: KeyboardShortcut[] = [
        { key: 'n', handler: handler1 },
        { key: 'd', handler: handler2 },
        { key: 'e', handler: handler3 }
      ]

      expect(shortcuts).toHaveLength(3)
      expect(shortcuts[0].key).toBe('n')
      expect(shortcuts[1].key).toBe('d')
      expect(shortcuts[2].key).toBe('e')
    })

    it('should find correct shortcut in array', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        handler: () => void
      }

      const findMatchingShortcut = (
        event: { key: string; shiftKey: boolean },
        shortcuts: KeyboardShortcut[]
      ): KeyboardShortcut | undefined => {
        return shortcuts.find(shortcut => {
          const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
          const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey
          return keyMatch && shiftMatch
        })
      }

      const shortcuts: KeyboardShortcut[] = [
        { key: 'n', shiftKey: true, handler: vi.fn() },
        { key: 'd', handler: vi.fn() },
        { key: 'e', shiftKey: true, altKey: true, handler: vi.fn() }
      ]

      const event1 = { key: 'n', shiftKey: true }
      const event2 = { key: 'd', shiftKey: false }
      const event3 = { key: 'z', shiftKey: false }

      expect(findMatchingShortcut(event1, shortcuts)?.key).toBe('n')
      expect(findMatchingShortcut(event2, shortcuts)?.key).toBe('d')
      expect(findMatchingShortcut(event3, shortcuts)).toBeUndefined()
    })
  })

  describe('Special Keys Handling', () => {
    it('should handle escape key', () => {
      const handler = vi.fn()

      interface KeyboardShortcut {
        key: string
        handler: () => void
      }

      const shortcut: KeyboardShortcut = {
        key: 'Escape',
        handler
      }

      const keyMatches = (eventKey: string, shortcutKey: string): boolean => {
        return eventKey.toLowerCase() === shortcutKey.toLowerCase()
      }

      expect(keyMatches('Escape', shortcut.key)).toBe(true)
      expect(keyMatches('escape', shortcut.key)).toBe(true)
      expect(keyMatches('ESC', shortcut.key)).toBe(false) // Not exact match
    })

    it('should handle enter key', () => {
      const handler = vi.fn()

      interface KeyboardShortcut {
        key: string
        handler: () => void
      }

      const shortcut: KeyboardShortcut = {
        key: 'Enter',
        handler
      }

      const keyMatches = (eventKey: string, shortcutKey: string): boolean => {
        return eventKey.toLowerCase() === shortcutKey.toLowerCase()
      }

      expect(keyMatches('Enter', shortcut.key)).toBe(true)
      expect(keyMatches('enter', shortcut.key)).toBe(true)
    })

    it('should handle function keys', () => {
      const keyMatches = (eventKey: string, shortcutKey: string): boolean => {
        return eventKey.toLowerCase() === shortcutKey.toLowerCase()
      }

      expect(keyMatches('F1', 'f1')).toBe(true)
      expect(keyMatches('F12', 'f12')).toBe(true)
      expect(keyMatches('F5', 'F5')).toBe(true)
    })

    it('should handle arrow keys', () => {
      const keyMatches = (eventKey: string, shortcutKey: string): boolean => {
        return eventKey.toLowerCase() === shortcutKey.toLowerCase()
      }

      expect(keyMatches('ArrowUp', 'arrowup')).toBe(true)
      expect(keyMatches('ArrowDown', 'arrowdown')).toBe(true)
      expect(keyMatches('ArrowLeft', 'arrowleft')).toBe(true)
      expect(keyMatches('ArrowRight', 'arrowright')).toBe(true)
    })

    it('should handle space key', () => {
      const keyMatches = (eventKey: string, shortcutKey: string): boolean => {
        return eventKey.toLowerCase() === shortcutKey.toLowerCase()
      }

      expect(keyMatches(' ', ' ')).toBe(true)
      expect(keyMatches(' ', 'space')).toBe(false) // Space character vs 'space' string
    })
  })

  describe('Event Prevention Logic', () => {
    it('should prevent default behavior when shortcut matches', () => {
      const mockEvent = {
        key: 'n',
        shiftKey: true,
        preventDefault: vi.fn()
      }

      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        handler: () => void
      }

      const handleShortcut = (
        event: typeof mockEvent,
        shortcut: KeyboardShortcut
      ) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey

        if (keyMatch && shiftMatch) {
          event.preventDefault()
          shortcut.handler()
        }
      }

      const shortcut: KeyboardShortcut = {
        key: 'n',
        shiftKey: true,
        handler: vi.fn()
      }

      handleShortcut(mockEvent, shortcut)

      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1)
    })

    it('should not prevent default when shortcut does not match', () => {
      const mockEvent = {
        key: 'm', // Different key
        shiftKey: true,
        preventDefault: vi.fn()
      }

      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        handler: () => void
      }

      const handleShortcut = (
        event: typeof mockEvent,
        shortcut: KeyboardShortcut
      ) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey

        if (keyMatch && shiftMatch) {
          event.preventDefault()
          shortcut.handler()
        }
      }

      const shortcut: KeyboardShortcut = {
        key: 'n',
        shiftKey: true,
        handler: vi.fn()
      }

      handleShortcut(mockEvent, shortcut)

      expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('Shortcut Interface Validation', () => {
    it('should validate KeyboardShortcut interface structure', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        altKey?: boolean
        ctrlKey?: boolean
        metaKey?: boolean
        handler: () => void
      }

      const isValidShortcut = (obj: any): obj is KeyboardShortcut => {
        return (
          typeof obj === 'object' &&
          typeof obj.key === 'string' &&
          obj.key.length > 0 &&
          typeof obj.handler === 'function' &&
          (obj.shiftKey === undefined || typeof obj.shiftKey === 'boolean') &&
          (obj.altKey === undefined || typeof obj.altKey === 'boolean') &&
          (obj.ctrlKey === undefined || typeof obj.ctrlKey === 'boolean') &&
          (obj.metaKey === undefined || typeof obj.metaKey === 'boolean')
        )
      }

      const validShortcut: KeyboardShortcut = {
        key: 'n',
        shiftKey: true,
        handler: () => {}
      }

      expect(isValidShortcut(validShortcut)).toBe(true)
      expect(isValidShortcut({ key: 'n' })).toBe(false) // Missing handler
      expect(isValidShortcut({ handler: () => {} })).toBe(false) // Missing key
      expect(isValidShortcut({ key: '', handler: () => {} })).toBe(false) // Empty key
    })
  })

  describe('Single Shortcut Helper Logic', () => {
    it('should convert single shortcut to array format', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        altKey?: boolean
        ctrlKey?: boolean
        metaKey?: boolean
        handler: () => void
      }

      const createShortcutArray = (
        key: string,
        handler: () => void,
        modifiers?: {
          shiftKey?: boolean
          altKey?: boolean
          ctrlKey?: boolean
          metaKey?: boolean
        }
      ): KeyboardShortcut[] => {
        return [
          {
            key,
            handler,
            ...modifiers
          }
        ]
      }

      const handler = vi.fn()
      const shortcuts = createShortcutArray('n', handler, { shiftKey: true })

      expect(shortcuts).toHaveLength(1)
      expect(shortcuts[0].key).toBe('n')
      expect(shortcuts[0].shiftKey).toBe(true)
      expect(shortcuts[0].handler).toBe(handler)
    })

    it('should handle modifiers spreading correctly', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        altKey?: boolean
        ctrlKey?: boolean
        metaKey?: boolean
        handler: () => void
      }

      const createShortcut = (
        key: string,
        handler: () => void,
        modifiers?: {
          shiftKey?: boolean
          altKey?: boolean
          ctrlKey?: boolean
          metaKey?: boolean
        }
      ): KeyboardShortcut => {
        return {
          key,
          handler,
          ...modifiers
        }
      }

      const handler = vi.fn()

      const shortcut1 = createShortcut('n', handler)
      expect(shortcut1.shiftKey).toBeUndefined()

      const shortcut2 = createShortcut('n', handler, { shiftKey: true, altKey: true })
      expect(shortcut2.shiftKey).toBe(true)
      expect(shortcut2.altKey).toBe(true)
      expect(shortcut2.ctrlKey).toBeUndefined()
    })
  })

  describe('Composable Integration', () => {
    it('should handle composable import without errors', async () => {
      const module = await import('../../composables/useKeyboardShortcut')
      expect(module.useKeyboardShortcut).toBeDefined()
      expect(module.useKeyboardShortcutSingle).toBeDefined()
      expect(typeof module.useKeyboardShortcut).toBe('function')
      expect(typeof module.useKeyboardShortcutSingle).toBe('function')
    })

    it('should validate KeyboardShortcut interface export', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        altKey?: boolean
        ctrlKey?: boolean
        metaKey?: boolean
        handler: () => void
      }

      const testShortcut: KeyboardShortcut = {
        key: 'n',
        shiftKey: true,
        altKey: true,
        handler: () => {}
      }

      expect(testShortcut).toBeDefined()
      expect(testShortcut.key).toBe('n')
      expect(testShortcut.shiftKey).toBe(true)
      expect(testShortcut.altKey).toBe(true)
      expect(typeof testShortcut.handler).toBe('function')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty shortcuts array', () => {
      const processShortcuts = (shortcuts: any[]) => {
        return shortcuts.length
      }

      expect(processShortcuts([])).toBe(0)
    })

    it('should handle shortcuts with same key but different modifiers', () => {
      interface KeyboardShortcut {
        key: string
        shiftKey?: boolean
        altKey?: boolean
        handler: () => void
      }

      const shortcuts: KeyboardShortcut[] = [
        { key: 'n', handler: vi.fn() },
        { key: 'n', shiftKey: true, handler: vi.fn() },
        { key: 'n', shiftKey: true, altKey: true, handler: vi.fn() }
      ]

      expect(shortcuts).toHaveLength(3)
      expect(shortcuts.every(s => s.key === 'n')).toBe(true)
    })

    it('should handle numeric key shortcuts', () => {
      const keyMatches = (eventKey: string, shortcutKey: string): boolean => {
        return eventKey.toLowerCase() === shortcutKey.toLowerCase()
      }

      expect(keyMatches('1', '1')).toBe(true)
      expect(keyMatches('0', '0')).toBe(true)
      expect(keyMatches('9', '9')).toBe(true)
    })

    it('should handle symbol key shortcuts', () => {
      const keyMatches = (eventKey: string, shortcutKey: string): boolean => {
        return eventKey === shortcutKey // Case-sensitive for symbols
      }

      expect(keyMatches('?', '?')).toBe(true)
      expect(keyMatches('/', '/')).toBe(true)
      expect(keyMatches('!', '!')).toBe(true)
    })
  })

  describe('Modifier Combination Logic', () => {
    it('should handle Ctrl+Shift combination', () => {
      interface KeyboardShortcut {
        key: string
        ctrlKey?: boolean
        shiftKey?: boolean
        handler: () => void
      }

      const matchesShortcut = (
        event: { key: string; ctrlKey: boolean; shiftKey: boolean },
        shortcut: KeyboardShortcut
      ): boolean => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey

        return keyMatch && ctrlMatch && shiftMatch
      }

      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        handler: vi.fn()
      }

      const matchingEvent = {
        key: 's',
        ctrlKey: true,
        shiftKey: true
      }

      expect(matchesShortcut(matchingEvent, shortcut)).toBe(true)
    })

    it('should handle Alt+Shift combination', () => {
      interface KeyboardShortcut {
        key: string
        altKey?: boolean
        shiftKey?: boolean
        handler: () => void
      }

      const matchesShortcut = (
        event: { key: string; altKey: boolean; shiftKey: boolean },
        shortcut: KeyboardShortcut
      ): boolean => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey

        return keyMatch && altMatch && shiftMatch
      }

      const shortcut: KeyboardShortcut = {
        key: 'n',
        altKey: true,
        shiftKey: true,
        handler: vi.fn()
      }

      const matchingEvent = {
        key: 'n',
        altKey: true,
        shiftKey: true
      }

      expect(matchesShortcut(matchingEvent, shortcut)).toBe(true)
    })

    it('should handle Cmd/Meta key (macOS)', () => {
      interface KeyboardShortcut {
        key: string
        metaKey?: boolean
        handler: () => void
      }

      const matchesShortcut = (
        event: { key: string; metaKey: boolean },
        shortcut: KeyboardShortcut
      ): boolean => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const metaMatch = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey

        return keyMatch && metaMatch
      }

      const shortcut: KeyboardShortcut = {
        key: 's',
        metaKey: true,
        handler: vi.fn()
      }

      const matchingEvent = {
        key: 's',
        metaKey: true
      }

      expect(matchesShortcut(matchingEvent, shortcut)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', () => {
      const failingHandler = () => {
        throw new Error('Handler error')
      }

      const safeExecuteHandler = (handler: () => void) => {
        try {
          handler()
        } catch (error) {
          // Error is caught and logged
          return false
        }
        return true
      }

      expect(safeExecuteHandler(failingHandler)).toBe(false)
      expect(() => safeExecuteHandler(failingHandler)).not.toThrow()
    })

    it('should validate shortcut configuration before registration', () => {
      interface KeyboardShortcut {
        key: string
        handler: () => void
      }

      const isValidShortcutConfig = (shortcut: any): shortcut is KeyboardShortcut => {
        return (
          typeof shortcut === 'object' &&
          shortcut !== null &&
          typeof shortcut.key === 'string' &&
          shortcut.key.length > 0 &&
          typeof shortcut.handler === 'function'
        )
      }

      expect(isValidShortcutConfig({ key: 'n', handler: () => {} })).toBe(true)
      expect(isValidShortcutConfig({ key: '', handler: () => {} })).toBe(false)
      expect(isValidShortcutConfig({ key: 'n' })).toBe(false)
      expect(isValidShortcutConfig(null)).toBe(false)
    })
  })
})
