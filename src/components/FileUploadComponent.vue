<template>
  <div class="space-y-4">
    <!-- Desktop/Tablet: Traditional drag-drop interface -->
    <div v-if="!isMobile"
         class="file-upload-component"
         :class="{ 'drag-over': isDragOver }"
         @drop="handleDrop"
         @dragover.prevent="isDragOver = true"
         @dragleave.prevent="isDragOver = false"
         @click="openFileSelector"
         :aria-label="t('fileUpload.dropZone')"
         role="button"
         tabindex="0"
         @keydown.enter="openFileSelector"
         @keydown.space.prevent="openFileSelector">

      <div class="upload-content">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto h-12 w-12 text-gray-400">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
        <p class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ t('fileUpload.clickOrDrag') }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('fileUpload.maxSize', { size: maxSizeFormatted }) }}</p>
      </div>
    </div>

    <!-- Mobile: Dedicated buttons for camera and file selection -->
    <div v-else class="mobile-upload-options">
      <div class="grid grid-cols-1 gap-3">
        <!-- Camera Button -->
        <button
          v-if="allowCamera && acceptTypes.includes('image')"
          type="button"
          @click="openCamera"
          class="mobile-upload-button camera-button"
          :aria-label="t('fileUpload.takePhoto')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          <span class="font-medium">{{ t('fileUpload.takePhoto') }}</span>
        </button>

        <!-- File Selection Button -->
        <button
          type="button"
          @click="openFileSelector"
          class="mobile-upload-button file-button"
          :aria-label="t('fileUpload.chooseFiles')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 18H3.75a1.125 1.125 0 01-1.125-1.125V4.875c0-.621.504-1.125 1.125-1.125H8.25v2.25a3.375 3.375 0 003.375 3.375h1.5a1.125 1.125 0 011.125-1.125v1.5a3.375 3.375 0 003.375 3.375H21V18a2.25 2.25 0 01-2.25 2.25z" />
          </svg>
          <span class="font-medium">{{ t('fileUpload.chooseFiles') }}</span>
        </button>
      </div>

      <p class="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
        {{ t('fileUpload.maxSize', { size: maxSizeFormatted }) }}
      </p>
    </div>

    <!-- Hidden file inputs -->
    <input
      type="file"
      :accept="acceptTypes"
      :multiple="multiple"
      @change="handleFileUpload"
      class="hidden"
      ref="fileInput"
    />

    <input
      v-if="allowCamera && acceptTypes.includes('image')"
      type="file"
      accept="image/*"
      :multiple="multiple"
      capture="environment"
      @change="handleFileUpload"
      class="hidden"
      ref="cameraInput"
    />

  <div v-if="previews.length > 0" class="preview-grid mt-4">
      <div v-for="(file, index) in previews" :key="file.id" class="preview-item group">
        <img v-if="file.type.startsWith('image/')" 
             :src="file.preview" 
             :alt="t('fileUpload.previewOf', { filename: file.name })" 
             class="preview-image" />
        <div v-else class="file-preview">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span class="file-name">{{ file.name }}</span>
        </div>
        <button type="button" 
                @click="removeFile(index)" 
                class="remove-button"
                :aria-label="t('fileUpload.removeFile')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- PDF Conversion Modal -->
    <div v-if="showPdfModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {{ t('fileUpload.pdfConversion') }}
        </h3>
        <div class="mb-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {{ t('fileUpload.pdfConversionMessage') }}
          </p>
          <div v-if="pdfToConvert" class="text-xs text-gray-500 dark:text-gray-500">
            <div class="flex items-center justify-between">
              <span>{{ pdfToConvert.name }}</span>
              <span v-if="pdfPageCount > 0">{{ t('fileUpload.pdfPageCount', { count: pdfPageCount }) }}</span>
            </div>
            <div v-if="estimatedSizeText" class="mt-1">
              {{ t('fileUpload.estimatedSize', { size: estimatedSizeText }) }}
            </div>
          </div>
        </div>
        <div class="flex justify-end space-x-3">
          <button @click="cancelPdfConversion" class="btn-outline">
            {{ t('common.cancel') }}
          </button>
          <button @click="handlePdfConversion" class="btn-primary">
            {{ t('common.continue') }}
          </button>
        </div>
      </div>
    </div>

    <!-- PDF Conversion Progress -->
    <div v-if="convertingPdf" class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div class="flex items-center">
        <svg class="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm text-blue-600 dark:text-blue-400">
          {{ t('fileUpload.convertingPdf', {
            current: conversionProgress.current,
            total: conversionProgress.total
          }) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from '../composables/useI18n'
import { isPdfFile, getEstimatedImageSize } from '../utils/pdfToImage'

interface FilePreview {
  id: string
  file: File
  preview: string
  name: string
  type: string
}

const props = withDefaults(defineProps<{
  modelValue?: File[]
  acceptTypes?: string
  multiple?: boolean
  maxSize?: number
  allowCamera?: boolean
}>(), {
  acceptTypes: 'image/*',
  multiple: true,
  maxSize: 10 * 1024 * 1024,
  allowCamera: true
})

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
  'files-selected': [files: File[]]
}>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement>()
const cameraInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const previews = ref<FilePreview[]>([])
const error = ref('')

// Detect if mobile device
const isMobile = ref(false)

// PDF conversion state
const showPdfModal = ref(false)
const pdfToConvert = ref<File | null>(null)
const convertingPdf = ref(false)
const conversionProgress = ref({ current: 0, total: 0 })
const pdfPageCount = ref(0)

onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
})

