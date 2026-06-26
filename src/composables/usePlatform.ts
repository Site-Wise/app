import { ref, onMounted } from 'vue'

/**
 * Synchronous check for whether we are running inside a Tauri webview
 * (desktop or mobile native build). Unlike `usePlatform()` this does not
 * require an async `invoke` round-trip, so it can be used during component
 * setup to gate UI that only makes sense on the web (e.g. the Cloudflare
 * Turnstile widget, which cannot complete its challenge inside a native
 * webview). Tauri v2 always injects `__TAURI_INTERNALS__` into the window.
 */
export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  return '__TAURI_INTERNALS__' in w || '__TAURI__' in w || w.isTauri === true
}

// Dynamically import Tauri API to avoid build issues
async function invokeTauri(command: string, args?: Record<string, any>): Promise<any> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke(command, args)
  } catch {
    throw new Error('Tauri API not available')
  }
}

export interface PlatformInfo {
  platform: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web'
  arch: string
  isNative: boolean
  isTauri: boolean
  isPWA: boolean
  isMobile: boolean
  isDesktop: boolean
}

export function usePlatform() {
  const platformInfo = ref<PlatformInfo>({
    platform: 'web',
    arch: 'unknown',
    isNative: false,
    isTauri: false,
    isPWA: false,
    isMobile: false,
    isDesktop: false
  })

  const isLoading = ref(true)

  onMounted(async () => {
    try {
      // Try to get platform info from Tauri
      const tauriInfo = await invokeTauri('get_platform_info') as {
        platform: string
        arch: string
        is_native: boolean
        is_mobile?: boolean
        is_desktop?: boolean
      }

      // Derive mobile/desktop from the reported OS so Tauri on Android/iOS is
      // correctly classified as mobile (the Rust side also reports these flags).
      const isMobile = tauriInfo.is_mobile ?? (tauriInfo.platform === 'android' || tauriInfo.platform === 'ios')

      platformInfo.value = {
        platform: tauriInfo.platform as any,
        arch: tauriInfo.arch,
        isNative: tauriInfo.is_native,
        isTauri: true,
        isPWA: false,
        isMobile,
        isDesktop: tauriInfo.is_desktop ?? !isMobile
      }
    } catch {
      // Fallback to web platform detection
      const userAgent = (navigator?.userAgent || '').toLowerCase()
      const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || false
      const isInPWA = (window.navigator as any)?.standalone || isStandalone

      let platform: PlatformInfo['platform'] = 'web'
      if (userAgent.includes('android')) platform = 'android'
      else if (userAgent.includes('iphone') || userAgent.includes('ipad')) platform = 'ios'
      else if (userAgent.includes('mac')) platform = 'macos'
      else if (userAgent.includes('win')) platform = 'windows'
      else if (userAgent.includes('linux')) platform = 'linux'

      const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)

      platformInfo.value = {
        platform,
        arch: 'unknown',
        isNative: false,
        isTauri: false,
        isPWA: isInPWA,
        isMobile,
        isDesktop: !isMobile
      }
    }

    isLoading.value = false
  })

  const capabilities = ref({
    get notifications() {
      return platformInfo.value.isTauri || 'Notification' in window
    },
    get filesystem() {
      return platformInfo.value.isTauri
    },
    get systemTray() {
      return platformInfo.value.isTauri && platformInfo.value.isDesktop
    },
    get autoUpdater() {
      return platformInfo.value.isTauri
    },
    get deepLinking() {
      return platformInfo.value.isTauri || platformInfo.value.isPWA
    }
  })

  return {
    platformInfo,
    isLoading,
    capabilities
  }
}