import { vi } from 'vitest'

// Mock PocketBase
vi.mock('pocketbase', () => {
  const mockPB = {
    authStore: {
      isValid: false,
      model: null,
      clear: vi.fn(),
    },
    collection: vi.fn(() => ({
      getFullList: vi.fn(),
      getOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      authWithPassword: vi.fn(),
    })),
    autoCancellation: vi.fn(),
    baseUrl: 'http://localhost:8090'
  }
  
  return {
    default: vi.fn(() => mockPB)
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

// Mock window.alert and confirm
window.alert = vi.fn()
window.confirm = vi.fn(() => true)

// Mock URL.createObjectURL
window.URL.createObjectURL = vi.fn(() => 'mock-url')

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
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