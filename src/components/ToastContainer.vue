<template>
  <Teleport to="body">
    <div
      class="toast-region fixed z-50 pointer-events-none"
      :class="[
        // Desktop: top-right, fixed width
        'top-4 right-4 max-w-sm w-full',
        // Mobile: top, full width with side gutters
        'max-sm:top-0 max-sm:left-0 max-sm:right-0 max-sm:max-w-none max-sm:px-3'
      ]"
      aria-live="polite"
    >
      <!-- Compact "Close all" pill, right-aligned above the stack -->
      <Transition name="toast-pill">
        <div v-if="showClearAll" class="mb-2 flex justify-end">
          <button
            @click="clearAll"
            class="pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
                   text-ink/70 dark:text-cream/70 bg-white/90 dark:bg-ink-3/90 backdrop-blur-sm
                   border border-stone-200/80 dark:border-ink-4 shadow-card
                   hover:text-ink dark:hover:text-cream hover:border-stone-300 dark:hover:border-stone-600
                   transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
          >
            <X class="h-3.5 w-3.5" />
            {{ t('common.closeAll') }}
          </button>
        </div>
      </Transition>

      <TransitionGroup name="toast" tag="div" class="space-y-2.5">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-card pointer-events-auto relative overflow-hidden flex items-start gap-3
                 rounded-xl pl-3 pr-2.5 py-3
                 bg-white dark:bg-ink-3 border border-stone-200/90 dark:border-ink-4 shadow-modal"
          role="alert"
          @mouseenter="pauseToast(toast.id)"
          @mouseleave="resumeToast(toast.id)"
        >
          <!-- Type accent line on the leading edge -->
          <span
            class="absolute inset-y-2 left-0 w-1 rounded-full"
            :class="getAccentClasses(toast.type)"
            aria-hidden="true"
          />

          <!-- Tinted icon chip -->
          <div
            class="flex-shrink-0 grid place-items-center h-9 w-9 rounded-lg"
            :class="getChipClasses(toast.type)"
          >
            <component :is="getToastIcon(toast.type)" class="h-5 w-5" :class="getIconClasses(toast.type)" />
          </div>

          <!-- Message -->
          <div class="flex-1 min-w-0 py-0.5">
            <p class="text-sm font-medium leading-snug break-words text-ink dark:text-cream">
              {{ toast.message }}
            </p>
          </div>

          <!-- Close -->
          <button
            @click="removeToast(toast.id)"
            class="flex-shrink-0 -mr-1 -mt-1 grid place-items-center h-11 w-11 rounded-lg
                   text-stone-400 dark:text-stone-500 transition-colors duration-200
                   hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            :aria-label="`Close ${toast.type} notification`"
          >
            <X class="h-4 w-4" />
          </button>

          <!-- Auto-dismiss progress (non-persistent only) -->
          <span
            v-if="!toast.persistent && toast.duration"
            class="toast-progress absolute bottom-0 left-0 h-0.5 rounded-full"
            :class="[getProgressClasses(toast.type), { 'is-paused': pausedIds.has(toast.id) }]"
            :style="{ animationDuration: `${toast.duration}ms` }"
            aria-hidden="true"
          />
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
import { computed, reactive } from 'vue'

const { toasts, removeToast, clearAll } = useToast()
const { t } = useI18n()

// Track which toasts are hover-paused so the progress bar can freeze.
const pausedIds = reactive(new Set<string>())
const pauseToast = (id: string) => pausedIds.add(id)
const resumeToast = (id: string) => pausedIds.delete(id)

// Show clear-all pill if there are multiple toasts or any persistent toasts.
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

// Tinted icon chip background per type — soft surface, not a saturated fill.
const getChipClasses = (type: Toast['type']) => {
  const styles = {
    success: 'bg-forest-50 dark:bg-forest-500/15',
    error: 'bg-clay-50 dark:bg-clay-500/15',
    warning: 'bg-amber-50 dark:bg-amber-500/15',
    info: 'bg-stone-100 dark:bg-ink-4'
  }
  return styles[type]
}

const getIconClasses = (type: Toast['type']) => {
  const styles = {
    success: 'text-forest-600 dark:text-forest-400',
    error: 'text-clay-600 dark:text-clay-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-stone-500 dark:text-stone-300'
  }
  return styles[type]
}

// Leading accent line color per type.
const getAccentClasses = (type: Toast['type']) => {
  const styles = {
    success: 'bg-forest-500',
    error: 'bg-clay-500',
    warning: 'bg-amber-500',
    info: 'bg-stone-400 dark:bg-stone-500'
  }
  return styles[type]
}

// Progress bar color per type (slightly translucent to read as an affordance).
const getProgressClasses = (type: Toast['type']) => {
  const styles = {
    success: 'bg-forest-500/70',
    error: 'bg-clay-500/70',
    warning: 'bg-amber-500/70',
    info: 'bg-stone-400/70'
  }
  return styles[type]
}

// Combined surface + accent styles for a type. Retained for test/contract parity
// with the prior getToastStyles(type) shape.
const getToastStyles = (type: Toast['type']) => {
  return [getChipClasses(type), getAccentClasses(type), getIconClasses(type)].join(' ')
}

defineExpose({ getToastStyles, getToastIcon })
</script>

<style scoped>
/* --- Entrance / exit: tasteful slide + fade + scale on the brand snap curve --- */
.toast-enter-active {
  transition:
    transform 0.42s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.28s ease-out;
}
.toast-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.4, 0, 1, 1),
    opacity 0.22s ease-in;
  position: absolute;
  width: 100%;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(110%) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(110%) scale(0.96);
}

/* Reflow of remaining toasts when one leaves */
.toast-move {
  transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
}

/* Close-all pill */
.toast-pill-enter-active,
.toast-pill-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-pill-enter-from,
.toast-pill-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}

/* Mobile: enter from the top instead of the side */
@media (max-width: 640px) {
  .toast-region {
    padding-top: max(0.75rem, env(safe-area-inset-top));
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: translateY(-120%) scale(0.97);
  }
}

/* --- Auto-dismiss progress affordance --- */
.toast-progress {
  width: 100%;
  transform-origin: left center;
  animation-name: toast-shrink;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
.toast-progress.is-paused {
  animation-play-state: paused;
}
@keyframes toast-shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

/* --- Respect reduced motion --- */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move,
  .toast-pill-enter-active,
  .toast-pill-leave-active {
    transition: opacity 0.15s ease;
  }
  .toast-enter-from,
  .toast-leave-to,
  .toast-pill-enter-from,
  .toast-pill-leave-to {
    transform: none;
    opacity: 0;
  }
  .toast-progress {
    animation: none;
    transform: scaleX(1);
    opacity: 0.5;
  }
}
</style>
