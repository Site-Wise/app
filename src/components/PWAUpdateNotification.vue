<template>
  <Transition
    enter-active-class="transition ease-out duration-300 transform"
    enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
    enter-to-class="opacity-100 translate-y-0 sm:scale-100"
    leave-active-class="transition ease-in duration-200 transform"
    leave-from-class="opacity-100 translate-y-0 sm:scale-100"
    leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
  >
    <div 
      v-if="showUpdatePrompt" 
      class="fixed bottom-4 inset-x-4 z-50 sm:right-4 sm:left-auto sm:max-w-sm"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div class="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Download class="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div class="ml-3 flex-1">
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              {{ t('pwa.updateAvailable') }}
            </div>
            <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('pwa.updateDescription') }}
            </div>
            <div class="mt-3 flex space-x-2">
              <button
                @click="handleUpdate"
                :disabled="isUpdating"
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Loader2 v-if="isUpdating" class="w-3 h-3 mr-1 animate-spin" />
                <Download v-else class="w-3 h-3 mr-1" />
                {{ isUpdating ? t('pwa.updating') : t('pwa.updateNow') }}
              </button>
              <button
                @click="handleDismiss"
                :disabled="isUpdating"
                class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ t('pwa.later') }}
              </button>
            </div>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              @click="handleDismiss"
              :disabled="isUpdating"
              class="inline-flex text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span class="sr-only">{{ t('common.close') }}</span>
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Download, Loader2, X } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { usePWAUpdate } from '../composables/usePWAUpdate';

const { t } = useI18n();
const { showUpdatePrompt, isUpdating, applyUpdate, dismissUpdate } = usePWAUpdate();

const handleUpdate = async () => {
  await applyUpdate();
};

const handleDismiss = () => {
  dismissUpdate();
};
</script>