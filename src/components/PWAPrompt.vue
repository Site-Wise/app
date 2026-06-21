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
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-ink-3 border border-stone-200 dark:border-ink-4 rounded-xl shadow-modal p-5 z-50"
    >
      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 flex items-center justify-center shadow-lg p-2">
            <img src="/logo.webp" alt="SiteWise" class="w-8 h-8 object-contain" />
          </div>
        </div>
        <div class="flex-1">
          <h3 class="text-base font-semibold text-ink dark:text-cream mb-2">
            {{ t('pwa.installTitle') }}
          </h3>
          <p class="text-sm text-stone-600 dark:text-stone-400 mb-4 leading-relaxed">
            {{ t('pwa.installMessage') }}
          </p>
          <div class="flex space-x-3">
            <button
              @click="handleInstall"
              :disabled="installing"
              class="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md text-ink bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-card"
            >
              <Download v-if="!installing" class="mr-2 h-4 w-4" />
              <Loader2 v-else class="mr-2 h-4 w-4 animate-spin" />
              {{ installing ? t('pwa.installing') : t('pwa.install') }}
            </button>
            <button
              @click="dismiss"
              class="px-4 py-2.5 border border-stone-300 dark:border-ink-4 text-sm font-medium rounded-md text-stone-700 dark:text-stone-300 bg-white dark:bg-ink-3 hover:bg-stone-50 dark:hover:bg-ink-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-200"
            >
              {{ t('pwa.later') }}
            </button>
          </div>
        </div>
        <button
          @click="dismiss"
          class="flex-shrink-0 text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream p-1 rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-200"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </div>
  </Transition>

  <!-- Update notification is handled by PWAUpdateNotification component -->

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
      class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-700 rounded-lg shadow-modal px-4 py-3 z-50"
    >
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center">
          <WifiOff class="h-4 w-4 text-ink" />
        </div>
        <span class="text-sm font-medium text-amber-900 dark:text-amber-200">
          {{ t('pwa.youreOffline') }}
        </span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Download, X, WifiOff, Loader2 } from 'lucide-vue-next';
import { usePWA } from '../composables/usePWA';
import { useI18n } from '../composables/useI18n';

const { isInstallable, isOnline, installApp } = usePWA();
const { t } = useI18n();

const dismissed = ref(false);
const installing = ref(false);

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
    isOnline: isOnline.value,
    dismissed: dismissed.value
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
</script>