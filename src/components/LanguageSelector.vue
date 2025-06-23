<template>
  <div class="relative inline-block" ref="selectorRef">
    <!-- Responsive trigger button -->
    <button
      @click="dropdownOpen = !dropdownOpen"
      class="flex items-center justify-between p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors duration-200 touch-manipulation w-full md:w-auto md:min-w-[40px]"
      :class="{ 'bg-gray-100 dark:bg-gray-700': dropdownOpen }"
      :aria-expanded="dropdownOpen"
      aria-haspopup="menu"
      :aria-label="t('language.selectLanguage')"
    >
      <div class="flex items-center">
        <!-- Only show globe icon on larger screens when text is hidden -->
        <!-- <Globe class="hidden lg:block h-5 w-5 mr-2" /> -->
        <span class="text-lg font-medium">
          {{ getLanguageFlag(currentLanguage) }}
        </span>
        <!-- Show language name on larger screens -->
        <!-- <span class="hidden lg:inline ml-1 text-sm">
          {{ availableLanguages.find(lang => lang.code === currentLanguage)?.nativeName }}
        </span> -->
      </div>
      <ChevronDown 
        class="h-3 w-3 ml-1 md:ml-2 transition-transform duration-200" 
        :class="{ 'rotate-180': dropdownOpen }"
        :aria-hidden="true"
      />
    </button>
   
    <!-- Responsive dropdown -->
    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[60] max-h-64 overflow-y-auto"
      role="menu"
    >
      <!-- Language options -->
      <div class="py-2">
        <button
          v-for="language in availableLanguages"
          :key="language.code"
          @click="selectLanguage(language.code as 'en' | 'hi')"
          class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 touch-manipulation group"
          :class="{ 
            'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500': currentLanguage === language.code,
            'text-primary-700 dark:text-primary-300': currentLanguage === language.code,
            'text-gray-700 dark:text-gray-300': currentLanguage !== language.code
          }"
          role="menuitem"
        >
          <span class="mr-3 text-lg md:text-xl">{{ getLanguageFlag(language.code) }}</span>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">{{ language.nativeName }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 truncate md:block hidden">{{ language.name }}</div>
          </div>
          <div class="ml-3 flex-shrink-0">
            <Check 
              v-if="currentLanguage === language.code" 
              class="h-4 w-4 md:h-5 md:w-5 text-primary-600 dark:text-primary-400" 
            />
          </div>
        </button>
      </div>
    </div>

    <!-- Mobile backdrop overlay (optional - uncomment if you want backdrop) -->
    <!-- 
    <div
      v-if="dropdownOpen"
      @click="dropdownOpen = false"
      class="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
    ></div>
    -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';

const { currentLanguage, setLanguage, availableLanguages, t } = useI18n();
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