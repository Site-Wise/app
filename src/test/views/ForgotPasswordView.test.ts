import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../utils/test-setup'
import ForgotPasswordView from '../../views/ForgotPasswordView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock i18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.forgotPasswordTitle': 'Forgot your password?',
        'auth.forgotPasswordSubtitle': 'Enter your email address and we\'ll send you a reset link',
        'auth.resetLinkSent': 'Reset link sent!',
        'auth.checkYourEmail': 'Check your email for instructions to reset your password',
        'auth.email': 'Email',
        'forms.enterEmail': 'Enter your email',
        'auth.sendingResetLink': 'Sending...',
        'auth.sendResetLink': 'Send reset link',
        'auth.backToLogin': 'Back to login',
        'forms.emailRequired': 'Email is required',
        'auth.userNotFound': 'No user found with this email address',
        'auth.passwordResetError': 'Failed to send reset link. Please try again.'
      }
      return translations[key] || key
    }
  })
}))

// Mock PocketBase
vi.mock('../../services/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      requestPasswordReset: vi.fn()
    }))
  },
  getCurrentSiteId: vi.fn(() => null),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
  setCurrentUserRole: vi.fn(),
  calculatePermissions: vi.fn().mockReturnValue({
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canManageRoles: true,
    canExport: true,
    canViewFinancials: true
  })
}))

// Mock Lucide icons
vi.mock('lucide-vue-next', () => ({
  AlertCircle: { template: '<span>AlertCircle</span>' },
  CheckCircle: { template: '<span>CheckCircle</span>' },
  Loader2: { template: '<span>Loader2</span>' }
}))

describe('ForgotPasswordView', () => {
  let wrapper: any
  let pinia: any
  let mockRequestPasswordReset: any

  const createWrapper = () => {
    const router = createMockRouter()
    
    return mount(ForgotPasswordView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': {
            template: '<a><slot /></a>',
            props: ['to']
          }
        }
      }
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { pinia: testPinia } = setupTestPinia()
    pinia = testPinia
    
    // Setup PocketBase mock
    const { pb } = await import('../../services/pocketbase')
    mockRequestPasswordReset = vi.fn()
    vi.mocked(pb.collection).mockReturnValue({
      requestPasswordReset: mockRequestPasswordReset
    } as any)
    
    wrapper = createWrapper()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Basic Rendering', () => {
    it('should render the logo and title', () => {
      expect(wrapper.find('img[alt="SiteWise"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('SiteWise')
      expect(wrapper.text()).toContain('Forgot your password?')
    })

    it('should render the subtitle', () => {
      expect(wrapper.text()).toContain('Enter your email address and we\'ll send you a reset link')
    })

    it('should render the email input field', () => {
      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.exists()).toBe(true)
      expect(emailInput.attributes('placeholder')).toBe('Enter your email')
    })

    it('should render the submit button', () => {
      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.exists()).toBe(true)
      expect(submitButton.text()).toBe('Send reset link')
    })

    it('should render the back to login link', () => {
      const links = wrapper.findAll('a')
      const backToLoginLink = links.find((link: any) => link.text().includes('Back to login'))
      expect(backToLoginLink.exists()).toBe(true)
    })
  })

  describe('Form Interaction', () => {
    it('should update email value when typing', async () => {
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      expect(wrapper.vm.email).toBe('test@example.com')
    })

    it('should disable submit button when email is empty', async () => {
      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeDefined()
    })

    it('should enable submit button when email is entered', async () => {
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      await wrapper.vm.$nextTick()
      
      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeUndefined()
    })

    it('should show loading state when submitting', async () => {
      // Setup mock to delay resolution
      mockRequestPasswordReset.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      const form = wrapper.find('form')
      form.trigger('submit')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.loading).toBe(true)
      expect(wrapper.text()).toContain('Sending...')
      
      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 150))
    })
  })

  describe('Password Reset Flow', () => {
    it('should successfully send reset link', async () => {
      mockRequestPasswordReset.mockResolvedValue(true)
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('test@example.com')
      expect(wrapper.vm.emailSent).toBe(true)
      expect(wrapper.text()).toContain('Reset link sent!')
      expect(wrapper.text()).toContain('Check your email for instructions to reset your password')
    })

    it('should hide form after successful submission', async () => {
      mockRequestPasswordReset.mockResolvedValue(true)
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Form should be hidden
      expect(wrapper.find('form').exists()).toBe(false)
      
      // Success message should be shown
      expect(wrapper.find('.bg-green-50').exists()).toBe(true)
    })

    it('should show back to login button after successful submission', async () => {
      mockRequestPasswordReset.mockResolvedValue(true)
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Should show a prominent back to login button
      const backButton = wrapper.find('.btn-outline')
      expect(backButton.exists()).toBe(true)
      expect(backButton.text()).toBe('Back to login')
    })
  })

  describe('Error Handling', () => {
    it('should show error when email is not entered', async () => {
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.error).toBe('Email is required')
      expect(wrapper.text()).toContain('Email is required')
    })

    it('should show user not found error for 400 status', async () => {
      mockRequestPasswordReset.mockRejectedValue({ status: 400 })
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('nonexistent@example.com')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.vm.error).toBe('No user found with this email address')
      expect(wrapper.find('.bg-error-50').exists()).toBe(true)
    })

    it('should show generic error for other failures', async () => {
      mockRequestPasswordReset.mockRejectedValue(new Error('Network error'))
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.vm.error).toBe('Failed to send reset link. Please try again.')
      expect(wrapper.find('.bg-error-50').exists()).toBe(true)
    })

    it('should log errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockRequestPasswordReset.mockRejectedValue(new Error('Test error'))
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(consoleSpy).toHaveBeenCalledWith('Password reset error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should clear error when typing new email', async () => {
      // First create an error
      wrapper.vm.error = 'Some error'
      await wrapper.vm.$nextTick()
      
      // Type new email and check error is cleared on next submission
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('new@example.com')
      
      mockRequestPasswordReset.mockResolvedValue(true)
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      
      // Error should be cleared at start of submission
      expect(wrapper.vm.error).toBe('')
    })
  })

  describe('Loading State', () => {
    it('should disable input during loading', async () => {
      mockRequestPasswordReset.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      const form = wrapper.find('form')
      form.trigger('submit')
      await wrapper.vm.$nextTick()
      
      expect(emailInput.attributes('disabled')).toBeDefined()
      
      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    it('should disable button during loading', async () => {
      mockRequestPasswordReset.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      const form = wrapper.find('form')
      form.trigger('submit')
      await wrapper.vm.$nextTick()
      
      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeDefined()
      
      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    it('should reset loading state after error', async () => {
      mockRequestPasswordReset.mockRejectedValue(new Error('Test error'))
      
      const emailInput = wrapper.find('input[type="email"]')
      await emailInput.setValue('test@example.com')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.vm.loading).toBe(false)
      expect(wrapper.text()).toContain('Send reset link')
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      const label = wrapper.find('label[for="email"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('Email')
    })

    it('should have proper autocomplete attribute', () => {
      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.attributes('autocomplete')).toBe('email')
    })

    it('should have required attribute on email input', () => {
      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.attributes('required')).toBeDefined()
    })
  })
})