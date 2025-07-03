<template>
  <Teleport to="body">
    <div
      v-if="showShortcuts"
      class="fixed inset-0 pointer-events-none z-[9999]"
      role="tooltip"
      aria-label="Keyboard shortcuts help"
    >
      <!-- Overlay with shortcuts panel -->
      <div class="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-md pointer-events-auto">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
          <div class="text-xs text-gray-500 dark:text-gray-400">Hold Alt+Shift</div>
        </div>
        
        <!-- Navigation shortcuts -->
        <div class="space-y-2">
          <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Navigation</div>
          <div class="grid grid-cols-2 gap-1 text-xs">
            <div v-for="shortcut in navigationShortcuts" :key="shortcut.key" class="flex justify-between items-center py-1">
              <span class="text-gray-600 dark:text-gray-400">{{ shortcut.label }}</span>
              <kbd class="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600">
                {{ shortcut.key.toUpperCase() }}
              </kbd>
            </div>
          </div>
        </div>

        <!-- Action shortcuts -->
        <div v-if="actionShortcuts.length > 0" class="mt-3 space-y-2">
          <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Actions</div>
          <div class="space-y-1 text-xs">
            <div v-for="shortcut in actionShortcuts" :key="shortcut.key" class="flex justify-between items-center py-1">
              <span class="text-gray-600 dark:text-gray-400">{{ shortcut.label }}</span>
              <kbd class="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600">
                {{ getShortcutDisplay(shortcut.key, shortcut.requiresAltShift) }}
              </kbd>
            </div>
          </div>
        </div>
      </div>

      <!-- Individual element tooltips -->
      <div v-for="tooltip in elementTooltips" :key="tooltip.id" 
           :style="{ top: tooltip.top + 'px', left: tooltip.left + 'px' }"
           class="absolute bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2">
        <div class="font-medium">{{ tooltip.key }}</div>
        <div class="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useKeyboardShortcuts, getShortcutDisplay } from '../composables/useKeyboardShortcuts'

interface ElementTooltip {
  id: string
  key: string
  top: number
  left: number
}

const { showShortcuts, getShortcutsByCategory } = useKeyboardShortcuts()

const elementTooltips = ref<ElementTooltip[]>([])

const navigationShortcuts = computed(() => {
  return getShortcutsByCategory('navigation')
})

const actionShortcuts = computed(() => {
  return getShortcutsByCategory('action')
})

const updateElementTooltips = () => {
  if (!showShortcuts.value) {
    elementTooltips.value = []
    return
  }

  nextTick(() => {
    const tooltips: ElementTooltip[] = []
    
    // Find elements with keyboard shortcuts
    const shortcutElements = document.querySelectorAll('[data-keyboard-shortcut]')
    
    shortcutElements.forEach((element, index) => {
      const shortcut = element.getAttribute('data-keyboard-shortcut')
      const rect = element.getBoundingClientRect()
      
      if (shortcut && rect.width > 0 && rect.height > 0) {
        tooltips.push({
          id: `tooltip-${index}`,
          key: shortcut.toUpperCase(),
          top: rect.top + 24 + window.scrollY,
          // left: rect.left + rect.width / 2 + window.scrollX
          left: rect.left + 16 + window.scrollX
        })
      }
    })
    
    elementTooltips.value = tooltips
  })
}

// Watch for showShortcuts changes and update tooltips
let unwatchShortcuts: (() => void) | null = null

onMounted(() => {
  // Watch showShortcuts and update tooltips accordingly
  unwatchShortcuts = watch(showShortcuts, (newValue) => {
    if (newValue) {
      updateElementTooltips()
    } else {
      elementTooltips.value = []
    }
  }, { immediate: true })

  // Update tooltips on window resize or scroll
  window.addEventListener('resize', updateElementTooltips)
  window.addEventListener('scroll', updateElementTooltips)
})

onUnmounted(() => {
  if (unwatchShortcuts) {
    unwatchShortcuts()
  }
  window.removeEventListener('resize', updateElementTooltips)
  window.removeEventListener('scroll', updateElementTooltips)
})
</script>