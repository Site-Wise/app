<template>
  <div class="space-y-4">
    <label class="file-upload-component" 
           :class="{ 'drag-over': isDragOver }"
           @drop="handleDrop"
           @dragover.prevent="isDragOver = true"
           @dragleave.prevent="isDragOver = false"
           :aria-label="t('fileUpload.dropZone')"
           role="button"
           tabindex="0"
           @keydown.enter="fileInput?.click()"
           @keydown.space.prevent="fileInput?.click()">
    
    <input
      type="file"
      :accept="acceptTypes"
      :multiple="multiple"
      :capture="isMobile && allowCamera ? 'environment' : undefined"
      @change="handleFileUpload"
      class="hidden"
      ref="fileInput"
    />

    <div class="upload-content">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto h-12 w-12 text-gray-400">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
      </svg>
      <p class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        <span class="hidden sm:inline">{{ t('fileUpload.clickOrDrag') }}</span>
        <span class="sm:hidden">{{ t('fileUpload.tapToSelect') }}</span>
      </p>
      <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('fileUpload.maxSize', { size: maxSizeFormatted }) }}</p>
    </div>
  </label>

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from '../composables/useI18n'

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
const isDragOver = ref(false)
const previews = ref<FilePreview[]>([])
const error = ref('')

// Detect if mobile device
const isMobile = ref(false)

onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
})

const maxSizeFormatted = computed(() => {
  const mb = props.maxSize / (1024 * 1024)
  return `${mb}MB`
})

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  if (event.dataTransfer?.files) {
    processFiles(Array.from(event.dataTransfer.files))
  }
}

const processFiles = (files: File[]) => {
  error.value = ''
  
  const validFiles = files.filter(file => {
    if (file.size > props.maxSize) {
      error.value = t('fileUpload.fileTooLarge', { name: file.name, size: maxSizeFormatted.value })
      return false
    }
    
    if (props.acceptTypes !== '*' && !file.type.match(props.acceptTypes.replace('*', '.*'))) {
      error.value = t('fileUpload.invalidFileType', { name: file.name })
      return false
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
  .upload-area {
    @apply p-4;
  }
  
  .camera-button,
  .file-button {
    @apply w-full justify-center;
  }
  
  .preview-grid {
    @apply grid-cols-2;
  }
  
  .preview-image,
  .file-preview {
    @apply h-24;
  }
}
</style>