const maxSizeFormatted = computed(() => {
  const mb = props.maxSize / (1024 * 1024)
  return `${mb}MB`
})

const estimatedSizeText = computed(() => {
  if (pdfPageCount.value > 0) {
    return getEstimatedImageSize(pdfPageCount.value, 150)
  }
  return ''
})

const openFileSelector = () => {
  fileInput.value?.click()
}

const openCamera = () => {
  cameraInput.value?.click()
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
  }
  // Reset the input value to allow selecting the same file again
  target.value = ''
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  if (event.dataTransfer?.files) {
    processFiles(Array.from(event.dataTransfer.files))
  }
}

const processFiles = async (files: File[]) => {
  error.value = ''

  // Separate PDF files from other files
  const pdfFiles = files.filter(isPdfFile)
  const otherFiles = files.filter(file => !isPdfFile(file))

  // Process non-PDF files immediately
  if (otherFiles.length > 0) {
    processNonPdfFiles(otherFiles)
  }

  // Handle PDF files
  for (const pdfFile of pdfFiles) {
    if (props.acceptTypes === 'image/*' || props.acceptTypes.includes('image')) {
      // Show conversion modal for PDFs when images are expected
      await showPdfConversionModal(pdfFile)
    } else {
      // If PDFs are not being converted to images, treat as regular file
      processNonPdfFiles([pdfFile])
    }
  }
}

const processNonPdfFiles = (files: File[]) => {
  const validFiles = files.filter(file => {
    if (file.size > props.maxSize) {
      error.value = t('fileUpload.fileTooLarge', { name: file.name, size: maxSizeFormatted.value })
      return false
    }

    // Validate file type - handle multiple MIME types properly
    if (props.acceptTypes !== '*') {
      const acceptedTypes = props.acceptTypes.split(',').map(type => type.trim());
      const isValidType = acceptedTypes.some(acceptedType => {
        if (acceptedType.includes('*')) {
          // Handle wildcard types like "image/*"
          const baseType = acceptedType.replace('*', '');
          return file.type.startsWith(baseType);
        } else {
          // Handle exact types like "application/pdf"
          return file.type === acceptedType;
        }
      });

      if (!isValidType) {
        error.value = t('fileUpload.invalidFileType', { name: file.name })
        return false
      }
    }

    return true
  })

  if (!props.multiple && validFiles.length > 0) {
    previews.value = []
  }

  validFiles.forEach(file => {
    const reader = new FileReader()
    const id = `${file.name}-${Date.now()}-${Math.random()}`

    reader.onload = (e) => {
      const preview: FilePreview = {
        id,
        file,
        preview: e.target?.result as string,
        name: file.name,
        type: file.type
      }

      if (props.multiple) {
        previews.value.push(preview)
      } else {
        previews.value = [preview]
      }

      updateModelValue()
    }

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file)
    } else {
      const preview: FilePreview = {
        id,
        file,
        preview: '',
        name: file.name,
        type: file.type
      }

      if (props.multiple) {
        previews.value.push(preview)
      } else {
        previews.value = [preview]
      }

      updateModelValue()
    }
  })
}

