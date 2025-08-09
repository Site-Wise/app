<template>
  <!-- Install Prompt -->
  <Transition
    enter-active-class="transform transition-all duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transform transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="isInstallable && !dismissed"
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-5 z-50 backdrop-blur-sm"
    >
      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 flex items-center justify-center shadow-lg p-2">
            <img src="/logo.webp" alt="SiteWise" class="w-8 h-8 object-contain" />
          </div>
        </div>
        <div class="flex-1">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-2">
            {{ t('pwa.installTitle') }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            {{ t('pwa.installMessage') }}
          </p>
          <div class="flex space-x-3">
            <button
              @click="handleInstall"
              :disabled="installing"
              class="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Download v-if="!installing" class="mr-2 h-4 w-4" />
              <Loader2 v-else class="mr-2 h-4 w-4 animate-spin" />
              {{ installing ? t('pwa.installing') : t('pwa.install') }}
            </button>
            <button
              @click="dismiss"
              class="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
            >
              {{ t('pwa.later') }}
            </button>
          </div>
        </div>
        <button
          @click="dismiss"
          class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </div>
  </Transition>

  <!-- Update Available Prompt -->
  <Transition
    enter-active-class="transform transition-all duration-300 ease-out"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transform transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="updateAvailable && !updateDismissed"
      class="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border border-blue-200 dark:border-blue-700 rounded-xl shadow-2xl p-5 z-50 backdrop-blur-sm"
    >
      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <RefreshCw class="h-6 w-6 text-white" />
          </div>
        </div>
        <div class="flex-1">
          <h3 class="text-base font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {{ t('pwa.updateTitle') }}
          </h3>
          <p class="text-sm text-blue-700 dark:text-blue-200 mb-4 leading-relaxed">
            {{ t('pwa.updateMessage') }}
          </p>
          <div class="flex space-x-3">
            <button
              @click="handleUpdate"
              :disabled="updating"
              class="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <RefreshCw v-if="!updating" class="mr-2 h-4 w-4" />
              <Loader2 v-else class="mr-2 h-4 w-4 animate-spin" />
              {{ updating ? t('pwa.updating') : t('pwa.updateNow') }}
            </button>
            <button
              @click="updateDismissed = true"
              class="px-4 py-2.5 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-lg text-blue-700 dark:text-blue-200 bg-white dark:bg-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              {{ t('pwa.later') }}
            </button>
          </div>
        </div>
        <button
          @click="updateDismissed = true"
          class="flex-shrink-0 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors duration-200"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </div>
  </Transition>

  <!-- Offline Indicator -->
  <Transition
    enter-active-class="transform transition-all duration-300 ease-out"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transform transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="!isOnline"
      class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/40 dark:to-orange-900/40 border border-yellow-200 dark:border-yellow-700 rounded-xl shadow-xl px-4 py-3 z-50 backdrop-blur-sm"
    >
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
          <WifiOff class="h-4 w-4 text-white" />
        </div>
        <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          {{ t('pwa.youreOffline') }}
        </span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Download, X, RefreshCw, WifiOff, Loader2 } from 'lucide-vue-next';
import { usePWA } from '../composables/usePWA';
import { usePWAUpdate } from '../composables/usePWAUpdate';
import { useI18n } from '../composables/useI18n';

const { isInstallable, isOnline, installApp } = usePWA();
const { showUpdatePrompt: updateAvailable, applyUpdate } = usePWAUpdate();
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
    await applyUpdate();
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

  // Add development testing helpers
  if (import.meta.env.DEV) {
    // Add keyboard shortcut to test install prompt (Ctrl+Shift+I)
    const handleTestInstall = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        console.log('🧪 Testing PWA install prompt...');
        
        // Simulate install prompt for testing
        dismissed.value = false;
        
        // Create a fake beforeinstallprompt event
        const fakeEvent = {
          preventDefault: () => {},
          prompt: () => Promise.resolve(),
          userChoice: Promise.resolve({ outcome: 'accepted' })
        };
        
        // Trigger the same logic as the real event
        (window as any).fakeInstallPrompt = fakeEvent;
        isInstallable.value = true;
        
        console.log('✅ Install prompt should now be visible');
      }
    };
    
    window.addEventListener('keydown', handleTestInstall);
    
    // Log instructions
    console.log('🧪 PWA Development Testing:');
    console.log('   - Press Ctrl+Shift+I to test install prompt');
    console.log('   - Check browser DevTools > Application > Manifest for PWA status');
  }
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