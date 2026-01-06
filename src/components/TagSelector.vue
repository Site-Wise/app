<template>
  <div class="space-y-3">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ label || t('tags.selectTags') }}
    </label>
    
    <!-- Selected Tags Display -->
    <div v-if="selectedTags.length > 0" class="flex flex-wrap gap-2">
      <div
        v-for="tag in selectedTags"
        :key="tag.id"
        class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white"
        :style="{ backgroundColor: tag.color }"
      >
        <span>{{ tag.name }}</span>
        <button
          type="button"
          @click="removeTag(tag.id!)"
          class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black hover:bg-opacity-20"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    </div>

    <!-- Tag Input with Autocomplete -->
    <div class="relative">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          class="input pr-10"
          :placeholder="placeholder || t('tags.searchOrCreateTag')"
          @input="handleSearch"
          @keydown.enter.prevent="handleEnterKey"
          @keydown.escape="hideDropdown"
          @focus="showDropdown = true"
        />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <Search class="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <!-- Dropdown -->
      <div
        v-if="showDropdown && (filteredTags.length > 0 || canCreateNew)"
        class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto"
      >
        <!-- Existing Tags -->
        <div
          v-for="tag in filteredTags"
          :key="tag.id"
          class="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer touch-manipulation"
          @click="selectTag(tag)"
        >
          <div
            class="w-3 h-3 rounded-full mr-3 flex-shrink-0"
            :style="{ backgroundColor: tag.color }"
          ></div>
          <span class="flex-1 text-sm text-gray-900 dark:text-gray-100">{{ tag.name }}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">({{ tag.usage_count || 0 }})</span>
        </div>

        <!-- Create New Tag -->
        <div
          v-if="canCreateNew && searchQuery.trim()"
          class="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-t border-gray-200 dark:border-gray-600"
          @click="createNewTag"
        >
          <Plus class="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
          <span class="text-sm text-green-600 dark:text-green-400">
            {{ t('tags.createTag', { name: searchQuery.trim() }) }}
          </span>
        </div>

        <!-- No Results -->
        <div
          v-if="!canCreateNew && filteredTags.length === 0 && searchQuery.trim()"
          class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
        >
          {{ t('tags.noTagsFound') }}
        </div>
      </div>
    </div>

    <!-- Type Selection for New Tags -->
    <div v-if="showTypeSelection" class="space-y-2">
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">
        {{ t('tags.selectType') }}
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="type in tagTypes"
          :key="type.value"
          type="button"
          @click="selectTagType(type.value)"
          class="px-3 py-1 text-xs border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          :class="selectedType === type.value 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300' 
            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'"
        >
          {{ t(type.label) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { X, Search, Plus } from 'lucide-vue-next'
import { useI18n } from '../composables/useI18n'
import { useToast } from '../composables/useToast'
import { tagService, type Tag } from '../services/pocketbase'

interface Props {
  modelValue: string[] // Array of tag IDs
  label?: string
  placeholder?: string
  tagType?: Tag['type']
  allowCreate?: boolean
  trackUsage?: boolean // Whether to increment usage count when selecting tags
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
  (e: 'tagsChanged', tags: Tag[]): void
}

const props = withDefaults(defineProps<Props>(), {
  allowCreate: true,
  tagType: 'custom',
  trackUsage: true
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const { success, error } = useToast()

const allTags = ref<Tag[]>([])
const searchQuery = ref('')
const showDropdown = ref(false)
const showTypeSelection = ref(false)
const selectedType = ref<Tag['type']>(props.tagType)
const loading = ref(false)

const tagTypes: Array<{ value: Tag['type'], label: string }> = [
  { value: 'custom', label: 'tags.types.custom' },
  { value: 'item_category', label: 'tags.types.itemCategory' },
  { value: 'service_category', label: 'tags.types.serviceCategory' },
  { value: 'specialty', label: 'tags.types.specialty' }
]

const selectedTags = computed(() => {
  return allTags.value.filter(tag => props.modelValue.includes(tag.id!))
})

const filteredTags = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return allTags.value.slice(0, 10) // Show top 10 by usage

  return allTags.value
    .filter(tag => 
      tag.name.toLowerCase().includes(query) && 
      !props.modelValue.includes(tag.id!)
    )
    .slice(0, 10)
})

const canCreateNew = computed(() => {
  const query = searchQuery.value.trim()
  return props.allowCreate && 
         query.length > 0 && 
         !allTags.value.some(tag => tag.name.toLowerCase() === query.toLowerCase())
})

const loadTags = async () => {
  try {
    allTags.value = await tagService.getAll()
  } catch (err) {
    console.error('Error loading tags:', err)
  }
}

const handleSearch = () => {
  showDropdown.value = true
}

const selectTag = (tag: Tag) => {
  if (!props.modelValue.includes(tag.id!)) {
    const newValue = [...props.modelValue, tag.id!]
    emit('update:modelValue', newValue)
    emit('tagsChanged', allTags.value.filter(t => newValue.includes(t.id!)))

    // Increment usage count only if tracking is enabled
    if (props.trackUsage) {
      tagService.incrementUsage(tag.id!)
    }
  }
  searchQuery.value = ''
  showDropdown.value = false
}

const removeTag = (tagId: string) => {
  const newValue = props.modelValue.filter(id => id !== tagId)
  emit('update:modelValue', newValue)
  emit('tagsChanged', allTags.value.filter(t => newValue.includes(t.id!)))
}

const handleEnterKey = () => {
  if (filteredTags.value.length === 1) {
    selectTag(filteredTags.value[0])
  } else if (canCreateNew.value) {
    if (props.tagType === 'custom') {
      showTypeSelection.value = true
    } else {
      createNewTag()
    }
  }
}

const selectTagType = (type: Tag['type']) => {
  selectedType.value = type
  showTypeSelection.value = false
  createNewTag()
}

const createNewTag = async () => {
  const name = searchQuery.value.trim()
  if (!name) return

  loading.value = true
  try {
    const newTag = await tagService.findOrCreate(name, selectedType.value)
    await loadTags() // Refresh the list
    selectTag(newTag)
    success(t('tags.created', { name }))
  } catch (err) {
    console.error('Error creating tag:', err)
    error(t('messages.error'))
  } finally {
    loading.value = false
    showTypeSelection.value = false
  }
}

const hideDropdown = () => {
  showDropdown.value = false
  showTypeSelection.value = false
}

const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  if (!target.closest('.relative')) {
    hideDropdown()
  }
}

onMounted(() => {
  loadTags()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>