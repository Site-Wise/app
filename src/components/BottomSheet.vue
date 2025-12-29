<template>
  <Teleport to="body">
    <Transition name="bottom-sheet-overlay">
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black/50 z-50"
        @click="handleOverlayClick"
      />
    </Transition>

    <Transition :name="isMobile ? 'bottom-sheet' : 'modal-fade'">
      <div
        v-if="modelValue"
        class="fixed z-50"
        :class="containerClasses"
        role="dialog"
        :aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <!-- Mobile Bottom Sheet -->
        <div
          v-if="isMobile"
          ref="sheetRef"
          class="bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl w-full max-h-[90vh] flex flex-col"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <!-- Handle bar for swipe to dismiss -->
          <div class="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
            <div class="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          <!-- Header -->
          <div v-if="title || $slots.header" class="px-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <slot name="header">
              <h2 :id="titleId" class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ title }}
              </h2>
            </slot>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-4 scroll-smooth-touch">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-4 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 pb-safe">
            <slot name="footer" />
          </div>
        </div>

        <!-- Desktop Modal -->
        <div
          v-else
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full flex flex-col"
          :class="sizeClasses"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <slot name="header">
              <h2 :id="titleId" class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ title }}
              </h2>
            </slot>
            <button
              v-if="showCloseButton"
              @click="close"
              class="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :aria-label="t('common.close')"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
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
  isMobile.value = window.matchMedia('(max-width: 1023px)').matches;
};

const containerClasses = computed(() => {
  if (isMobile.value) {
    return 'inset-x-0 bottom-0';
  }
  return 'inset-0 flex items-center justify-center p-4';
});

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  return `${sizes[props.size]} max-h-[90vh]`;
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
  transition: opacity 0.2s ease-out;
}

.modal-fade-leave-active {
  transition: opacity 0.15s ease-in;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-to,
.modal-fade-leave-from {
  opacity: 1;
}
</style>
