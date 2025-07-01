<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ label }}
    </label>
    
    <!-- Item Selection Dropdown -->
    <div class="relative">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          class="input pr-10"
          :placeholder="placeholder || t('forms.searchItems')"
          @input="handleSearch"
          @keydown.enter.prevent="handleEnterKey"
          @keydown.escape="hideDropdown"
          @focus="showDropdown = true"
          @click="showDropdown = true"
          :readonly="readonly"
        />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1">
          <button
            v-if="selectedItem && !readonly"
            type="button"
            @click.stop="clearSelection"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="t('common.clear')"
          >
            <X class="h-4 w-4" />
          </button>
          <Search class="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <!-- Dropdown -->
      <div
        v-if="showDropdown && (filteredItems.length > 0 || searchQuery.trim())"
        class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto"
      >
        <!-- Available Items -->
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer touch-manipulation"
          @click="selectItem(item)"
        >
          <Package class="h-4 w-4 text-gray-500 dark:text-gray-400 mr-3 flex-shrink-0" />
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ item.name }}</div>
            <div v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400">{{ item.description }}</div>
          </div>
          <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">({{ item.unit }})</span>
        </div>

        <!-- No Results -->
        <div
          v-if="filteredItems.length === 0 && searchQuery.trim()"
          class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
        >
          {{ t('items.noItemsFound') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Search, Package, X } from 'lucide-vue-next'
import { useI18n } from '../composables/useI18n'
import { type Item } from '../services/pocketbase'

interface Props {
  modelValue: string // Selected item ID
  items: Item[]
  usedItems?: string[] // Array of item IDs that are already used/unavailable
  label?: string
  placeholder?: string
  readonly?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'itemSelected', item: Item | null): void
}

const props = withDefaults(defineProps<Props>(), {
  usedItems: () => [],
  readonly: false
})

const emit = defineEmits<Emits>()

const { t } = useI18n()

const searchQuery = ref('')
const showDropdown = ref(false)

const selectedItem = computed(() => {
  return props.items.find(item => item.id === props.modelValue) || null
})

const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  let availableItems = props.items.filter(item => {
    // Don't exclude the current item if modelValue is empty (item cleared)
    const isCurrentItem = props.modelValue && item.id === props.modelValue
    return !props.usedItems.includes(item.id!) && !isCurrentItem
  })

  if (!query) {
    return availableItems // Show all available items when no search query
  }

  return availableItems
    .filter(item => 
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    )
    .slice(0, 10)
})

const handleSearch = () => {
  showDropdown.value = true
}

const selectItem = (item: Item) => {
  emit('update:modelValue', item.id!)
  emit('itemSelected', item)
  searchQuery.value = item.name
  showDropdown.value = false
}

const clearSelection = () => {
  emit('update:modelValue', '')
  emit('itemSelected', null)
  searchQuery.value = ''
  showDropdown.value = false
}


const handleEnterKey = () => {
  if (filteredItems.value.length === 1) {
    selectItem(filteredItems.value[0])
  }
}

const hideDropdown = () => {
  showDropdown.value = false
}

const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  if (!target.closest('.relative')) {
    hideDropdown()
  }
}

// Watch for changes in modelValue to update searchQuery
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    const item = props.items.find(item => item.id === newValue)
    if (item) {
      searchQuery.value = item.name
    }
  } else {
    searchQuery.value = ''
  }
}, { immediate: true })


onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>