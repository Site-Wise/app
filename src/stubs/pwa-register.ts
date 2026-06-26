// Stub for `virtual:pwa-register/vue` used when building for Tauri (desktop and
// mobile/Android). Native builds have no service worker / PWA runtime, so the
// vite-plugin-pwa virtual module is not available. This no-op implementation
// preserves the API surface consumed by `usePWAUpdate.ts` so the app builds and
// runs natively without PWA update logic.
import { ref } from 'vue'

export interface RegisterSWOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: unknown) => void
}

export function useRegisterSW(_options: RegisterSWOptions = {}) {
  return {
    needRefresh: ref(false),
    offlineReady: ref(false),
    updateServiceWorker: async (_reloadPage?: boolean): Promise<void> => {}
  }
}
