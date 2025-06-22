import { ref, onMounted } from 'vue'

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
      }

      platformInfo.value = {
        platform: tauriInfo.platform as any,
        arch: tauriInfo.arch,
        isNative: tauriInfo.is_native,
        isTauri: true,
        isPWA: false,
        isMobile: false,
        isDesktop: true
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