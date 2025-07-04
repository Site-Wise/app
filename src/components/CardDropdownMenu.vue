<template>
  <div class="relative" @click.stop>
    <button 
      @click="isOpen = !isOpen"
      class="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      :title="t('common.actions')"
    >
      <MoreVertical class="h-5 w-5" />
    </button>
    
    <div 
      v-if="isOpen"
      class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
      @click.stop
    >
      <div class="py-1">
        <template v-for="action in actions" :key="action.key">
          <button
            v-if="!action.hidden"
            @click="handleAction(action)"
            :disabled="action.disabled"
            :class="[
              'w-full text-left px-4 py-3 text-sm flex items-center space-x-3 transition-colors',
              action.disabled 
                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                : action.variant === 'danger'
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            ]"
          >
            <component :is="action.icon" class="h-4 w-4 flex-shrink-0" />
            <span>{{ action.label }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
  
  <!-- Click outside to close -->
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-40" 
    @click="isOpen = false"
  ></div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { MoreVertical } from 'lucide-vue-next'
import { useI18n } from '../composables/useI18n'

interface DropdownAction {
  key: string
  label: string
  icon: any
  variant?: 'default' | 'danger'
  disabled?: boolean
  hidden?: boolean
}

interface Props {
  actions: DropdownAction[]
}

interface Emits {
  (e: 'action', key: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const isOpen = ref(false)

const handleAction = (action: DropdownAction) => {
  if (!action.disabled) {
    isOpen.value = false
    emit('action', action.key)
  }
}

// Close dropdown on escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    isOpen.value = false
  }
}

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Add escape key listener when mounted
document.addEventListener('keydown', handleKeydown)
</script>