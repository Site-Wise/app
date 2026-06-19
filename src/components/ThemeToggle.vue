<template>
  <div class="relative inline-block" ref="selectorRef">
    <button
      @click="dropdownOpen = !dropdownOpen"
      class="flex items-center justify-between p-2 rounded-md text-stone-600 hover:text-ink hover:bg-stone-100 dark:text-stone-300 dark:hover:text-cream dark:hover:bg-ink-4 transition-colors duration-200 ease-snap active:scale-[0.98] touch-manipulation w-full md:w-auto md:min-w-[40px]"
      :class="{ 'bg-stone-100 dark:bg-ink-4': dropdownOpen }"
      :aria-expanded="dropdownOpen"
      aria-haspopup="menu"
      :aria-label="t('theme.toggleTheme')"
    >
      <component :is="currentIcon" class="h-4 w-4 md:h-5 md:w-5" :aria-hidden="true" />
      <ChevronDown 
        class="h-3 w-3 ml-1 md:ml-2 transition-transform duration-200" 
        :class="{ 'rotate-180': dropdownOpen }"
        :aria-hidden="true"
      />
    </button>
    
    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-2 w-48 bg-white dark:bg-ink-3 rounded-lg shadow-modal border border-stone-200 dark:border-ink-4 z-[60] max-h-64 overflow-y-auto"
      role="menu"
    >
      <div class="py-2">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          @click="selectTheme(option.value as 'light' | 'dark' | 'system')"
          class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-stone-50 dark:hover:bg-ink-4 transition-colors duration-200 touch-manipulation group"
          :class="{
            'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500': theme === option.value,
            'text-amber-800 dark:text-amber-300': theme === option.value,
            'text-stone-700 dark:text-stone-300': theme !== option.value
          }"
          role="menuitem"
        >
          <component :is="option.icon" class="mr-3 h-4 w-4 md:h-5 md:w-5" />
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">{{ t(option.labelKey) }}</div>
          </div>
          <div class="ml-3 flex-shrink-0">
            <Check
              v-if="theme === option.value"
              class="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400"
            />
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Sun, Moon, Monitor, ChevronDown, Check } from 'lucide-vue-next';
import { useTheme } from '../composables/useTheme';
import { useI18n } from '../composables/useI18n';

const { theme, isDark, setTheme } = useTheme();
const { t } = useI18n();
const dropdownOpen = ref(false);
const selectorRef = ref<HTMLElement | null>(null);

const themeOptions = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor }
];

const currentIcon = computed(() => {
  if (theme.value === 'system') {
    return isDark.value ? Moon : Sun;
  }
  return theme.value === 'dark' ? Moon : Sun;
});

const selectTheme = (newTheme: 'light' | 'dark' | 'system') => {
  setTheme(newTheme);
  dropdownOpen.value = false;
};

const handleClickOutside = (event: Event) => {
  if (selectorRef.value && !selectorRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>