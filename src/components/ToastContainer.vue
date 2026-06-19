<template>
  <Teleport to="body">
    <div 
      class="fixed z-50 transition-all duration-300 ease-out"
      :class="[
        // Desktop positioning: top-right
        'top-4 right-4 max-w-sm',
        // Mobile positioning: top-center, full width with padding
        'sm:top-4 sm:right-4 sm:max-w-sm',
        'max-sm:top-4 max-sm:left-4 max-sm:right-4 max-sm:max-w-none'
      ]"
    >
      <!-- Close All Button -->
      <div v-if="showClearAll" class="mb-2">
        <button
          @click="clearAll"
          class="w-full px-4 py-2 text-sm font-medium text-clay-800 dark:text-clay-200 bg-clay-50 dark:bg-clay-900/40 hover:bg-clay-100 dark:hover:bg-clay-900/60 border border-clay-200 dark:border-clay-700 rounded-lg shadow-modal transition-colors duration-200"
        >
          {{ t('common.closeAll') }}
        </button>
      </div>

      <TransitionGroup
        name="toast"
        tag="div"
        class="space-y-2"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'px-4 py-3 rounded-lg shadow-modal border',
            'transform transition-all duration-300 ease-out',
            'flex items-start justify-between gap-3',
            getToastStyles(toast.type)
          ]"
          role="alert"
        >
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <div class="flex-shrink-0 mt-0.5">
              <component :is="getToastIcon(toast.type)" class="h-5 w-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium break-words">{{ toast.message }}</p>
            </div>
          </div>
          <button
            @click="removeToast(toast.id)"
            class="flex-shrink-0 p-1 rounded-md transition-colors duration-200 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/30"
            :aria-label="`Close ${toast.type} notification`"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-vue-next'
import { useToast, type Toast } from '../composables/useToast'
import { useI18n } from '../composables/useI18n'
import { computed } from 'vue'

const { toasts, removeToast, clearAll } = useToast()
const { t } = useI18n()

// Show clear all button if there are multiple toasts or any persistent toasts
const showClearAll = computed(() => {
  return toasts.value.length > 1 || toasts.value.some(toast => toast.persistent)
})

const getToastIcon = (type: Toast['type']) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  }
  return icons[type]
}

const getToastStyles = (type: Toast['type']) => {
  const styles = {
    success: 'bg-forest-50 dark:bg-forest-900/40 border-forest-200 dark:border-forest-700 text-forest-800 dark:text-forest-200',
    error: 'bg-clay-50 dark:bg-clay-900/40 border-clay-200 dark:border-clay-700 text-clay-800 dark:text-clay-200',
    warning: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-200',
    info: 'bg-white dark:bg-ink-3 border-stone-200 dark:border-ink-4 text-ink dark:text-cream'
  }
  return styles[type]
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease-out;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-move {
  transition: transform 0.3s ease-out;
}

/* Mobile-specific animations */
@media (max-width: 640px) {
  .toast-enter-from {
    transform: translateY(-100%) scale(0.95);
  }
  
  .toast-leave-to {
    transform: translateY(-100%) scale(0.95);
  }
}
</style>