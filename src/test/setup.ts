import { vi } from 'vitest'

// Mock PocketBase - using a class for proper constructor behavior in Vitest v4
vi.mock('pocketbase', () => {
  class MockPocketBase {
    authStore = {
      isValid: false,
      model: null,
      clear: vi.fn(),
    }
    baseUrl = 'http://localhost:8090'

    collection = vi.fn(() => ({
      getFullList: vi.fn(),
      getOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      authWithPassword: vi.fn(),
      getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
    }))

    autoCancellation = vi.fn()
  }

  return {
    default: MockPocketBase
  }
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ServiceWorkerRegistration for background sync
const mockServiceWorkerRegistration = {
  prototype: {},
  sync: {
    register: vi.fn()
  }
}

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: {
      register: vi.fn(),
      ready: Promise.resolve({
        sync: {
          register: vi.fn()
        }
      })
    }
  },
  writable: true,
})

// Mock ServiceWorkerRegistration
Object.defineProperty(window, 'ServiceWorkerRegistration', {
  value: mockServiceWorkerRegistration,
  writable: true,
})

// Mock window.alert and confirm
window.alert = vi.fn()
window.confirm = vi.fn(() => true)

// Mock URL.createObjectURL
window.URL.createObjectURL = vi.fn(() => 'mock-url')

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}))

// Mock Tauri Core API (for useNativeNotifications)
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((command: string) => {
    if (command === 'get_platform_info') {
      return Promise.resolve({ os: 'test', arch: 'test' })
    }
    if (command === 'show_notification') {
      return Promise.resolve()
    }
    return Promise.resolve()
  })
}))

// Mock window.Notification
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    close: vi.fn()
  }))
})

// Add requestPermission as a static method
window.Notification.requestPermission = vi.fn().mockResolvedValue('granted')
window.Notification.permission = 'default'

// Mock virtual:pwa-register/vue
vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW: () => ({
    needRefresh: { value: false },
    updateServiceWorker: vi.fn()
  })
}))