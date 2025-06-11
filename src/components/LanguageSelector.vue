<template>
  <div class="relative" ref="selectorRef">
    <button
      @click="dropdownOpen = !dropdownOpen"
      class="flex items-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors duration-200"
      :class="{ 'bg-gray-100 dark:bg-gray-700': dropdownOpen }"
    >
      <Globe class="h-5 w-5" />
      <ChevronDown class="ml-1 h-3 w-3" />
    </button>
    
    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
    >
      <button
        v-for="language in availableLanguages"
        :key="language.code"
        @click="selectLanguage(language.code as 'en' | 'hi')"
        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        :class="{ 'bg-gray-100 dark:bg-gray-700': currentLanguage === language.code }"
      >
        <span class="mr-3 text-lg">{{ getLanguageFlag(language.code) }}</span>
        <div class="flex-1 text-left">
          <div class="font-medium">{{ language.nativeName }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">{{ language.name }}</div>
        </div>
        <Check v-if="currentLanguage === language.code" class="ml-auto h-4 w-4 text-primary-600 dark:text-primary-400" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Globe, ChevronDown, Check } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';

const { currentLanguage, setLanguage, availableLanguages } = useI18n();
const dropdownOpen = ref(false);
const selectorRef = ref<HTMLElement | null>(null);

const getLanguageFlag = (code: string) => {
  const flags: Record<string, string> = {
    en: '🇺🇸',
    hi: '🇮🇳'
  };
  return flags[code] || '🌐';
};

const selectLanguage = (code: 'en' | 'hi') => {
  setLanguage(code);
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