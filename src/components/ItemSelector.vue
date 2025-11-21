<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ label }}
    </label>
    
    <!-- Item Selection Dropdown -->
    <div class="relative">
      <div class="relative">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          class="input pr-10"
          :placeholder="placeholder || t('forms.searchItems')"
          @input="handleSearch"
          @keydown.enter.prevent="handleEnterKey"
          @keydown.escape="hideDropdown"
          @keydown.up.prevent="handleArrowUp"
          @keydown.down.prevent="handleArrowDown"
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
          v-for="(item, index) in filteredItems"
          :key="item.id"
          :class="[
            'flex items-center px-3 py-2 cursor-pointer touch-manipulation',
            index === highlightedIndex
              ? 'bg-primary-50 dark:bg-primary-900/20'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
          ]"
          @click="selectItem(item)"
        >
          <Package class="h-4 w-4 text-gray-500 dark:text-gray-400 mr-3 flex-shrink-0" />
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ item.name }}</div>
            <div v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400">{{ item.description }}</div>
          </div>
          <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">({{ item.unit }})</span>
        </div>

        <!-- No Results / Create New Item -->
        <div v-if="filteredItems.length === 0 && searchQuery.trim()">
          <div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
            {{ t('items.noItemsFound') }}
          </div>
          <div
            class="flex items-center px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer touch-manipulation text-primary-600 dark:text-primary-400"
            @click="handleCreateNewItem"
          >
            <Plus class="h-4 w-4 mr-3 flex-shrink-0" />
            <div class="flex-1">
              <div class="text-sm font-medium">{{ t('items.createNewItem') }}</div>
              <div class="text-xs opacity-80">"{{ searchQuery.trim() }}"</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Search, Package, X, Plus } from 'lucide-vue-next'
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
  (e: 'createNewItem', searchQuery: string): void
}

const props = withDefaults(defineProps<Props>(), {
  usedItems: () => [],
  readonly: false
})

const emit = defineEmits<Emits>()

const { t } = useI18n()

const searchQuery = ref('')
const showDropdown = ref(false)
const searchInputRef = ref<HTMLInputElement>()
const highlightedIndex = ref(-1)

const selectedItem = computed(() => {
  return props.items.find(item => item.id === props.modelValue) || null
})

const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  let availableItems = props.items.filter(item => {
    // If the search query doesn't match the current item's name, allow it to appear
    // This fixes the bug where deleting text doesn't show the item again
    const isCurrentItem = props.modelValue && item.id === props.modelValue
    const searchQueryMatchesCurrentItem = isCurrentItem && query === item.name.toLowerCase()

    // Exclude used items and the current item ONLY if search query matches the current item
    return !props.usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
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
  highlightedIndex.value = -1
}

const clearSelection = () => {
  emit('update:modelValue', '')
  emit('itemSelected', null)
  searchQuery.value = ''
  showDropdown.value = false
}

// Keyboard navigation
const handleArrowDown = () => {
  if (!showDropdown.value || filteredItems.value.length === 0) return

  highlightedIndex.value = highlightedIndex.value < filteredItems.value.length - 1
    ? highlightedIndex.value + 1
    : 0
}

const handleArrowUp = () => {
  if (!showDropdown.value || filteredItems.value.length === 0) return

  highlightedIndex.value = highlightedIndex.value > 0
    ? highlightedIndex.value - 1
    : filteredItems.value.length - 1
}

const handleEnterKey = () => {
  // If an item is highlighted, select it
  if (highlightedIndex.value >= 0 && filteredItems.value[highlightedIndex.value]) {
    selectItem(filteredItems.value[highlightedIndex.value])
    return
  }

  // Fallback: if only one item matches, select it
  if (filteredItems.value.length === 1) {
    selectItem(filteredItems.value[0])
  }
}

const hideDropdown = () => {
  showDropdown.value = false
  highlightedIndex.value = -1
}

const handleCreateNewItem = () => {
  emit('createNewItem', searchQuery.value.trim())
  hideDropdown()
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

// Reset highlighted index when search query changes
watch(searchQuery, () => {
  highlightedIndex.value = -1
})

// Reset highlighted index when dropdown is opened
watch(showDropdown, (isOpen) => {
  if (isOpen) {
    highlightedIndex.value = -1
  }
})

// Auto-focus method for parent components to call
const focus = async () => {
  await nextTick()
  searchInputRef.value?.focus()
}

// Expose the focus method
defineExpose({
  focus
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>