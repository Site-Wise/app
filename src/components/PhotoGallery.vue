<template>
  <div>
    <!-- Photo Grid -->
    <div v-if="photos.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div 
        v-for="(photo, index) in photos" 
        :key="index"
        @click="openGallery(index)"
        class="relative group cursor-pointer overflow-hidden rounded-lg bg-stone-100 dark:bg-ink-4 aspect-square"
      >
        <img 
          :src="getPhotoUrl(photo)" 
          :alt="`${t('delivery.photos')} ${index + 1}`"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
          <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="bg-white dark:bg-ink-3 rounded-full p-2 shadow-modal">
              <Eye class="h-5 w-5 text-stone-700 dark:text-stone-300" />
            </div>
          </div>
        </div>
        <!-- Photo count indicator for first photo -->
        <div v-if="index === 0 && photos.length > 1" class="absolute top-2 right-2 bg-ink/70 text-cream text-xs font-mono px-2 py-1 rounded-md">
          +{{ photos.length - 1 }}
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <Camera class="mx-auto h-12 w-12 text-stone-400 dark:text-stone-500" />
      <h3 class="mt-2 text-sm font-medium text-ink dark:text-cream">{{ t('delivery.noPhotos') }}</h3>
      <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">{{ t('delivery.noPhotosMessage') }}</p>
    </div>

    <!-- Gallery Modal -->
    <div
      v-if="showGallery"
      class="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center select-none"
      @keydown.escape="closeGallery"
      tabindex="0"
      role="dialog"
      :aria-label="t('photos.galleryModal')"
      aria-modal="true"
    >
      <!-- Top chrome: counter + close. Auto-hides on mobile when controls are toggled off -->
      <div
        class="absolute top-0 inset-x-0 z-[62] flex items-center justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] transition-opacity duration-300"
        :class="chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      >
        <!-- Photo Counter -->
        <div class="bg-ink/60 backdrop-blur-sm text-cream px-3 py-1.5 rounded-full text-sm font-mono sw-tabular">
          {{ currentPhotoIndex + 1 }} / {{ photos.length }}
        </div>

        <!-- Close Button -->
        <button
          @click.stop="closeGallery"
          class="grid place-items-center h-11 w-11 bg-ink/60 backdrop-blur-sm hover:bg-ink/80 text-cream rounded-full transition-all duration-200"
          :aria-label="t('photos.closeGallery')"
        >
          <X class="h-6 w-6" />
        </button>
      </div>

      <!-- Navigation Buttons: desktop only — swipe replaces these on mobile -->
      <button
        v-if="photos.length > 1"
        @click.stop="previousPhoto"
        class="hidden md:grid place-items-center absolute left-4 top-1/2 -translate-y-1/2 z-[61] h-12 w-12 bg-ink/60 backdrop-blur-sm hover:bg-ink/80 text-cream rounded-full transition-all duration-200"
        :disabled="currentPhotoIndex === 0"
        :class="{ 'opacity-40 cursor-not-allowed': currentPhotoIndex === 0 }"
        :aria-label="t('photos.previousPhoto')"
      >
        <ChevronLeft class="h-6 w-6" />
      </button>

      <button
        v-if="photos.length > 1"
        @click.stop="nextPhoto"
        class="hidden md:grid place-items-center absolute right-4 top-1/2 -translate-y-1/2 z-[61] h-12 w-12 bg-ink/60 backdrop-blur-sm hover:bg-ink/80 text-cream rounded-full transition-all duration-200"
        :disabled="currentPhotoIndex === photos.length - 1"
        :class="{ 'opacity-40 cursor-not-allowed': currentPhotoIndex === photos.length - 1 }"
        :aria-label="t('photos.nextPhoto')"
      >
        <ChevronRight class="h-6 w-6" />
      </button>

      <!-- Swipe + tap surface. Fills the screen so the image is the hero. -->
      <div
        class="absolute inset-0 flex items-center justify-center overflow-hidden touch-pan-y"
        @click="onSurfaceClick"
        @touchstart.passive="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <img
          :src="getPhotoUrl(photos[currentPhotoIndex])"
          :alt="`${t('delivery.photos')} ${currentPhotoIndex + 1}`"
          class="max-w-full max-h-screen object-contain"
          :class="[
            { 'cursor-zoom-in': !isZoomed, 'cursor-zoom-out': isZoomed },
            isSwiping ? '' : 'transition-transform duration-300 ease-out'
          ]"
          :style="imageStyle"
          @load="onPhotoLoad"
          draggable="false"
        />

        <!-- Loading Spinner -->
        <div v-if="photoLoading" class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="bg-ink/60 backdrop-blur-sm rounded-2xl p-4">
            <Loader2 class="h-8 w-8 text-cream animate-spin" />
          </div>
        </div>
      </div>

      <!-- Bottom chrome: actions + (desktop) thumbnail strip. Auto-hides on mobile. -->
      <div
        class="absolute bottom-0 inset-x-0 z-[62] flex flex-col items-center gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-300"
        :class="chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      >
        <!-- Thumbnail Strip: desktop only — swipe + counter make it redundant on mobile -->
        <div
          v-if="photos.length > 1"
          class="hidden md:flex items-center gap-2 bg-ink/60 backdrop-blur-sm rounded-xl p-2 max-w-[90vw] overflow-x-auto"
        >
          <button
            v-for="(photo, index) in photos"
            :key="index"
            @click.stop="goToPhoto(index)"
            class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200"
            :class="index === currentPhotoIndex
              ? 'border-clay-500'
              : 'border-transparent hover:border-stone-400 opacity-70 hover:opacity-100'"
            :aria-label="`${t('delivery.photos')} ${index + 1}`"
          >
            <img
              :src="getPhotoUrl(photo)"
              :alt="`${t('delivery.photos')} ${index + 1}`"
              class="w-full h-full object-cover"
            />
          </button>
        </div>

        <!-- Photo Actions -->
        <div class="flex items-center gap-2 bg-ink/60 backdrop-blur-sm rounded-full p-1.5">
          <button
            @click.stop="downloadPhoto"
            class="grid place-items-center h-11 w-11 hover:bg-ink/80 text-cream rounded-full transition-all duration-200"
            :title="t('files.download')"
            :aria-label="t('files.download')"
          >
            <Download class="h-5 w-5" />
          </button>

          <button
            @click.stop="toggleZoom"
            class="grid place-items-center h-11 w-11 hover:bg-ink/80 text-cream rounded-full transition-all duration-200"
            :class="{ 'text-clay-400': isZoomed }"
            :title="isZoomed ? t('photos.zoomOut') : t('photos.zoomIn')"
            :aria-label="isZoomed ? t('photos.zoomOut') : t('photos.zoomIn')"
          >
            <ZoomIn v-if="!isZoomed" class="h-5 w-5" />
            <ZoomOut v-else class="h-5 w-5" />
          </button>

          <button
            v-if="showDeleteButton"
            @click.stop="deletePhoto"
            class="grid place-items-center h-11 w-11 text-clay-400 hover:bg-clay-600/30 rounded-full transition-all duration-200"
            :title="t('files.delete')"
            :aria-label="t('files.delete')"
          >
            <Trash2 class="h-5 w-5" />
          </button>
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
const zoomLevel = ref(1);
const zoomX = ref(0);
const zoomY = ref(0);

