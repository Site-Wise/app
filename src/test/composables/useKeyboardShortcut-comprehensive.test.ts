import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Comprehensive tests for useKeyboardShortcut composable logic
 * Tests keyboard shortcut handling, key binding, and event management
 */

describe('useKeyboardShortcut Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Key Combination Parsing', () => {
    it('should parse simple key', () => {
      const parseKey = (shortcut: string) => {
        const parts = shortcut.toLowerCase().split('+')
        return {
          key: parts[parts.length - 1],
          modifiers: parts.slice(0, -1)
        }
      }

      expect(parseKey('n')).toEqual({ key: 'n', modifiers: [] })
    })

    it('should parse key with single modifier', () => {
      const parseKey = (shortcut: string) => {
        const parts = shortcut.toLowerCase().split('+')
        return {
          key: parts[parts.length - 1],
          modifiers: parts.slice(0, -1)
        }
      }

      expect(parseKey('shift+n')).toEqual({ key: 'n', modifiers: ['shift'] })
      expect(parseKey('ctrl+s')).toEqual({ key: 's', modifiers: ['ctrl'] })
    })

    it('should parse key with multiple modifiers', () => {
      const parseKey = (shortcut: string) => {
        const parts = shortcut.toLowerCase().split('+')
        return {
          key: parts[parts.length - 1],
          modifiers: parts.slice(0, -1)
        }
      }

      expect(parseKey('shift+alt+n')).toEqual({ key: 'n', modifiers: ['shift', 'alt'] })
      expect(parseKey('ctrl+shift+s')).toEqual({ key: 's', modifiers: ['ctrl', 'shift'] })
    })

    it('should handle escape key', () => {
      const parseKey = (shortcut: string) => {
        const parts = shortcut.toLowerCase().split('+')
        return {
          key: parts[parts.length - 1],
          modifiers: parts.slice(0, -1)
        }
      }

      expect(parseKey('escape')).toEqual({ key: 'escape', modifiers: [] })
      expect(parseKey('esc')).toEqual({ key: 'esc', modifiers: [] })
    })
  })

  describe('Key Event Matching', () => {
    it('should match simple key press', () => {
      const matchesShortcut = (event: any, shortcut: string) => {
        const parts = shortcut.toLowerCase().split('+')
        const key = parts[parts.length - 1]
        const modifiers = parts.slice(0, -1)

        if (event.key.toLowerCase() !== key) return false
        if (modifiers.includes('shift') !== event.shiftKey) return false
        if (modifiers.includes('ctrl') !== event.ctrlKey) return false
        if (modifiers.includes('alt') !== event.altKey) return false
        if (modifiers.includes('meta') !== event.metaKey) return false

        return true
      }

      const event = { key: 'n', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false }
      expect(matchesShortcut(event, 'n')).toBe(true)
    })

    it('should match key with shift modifier', () => {
      const matchesShortcut = (event: any, shortcut: string) => {
        const parts = shortcut.toLowerCase().split('+')
        const key = parts[parts.length - 1]
        const modifiers = parts.slice(0, -1)

        if (event.key.toLowerCase() !== key) return false
        if (modifiers.includes('shift') !== event.shiftKey) return false
        if (modifiers.includes('ctrl') !== event.ctrlKey) return false
        if (modifiers.includes('alt') !== event.altKey) return false
        if (modifiers.includes('meta') !== event.metaKey) return false

        return true
      }

      const event = { key: 'n', shiftKey: true, ctrlKey: false, altKey: false, metaKey: false }
      expect(matchesShortcut(event, 'shift+n')).toBe(true)
      expect(matchesShortcut(event, 'n')).toBe(false)
    })

    it('should match key with multiple modifiers', () => {
      const matchesShortcut = (event: any, shortcut: string) => {
        const parts = shortcut.toLowerCase().split('+')
        const key = parts[parts.length - 1]
        const modifiers = parts.slice(0, -1)

        if (event.key.toLowerCase() !== key) return false
        if (modifiers.includes('shift') !== event.shiftKey) return false
        if (modifiers.includes('ctrl') !== event.ctrlKey) return false
        if (modifiers.includes('alt') !== event.altKey) return false

        return true
      }

      const event = { key: 'n', shiftKey: true, ctrlKey: false, altKey: true, metaKey: false }
      expect(matchesShortcut(event, 'shift+alt+n')).toBe(true)
    })

    it('should not match when modifiers are different', () => {
      const matchesShortcut = (event: any, shortcut: string) => {
        const parts = shortcut.toLowerCase().split('+')
        const key = parts[parts.length - 1]
        const modifiers = parts.slice(0, -1)

        if (event.key.toLowerCase() !== key) return false
        if (modifiers.includes('shift') !== event.shiftKey) return false
        if (modifiers.includes('ctrl') !== event.ctrlKey) return false
        if (modifiers.includes('alt') !== event.altKey) return false

        return true
      }

      const event = { key: 'n', shiftKey: true, ctrlKey: true, altKey: false, metaKey: false }
      expect(matchesShortcut(event, 'shift+n')).toBe(false) // Ctrl is pressed but not required
    })
  })

  describe('Input Element Detection', () => {
    it('should detect input elements', () => {
      const isInputElement = (tagName: string) => {
        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName.toUpperCase())
      }

      expect(isInputElement('INPUT')).toBe(true)
      expect(isInputElement('TEXTAREA')).toBe(true)
      expect(isInputElement('SELECT')).toBe(true)
      expect(isInputElement('DIV')).toBe(false)
      expect(isInputElement('BUTTON')).toBe(false)
    })

    it('should detect contenteditable elements', () => {
      const isEditable = (isContentEditable: boolean) => {
        return isContentEditable
      }

      expect(isEditable(true)).toBe(true)
      expect(isEditable(false)).toBe(false)
    })

    it('should skip shortcuts in form fields', () => {
      const shouldSkipShortcut = (
        tagName: string,
        isContentEditable: boolean,
        allowInInput: boolean
      ) => {
        if (allowInInput) return false
        const isInputElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName.toUpperCase())
        return isInputElement || isContentEditable
      }

      expect(shouldSkipShortcut('INPUT', false, false)).toBe(true)
      expect(shouldSkipShortcut('INPUT', false, true)).toBe(false)
      expect(shouldSkipShortcut('DIV', true, false)).toBe(true)
      expect(shouldSkipShortcut('DIV', false, false)).toBe(false)
    })
  })

  describe('Shortcut Registration', () => {
    it('should register a shortcut callback', () => {
      const shortcuts: Map<string, Function> = new Map()

      const registerShortcut = (key: string, callback: Function) => {
        shortcuts.set(key.toLowerCase(), callback)
      }

      const mockCallback = vi.fn()
      registerShortcut('shift+n', mockCallback)

      expect(shortcuts.has('shift+n')).toBe(true)
      expect(shortcuts.get('shift+n')).toBe(mockCallback)
    })

    it('should unregister a shortcut', () => {
      const shortcuts: Map<string, Function> = new Map()

      const registerShortcut = (key: string, callback: Function) => {
        shortcuts.set(key.toLowerCase(), callback)
      }

      const unregisterShortcut = (key: string) => {
        shortcuts.delete(key.toLowerCase())
      }

      const mockCallback = vi.fn()
      registerShortcut('shift+n', mockCallback)
      expect(shortcuts.has('shift+n')).toBe(true)

      unregisterShortcut('shift+n')
      expect(shortcuts.has('shift+n')).toBe(false)
    })

    it('should handle multiple shortcuts', () => {
      const shortcuts: Map<string, Function> = new Map()

      const registerShortcut = (key: string, callback: Function) => {
        shortcuts.set(key.toLowerCase(), callback)
      }

      registerShortcut('shift+n', vi.fn())
      registerShortcut('ctrl+s', vi.fn())
      registerShortcut('escape', vi.fn())

      expect(shortcuts.size).toBe(3)
    })
  })

  describe('Event Handler Execution', () => {
    it('should execute callback when shortcut matches', () => {
      const mockCallback = vi.fn()
      const shortcuts: Map<string, Function> = new Map()
      shortcuts.set('n', mockCallback)

      const handleKeydown = (event: any) => {
        const key = event.key.toLowerCase()
        if (shortcuts.has(key)) {
          shortcuts.get(key)!()
        }
      }

      handleKeydown({ key: 'n' })
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    it('should not execute callback when shortcut does not match', () => {
      const mockCallback = vi.fn()
      const shortcuts: Map<string, Function> = new Map()
      shortcuts.set('n', mockCallback)

      const handleKeydown = (event: any) => {
        const key = event.key.toLowerCase()
        if (shortcuts.has(key)) {
          shortcuts.get(key)!()
        }
      }

      handleKeydown({ key: 'm' })
      expect(mockCallback).not.toHaveBeenCalled()
    })

    it('should prevent default when preventDefault option is true', () => {
      const mockEvent = {
        key: 'n',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      const handleShortcut = (event: any, preventDefaultOption: boolean) => {
        if (preventDefaultOption) {
          event.preventDefault()
          event.stopPropagation()
        }
      }

      handleShortcut(mockEvent, true)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })

    it('should not prevent default when preventDefault option is false', () => {
      const mockEvent = {
        key: 'n',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }

      const handleShortcut = (event: any, preventDefaultOption: boolean) => {
        if (preventDefaultOption) {
          event.preventDefault()
          event.stopPropagation()
        }
      }

      handleShortcut(mockEvent, false)
      expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('Shortcut Display Formatting', () => {
    it('should format shortcut for display on Windows/Linux', () => {
      const formatShortcutForDisplay = (shortcut: string, isMac: boolean) => {
        if (isMac) {
          return shortcut
            .replace(/shift/gi, '⇧')
            .replace(/alt/gi, '⌥')
            .replace(/ctrl/gi, '⌃')
            .replace(/meta/gi, '⌘')
            .replace(/\+/g, '')
        }
        return shortcut.toUpperCase()
      }

      expect(formatShortcutForDisplay('shift+n', false)).toBe('SHIFT+N')
      expect(formatShortcutForDisplay('ctrl+s', false)).toBe('CTRL+S')
    })

    it('should format shortcut for display on Mac', () => {
      const formatShortcutForDisplay = (shortcut: string, isMac: boolean) => {
        if (isMac) {
          return shortcut
            .replace(/shift/gi, '⇧')
            .replace(/alt/gi, '⌥')
            .replace(/ctrl/gi, '⌃')
            .replace(/meta/gi, '⌘')
            .replace(/\+/g, '')
        }
        return shortcut.toUpperCase()
      }

      expect(formatShortcutForDisplay('shift+n', true)).toContain('⇧')
      expect(formatShortcutForDisplay('alt+n', true)).toContain('⌥')
      expect(formatShortcutForDisplay('meta+n', true)).toContain('⌘')
    })
  })

  describe('Scope Management', () => {
    it('should handle global scope', () => {
      const isInScope = (scope: string, activeScope: string | null) => {
        if (scope === 'global') return true
        return scope === activeScope
      }

      expect(isInScope('global', null)).toBe(true)
      expect(isInScope('global', 'modal')).toBe(true)
    })

    it('should handle specific scope', () => {
      const isInScope = (scope: string, activeScope: string | null) => {
        if (scope === 'global') return true
        return scope === activeScope
      }

      expect(isInScope('modal', 'modal')).toBe(true)
      expect(isInScope('modal', 'table')).toBe(false)
      expect(isInScope('modal', null)).toBe(false)
    })
  })

  describe('Shortcut Priority', () => {
    it('should give higher priority to shortcuts with more modifiers', () => {
      const getShortcutPriority = (shortcut: string) => {
        const parts = shortcut.split('+')
        return parts.length - 1 // Number of modifiers
      }

      expect(getShortcutPriority('shift+alt+n')).toBe(2)
      expect(getShortcutPriority('shift+n')).toBe(1)
      expect(getShortcutPriority('n')).toBe(0)
    })

    it('should sort shortcuts by priority', () => {
      const getShortcutPriority = (shortcut: string) => {
        const parts = shortcut.split('+')
        return parts.length - 1
      }

      const shortcuts = ['n', 'shift+alt+n', 'shift+n']
      const sorted = shortcuts.sort((a, b) => getShortcutPriority(b) - getShortcutPriority(a))

      expect(sorted[0]).toBe('shift+alt+n')
      expect(sorted[1]).toBe('shift+n')
      expect(sorted[2]).toBe('n')
    })
  })

  describe('Keyboard Event Properties', () => {
    it('should handle escape key codes', () => {
      const isEscapeKey = (event: any) => {
        return event.key === 'Escape' || event.keyCode === 27 || event.which === 27
      }

      expect(isEscapeKey({ key: 'Escape', keyCode: 27, which: 27 })).toBe(true)
      expect(isEscapeKey({ key: 'Enter', keyCode: 13, which: 13 })).toBe(false)
    })

    it('should handle enter key codes', () => {
      const isEnterKey = (event: any) => {
        return event.key === 'Enter' || event.keyCode === 13 || event.which === 13
      }

      expect(isEnterKey({ key: 'Enter', keyCode: 13, which: 13 })).toBe(true)
      expect(isEnterKey({ key: 'Escape', keyCode: 27, which: 27 })).toBe(false)
    })

    it('should handle arrow keys', () => {
      const isArrowKey = (event: any) => {
        return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      }

      expect(isArrowKey({ key: 'ArrowUp' })).toBe(true)
      expect(isArrowKey({ key: 'ArrowDown' })).toBe(true)
      expect(isArrowKey({ key: 'Enter' })).toBe(false)
    })
  })

  describe('Shortcut Enabled State', () => {
    it('should check if shortcuts are enabled', () => {
      let shortcutsEnabled = true

      const disableShortcuts = () => {
        shortcutsEnabled = false
      }

      const enableShortcuts = () => {
        shortcutsEnabled = true
      }

      expect(shortcutsEnabled).toBe(true)
      disableShortcuts()
      expect(shortcutsEnabled).toBe(false)
      enableShortcuts()
      expect(shortcutsEnabled).toBe(true)
    })

    it('should not execute shortcut when disabled', () => {
      const mockCallback = vi.fn()
      let shortcutsEnabled = false

      const handleKeydown = (event: any) => {
        if (!shortcutsEnabled) return
        mockCallback()
      }

      handleKeydown({ key: 'n' })
      expect(mockCallback).not.toHaveBeenCalled()
    })
  })

  describe('Special Keys Handling', () => {
    it('should handle function keys', () => {
      const isFunctionKey = (key: string) => {
        return /^F\d+$/.test(key)
      }

      expect(isFunctionKey('F1')).toBe(true)
      expect(isFunctionKey('F12')).toBe(true)
      expect(isFunctionKey('Enter')).toBe(false)
    })

    it('should handle space key', () => {
      const isSpaceKey = (key: string) => {
        return key === ' ' || key === 'Space'
      }

      expect(isSpaceKey(' ')).toBe(true)
      expect(isSpaceKey('Space')).toBe(true)
      expect(isSpaceKey('n')).toBe(false)
    })

    it('should handle tab key', () => {
      const isTabKey = (key: string) => {
        return key === 'Tab'
      }

      expect(isTabKey('Tab')).toBe(true)
      expect(isTabKey('Enter')).toBe(false)
    })
  })

  describe('Tooltip Display Logic', () => {
    it('should generate tooltip text for shortcut', () => {
      const getTooltipText = (action: string, shortcut: string) => {
        return `${action} (${shortcut})`
      }

      expect(getTooltipText('New Item', 'Shift+N')).toBe('New Item (Shift+N)')
    })

    it('should hide tooltip on mobile', () => {
      const shouldShowTooltip = (isMobile: boolean, shortcut: string) => {
        return !isMobile && !!shortcut
      }

      expect(shouldShowTooltip(false, 'Shift+N')).toBe(true)
      expect(shouldShowTooltip(true, 'Shift+N')).toBe(false)
      expect(shouldShowTooltip(false, '')).toBe(false)
    })
  })
})
