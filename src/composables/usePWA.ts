import { ref, onMounted } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
  };
}

export function usePWA() {
  const isInstallable = ref(false);
  const isInstalled = ref(false);
  const isOnline = ref(navigator.onLine);
  const installPrompt = ref<BeforeInstallPromptEvent | null>(null);
  
  // Use Vite PWA plugin's built-in registration
  const {
    needRefresh: updateAvailable,
    updateServiceWorker,
    offlineReady
  } = useRegisterSW({
    immediate: true, // Auto-register on mount
    onRegistered(r) {
      console.log('PWA: Service Worker registered', r);
      // Check for updates periodically (every hour)
      r && setInterval(() => {
        console.log('PWA: Checking for updates...');
        r.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('PWA: Service Worker registration error', error);
    },
    onNeedRefresh() {
      console.log('PWA: New content available, update needed');
      // updateAvailable will be set to true automatically
    },
    onOfflineReady() {
      console.log('PWA: App ready to work offline');
    }
  });

  // Check if app is installed
  const checkInstallStatus = () => {
    // Check if running in standalone mode (installed)
    isInstalled.value = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
  };

  // Install the PWA
  const installApp = async () => {
    if (!installPrompt.value) return false;

    try {
      await installPrompt.value.prompt();
      const choiceResult = await installPrompt.value.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        isInstallable.value = false;
        installPrompt.value = null;
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('PWA: Error during installation:', error);
      return false;
    }
  };

  // Update the app using Vite PWA plugin's built-in functionality
  const updateApp = async () => {
    try {
      // With autoUpdate mode, this will reload the page to apply the update
      await updateServiceWorker(true);
    } catch (error) {
      console.error('PWA: Error updating app:', error);
    }
  };

  // Service worker is automatically registered by Vite PWA plugin

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // Show notification
  const showNotification = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options
      });
    }
    return null;
  };

  // Add to offline queue (for future implementation)
  const addToOfflineQueue = (request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }) => {
    // Store in IndexedDB or localStorage for background sync
    const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    offlineQueue.push({
      ...request,
      id: Date.now().toString(),
      timestamp: Date.now()
    });
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
    
    // Register for background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        const regWithSync = registration as ServiceWorkerRegistrationWithSync;
        if (regWithSync.sync) {
          return regWithSync.sync.register('background-sync-items');
        }
      });
    }
  };

  // Initialize PWA features
  const initializePWA = () => {
    checkInstallStatus();

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      installPrompt.value = e as BeforeInstallPromptEvent;
      isInstallable.value = true;
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true;
      isInstallable.value = false;
      installPrompt.value = null;
    });

    // Listen for online/offline status
    window.addEventListener('online', () => {
      isOnline.value = true;
    });

    window.addEventListener('offline', () => {
      isOnline.value = false;
    });

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      isInstalled.value = e.matches;
    });
  };

  onMounted(() => {
    initializePWA();
  });

  return {
    isInstallable,
    isInstalled,
    isOnline,
    updateAvailable,
    offlineReady,
    installApp,
    updateApp,
    requestNotificationPermission,
    showNotification,
    addToOfflineQueue,
    initializePWA
  };
}