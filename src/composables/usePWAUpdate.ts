import { ref, onMounted } from 'vue';
import { useToast } from './useToast';
import { useI18n } from './useI18n';

// Create a shared state for the PWA update
const showUpdatePrompt = ref(false);
const updateAvailable = ref(false);
const isUpdating = ref(false);
let updateSW: (() => Promise<void>) | null = null;

export function usePWAUpdate() {
  const { t } = useI18n();
  const { info } = useToast();
  
  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
      try {
        // Import workbox-window dynamically to avoid SSR issues
        const { Workbox } = await import('workbox-window');
        
        const wb = new Workbox('/sw.js');
        
        // Listen for waiting service worker
        wb.addEventListener('waiting', (event) => {
          console.log('Service worker is waiting, showing update prompt');
          updateAvailable.value = true;
          showUpdatePrompt.value = true;
          
          // Store the update function for later use
          updateSW = async () => {
            if (event.sw) {
              // Tell the waiting service worker to skip waiting
              event.sw.postMessage({ type: 'SKIP_WAITING' });
            }
          };
        });
        
        // Listen for controlling service worker change
        wb.addEventListener('controlling', () => {
          console.log('Service worker is controlling, reloading page');
          window.location.reload();
        });
        
        // Listen for app update
        wb.addEventListener('installed', (event) => {
          if (event.isUpdate) {
            console.log('App has been updated');
            info(t('pwa.updateInstalled'));
          }
        });
        
        // Register the service worker
        wb.register();
        
      } catch (error) {
        console.error('Error setting up PWA update:', error);
      }
    }
  };
  
  const applyUpdate = async () => {
    if (updateSW) {
      isUpdating.value = true;
      try {
        await updateSW();
        // The controlling event listener will handle the reload
      } catch (error) {
        console.error('Error applying update:', error);
        isUpdating.value = false;
      }
    }
  };
  
  const dismissUpdate = () => {
    showUpdatePrompt.value = false;
    updateAvailable.value = false;
  };

  // For testing purposes only: simulate an update and trigger the prompt
  const simulateUpdateAndReload = () => {
    updateSW = () => {
      window.location.reload();
      return Promise.resolve();
    };
    showUpdatePrompt.value = true;
  };

  onMounted(() => {
    // Only check for updates when not in Tauri
    if (!(window as any).__TAURI__) {
      checkForUpdates();
    }
  });
  
  return {
    showUpdatePrompt,
    updateAvailable,
    isUpdating,
    applyUpdate,
    dismissUpdate,
    ...(import.meta.env.DEV ? { simulateUpdateAndReload } : {})
  };
}