const removeFile = (index: number) => {
  previews.value.splice(index, 1)
  updateModelValue()
}

// PDF conversion methods
const showPdfConversionModal = async (pdfFile: File) => {
  pdfToConvert.value = pdfFile
  pdfPageCount.value = 0

  try {
    // Get page count for display in modal
    const pdfjsLib = await import('pdfjs-dist')
    // Set worker source to use static file from public directory
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
    }

    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    pdfPageCount.value = pdf.numPages
  } catch (err) {
    console.error('Failed to get PDF page count:', err)
    pdfPageCount.value = 1 // Default to 1 page if we can't detect
  }

  showPdfModal.value = true
}

const handlePdfConversion = async () => {
  if (!pdfToConvert.value) return

  convertingPdf.value = true
  showPdfModal.value = false

  try {
    const { convertPdfToImages } = await import('../utils/pdfToImage')

    const images = await convertPdfToImages(pdfToConvert.value, {
      dpi: 150,
      format: 'jpeg',
      quality: 0.85,
      onProgress: (current, total) => {
        conversionProgress.value = { current, total }
      }
    })

    // Process converted images
    processNonPdfFiles(images)

  } catch (err) {
    error.value = t('fileUpload.pdfConversionError')
    console.error('PDF conversion failed:', err)
  } finally {
    convertingPdf.value = false
    pdfToConvert.value = null
    conversionProgress.value = { current: 0, total: 0 }
    pdfPageCount.value = 0
  }
}

const cancelPdfConversion = () => {
  showPdfModal.value = false
  pdfToConvert.value = null
  pdfPageCount.value = 0
}

const updateModelValue = () => {
  const files = previews.value.map(p => p.file)
  emit('update:modelValue', files)
  emit('files-selected', files)
}

watch(() => props.modelValue, (newFiles) => {
  if (!newFiles || newFiles.length === 0) {
    previews.value = []
  }
})
</script>

<style scoped>
.file-upload-component {
  @apply border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 block;
}

.file-upload-component.drag-over {
  @apply border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20;
}

.upload-content {
  @apply flex flex-col items-center justify-center;
}

.mobile-upload-options {
  @apply p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg;
}

.mobile-upload-button {
  @apply flex items-center justify-center space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation;
}

.camera-button {
  @apply text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20;
}

.file-button {
  @apply text-green-600 dark:text-green-400 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20;
}

.preview-grid {
  @apply grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4;
}

.preview-item {
  @apply relative;
}

.preview-image {
  @apply w-full h-32 object-cover rounded-lg;
}

.file-preview {
  @apply w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center p-2;
}

.file-name {
  @apply text-xs text-gray-700 dark:text-gray-300 mt-2 truncate w-full text-center;
}

.remove-button {
  @apply absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg;
}

.error-message {
  @apply text-red-600 dark:text-red-400 text-sm mt-2;
}

.hidden {
  @apply sr-only;
}

@media (max-width: 640px) {
  .mobile-upload-options {
    @apply p-3;
  }

  .mobile-upload-button {
    @apply p-3 text-sm;
  }

  .preview-grid {
    @apply grid-cols-2;
  }

  .preview-image,
  .file-preview {
    @apply h-24;
  }
}

/* Additional mobile optimizations */
@media (max-width: 480px) {
  .mobile-upload-button {
    @apply p-2.5 text-xs;
  }

  .mobile-upload-button svg {
    @apply w-5 h-5;
  }
}
</style>