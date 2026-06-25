import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Check if building for Tauri
const isTauri = process.env.TAURI_PLATFORM !== undefined

// When running `tauri [android|ios] dev`, Tauri sets TAURI_DEV_HOST so the
// device/emulator can reach the Vite dev server (and HMR websocket) over the
// network instead of localhost.
const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    vue(),
    // Only include PWA plugin when not building for Tauri
    ...(isTauri ? [] : [VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      disable: false,
      manifest: {
        name: 'SiteWise - Construction Site Management',
        short_name: 'SiteWise',
        description: 'A comprehensive construction site management application for tracking items, vendors, deliveries, and payments',
        theme_color: '#0A0E0D',
        background_color: '#ffffff',
        display: 'standalone',
        id: '/',
        scope: '/',
        start_url: '/',
        handle_links: 'preferred',
        scope_extensions: [
          {
            origin: 'https://app.sitewise.in'
          }
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // clientsClaim ensures the new service worker takes control immediately
        // This helps suppress browser-native update notifications
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Keep the heavy on-demand PDF/export stack out of the first SW-install
        // download (~2 MB). These chunks are only needed when a user actually
        // generates a PDF, so they load at runtime (cached on first use below).
        globIgnores: [
          '**/pdf.worker*',
          '**/pdf-*',
          '**/jspdf*',
          '**/html2canvas*'
        ],
        runtimeCaching: [
          {
            // On-demand PDF/export chunks: cache on first use so subsequent
            // PDF generation works offline, without bloating SW install.
            urlPattern: /\/assets\/(pdf\.worker|pdf-|jspdf|html2canvas).*\.js$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-export-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              }
            }
          },
          {
            urlPattern: /\/api\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true // Enable PWA in development for testing
      }
    })])
  ],
  // For Tauri (desktop + mobile) builds the PWA plugin is disabled, so the
  // `virtual:pwa-register/vue` module it normally provides does not exist.
  // Alias it to a no-op stub so native builds resolve cleanly.
  resolve: {
    alias: isTauri
      ? {
          'virtual:pwa-register/vue': fileURLToPath(
            new URL('./src/stubs/pwa-register.ts', import.meta.url)
          )
        }
      : {}
  },
  // Ensure proper configuration for both environments
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    // Bind to all interfaces only for mobile dev (when TAURI_DEV_HOST is set),
    // otherwise keep the default localhost binding.
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 5174
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    rollupOptions: {
      external: isTauri ? [] : ['@tauri-apps/api/tauri'],
      output: {
        // Split a stable framework vendor chunk (vue, vue-router, pinia,
        // pocketbase) so it caches independently of fast-changing app code.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              /[\\/]node_modules[\\/](@?vue|vue-router|pinia|pocketbase)([\\/]|$)/.test(id)
            ) {
              return 'vendor';
            }
          }
        }
      }
    }
  },
  css: {
    postcss: './postcss.config.js', // if you're using PostCSS
  },
})