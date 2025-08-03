import { ref } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { useToast } from './useToast';
import { useI18n } from './useI18n';

// Create a shared state for the PWA update
const showUpdatePrompt = ref(false);
const updateAvailable = ref(false);
const isUpdating = ref(false);

export function usePWAUpdate() {
  const { t } = useI18n();
  const { info } = useToast();
  
  // Use Vite PWA plugin's built-in registration - get instance without registering again
  const {
    updateServiceWorker
  } = useRegisterSW({
    immediate: false, // Don't auto-register (usePWA handles this)
    onNeedRefresh() {
      console.log('PWA Update: New content available, showing update prompt');
      updateAvailable.value = true;
      showUpdatePrompt.value = true;
    },
    onOfflineReady() {
      console.log('PWA Update: App ready to work offline');
      info(t('pwa.updateInstalled'));
    }
  });
  
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