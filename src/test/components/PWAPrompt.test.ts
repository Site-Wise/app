import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { nextTick } from 'vue'
import PWAPrompt from '../../components/PWAPrompt.vue'

const mockInstallApp = vi.fn()
const mockApplyUpdate = vi.fn()

// Mock reactive PWA state
const mockIsInstallable = ref(false)
const mockShowUpdatePrompt = ref(false)
const mockIsOnline = ref(true)

// Mock the usePWA composable
vi.mock('../../composables/usePWA', () => ({
  usePWA: () => ({
    isInstallable: mockIsInstallable,
    isOnline: mockIsOnline,
    installApp: mockInstallApp
  })
}))

// Mock the usePWAUpdate composable
vi.mock('../../composables/usePWAUpdate', () => ({
  usePWAUpdate: () => ({
    showUpdatePrompt: mockShowUpdatePrompt,
    applyUpdate: mockApplyUpdate
  })
}))

// Mock the useI18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('PWAPrompt', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock state
    mockIsInstallable.value = false
    mockShowUpdatePrompt.value = false
    mockIsOnline.value = true
    
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Install Prompt', () => {
    it('should render install prompt when installable and not dismissed', async () => {
      mockIsInstallable.value = true
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(true)
      expect(wrapper.text()).toContain('pwa.installTitle')
      expect(wrapper.text()).toContain('pwa.installMessage')
    })

    it('should not render install prompt when not installable', async () => {
      mockIsInstallable.value = false
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(false)
    })

    it('should hide install prompt when dismissed', async () => {
      mockIsInstallable.value = true
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      // Initially visible
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(true)
      
      // Dismiss the prompt by clicking the close button
      const closeButton = wrapper.find('.text-gray-400')
      await closeButton.trigger('click')
      await nextTick()
      
      // Should be hidden
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(false)
    })

    it('should call installApp when install button is clicked', async () => {
      mockIsInstallable.value = true
      mockInstallApp.mockResolvedValue(true)
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      const buttons = wrapper.findAll('button')
      const installButton = buttons.find((btn: any) => btn.text().includes('pwa.install'))
      
      expect(installButton).toBeDefined()
      
      await installButton!.trigger('click')
      expect(mockInstallApp).toHaveBeenCalledOnce()
    })

    it('should show loading state during installation', async () => {
      mockIsInstallable.value = true
      let resolveInstall: any
      mockInstallApp.mockImplementation(() => new Promise(resolve => {
        resolveInstall = resolve
      }))
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      const buttons = wrapper.findAll('button')
      const installButton = buttons.find((btn: any) => btn.text().includes('pwa.install'))
      
      await installButton!.trigger('click')
      await nextTick()
      
      // Should show loading text
      expect(wrapper.text()).toContain('pwa.installing')
      
      // Resolve the promise
      resolveInstall(true)
      await nextTick()
    })

    it('should dismiss prompt after successful installation', async () => {
      mockIsInstallable.value = true
      mockInstallApp.mockResolvedValue(true)
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      const buttons = wrapper.findAll('button')
      const installButton = buttons.find((btn: any) => btn.text().includes('pwa.install'))
      
      await installButton!.trigger('click')
      await nextTick()
      
      // Should be dismissed after successful installation
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(false)
    })

    it('should remember dismissal in session storage', async () => {
      mockIsInstallable.value = true
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      const laterButton = wrapper.findAll('button').find((btn: any) => btn.text().includes('pwa.later'))
      await laterButton!.trigger('click')
      
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', 'true')
    })

    it('should not show install prompt if previously dismissed in session', async () => {
      vi.mocked(window.sessionStorage.getItem).mockReturnValue('true')
      mockIsInstallable.value = true
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      // Should not show prompt if previously dismissed
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(false)
    })
  })

  describe('Update Prompt Delegation', () => {
    // Note: Update prompts are handled by PWAUpdateNotification component
    // PWAPrompt only handles install prompts and offline indicator

    it('should not render update prompt (handled by PWAUpdateNotification)', async () => {
      mockShowUpdatePrompt.value = true

      wrapper = mount(PWAPrompt)
      await nextTick()

      // PWAPrompt does not render update prompts - they are handled by PWAUpdateNotification
      // The .fixed.top-4 selector for updates should NOT exist in PWAPrompt
      // Only offline indicator uses top-4, but it has different classes (from-yellow-50)
      expect(wrapper.find('.fixed.top-4.from-white').exists()).toBe(false)
    })
  })

  describe('Offline Indicator', () => {
    it('should render offline indicator when offline', async () => {
      mockIsOnline.value = false
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      expect(wrapper.find('.from-yellow-50').exists()).toBe(true)
      expect(wrapper.text()).toContain('pwa.youreOffline')
    })

    it('should not render offline indicator when online', async () => {
      mockIsOnline.value = true
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      expect(wrapper.find('.from-yellow-50').exists()).toBe(false)
    })

    it('should have correct positioning for offline indicator', async () => {
      mockIsOnline.value = false
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      const offlineIndicator = wrapper.find('.from-yellow-50')
      expect(offlineIndicator.classes()).toContain('fixed')
      expect(offlineIndicator.classes()).toContain('top-4')
      expect(offlineIndicator.classes()).toContain('left-1/2')
      expect(offlineIndicator.classes()).toContain('transform')
      expect(offlineIndicator.classes()).toContain('-translate-x-1/2')
    })
  })

  describe('Error Handling', () => {
    it('should handle installation errors gracefully', async () => {
      mockIsInstallable.value = true
      mockInstallApp.mockRejectedValue(new Error('Installation failed'))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      const buttons = wrapper.findAll('button')
      const installButton = buttons.find((btn: any) => btn.text().includes('pwa.install'))
      
      await installButton!.trigger('click')
      await nextTick()
      
      // Should log error and not crash
      expect(consoleSpy).toHaveBeenCalledWith('Failed to install app:', expect.any(Error))
      expect(wrapper.exists()).toBe(true)
      
      consoleSpy.mockRestore()
    })

    // Note: Update error handling is tested in PWAUpdateNotification.test.ts
    // PWAPrompt does not handle update functionality
  })

  describe('Responsive Design', () => {
    it('should have responsive classes for install prompt', async () => {
      mockIsInstallable.value = true
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      const installPrompt = wrapper.find('.fixed.bottom-4')
      expect(installPrompt.classes()).toContain('left-4')
      expect(installPrompt.classes()).toContain('right-4')
      expect(installPrompt.classes()).toContain('md:left-auto')
      expect(installPrompt.classes()).toContain('md:right-4')
      expect(installPrompt.classes()).toContain('md:w-96')
    })

    // Note: Update prompt responsive classes are tested in PWAUpdateNotification.test.ts
    // PWAPrompt only handles install prompts and offline indicator
  })

  describe('Accessibility', () => {
    it('should have proper button elements for interactions', async () => {
      mockIsInstallable.value = true
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
      
      // Should have install button
      const installButton = buttons.find((btn: any) => btn.text().includes('pwa.install'))
      expect(installButton).toBeDefined()
      
      // Should have later button
      const laterButton = buttons.find((btn: any) => btn.text().includes('pwa.later'))
      expect(laterButton).toBeDefined()
    })

    it('should disable buttons during loading states', async () => {
      mockIsInstallable.value = true
      mockInstallApp.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      wrapper = mount(PWAPrompt)
      await nextTick()
      
      const buttons = wrapper.findAll('button')
      const installButton = buttons.find((btn: any) => btn.text().includes('pwa.install'))
      
      await installButton!.trigger('click')
      await nextTick()
      
      // Button should be disabled during installation
      expect(installButton!.element.disabled).toBe(true)
    })
  })
})