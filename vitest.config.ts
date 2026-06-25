import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    // happy-dom fetches real URLs for some DOM operations. Components that trigger
    // anchor/window navigation (e.g. PhotoGallery's download link with target="_blank")
    // or that have image file loading enabled cause happy-dom to fetch the URL against
    // its default origin (http://localhost:3000). With no dev server this fails with
    // ECONNREFUSED, and because vitest runs happy-dom with error-capturing disabled the
    // rejection escapes as an UNHANDLED rejection that intermittently flips the run's
    // exit code to 1 (all tests still pass). Disabling navigation and image file loading
    // prevents these network fetches at the source — tests still mount, render and assert
    // on the DOM, they just never hit the network.
    environmentOptions: {
      happyDOM: {
        settings: {
          enableImageFileLoading: false,
          navigation: {
            disableMainFrameNavigation: true,
            disableChildFrameNavigation: true,
            disableChildPageNavigation: true,
            disableFallbackToSetURL: false
          }
        }
      }
    },
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
    testTimeout: 10000,
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src-tauri',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'coverage/',
        'public/',
        'dev-dist/',
        'external_services/'
      ],
      all: true,
      reportsDirectory: './coverage'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tauri-apps/api/tauri': resolve(__dirname, './src/test/mocks/@tauri-apps/api/tauri.ts'),
      'virtual:pwa-register/vue': resolve(__dirname, './src/test/mocks/virtual-pwa-register.ts')
    }
  }
})