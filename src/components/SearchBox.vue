<template>
  <div class="relative">
    <input
      type="search"
      inputmode="search"
      :placeholder="placeholder"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="w-full px-4 py-3 pl-11 pr-11 text-base sm:text-sm border border-stone-200 dark:border-ink-4 rounded-md bg-white dark:bg-ink-3 text-ink dark:text-cream placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-ink dark:focus:border-cream transition-all duration-200 min-h-touch"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
    />
    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
      <Search class="h-5 w-5 text-stone-500 dark:text-stone-400" />
    </div>
    <div class="absolute inset-y-0 right-0 pr-2 flex items-center">
      <!-- Clear button - shows when there's text and not loading -->
      <button
        v-if="modelValue && !searchLoading"
        @click="clearSearch"
        class="p-2 text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-all duration-150 touch-feedback min-h-touch min-w-[44px] flex items-center justify-center"
        type="button"
        :title="'Clear search'"
      >
        <X class="h-5 w-5" />
      </button>
      <!-- Loading spinner - shows when loading -->
      <div v-if="searchLoading" class="p-2 pointer-events-none">
        <Loader2 class="h-5 w-5 animate-spin text-amber-500" />
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
