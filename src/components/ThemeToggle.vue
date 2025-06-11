<template>
  <div class="relative">
    <button
      @click="toggleDropdown"
      class="flex items-center justify-between w-full p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors duration-200 md:min-w-[40px]"
      :class="{ 'bg-gray-100 dark:bg-gray-700': dropdownOpen }"
    >
      <component :is="currentIcon" class="h-4 w-4 md:h-5 md:w-5" />
      <ChevronDown class="ml-1 h-3 w-3 transition-transform duration-200" :class="{ 'rotate-180': dropdownOpen }" />
    </button>
    
    <div
      v-if="dropdownOpen"
      class="absolute right-0 md:right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
    >
      <button
        v-for="option in themeOptions"
        :key="option.value"
        @click="selectTheme(option.value as 'light' | 'dark' | 'system')"
        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        :class="{ 'bg-gray-100 dark:bg-gray-700': theme === option.value }"
      >
        <component :is="option.icon" class="mr-3 h-4 w-4" />
        {{ t(option.labelKey) }}
        <Check v-if="theme === option.value" class="ml-auto h-4 w-4 text-primary-600 dark:text-primary-400" />
      </button>
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

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value;
};

const selectTheme = (newTheme: 'light' | 'dark' | 'system') => {
  setTheme(newTheme);
  dropdownOpen.value = false;
};

const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.relative')) {
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