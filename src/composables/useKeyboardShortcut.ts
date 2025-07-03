import { onMounted, onUnmounted } from 'vue';

export interface KeyboardShortcut {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
}

/**
 * A composable for handling keyboard shortcuts in a clean, reusable way.
 * Automatically manages event listener cleanup on component unmount.
 * 
 * @param shortcuts - An array of keyboard shortcut configurations
 * 
 * @example
 * useKeyboardShortcut([
 *   {
 *     key: 'n',
 *     shiftKey: true,
 *     altKey: true,
 *     handler: () => console.log('Shift+Alt+N pressed')
 *   }
 * ]);
 */
export function useKeyboardShortcut(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = (event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
      const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey;
      const ctrlMatch = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
      const metaMatch = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;

      if (keyMatch && shiftMatch && altMatch && ctrlMatch && metaMatch) {
        event.preventDefault();
        shortcut.handler();
        break; // Only handle the first matching shortcut
      }
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}

/**
 * Convenience function for single keyboard shortcut
 */
export function useKeyboardShortcutSingle(
  key: string,
  handler: () => void,
  modifiers?: {
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
  }
) {
  useKeyboardShortcut([
    {
      key,
      handler,
      ...modifiers
    }
  ]);
}