import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
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