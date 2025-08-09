import { ref } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { useToast } from './useToast';
import { useI18n } from './useI18n';

// Create a shared state for the PWA update
const showUpdatePrompt = ref(false);
const updateAvailable = ref(false);
const isUpdating = ref(false);

// Single service worker registration instance
let swRegistration: ReturnType<typeof useRegisterSW> | null = null;

export function usePWAUpdate() {
  const { t } = useI18n();
  const { info } = useToast();
  
  // Use shared service worker registration or create one
  if (!swRegistration) {
    console.log('🔧 PWA Update: Creating service worker registration...');
    swRegistration = useRegisterSW({
      immediate: true, // Auto-register on first use
      onNeedRefresh() {
        console.log('🎯 PWA Update: New content available, showing update prompt');
        updateAvailable.value = true;
        showUpdatePrompt.value = true;
      },
      onOfflineReady() {
        console.log('PWA Update: App ready to work offline');
        info(t('pwa.updateInstalled'));
      },
      onRegistered(r) {
        console.log('PWA: Service Worker registered for updates', r);
        // Check for updates periodically (every hour)
        r && setInterval(() => {
          console.log('PWA: Checking for updates...');
          r.update();
        }, 60 * 60 * 1000);
      },
      onRegisterError(error) {
        console.error('PWA: Service Worker registration error', error);
      }
    });
  }
  
  const { updateServiceWorker } = swRegistration;
  
  const applyUpdate = async () => {
    isUpdating.value = true;
    try {
      await updateServiceWorker(true);
      showUpdatePrompt.value = false;
      updateAvailable.value = false;
    } catch (error) {
      console.error('Error applying update:', error);
    } finally {
      isUpdating.value = false;
    }
  };
  
  const dismissUpdate = () => {
    showUpdatePrompt.value = false;
    updateAvailable.value = false;
  };

  // For testing purposes only: simulate an update and trigger the prompt
  const simulateUpdateAndReload = () => {
    updateAvailable.value = true;
    showUpdatePrompt.value = true;
  };
  
  return {
    showUpdatePrompt,
    updateAvailable,
    isUpdating,
    applyUpdate,
    dismissUpdate,
    ...(import.meta.env.DEV ? { simulateUpdateAndReload } : {})
  };
}