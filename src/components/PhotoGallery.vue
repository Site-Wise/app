<template>
  <div>
    <!-- Photo Grid -->
    <div v-if="photos.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div 
        v-for="(photo, index) in photos" 
        :key="index"
        @click="openGallery(index)"
        class="relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 aspect-square"
      >
        <img 
          :src="getPhotoUrl(photo)" 
          :alt="`${t('incoming.photos')} ${index + 1}`"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
          <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
              <Eye class="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </div>
          </div>
        </div>
        <!-- Photo count indicator for first photo -->
        <div v-if="index === 0 && photos.length > 1" class="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
          +{{ photos.length - 1 }}
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <Camera class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('incoming.noPhotos') }}</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('incoming.noPhotosMessage') }}</p>
    </div>

    <!-- Gallery Modal -->
    <div 
      v-if="showGallery" 
      class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
      @click="closeGallery"
      @keydown.escape="closeGallery"
      tabindex="0"
    >
      <!-- Close Button -->
      <button 
        @click="closeGallery"
        class="absolute top-4 right-4 z-60 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
      >
        <X class="h-6 w-6" />
      </button>

      <!-- Photo Counter -->
      <div class="absolute top-4 left-4 z-60 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
        {{ currentPhotoIndex + 1 }} / {{ photos.length }}
      </div>

      <!-- Navigation Buttons -->
      <button 
        v-if="photos.length > 1"
        @click.stop="previousPhoto"
        class="absolute left-4 top-1/2 transform -translate-y-1/2 z-60 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-200"
        :disabled="currentPhotoIndex === 0"
        :class="{ 'opacity-50 cursor-not-allowed': currentPhotoIndex === 0 }"
      >
        <ChevronLeft class="h-6 w-6" />
      </button>

      <button 
        v-if="photos.length > 1"
        @click.stop="nextPhoto"
        class="absolute right-4 top-1/2 transform -translate-y-1/2 z-60 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-200"
        :disabled="currentPhotoIndex === photos.length - 1"
        :class="{ 'opacity-50 cursor-not-allowed': currentPhotoIndex === photos.length - 1 }"
      >
        <ChevronRight class="h-6 w-6" />
      </button>

      <!-- Main Photo -->
      <div 
        class="relative max-w-7xl max-h-full mx-4 flex items-center justify-center"
        @click.stop
      >
        <img 
          :src="getPhotoUrl(photos[currentPhotoIndex])" 
          :alt="`${t('incoming.photos')} ${currentPhotoIndex + 1}`"
          class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          :class="{ 'cursor-zoom-in': !isZoomed, 'cursor-zoom-out': isZoomed }"
          @click="toggleZoom"
          :style="zoomStyle"
          ref="photoElement"
          @load="onPhotoLoad"
        />
        
        <!-- Loading Spinner -->
        <div v-if="photoLoading" class="absolute inset-0 flex items-center justify-center">
          <div class="bg-black bg-opacity-50 rounded-lg p-4">
            <Loader2 class="h-8 w-8 text-white animate-spin" />
          </div>
        </div>
      </div>

      <!-- Photo Actions -->
      <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-60 flex items-center space-x-2">
        <button 
          @click.stop="downloadPhoto"
          class="bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
          :title="t('files.download')"
        >
          <Download class="h-5 w-5" />
        </button>
        
        <button 
          @click.stop="toggleZoom"
          class="bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
          :title="isZoomed ? t('photos.zoomOut') : t('photos.zoomIn')"
        >
          <ZoomIn v-if="!isZoomed" class="h-5 w-5" />
          <ZoomOut v-else class="h-5 w-5" />
        </button>

        <button 
          v-if="showDeleteButton"
          @click.stop="deletePhoto"
          class="bg-red-600 bg-opacity-80 hover:bg-opacity-100 text-white rounded-full p-2 transition-all duration-200"
          :title="t('files.delete')"
        >
          <Trash2 class="h-5 w-5" />
        </button>
      </div>

      <!-- Thumbnail Strip -->
      <div 
        v-if="photos.length > 1" 
        class="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-60 flex items-center space-x-2 bg-black bg-opacity-50 rounded-lg p-2 max-w-full overflow-x-auto"
      >
        <div 
          v-for="(photo, index) in photos" 
          :key="index"
          @click.stop="currentPhotoIndex = index"
          class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200"
          :class="{ 
            'border-white': index === currentPhotoIndex, 
            'border-transparent hover:border-gray-300': index !== currentPhotoIndex 
          }"
        >
          <img 
            :src="getPhotoUrl(photo)" 
            :alt="`${t('incoming.photos')} ${index + 1}`"
            class="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Trash2, 
  Camera,
  Loader2
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { pb } from '../services/pocketbase';

interface Props {
  photos: string[];
  itemId?: string;
  showDeleteButton?: boolean;
}

