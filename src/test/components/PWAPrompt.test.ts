import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import PWAPrompt from '../../components/PWAPrompt.vue'

const mockInstallApp = vi.fn()
const mockUpdateApp = vi.fn()

// Mock the usePWA composable
vi.mock('../../composables/usePWA', () => ({
  usePWA: () => ({
    isInstallable: computed(() => true),
    updateAvailable: computed(() => false),
    isOnline: computed(() => true),
    installApp: mockInstallApp,
    updateApp: mockUpdateApp
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
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Install Prompt', () => {
    it('should render install prompt when installable', () => {
      wrapper = mount(PWAPrompt)
      
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(true)
      expect(wrapper.text()).toContain('pwa.installTitle')
      expect(wrapper.text()).toContain('pwa.installMessage')
      expect(wrapper.text()).toContain('pwa.install')
    })

    it('should not render install prompt when not installable', async () => {
      // Mock not installable
      vi.mocked(await import('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => false),
        updateAvailable: computed(() => false),
        isOnline: computed(() => true),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
      
      wrapper = mount(PWAPrompt)
      
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(false)
    })

    it('should not render install prompt when dismissed', () => {
      wrapper = mount(PWAPrompt)
      
      // Dismiss the prompt
      wrapper.vm.dismissed = true
      wrapper.vm.$nextTick(() => {
        expect(wrapper.find('.fixed.bottom-4').exists()).toBe(false)
      })
    })

    it('should show app logo and title', () => {
      wrapper = mount(PWAPrompt)
      
      const logo = wrapper.findComponent({ name: 'HardHat' })
      expect(logo.exists()).toBe(true)
      expect(logo.classes()).toContain('text-primary-600')
    })

    it('should have install button with proper styling', () => {
      wrapper = mount(PWAPrompt)
      
      const installButton = wrapper.find('button:contains("pwa.install")')
      expect(installButton.exists()).toBe(true)
      expect(installButton.classes()).toContain('bg-primary-600')
      expect(installButton.classes()).toContain('hover:bg-primary-700')
    })

    it('should have later button', () => {
      wrapper = mount(PWAPrompt)
      
      const laterButton = wrapper.find('button:contains("pwa.later")')
      expect(laterButton.exists()).toBe(true)
      expect(laterButton.classes()).toContain('border-gray-300')
    })

    it('should have close button', () => {
      wrapper = mount(PWAPrompt)
      
      const closeButton = wrapper.find('.text-gray-400')
      expect(closeButton.exists()).toBe(true)
      
      const xIcon = closeButton.findComponent({ name: 'X' })
      expect(xIcon.exists()).toBe(true)
    })
  })

  describe('Install Functionality', () => {
    it('should call installApp when install button is clicked', async () => {
      mockInstallApp.mockResolvedValue(true)
      
      wrapper = mount(PWAPrompt)
      
      const installButton = wrapper.find('button:contains("pwa.install")')
      await installButton.trigger('click')
      
      expect(mockInstallApp).toHaveBeenCalled()
    })

    it('should show loading state during installation', async () => {
      mockInstallApp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      wrapper = mount(PWAPrompt)
      
      const installButton = wrapper.find('button:contains("pwa.install")')
      await installButton.trigger('click')
      
      expect(wrapper.vm.installing).toBe(true)
      expect(installButton.attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('pwa.installing')
      
      const loader = wrapper.findComponent({ name: 'Loader2' })
      expect(loader.exists()).toBe(true)
      expect(loader.classes()).toContain('animate-spin')
    })

    it('should dismiss prompt after successful installation', async () => {
      mockInstallApp.mockResolvedValue(true)
      
      wrapper = mount(PWAPrompt)
      
      const installButton = wrapper.find('button:contains("pwa.install")')
      await installButton.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.dismissed).toBe(true)
    })

    it('should not dismiss prompt if installation fails', async () => {
      mockInstallApp.mockResolvedValue(false)
      
      wrapper = mount(PWAPrompt)
      
      const installButton = wrapper.find('button:contains("pwa.install")')
      await installButton.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.dismissed).toBe(false)
    })

    it('should handle installation errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockInstallApp.mockRejectedValue(new Error('Installation failed'))
      
      wrapper = mount(PWAPrompt)
      
      const installButton = wrapper.find('button:contains("pwa.install")')
      await installButton.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to install app:', expect.any(Error))
      expect(wrapper.vm.installing).toBe(false)
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Dismiss Functionality', () => {
    it('should dismiss prompt when later button is clicked', async () => {
      wrapper = mount(PWAPrompt)
      
      const laterButton = wrapper.find('button:contains("pwa.later")')
      await laterButton.trigger('click')
      
      expect(wrapper.vm.dismissed).toBe(true)
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', 'true')
    })

    it('should dismiss prompt when close button is clicked', async () => {
      wrapper = mount(PWAPrompt)
      
      const closeButton = wrapper.find('.text-gray-400')
      await closeButton.trigger('click')
      
      expect(wrapper.vm.dismissed).toBe(true)
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', 'true')
    })

    it('should remember dismissal from session storage', () => {
      vi.mocked(window.sessionStorage.getItem).mockReturnValue('true')
      
      wrapper = mount(PWAPrompt)
      
      expect(wrapper.vm.dismissed).toBe(true)
    })
  })

  describe('Update Prompt', () => {
    beforeEach(() => {
      // Mock update available
      vi.mocked(require('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => false),
        updateAvailable: computed(() => true),
        isOnline: computed(() => true),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
    })

    it('should render update prompt when update is available', () => {
      wrapper = mount(PWAPrompt)
      
      expect(wrapper.find('.fixed.top-4').exists()).toBe(true)
      expect(wrapper.text()).toContain('pwa.updateTitle')
      expect(wrapper.text()).toContain('pwa.updateMessage')
      expect(wrapper.text()).toContain('pwa.updateNow')
    })

    it('should not render update prompt when dismissed', () => {
      wrapper = mount(PWAPrompt)
      
      wrapper.vm.updateDismissed = true
      wrapper.vm.$nextTick(() => {
        expect(wrapper.find('.fixed.top-4').exists()).toBe(false)
      })
    })

    it('should have blue styling for update prompt', () => {
      wrapper = mount(PWAPrompt)
      
      const updatePrompt = wrapper.find('.bg-blue-50')
      expect(updatePrompt.exists()).toBe(true)
      expect(updatePrompt.classes()).toContain('border-blue-200')
      
      const updateButton = wrapper.find('button:contains("pwa.updateNow")')
      expect(updateButton.classes()).toContain('bg-blue-600')
      expect(updateButton.classes()).toContain('hover:bg-blue-700')
    })

    it('should show refresh icon', () => {
      wrapper = mount(PWAPrompt)
      
      const refreshIcon = wrapper.findComponent({ name: 'RefreshCw' })
      expect(refreshIcon.exists()).toBe(true)
      expect(refreshIcon.classes()).toContain('text-blue-600')
    })
  })

  describe('Update Functionality', () => {
    beforeEach(() => {
      vi.mocked(require('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => false),
        updateAvailable: computed(() => true),
        isOnline: computed(() => true),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
    })

    it('should call updateApp when update button is clicked', async () => {
      mockUpdateApp.mockResolvedValue(undefined)
      
      wrapper = mount(PWAPrompt)
      
      const updateButton = wrapper.find('button:contains("pwa.updateNow")')
      await updateButton.trigger('click')
      
      expect(mockUpdateApp).toHaveBeenCalled()
    })

    it('should show loading state during update', async () => {
      mockUpdateApp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      wrapper = mount(PWAPrompt)
      
      const updateButton = wrapper.find('button:contains("pwa.updateNow")')
      await updateButton.trigger('click')
      
      expect(wrapper.vm.updating).toBe(true)
      expect(updateButton.attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('pwa.updating')
      
      const loader = wrapper.findComponent({ name: 'Loader2' })
      expect(loader.exists()).toBe(true)
    })

    it('should handle update errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockUpdateApp.mockRejectedValue(new Error('Update failed'))
      
      wrapper = mount(PWAPrompt)
      
      const updateButton = wrapper.find('button:contains("pwa.updateNow")')
      await updateButton.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update app:', expect.any(Error))
      expect(wrapper.vm.updating).toBe(false)
      
      consoleErrorSpy.mockRestore()
    })

    it('should dismiss update prompt when later button is clicked', async () => {
      wrapper = mount(PWAPrompt)
      
      const laterButton = wrapper.findAll('button:contains("pwa.later")')[1] // Second later button for update
      await laterButton.trigger('click')
      
      expect(wrapper.vm.updateDismissed).toBe(true)
    })

    it('should dismiss update prompt when close button is clicked', async () => {
      wrapper = mount(PWAPrompt)
      
      const closeButton = wrapper.find('.text-blue-400')
      await closeButton.trigger('click')
      
      expect(wrapper.vm.updateDismissed).toBe(true)
    })
  })

  describe('Offline Indicator', () => {
    beforeEach(() => {
      // Mock offline state
      vi.mocked(require('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => false),
        updateAvailable: computed(() => false),
        isOnline: computed(() => false),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
    })

    it('should render offline indicator when offline', () => {
      wrapper = mount(PWAPrompt)
      
      expect(wrapper.find('.fixed.top-4.left-1\\/2').exists()).toBe(true)
      expect(wrapper.text()).toContain('pwa.youreOffline')
      
      const wifiOffIcon = wrapper.findComponent({ name: 'WifiOff' })
      expect(wifiOffIcon.exists()).toBe(true)
      expect(wifiOffIcon.classes()).toContain('text-yellow-600')
    })

    it('should have yellow styling for offline indicator', () => {
      wrapper = mount(PWAPrompt)
      
      const offlineIndicator = wrapper.find('.bg-yellow-50')
      expect(offlineIndicator.exists()).toBe(true)
      expect(offlineIndicator.classes()).toContain('border-yellow-200')
      expect(offlineIndicator.classes()).toContain('text-yellow-800')
    })

    it('should not render offline indicator when online', async () => {
      // Mock back to online
      vi.mocked(await import('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => false),
        updateAvailable: computed(() => false),
        isOnline: computed(() => true),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
      
      wrapper = mount(PWAPrompt)
      
      expect(wrapper.find('.bg-yellow-50').exists()).toBe(false)
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive positioning for install prompt', () => {
      wrapper = mount(PWAPrompt)
      
      const installPrompt = wrapper.find('.fixed.bottom-4')
      expect(installPrompt.classes()).toContain('left-4')
      expect(installPrompt.classes()).toContain('right-4')
      expect(installPrompt.classes()).toContain('md:left-auto')
      expect(installPrompt.classes()).toContain('md:right-4')
      expect(installPrompt.classes()).toContain('md:w-96')
    })

    it('should have responsive positioning for update prompt', async () => {
      vi.mocked(await import('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => false),
        updateAvailable: computed(() => true),
        isOnline: computed(() => true),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
      
      wrapper = mount(PWAPrompt)
      
      const updatePrompt = wrapper.find('.fixed.top-4')
      expect(updatePrompt.classes()).toContain('left-4')
      expect(updatePrompt.classes()).toContain('right-4')
      expect(updatePrompt.classes()).toContain('md:left-auto')
      expect(updatePrompt.classes()).toContain('md:right-4')
      expect(updatePrompt.classes()).toContain('md:w-96')
    })

    it('should center offline indicator', async () => {
      vi.mocked(await import('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => false),
        updateAvailable: computed(() => false),
        isOnline: computed(() => false),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
      
      wrapper = mount(PWAPrompt)
      
      const offlineIndicator = wrapper.find('.fixed.top-4.left-1\\/2')
      expect(offlineIndicator.classes()).toContain('transform')
      expect(offlineIndicator.classes()).toContain('-translate-x-1/2')
    })
  })

  describe('Animation and Transitions', () => {
    it('should have transition classes', () => {
      wrapper = mount(PWAPrompt)
      
      const installPrompt = wrapper.find('.fixed.bottom-4')
      expect(installPrompt.classes()).toContain('transform')
      expect(installPrompt.classes()).toContain('transition-transform')
      expect(installPrompt.classes()).toContain('duration-300')
    })

    it('should apply correct transform classes based on installable state', async () => {
      wrapper = mount(PWAPrompt)
      
      const installPrompt = wrapper.find('.fixed.bottom-4')
      expect(installPrompt.classes()).toContain('translate-y-0')
      
      // Mock not installable
      vi.mocked(await import('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => false),
        updateAvailable: computed(() => false),
        isOnline: computed(() => true),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
      
      wrapper = mount(PWAPrompt)
      
      // Should not render at all when not installable
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(false)
    })
  })

  describe('Multiple Prompts Handling', () => {
    it('should handle install and update prompts simultaneously', async () => {
      // Mock both install and update available
      vi.mocked(await import('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => true),
        updateAvailable: computed(() => true),
        isOnline: computed(() => true),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
      
      wrapper = mount(PWAPrompt)
      
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(true) // Install prompt
      expect(wrapper.find('.fixed.top-4').exists()).toBe(true) // Update prompt
    })

    it('should handle all three indicators when offline with install and update', async () => {
      vi.mocked(await import('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => true),
        updateAvailable: computed(() => true),
        isOnline: computed(() => false),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
      
      wrapper = mount(PWAPrompt)
      
      expect(wrapper.find('.fixed.bottom-4').exists()).toBe(true) // Install
      expect(wrapper.find('.bg-blue-50').exists()).toBe(true) // Update
      expect(wrapper.find('.bg-yellow-50').exists()).toBe(true) // Offline
    })
  })

  describe('Dark Mode Support', () => {
    it('should have dark mode classes for install prompt', () => {
      wrapper = mount(PWAPrompt)
      
      const installPrompt = wrapper.find('.fixed.bottom-4')
      expect(installPrompt.classes()).toContain('dark:bg-gray-800')
      expect(installPrompt.classes()).toContain('dark:border-gray-700')
    })

    it('should have dark mode classes for update prompt', async () => {
      vi.mocked(await import('../../composables/usePWA')).usePWA = () => ({
        isInstallable: computed(() => false),
        updateAvailable: computed(() => true),
        isOnline: computed(() => true),
        installApp: mockInstallApp,
        updateApp: mockUpdateApp
      })
      
      wrapper = mount(PWAPrompt)
      
      const updatePrompt = wrapper.find('.bg-blue-50')
      expect(updatePrompt.classes()).toContain('dark:bg-blue-900/30')
      expect(updatePrompt.classes()).toContain('dark:border-blue-700')
    })
  })
})