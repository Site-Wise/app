import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePWA } from '../../composables/usePWA'

describe('usePWA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset navigator mocks
    Object.defineProperty(window, 'navigator', {
      value: {
        onLine: true,
        serviceWorker: {
          register: vi.fn().mockResolvedValue({
            addEventListener: vi.fn(),
            installing: null,
            waiting: null
          }),
          addEventListener: vi.fn(),
          ready: Promise.resolve({
            sync: {
              register: vi.fn()
            }
          })
        }
      },
      writable: true,
    })
  })

  it('should initialize PWA features', () => {
    const { isOnline, isInstallable, isInstalled } = usePWA()
    
    expect(isOnline.value).toBe(true)
    expect(isInstallable.value).toBe(false)
    expect(isInstalled.value).toBe(false)
  })

  it('should detect when app is installable', () => {
    const { isInstallable } = usePWA()
    
    // Simulate beforeinstallprompt event
    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' })
    }
    
    window.dispatchEvent(new CustomEvent('beforeinstallprompt', { detail: mockEvent }))
    
    expect(isInstallable.value).toBe(true)
  })

  it('should handle app installation', async () => {
    const { installApp, isInstallable } = usePWA()
    
    // Set up installable state
    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' })
    }
    
    // Manually trigger the install prompt availability
    window.dispatchEvent(new CustomEvent('beforeinstallprompt', { detail: mockEvent }))
    
    const result = await installApp()
    
    expect(result).toBe(false) // Since we don't have the actual event object
  })

  it('should detect online/offline status', () => {
    const { isOnline } = usePWA()
    
    expect(isOnline.value).toBe(true)
    
    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    })
    
    window.dispatchEvent(new Event('offline'))
    
    expect(isOnline.value).toBe(false)
  })

  it('should register service worker', async () => {
    const { initializePWA } = usePWA()
    
    initializePWA()
    
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js')
  })

  it('should request notification permission', async () => {
    const { requestNotificationPermission } = usePWA()
    
    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: {
        requestPermission: vi.fn().mockResolvedValue('granted')
      },
      writable: true
    })
    
    const result = await requestNotificationPermission()
    
    expect(result).toBe(true)
    expect(window.Notification.requestPermission).toHaveBeenCalled()
  })

  it('should show notification when permission granted', () => {
    const { showNotification } = usePWA()
    
    // Mock Notification constructor
    const mockNotification = vi.fn()
    Object.defineProperty(window, 'Notification', {
      value: mockNotification,
      writable: true
    })
    Object.defineProperty(window.Notification, 'permission', {
      value: 'granted',
      writable: true
    })
    
    showNotification('Test Title', { body: 'Test Body' })
    
    expect(mockNotification).toHaveBeenCalledWith('Test Title', {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      body: 'Test Body'
    })
  })

  it('should add items to offline queue', () => {
    const { addToOfflineQueue } = usePWA()
    
    const request = {
      url: '/api/items',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Item' })
    }
    
    addToOfflineQueue(request)
    
    const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
    expect(offlineQueue).toHaveLength(1)
    expect(offlineQueue[0]).toMatchObject(request)
  })
})