import { ref, onMounted } from 'vue';

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
  
  // Note: Service worker registration is handled by usePWAUpdate composable
  // This composable focuses on install prompts and other PWA features

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

  // Update the app - delegate to usePWAUpdate composable
  const updateApp = async () => {
    // Updates are handled by the usePWAUpdate composable
    console.log('PWA: Update app called - should use usePWAUpdate composable instead');
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
    console.log('🔧 PWA: Initializing PWA features...');
    checkInstallStatus();

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      console.log('🎯 PWA: beforeinstallprompt event received!', e);
      e.preventDefault();
      installPrompt.value = e as BeforeInstallPromptEvent;
      isInstallable.value = true;
      console.log('✅ PWA: App is now installable');
    });

    // Debug: Check if service worker is ready
    if ('serviceWorker' in navigator) {
      console.log('🔧 PWA: Service worker support available');
      navigator.serviceWorker.ready.then((registration) => {
        console.log('✅ PWA: Service worker is ready', registration);
      }).catch((error) => {
        console.error('❌ PWA: Service worker ready error', error);
      });
    } else {
      console.warn('⚠️ PWA: Service worker not supported');
    }

    // Debug: Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      console.log('✅ PWA: Manifest link found', manifestLink.getAttribute('href'));
    } else {
      console.warn('⚠️ PWA: No manifest link found');
    }

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
    installApp,
    updateApp,
    requestNotificationPermission,
    showNotification,
    addToOfflineQueue,
    initializePWA
  };
}