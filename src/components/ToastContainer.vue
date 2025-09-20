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
          class="w-full px-4 py-2 text-sm font-medium text-red-800 dark:text-red-100 bg-red-50/95 dark:bg-red-900/95 hover:bg-red-100 dark:hover:bg-red-800 border border-red-200 dark:border-red-700 rounded-lg transition-colors duration-200 backdrop-blur-sm"
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
            'px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border',
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
            class="flex-shrink-0 p-1 rounded-md transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
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
    success: 'bg-green-50/95 dark:bg-green-900/95 border-green-200 dark:border-green-700 text-green-800 dark:text-green-100',
    error: 'bg-red-50/95 dark:bg-red-900/95 border-red-200 dark:border-red-700 text-red-800 dark:text-red-100',
    warning: 'bg-yellow-50/95 dark:bg-yellow-900/95 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-100',
    info: 'bg-blue-50/95 dark:bg-blue-900/95 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-100'
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