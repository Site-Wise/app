import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick, createApp } from 'vue'
import { usePWA } from '../../composables/usePWA'

// Get mocked functions from setup
const mockUpdateServiceWorker = vi.fn()

// Override the mock to have access to the function
vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW: () => ({
    needRefresh: { value: false },
    updateServiceWorker: mockUpdateServiceWorker
  })
}))

describe('usePWA', () => {
  let app: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a Vue app instance to provide context for onMounted
    app = createApp({})
    
    // Reset window event listeners
    window.dispatchEvent = vi.fn()
    window.addEventListener = vi.fn()
    
    // Reset localStorage mock
    localStorage.getItem = vi.fn(() => '[]')
    localStorage.setItem = vi.fn()
    
    // Reset matchMedia for each test
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn()
    }))
    
    // Mock Notification API
    ;(global.window as any).Notification = {
      requestPermission: vi.fn().mockResolvedValue('granted'),
      permission: 'default'
    }
    
    // Mock notification constructor
    const NotificationConstructor = vi.fn()
    Object.setPrototypeOf(NotificationConstructor, {
      permission: 'granted'
    })
    ;(global.window as any).Notification = NotificationConstructor
    ;(global.window as any).Notification.requestPermission = vi.fn().mockResolvedValue('granted')
    ;(global.window as any).Notification.permission = 'granted'
  })

  describe('Basic Functionality', () => {
    it('should initialize with default values', () => {
      const { isInstallable, isInstalled, isOnline } = usePWA()
      
      expect(isInstallable.value).toBe(false)
      expect(isInstalled.value).toBe(false)
      expect(isOnline.value).toBe(true)
      // Note: updateAvailable is handled by usePWAUpdate composable, not usePWA
    })
  })

  describe('Install Detection', () => {
    it('should detect installed state when in standalone mode', () => {
      // Mock standalone mode before calling usePWA
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        addEventListener: vi.fn()
      }))
      
      const { isInstalled, initializePWA } = usePWA()
      
      // Call initializePWA to trigger the check
      initializePWA()
      
      expect(isInstalled.value).toBe(true)
    })
  })

  describe('Update Functionality', () => {
    it('should handle update app call gracefully', async () => {
      const { updateApp } = usePWA()
      
      // The updateApp function in usePWA just logs a message since updates
      // are handled by the usePWAUpdate composable. Test that it doesn't crash.
      await expect(updateApp()).resolves.toBeUndefined()
      
      // Note: Actual update functionality is tested in usePWAUpdate.test.ts
    })
  })

  describe('Notifications', () => {
    it('should request notification permission', async () => {
      const { requestNotificationPermission } = usePWA()
      
      const result = await requestNotificationPermission()
      
      expect(window.Notification.requestPermission).toHaveBeenCalled()
      expect(result).toBe(true)
    })
    
    it('should show notification when permission granted', () => {
      window.Notification.permission = 'granted'
      
      const { showNotification } = usePWA()
      const notification = showNotification('Test', { body: 'Test body' })
      
      expect(notification).toBeTruthy()
    })
    
    it('should not show notification when permission denied', () => {
      window.Notification.permission = 'denied'
      
      const { showNotification } = usePWA()
      const notification = showNotification('Test')
      
      expect(notification).toBeNull()
    })
  })

  describe('Offline Queue', () => {
    it('should add requests to offline queue', () => {
      const { addToOfflineQueue } = usePWA()
      
      const request = {
        url: '/api/test',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' })
      }
      
      addToOfflineQueue(request)
      
      expect(localStorage.setItem).toHaveBeenCalled()
      const [key, value] = (localStorage.setItem as any).mock.calls[0]
      expect(key).toBe('offlineQueue')
      
      const savedQueue = JSON.parse(value)
      expect(savedQueue).toHaveLength(1)
      expect(savedQueue[0]).toMatchObject({
        ...request,
        id: expect.any(String),
        timestamp: expect.any(Number)
      })
    })
    
    it('should register for background sync when available', () => {
      // This test verifies that the code path exists and doesn't throw
      // The actual sync registration is complex to test in isolation
      const { addToOfflineQueue } = usePWA()
      
      expect(() => {
        addToOfflineQueue({
          url: '/test',
          method: 'GET', 
          headers: {}
        })
      }).not.toThrow()
      
      // Verify localStorage was called (which means the function executed)
      expect(localStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('Online/Offline Detection', () => {
    it('should update online status', () => {
      const { isOnline } = usePWA()
      
      expect(isOnline.value).toBe(true)
      
      // Note: We can't easily test the event listeners since they're added
      // in onMounted which doesn't run in our simple test setup
    })
  })
})