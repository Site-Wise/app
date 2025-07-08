<template>
  <div 
    v-if="show" 
    class="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
    @click="handleBackdropClick"
    @keydown.escape="close"
    tabindex="0"
    role="dialog"
    aria-modal="true"
    :aria-label="t('common.imageViewer')"
  >
    <!-- Close Button -->
    <button 
      @click="close"
      class="absolute top-4 right-4 z-60 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
      :aria-label="t('common.close')"
    >
      <X class="h-6 w-6" />
    </button>

    <!-- Image Counter -->
    <div v-if="images.length > 1" class="absolute top-4 left-4 z-60 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm font-medium">
      {{ currentIndex + 1 }} / {{ images.length }}
    </div>

    <!-- Navigation Buttons -->
    <button 
      v-if="images.length > 1 && currentIndex > 0"
      @click="previousImage"
      class="absolute left-4 top-1/2 transform -translate-y-1/2 z-60 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
      :aria-label="t('common.previous')"
    >
      <ChevronLeft class="h-8 w-8" />
    </button>

    <button 
      v-if="images.length > 1 && currentIndex < images.length - 1"
      @click="nextImage"
      class="absolute right-4 top-1/2 transform -translate-y-1/2 z-60 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
      :aria-label="t('common.next')"
    >
      <ChevronRight class="h-8 w-8" />
    </button>

    <!-- Main Image Container -->
    <div 
      class="relative max-w-[95vw] max-h-[90vh] mx-4 flex items-center justify-center"
      @click.stop
    >
      <!-- Loading Spinner -->
      <div v-if="imageLoading" class="absolute inset-0 flex items-center justify-center">
        <div class="bg-black bg-opacity-60 rounded-lg p-6">
          <Loader2 class="h-8 w-8 text-white animate-spin" />
        </div>
      </div>

      <!-- Image -->
      <img 
        v-if="currentImage"
        :src="currentImage"
        :alt="`${t('common.image')} ${currentIndex + 1}`"
        class="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300"
        :class="{ 'opacity-0': imageLoading, 'opacity-100': !imageLoading }"
        @load="onImageLoad"
        @error="onImageError"
      />
      
      <!-- Error State -->
      <div v-if="imageError" class="bg-gray-800 rounded-lg p-8 text-center">
        <AlertCircle class="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p class="text-white text-lg mb-2">{{ t('messages.imageLoadError') }}</p>
        <p class="text-gray-400 text-sm">{{ t('messages.checkImageAccess') }}</p>
      </div>

      <!-- Overlay Information -->
      <div 
        v-if="currentOverlayInfo && !imageLoading && !imageError"
        class="absolute top-4 right-4 sm:top-6 sm:right-6 bg-black bg-opacity-75 text-white rounded-lg p-3 sm:p-4 max-w-xs sm:max-w-sm shadow-lg backdrop-blur-sm"
      >
        <div class="space-y-2 text-sm">
          <div v-if="currentOverlayInfo.vendorName" class="font-semibold">
            <span class="text-gray-300">{{ t('delivery.vendor') }}:</span>
            <span class="ml-1">{{ currentOverlayInfo.vendorName }}</span>
          </div>
          
          <div v-if="currentOverlayInfo.deliveryDate" class="text-gray-300">
            <span>{{ t('delivery.date') }}:</span>
            <span class="ml-1">{{ new Date(currentOverlayInfo.deliveryDate).toLocaleDateString() }}</span>
          </div>
          
          <div v-if="currentOverlayInfo.items && currentOverlayInfo.items.length > 0" class="border-t border-gray-600 pt-2">
            <div class="text-gray-300 mb-1">{{ t('delivery.items') }}:</div>
            <div class="space-y-1 max-h-24 overflow-y-auto">
              <div 
                v-for="item in currentOverlayInfo.items.slice(0, 3)" 
                :key="item"
                class="text-xs bg-gray-800 bg-opacity-50 rounded px-2 py-1"
              >
                {{ item }}
              </div>
              <div v-if="currentOverlayInfo.items.length > 3" class="text-xs text-gray-400">
                +{{ currentOverlayInfo.items.length - 3 }} {{ t('delivery.moreItems') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Thumbnail Strip -->
    <div 
      v-if="images.length > 1" 
      class="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-60 flex items-center space-x-2 bg-black bg-opacity-50 rounded-lg p-3 max-w-[90vw] overflow-x-auto scrollbar-hide"
    >
      <div 
        v-for="(image, index) in images" 
        :key="index"
        @click="currentIndex = index"
        class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:scale-105"
        :class="{ 
          'border-white shadow-lg': index === currentIndex, 
          'border-transparent hover:border-gray-300': index !== currentIndex 
        }"
      >
        <img 
          :src="image"
          :alt="`${t('common.thumbnail')} ${index + 1}`"
          class="w-full h-full object-cover"
        />
      </div>
    </div>

    <!-- Keyboard Navigation Hint -->
    <div v-if="images.length > 1" class="absolute bottom-20 right-4 z-60 bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded-lg">
      {{ t('common.useArrowKeys') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { X, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';

interface Props {
  show: boolean;
  images: string[];
  initialIndex?: number;
  overlayInfo?: {
    vendorName?: string;
    items?: string[];
    deliveryDate?: string;
  }[];
}

interface Emits {
  (e: 'close'): void;
  (e: 'update:show', value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0
});

const emit = defineEmits<Emits>();
const { t } = useI18n();

const currentIndex = ref(0);
const imageLoading = ref(false);
const imageError = ref(false);

const currentImage = computed(() => {
  return props.images[currentIndex.value] || null;
});

const currentOverlayInfo = computed(() => {
  return props.overlayInfo?.[currentIndex.value] || null;
});

// Watch for show prop changes to reset state
watch(() => props.show, (newShow) => {
  if (newShow) {
    currentIndex.value = Math.max(0, Math.min(props.initialIndex, props.images.length - 1));
    imageError.value = false;
    focusModal();
  }
});

// Watch for current image changes to reset loading state
watch(currentImage, () => {
  if (currentImage.value) {
    imageLoading.value = true;
    imageError.value = false;
  }
});

const close = () => {
  emit('update:show', false);
  emit('close');
};

const handleBackdropClick = (event: MouseEvent) => {
  // Only close if clicking the backdrop, not the image
  if (event.target === event.currentTarget) {
    close();
  }
};

const previousImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

const nextImage = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++;
  }
};

const onImageLoad = () => {
  imageLoading.value = false;
  imageError.value = false;
};

const onImageError = () => {
  imageLoading.value = false;
  imageError.value = true;
};

const focusModal = () => {
  nextTick(() => {
    const modal = document.querySelector('[role="dialog"]') as HTMLElement;
    if (modal) {
      modal.focus();
    }
  });
};

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.show) return;
  
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      previousImage();
      break;
    case 'ArrowRight':
      event.preventDefault();
      nextImage();
      break;
    case 'Escape':
      event.preventDefault();
      close();
      break;
    case 'Home':
      event.preventDefault();
      currentIndex.value = 0;
      break;
    case 'End':
      event.preventDefault();
      currentIndex.value = props.images.length - 1;
      break;
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Hide scrollbar for thumbnail strip */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>