// Chrome auto-hide (native photo-viewer feel): tap image toggles controls on mobile.
const chromeVisible = ref(true);

// Horizontal swipe-to-navigate state for the main image.
const isSwiping = ref(false);
const swipeOffset = ref(0);

const imageStyle = computed(() => {
  // When zoomed, swipe is disabled and pan/scale takes over.
  if (isZoomed.value) {
    return {
      transform: `scale(${zoomLevel.value}) translate(${zoomX.value}px, ${zoomY.value}px)`,
      transformOrigin: 'center center'
    };
  }
  // Otherwise follow the finger during a swipe; CSS transition snaps it back/forward.
  return {
    transform: `translateX(${swipeOffset.value}px)`
  };
});

const getPhotoUrl = (filename: string) => {
  if (!props.itemId) return filename;
  // Using direct URL construction as pb.files.getUrl is deprecated
  return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/delivery_items/${props.itemId}/${filename}`;
};

const openGallery = (index: number) => {
  currentPhotoIndex.value = index;
  showGallery.value = true;
  isZoomed.value = false;
  zoomLevel.value = 1;
  zoomX.value = 0;
  zoomY.value = 0;
  swipeOffset.value = 0;
  chromeVisible.value = true;

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
  isSwiping.value = false;
  swipeOffset.value = 0;
  chromeVisible.value = true;
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

const goToPhoto = (index: number) => {
  currentPhotoIndex.value = index;
  resetZoom();
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
    swipeOffset.value = 0;
  }
  // Keep controls reachable whenever the user interacts with zoom.
  chromeVisible.value = true;
};

const onPhotoLoad = () => {
  photoLoading.value = false;
};

// Click on the swipe surface. On desktop a click toggles zoom (legacy behaviour).
// On touch devices, taps are handled in handleTouchEnd (single tap = chrome,
// double tap = zoom), so we ignore synthetic clicks that follow a touch.
let lastTouchEndAt = 0;
const onSurfaceClick = (event: MouseEvent) => {
  if (Date.now() - lastTouchEndAt < 500) return; // came from a touch interaction
  // Clicking the image toggles zoom; clicking the dark surround closes (desktop).
  if ((event.target as HTMLElement)?.tagName === 'IMG') {
    toggleZoom();
  } else {
    closeGallery();
  }
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
  if (confirm(t('messages.confirmDelete', { item: t('delivery.photos') }))) {
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

// Touch events: swipe-to-navigate when not zoomed, pan when zoomed.
let touchStartX = 0;
let touchStartY = 0;
let touchLastX = 0;
let touchLastY = 0;
let touchStartTime = 0;
let lockedHorizontal: boolean | null = null; // null = undecided, true = horizontal swipe
let lastTapAt = 0;

const SWIPE_DISTANCE_THRESHOLD = 50; // px
const SWIPE_VELOCITY_THRESHOLD = 0.3; // px/ms

const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length !== 1) return;
  const touch = event.touches[0];
  touchStartX = touchLastX = touch.clientX;
  touchStartY = touchLastY = touch.clientY;
  touchStartTime = Date.now();
  lockedHorizontal = null;

  if (isZoomed.value) {
    // Begin panning the zoomed image.
    isDragging = true;
  }
};

const handleTouchMove = (event: TouchEvent) => {
  if (event.touches.length !== 1) return;
  const touch = event.touches[0];
  const deltaX = touch.clientX - touchLastX;
  const deltaY = touch.clientY - touchLastY;

  if (isZoomed.value) {
    // Pan the zoomed image.
    zoomX.value += deltaX / zoomLevel.value;
    zoomY.value += deltaY / zoomLevel.value;
    touchLastX = touch.clientX;
    touchLastY = touch.clientY;
    event.preventDefault();
    return;
  }

  // Decide gesture direction once, then commit to a horizontal swipe.
  if (lockedHorizontal === null) {
    const totalX = Math.abs(touch.clientX - touchStartX);
    const totalY = Math.abs(touch.clientY - touchStartY);
    if (totalX > 8 || totalY > 8) {
      lockedHorizontal = totalX > totalY;
    }
  }

  if (lockedHorizontal === true) {
    let offset = touch.clientX - touchStartX;
    // Add resistance at the ends so it feels bounded, not broken.
    const atStart = currentPhotoIndex.value === 0 && offset > 0;
    const atEnd = currentPhotoIndex.value === props.photos.length - 1 && offset < 0;
    if (atStart || atEnd) offset *= 0.35;
    isSwiping.value = true;
    swipeOffset.value = offset;
    event.preventDefault();
  }

  touchLastX = touch.clientX;
  touchLastY = touch.clientY;
};

const handleTouchEnd = () => {
  lastTouchEndAt = Date.now();

  if (isZoomed.value) {
    isDragging = false;
    return;
  }

  const wasSwiping = lockedHorizontal === true;

  if (wasSwiping) {
    const distance = touchLastX - touchStartX;
    const elapsed = Math.max(1, Date.now() - touchStartTime);
    const velocity = Math.abs(distance) / elapsed;
    const passed =
      Math.abs(distance) > SWIPE_DISTANCE_THRESHOLD ||
      velocity > SWIPE_VELOCITY_THRESHOLD;

    if (passed && distance < 0) {
      nextPhoto();
    } else if (passed && distance > 0) {
      previousPhoto();
    }
    // Snap back; CSS transition animates the reset (and the index change).
    isSwiping.value = false;
    swipeOffset.value = 0;
    lockedHorizontal = null;
    return;
  }

  // No swipe: treat as a tap. Double tap zooms, single tap toggles chrome.
  const now = Date.now();
  if (now - lastTapAt < 300) {
    toggleZoom();
    lastTapAt = 0;
  } else {
    chromeVisible.value = !chromeVisible.value;
    lastTapAt = now;
  }
  lockedHorizontal = null;
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