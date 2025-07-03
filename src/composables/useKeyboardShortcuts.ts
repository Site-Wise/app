import { ref, onMounted, onUnmounted, readonly } from 'vue'
import { useRouter } from 'vue-router'

export interface KeyboardShortcut {
  key: string
  label: string
  description: string
  action: () => void
  category: 'navigation' | 'action' | 'global'
  requiresAltShift: boolean
}

// Global state for showing shortcuts
const showShortcuts = ref(false)
const shortcuts = ref<Map<string, KeyboardShortcut>>(new Map())

export function useKeyboardShortcuts() {
  const router = useRouter()

  // Navigation shortcuts
  const navigationShortcuts: { [key: string]: { path: string; label: string } } = {
    'd': { path: '/', label: 'Dashboard' },
    'i': { path: '/items', label: 'Items' },
    's': { path: '/services', label: 'Services' },
    'v': { path: '/vendors', label: 'Vendors' },
    'e': { path: '/deliveries', label: 'Deliveries' },
    'b': { path: '/service-bookings', label: 'Service Bookings' },
    'q': { path: '/quotations', label: 'Quotations' },
    'a': { path: '/accounts', label: 'Accounts' },
    'p': { path: '/payments', label: 'Payments' },
    'r': { path: '/vendor-returns', label: 'Vendor Returns' }
  }

  const registerShortcut = (shortcut: KeyboardShortcut) => {
    shortcuts.value.set(shortcut.key.toLowerCase(), shortcut)
  }

  const unregisterShortcut = (key: string) => {
    shortcuts.value.delete(key.toLowerCase())
  }

  const getShortcutsByCategory = (category: string) => {
    return Array.from(shortcuts.value.values()).filter(s => s.category === category)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    
    // Handle ALT+SHIFT combination for showing shortcuts
    if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
      // If it's just ALT+SHIFT without another key, show shortcuts
      if (key === 'alt' || key === 'shift') {
        showShortcuts.value = true
        return
      }

      // Handle navigation shortcuts
      if (navigationShortcuts[key]) {
        event.preventDefault()
        router.push(navigationShortcuts[key].path)
        return
      }

      // Handle registered shortcuts that require ALT+SHIFT
      const shortcut = shortcuts.value.get(key)
      if (shortcut && shortcut.requiresAltShift) {
        event.preventDefault()
        shortcut.action()
        return
      }
    }

    // Handle shortcuts that don't require ALT+SHIFT (like ALT+SHIFT+N)
    if (event.altKey && event.shiftKey && key === 'n') {
      const createShortcut = shortcuts.value.get('n')
      if (createShortcut) {
        event.preventDefault()
        createShortcut.action()
      }
    }
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    // Hide shortcuts when ALT or SHIFT is released
    if (event.key === 'Alt' || event.key === 'Shift') {
      showShortcuts.value = false
    }
  }

  const initializeGlobalShortcuts = () => {
    // Register navigation shortcuts
    Object.entries(navigationShortcuts).forEach(([key, nav]) => {
      registerShortcut({
        key,
        label: nav.label,
        description: `Navigate to ${nav.label}`,
        action: () => router.push(nav.path),
        category: 'navigation',
        requiresAltShift: true
      })
    })

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  }

  const cleanup = () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  }

  // Auto-initialize when composable is used
  onMounted(() => {
    initializeGlobalShortcuts()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    showShortcuts: readonly(showShortcuts),
    shortcuts: readonly(shortcuts),
    registerShortcut,
    unregisterShortcut,
    getShortcutsByCategory,
    navigationShortcuts
  }
}

// Utility function to get shortcut display text
export function getShortcutDisplay(key: string, requiresAltShift = true): string {
  if (requiresAltShift) {
    return `Alt+Shift+${key.toUpperCase()}`
  }
  return key.toUpperCase()
}