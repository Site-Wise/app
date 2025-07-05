import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Check if building for Tauri
const isTauri = process.env.TAURI_PLATFORM !== undefined

// https://vitejs.dev/config/
export default defineConfig({
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
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
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
        ],
        // Remove problematic options that might cause the AJV validation error
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true // Enable PWA in development for testing
      }
    })])
  ],
  // Ensure proper configuration for both environments
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    rollupOptions: {
      external: isTauri ? [] : ['@tauri-apps/api/tauri']
    }
  },
  css: {
    postcss: './postcss.config.js', // if you're using PostCSS
  },
})