interface Emits {
  (e: 'photoDeleted', index: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  showDeleteButton: false
});

const emit = defineEmits<Emits>();
const { t } = useI18n();

const showGallery = ref(false);
const currentPhotoIndex = ref(0);
const isZoomed = ref(false);
const photoLoading = ref(false);
const photoElement = ref<HTMLImageElement | null>(null);
const zoomLevel = ref(1);
const zoomX = ref(0);
const zoomY = ref(0);

const zoomStyle = computed(() => {
  if (!isZoomed.value) return {};
  
  return {
    transform: `scale(${zoomLevel.value}) translate(${zoomX.value}px, ${zoomY.value}px)`,
    transformOrigin: 'center center',
    transition: 'transform 0.3s ease'
  };
});

const getPhotoUrl = (filename: string) => {
  if (!props.itemId) return filename;
  return `${pb.baseUrl}/api/files/incoming_items/${props.itemId}/${filename}`;
};

const openGallery = (index: number) => {
  currentPhotoIndex.value = index;
  showGallery.value = true;
  isZoomed.value = false;
  zoomLevel.value = 1;
  zoomX.value = 0;
  zoomY.value = 0;
  
  // Focus the gallery for keyboard navigation
  nextTick(() => {
    const galleryElement = document.querySelector('[tabindex="0"]') as HTMLElement;
    if (galleryElement) {
      galleryElement.focus();
    }
  });
};

const closeGallery = () => {
  showGallery.value = false;
  isZoomed.value = false;
  zoomLevel.value = 1;
  zoomX.value = 0;
  zoomY.value = 0;
};

const previousPhoto = () => {
  if (currentPhotoIndex.value > 0) {
    currentPhotoIndex.value--;
    resetZoom();
  }
};

const nextPhoto = () => {
  if (currentPhotoIndex.value < props.photos.length - 1) {
    currentPhotoIndex.value++;
    resetZoom();
  }
};

const resetZoom = () => {
  isZoomed.value = false;
  zoomLevel.value = 1;
  zoomX.value = 0;
  zoomY.value = 0;
};

const toggleZoom = () => {
  if (isZoomed.value) {
    resetZoom();
  } else {
    isZoomed.value = true;
    zoomLevel.value = 2;
  }
};

const onPhotoLoad = () => {
  photoLoading.value = false;
};

const downloadPhoto = () => {
  const photoUrl = getPhotoUrl(props.photos[currentPhotoIndex.value]);
  const link = document.createElement('a');
  link.href = photoUrl;
  link.download = `photo-${currentPhotoIndex.value + 1}.jpg`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const deletePhoto = () => {
  if (confirm(t('messages.confirmDelete', { item: t('incoming.photos') }))) {
    emit('photoDeleted', currentPhotoIndex.value);
    
    // Adjust current index if needed
    if (currentPhotoIndex.value >= props.photos.length - 1) {
      currentPhotoIndex.value = Math.max(0, props.photos.length - 2);
    }
    
    // Close gallery if no photos left
    if (props.photos.length <= 1) {
      closeGallery();
    }
  }
};

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (!showGallery.value) return;
  
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      previousPhoto();
      break;
    case 'ArrowRight':
      event.preventDefault();
      nextPhoto();
      break;
    case 'Escape':
      event.preventDefault();
      closeGallery();
      break;
    case ' ':
      event.preventDefault();
      toggleZoom();
      break;
    case 'Delete':
      if (props.showDeleteButton) {
        event.preventDefault();
        deletePhoto();
      }
      break;
  }
};

// Touch/mouse events for zoom and pan
let isDragging = false;
let lastX = 0;
let lastY = 0;

const handleMouseDown = (event: MouseEvent) => {
  if (!isZoomed.value) return;
  
  isDragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  event.preventDefault();
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging || !isZoomed.value) return;
  
  const deltaX = event.clientX - lastX;
  const deltaY = event.clientY - lastY;
  
  zoomX.value += deltaX / zoomLevel.value;
  zoomY.value += deltaY / zoomLevel.value;
  
  lastX = event.clientX;
  lastY = event.clientY;
  event.preventDefault();
};

const handleMouseUp = () => {
  isDragging = false;
};

// Wheel zoom
const handleWheel = (event: WheelEvent) => {
  if (!showGallery.value) return;
  
  event.preventDefault();
  
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  const newZoomLevel = Math.max(0.5, Math.min(4, zoomLevel.value + delta));
  
  if (newZoomLevel !== zoomLevel.value) {
    zoomLevel.value = newZoomLevel;
    isZoomed.value = newZoomLevel > 1;
    
    if (!isZoomed.value) {
      zoomX.value = 0;
      zoomY.value = 0;
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('wheel', handleWheel, { passive: false });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('wheel', handleWheel);
});
</script>