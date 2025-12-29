<template>
  <div class="relative" @click.stop>
    <button
      @click="isOpen = !isOpen"
      class="p-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 touch-feedback min-h-touch min-w-[44px] flex items-center justify-center"
      :title="t('common.actions')"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
    >
      <MoreVertical class="h-5 w-5" />
    </button>

    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50 overflow-hidden"
        role="menu"
        @click.stop
      >
        <div class="py-1">
          <template v-for="action in actions" :key="action.key">
            <button
              v-if="!action.hidden"
              @click="handleAction(action)"
              :disabled="action.disabled"
              role="menuitem"
              :class="[
                'w-full text-left px-4 py-3.5 text-sm flex items-center space-x-3 transition-all duration-150 touch-feedback min-h-touch',
                action.disabled
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : action.variant === 'danger'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600'
              ]"
            >
              <component :is="action.icon" class="h-5 w-5 flex-shrink-0" />
              <span class="font-medium">{{ action.label }}</span>
            </button>
          </template>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Click outside to close -->
  <Transition
    enter-active-class="transition-opacity duration-150"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40 bg-black/10 lg:bg-transparent"
      @click="isOpen = false"
    />
  </Transition>
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