<template>
  <div class="relative">
    <input
      type="search"
      inputmode="search"
      :placeholder="placeholder"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="w-full px-4 py-3 pl-11 pr-11 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 min-h-touch"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
    />
    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
      <Search class="h-5 w-5 text-gray-400" />
    </div>
    <div class="absolute inset-y-0 right-0 pr-2 flex items-center">
      <!-- Clear button - shows when there's text and not loading -->
      <button
        v-if="modelValue && !searchLoading"
        @click="clearSearch"
        class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 touch-feedback min-h-touch min-w-[44px] flex items-center justify-center"
        type="button"
        :title="'Clear search'"
      >
        <X class="h-5 w-5" />
      </button>
      <!-- Loading spinner - shows when loading -->
      <div v-if="searchLoading" class="p-2 pointer-events-none">
        <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2, X, Search } from 'lucide-vue-next';

defineProps<{
  modelValue: string;
  placeholder: string;
  searchLoading?: boolean;
}>();

const emit = defineEmits(['update:modelValue']);

const clearSearch = () => {
  emit('update:modelValue', '');
};
</script>

<style scoped>
/* Add any specific styles for the search box here if needed */
</style>
