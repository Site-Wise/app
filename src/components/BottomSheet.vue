<template>
  <Teleport to="body">
    <!-- Scrim -->
    <Transition name="bottom-sheet-overlay">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[60] bg-ink/60 backdrop-blur-sm"
        @click="handleOverlayClick"
      />
    </Transition>

    <!-- Panel -->
    <Transition :name="isMobile ? 'bottom-sheet' : 'modal-fade'">
      <div
        v-if="modelValue"
        class="fixed z-[60]"
        :class="containerClasses"
        role="dialog"
        :aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <div
          ref="sheetRef"
          class="bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 w-full flex flex-col overflow-hidden"
          :class="[panelShapeClasses, sizeClasses]"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <!-- Grab handle (mobile only) -->
          <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
            <div class="mx-auto h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4" />
          </div>

          <!-- Header -->
          <div
            v-if="title || $slots.header"
            :id="titleId"
            class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0"
          >
            <slot name="header">
              <h2 class="font-display text-lg font-semibold text-ink dark:text-cream flex-1">
                {{ title }}
              </h2>
            </slot>
            <button
              v-if="showCloseButton"
              @click="close"
              class="ml-auto h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors active:scale-[0.98]"
              :aria-label="t('common.close')"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4 scroll-smooth-touch">
            <slot />
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex gap-3 flex-shrink-0 pb-safe"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
}>(), {
  size: 'md',
  showCloseButton: true,
  closeOnOverlay: true,
  closeOnEscape: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

const { t } = useI18n();

const sheetRef = ref<HTMLElement | null>(null);
const titleId = `bottom-sheet-title-${Math.random().toString(36).substr(2, 9)}`;

// Touch handling for swipe to dismiss
const touchStartY = ref(0);
const touchCurrentY = ref(0);
const isDragging = ref(false);

// Check if mobile (using media query)
const isMobile = ref(false);

const updateMobileState = () => {
  isMobile.value = window.matchMedia('(max-width: 639px)').matches;
};

const containerClasses = computed(() => {
  if (isMobile.value) {
    return 'inset-x-0 bottom-0';
  }
  return 'inset-0 flex items-center justify-center p-4';
});

const panelShapeClasses = computed(() => {
  if (isMobile.value) {
    return 'rounded-t-2xl max-h-[92vh]';
  }
  return 'rounded-xl max-h-[88vh]';
});

const sizeClasses = computed(() => {
  if (isMobile.value) return '';
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  return sizes[props.size];
});

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close();
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.closeOnEscape && props.modelValue) {
    close();
  }
};

// Touch handlers for swipe to dismiss
const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  touchStartY.value = touch.clientY;
  touchCurrentY.value = touch.clientY;
  isDragging.value = true;
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return;

  const touch = e.touches[0];
  touchCurrentY.value = touch.clientY;

  const deltaY = touchCurrentY.value - touchStartY.value;

  // Only allow dragging down
  if (deltaY > 0 && sheetRef.value) {
    sheetRef.value.style.transform = `translateY(${deltaY}px)`;
  }
};

const handleTouchEnd = () => {
  if (!isDragging.value || !sheetRef.value) return;

  const deltaY = touchCurrentY.value - touchStartY.value;
  const threshold = 100; // Pixels to trigger close

  if (deltaY > threshold) {
    close();
  }

  // Reset transform
  sheetRef.value.style.transform = '';
  isDragging.value = false;
};

// Lock body scroll when modal is open
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  updateMobileState();
  window.addEventListener('resize', updateMobileState);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileState);
  window.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
/* Modal fade animation for desktop */
.modal-fade-enter-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.modal-fade-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.modal-fade-enter-to,
.modal-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
