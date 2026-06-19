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
      <div class="bg-white dark:bg-ink-3 rounded-lg shadow-modal border border-stone-200 dark:border-ink-4 p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div class="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-500/15 rounded-full">
              <Download class="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div class="ml-3 flex-1">
            <div class="text-sm font-medium text-ink dark:text-cream">
              {{ t('pwa.updateAvailable') }}
            </div>
            <div class="mt-1 text-sm text-stone-600 dark:text-stone-400">
              {{ t('pwa.updateDescription') }}
            </div>
            <div class="mt-3 flex space-x-2">
              <button
                @click="handleUpdate"
                :disabled="isUpdating"
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-ink bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Loader2 v-if="isUpdating" class="w-3 h-3 mr-1 animate-spin" />
                <Download v-else class="w-3 h-3 mr-1" />
                {{ isUpdating ? t('pwa.updating') : t('pwa.updateNow') }}
              </button>
              <button
                @click="handleDismiss"
                :disabled="isUpdating"
                class="inline-flex items-center px-3 py-1.5 border border-stone-300 dark:border-ink-4 text-xs font-medium rounded-md text-stone-700 dark:text-stone-300 bg-white dark:bg-ink-3 hover:bg-stone-50 dark:hover:bg-ink-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ t('pwa.later') }}
              </button>
            </div>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              @click="handleDismiss"
              :disabled="isUpdating"
              class="inline-flex text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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