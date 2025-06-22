/// <reference types="vite/client" />
/// <reference path="./types/tauri.d.ts" />

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_ENV: string
  readonly TAURI_PLATFORM?: string
  readonly TAURI_ARCH?: string
  readonly TAURI_FAMILY?: string
  readonly TAURI_PLATFORM_VERSION?: string
  readonly TAURI_PLATFORM_TYPE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend window for PWA detection
interface Window {
  matchMedia(query: string): MediaQueryList
}