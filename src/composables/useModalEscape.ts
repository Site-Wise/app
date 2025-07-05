import { onMounted, onUnmounted } from 'vue'

/**
 * Composable for handling ESC key to close modals
 * Ensures ESC doesn't conflict with ALT+SHIFT shortcut system
 * 
 * @param closeHandler - Function to call when ESC is pressed
 * @param isActive - Optional reactive ref to control when ESC should work
 */
export function useModalEscape(closeHandler: () => void, isActive?: () => boolean) {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Only handle ESC if modal should be active
    if (isActive && !isActive()) {
      return
    }

    // Only handle pure ESC key, not when combined with modifiers
    // This ensures no conflict with ALT+SHIFT shortcuts
    if (event.key === 'Escape' && !event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      event.stopPropagation()
      closeHandler()
    }
  }

  onMounted(() => {
    // Add event listener with high priority (capture phase)
    document.addEventListener('keydown', handleKeyDown, true)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown, true)
  })

  return {
    handleKeyDown
  }
}