<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'
import { Loader2, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-vue-next'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

interface Props {
  /** Controls visibility of the overlay */
  show: boolean
  /** Current state of the operation */
  state?: 'loading' | 'success' | 'error' | 'timeout'
  /** Message to display (optional, will use defaults based on state) */
  message?: string
  /** Timeout in ms before showing timeout warning (default: 10000) */
  timeoutDuration?: number
  /** Duration in ms to show success state before auto-closing (default: 1500) */
  successDuration?: number
  /** Whether to allow closing the overlay (enabled for error/timeout states) */
  allowClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  state: 'loading',
  timeoutDuration: 10000,
  successDuration: 1500,
  allowClose: false
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'timeout'): void
}>()

// Internal state for timeout warning
const hasTimedOut = ref(false)
let timeoutTimer: ReturnType<typeof setTimeout> | null = null
let successTimer: ReturnType<typeof setTimeout> | null = null

// Computed state that considers internal timeout
const effectiveState = computed(() => {
  if (props.state === 'loading' && hasTimedOut.value) {
    return 'timeout'
  }
  return props.state
})

// Determine if close button should be shown
const canClose = computed(() => {
  return props.allowClose || effectiveState.value === 'error' || effectiveState.value === 'timeout'
})

// Default messages based on state
const displayMessage = computed(() => {
  if (props.message) return props.message

  switch (effectiveState.value) {
    case 'loading':
      return t('loading.pleaseWait')
    case 'success':
      return t('loading.success')
    case 'error':
      return t('loading.error')
    case 'timeout':
      return t('loading.timeout')
    default:
      return ''
  }
})

// Icon component based on state
const iconComponent = computed(() => {
  switch (effectiveState.value) {
    case 'loading':
      return Loader2
    case 'success':
      return CheckCircle
    case 'error':
      return XCircle
    case 'timeout':
      return AlertTriangle
    default:
      return Loader2
  }
})

// Icon styling based on state
const iconClasses = computed(() => {
  const baseClasses = 'h-12 w-12 sm:h-16 sm:w-16'

  switch (effectiveState.value) {
    case 'loading':
      return `${baseClasses} text-primary-500 animate-spin`
    case 'success':
      return `${baseClasses} text-green-500`
    case 'error':
      return `${baseClasses} text-red-500`
    case 'timeout':
      return `${baseClasses} text-amber-500`
    default:
      return `${baseClasses} text-primary-500`
  }
})

// Background accent color for icon container
const iconBgClasses = computed(() => {
  switch (effectiveState.value) {
    case 'loading':
      return 'bg-primary-100 dark:bg-primary-900/30'
    case 'success':
      return 'bg-green-100 dark:bg-green-900/30'
    case 'error':
      return 'bg-red-100 dark:bg-red-900/30'
    case 'timeout':
      return 'bg-amber-100 dark:bg-amber-900/30'
    default:
      return 'bg-primary-100 dark:bg-primary-900/30'
  }
})

// Clear all timers
function clearTimers() {
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
    timeoutTimer = null
  }
  if (successTimer) {
    clearTimeout(successTimer)
    successTimer = null
  }
}

// Handle close action
function handleClose() {
  if (canClose.value) {
    emit('close')
  }
}

// Handle escape key
function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && canClose.value) {
    handleClose()
  }
}

// Watch for show prop changes to manage timers
watch(() => props.show, (newValue) => {
  clearTimers()
  hasTimedOut.value = false

  if (newValue && props.state === 'loading') {
    // Start timeout timer
    timeoutTimer = setTimeout(() => {
      hasTimedOut.value = true
      emit('timeout')
    }, props.timeoutDuration)
  }
}, { immediate: true })

// Watch for state changes
watch(() => props.state, (newState) => {
  clearTimers()

  if (newState === 'success' && props.show) {
    // Auto-close after success duration
    successTimer = setTimeout(() => {
      emit('close')
    }, props.successDuration)
  } else if (newState === 'loading' && props.show) {
    // Restart timeout timer
    hasTimedOut.value = false
    timeoutTimer = setTimeout(() => {
      hasTimedOut.value = true
      emit('timeout')
    }, props.timeoutDuration)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  clearTimers()
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @keydown="handleEscape"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-label="displayMessage"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          @click="handleClose"
        />

        <!-- Content Container -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="scale-90 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-90 opacity-0"
        >
          <div
            v-if="show"
            class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8
                   min-w-[280px] max-w-sm w-full mx-auto text-center
                   border border-gray-200 dark:border-gray-700"
            @click.stop
          >
            <!-- Close button (when allowed) -->
            <button
              v-if="canClose"
              @click="handleClose"
              class="absolute top-3 right-3 p-1.5 rounded-full
                     text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-700
                     transition-colors duration-150
                     focus:outline-none focus:ring-2 focus:ring-primary-500"
              :aria-label="t('common.close')"
            >
              <X class="h-5 w-5" />
            </button>

            <!-- Icon Container -->
            <div class="flex justify-center mb-4 sm:mb-5">
              <div
                :class="[
                  'p-4 sm:p-5 rounded-full transition-colors duration-300',
                  iconBgClasses
                ]"
              >
                <component
                  :is="iconComponent"
                  :class="iconClasses"
                />
              </div>
            </div>

            <!-- Message -->
            <p
              class="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-200
                     transition-all duration-300"
            >
              {{ displayMessage }}
            </p>

            <!-- Sub-message for timeout -->
            <p
              v-if="effectiveState === 'timeout'"
              class="mt-2 text-sm text-gray-500 dark:text-gray-400"
            >
              {{ t('loading.timeoutHint') }}
            </p>

            <!-- Close button for error/timeout states (mobile-friendly) -->
            <button
              v-if="effectiveState === 'error' || effectiveState === 'timeout'"
              @click="handleClose"
              class="mt-5 w-full px-4 py-2.5 rounded-xl font-medium
                     bg-gray-100 dark:bg-gray-700
                     text-gray-700 dark:text-gray-200
                     hover:bg-gray-200 dark:hover:bg-gray-600
                     transition-colors duration-150
                     focus:outline-none focus:ring-2 focus:ring-primary-500
                     min-h-[44px]"
            >
              {{ t('common.close') }}
            </button>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
