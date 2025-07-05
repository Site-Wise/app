<template>
  <!-- Install Prompt -->
  <div
    v-if="isInstallable && !dismissed"
    class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 transform transition-transform duration-300"
    :class="{ 'translate-y-0': isInstallable, 'translate-y-full': !isInstallable }"
  >
    <div class="flex items-start space-x-3">
      <div class="flex-shrink-0">
        <HardHat class="h-8 w-8 text-primary-600 dark:text-primary-400" />
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">
          {{ t('pwa.installTitle') }}
        </h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('pwa.installMessage') }}
        </p>
        <div class="mt-3 flex space-x-2">
          <button
            @click="handleInstall"
            :disabled="installing"
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <Download v-if="!installing" class="mr-1 h-3 w-3" />
            <Loader2 v-else class="mr-1 h-3 w-3 animate-spin" />
            {{ installing ? t('pwa.installing') : t('pwa.install') }}
          </button>
          <button
            @click="dismiss"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {{ t('pwa.later') }}
          </button>
        </div>
      </div>
      <button
        @click="dismiss"
        class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>

  <!-- Update Available Prompt -->
  <div
    v-if="updateAvailable && !updateDismissed"
    class="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg shadow-lg p-4 z-50"
  >
    <div class="flex items-start space-x-3">
      <div class="flex-shrink-0">
        <RefreshCw class="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-medium text-blue-900 dark:text-blue-100">
          {{ t('pwa.updateTitle') }}
        </h3>
        <p class="mt-1 text-sm text-blue-700 dark:text-blue-200">
          {{ t('pwa.updateMessage') }}
        </p>
        <div class="mt-3 flex space-x-2">
          <button
            @click="handleUpdate"
            :disabled="updating"
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw v-if="!updating" class="mr-1 h-3 w-3" />
            <Loader2 v-else class="mr-1 h-3 w-3 animate-spin" />
            {{ updating ? t('pwa.updating') : t('pwa.updateNow') }}
          </button>
          <button
            @click="updateDismissed = true"
            class="inline-flex items-center px-3 py-1.5 border border-blue-300 dark:border-blue-600 text-xs font-medium rounded text-blue-700 dark:text-blue-200 bg-white dark:bg-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {{ t('pwa.later') }}
          </button>
        </div>
      </div>
      <button
        @click="updateDismissed = true"
        class="flex-shrink-0 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>

  <!-- Offline Indicator -->
  <div
    v-if="!isOnline"
    class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg shadow-lg px-4 py-2 z-50"
  >
    <div class="flex items-center space-x-2">
      <WifiOff class="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
        {{ t('pwa.youreOffline') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { HardHat, Download, X, RefreshCw, WifiOff, Loader2 } from 'lucide-vue-next';
import { usePWA } from '../composables/usePWA';
import { useI18n } from '../composables/useI18n';

const { isInstallable, updateAvailable, isOnline, installApp, updateApp } = usePWA();
const { t } = useI18n();

const dismissed = ref(false);
const updateDismissed = ref(false);
const installing = ref(false);
const updating = ref(false);

const handleInstall = async () => {
  installing.value = true;
  try {
    const success = await installApp();
    if (success) {
      dismissed.value = true;
    }
  } catch (error) {
    console.error('Failed to install app:', error);
  } finally {
    installing.value = false;
  }
};

const handleUpdate = async () => {
  updating.value = true;
  try {
    await updateApp();
  } catch (error) {
    console.error('Failed to update app:', error);
  } finally {
    updating.value = false;
  }
};

const dismiss = () => {
  dismissed.value = true;
  // Remember dismissal for this session
  sessionStorage.setItem('pwa-install-dismissed', 'true');
};

onMounted(() => {
  // Check if user previously dismissed the install prompt
  const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
  if (wasDismissed) {
    dismissed.value = true;
  }
  
  // Debug logging
  console.log('PWAPrompt mounted:', {
    isInstallable: isInstallable.value,
    updateAvailable: updateAvailable.value,
    isOnline: isOnline.value,
    dismissed: dismissed.value,
    updateDismissed: updateDismissed.value
  });
});

// Watch for update availability changes
watch(updateAvailable, (newValue) => {
  console.log('PWAPrompt: updateAvailable changed to', newValue);
  if (newValue) {
    // Reset dismissal when a new update is available
    updateDismissed.value = false;
  }
});
</script>