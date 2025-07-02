import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LoginView from '../../views/LoginView.vue'
import { createMockRouter } from '../utils/test-utils'
import { setupTestPinia } from '../utils/test-setup'

// Mock components
vi.mock('../../components/TurnstileWidget.vue', () => ({
  default: {
    name: 'TurnstileWidget',
    template: '<div class="mock-turnstile" />',
    emits: ['success', 'error', 'expired'],
    methods: {
      reset: vi.fn()
    }
  }
}))

vi.mock('../../components/LegalModal.vue', () => ({
  default: {
    name: 'LegalModal',
    template: '<div class="mock-legal-modal" />',
    props: ['isVisible', 'type'],
    emits: ['close']
  }
}))

// Mock Auth composable
const mockLogin = vi.fn()
const mockRegister = vi.fn()
vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister
  })
}))

// Mock Site composable
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    loadUserSites: vi.fn().mockResolvedValue(undefined)
  })
}))

// Mock Theme composable
vi.mock('../../composables/useTheme', () => ({
  useTheme: () => ({
    isDark: { value: false }
  })
}))

// Mock i18n
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.loginTitle': 'Sign In',
        'auth.registerTitle': 'Create Account',
        'auth.loginSubtitle': 'Sign in to your account',
        'auth.registerSubtitle': 'Create your account',
        'auth.signIn': 'Sign In',
        'auth.createAccount': 'Create Account',
        'auth.email': 'Email address',
        'auth.password': 'Password',
        'auth.fullName': 'Full Name',
        'auth.phoneNumber': 'Phone Number',
        'auth.couponCode': 'Coupon Code',
        'auth.confirmPassword': 'Confirm Password',
        'auth.backToLogin': 'Back to Login',
        'auth.signingIn': 'Signing in...',
        'auth.loginFailed': 'Login failed',
        'auth.registrationFailed': 'Registration failed',
        'auth.turnstileRequired': 'Please complete the security check',
        'auth.passwordsDoNotMatch': 'Passwords do not match',
        'forms.enterEmail': 'Enter your email',
        'forms.enterPassword': 'Enter your password',
        'forms.enterFullName': 'Enter your full name',
        'forms.enterPhoneNumber': 'Enter phone number',
        'forms.enterCouponCode': 'Enter coupon code',
        'forms.createPassword': 'Create a password',
        'forms.confirmPassword': 'Confirm your password',
        'forms.optional': 'optional',
        'messages.error': 'An error occurred'
      }
      return translations[key] || key
    }
  })
}))

describe('LoginComponent', () => {
  let wrapper: any
  let router: any
  let pinia: any
  let siteStore: any
  let mockPush: any

  beforeEach(() => {
    vi.clearAllMocks()
    const { pinia: testPinia, siteStore: testSiteStore } = setupTestPinia()
    pinia = testPinia
    siteStore = testSiteStore
    router = createMockRouter()
    mockPush = vi.fn()
    router.push = mockPush

    // Set environment variables for Turnstile
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.unstubAllEnvs()
  })

  const createWrapper = () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          'AlertCircle': true,
          'Loader2': true,
          'TurnstileWidget': true,
          'LegalModal': true
        }
      }
    })
    
    // Mock the turnstile refs after mount to avoid reset errors
    wrapper.vm.loginTurnstileRef = { value: { reset: vi.fn() } }
    wrapper.vm.registerTurnstileRef = { value: { reset: vi.fn() } }
    
    return wrapper
  }

  describe('Component Initialization', () => {
    it('renders login form by default', async () => {
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.find('#email').exists()).toBe(true)
      expect(wrapper.find('#password').exists()).toBe(true)
      expect(wrapper.text()).toContain('Sign In')
    })

    it('switches to registration form when register tab is clicked', async () => {
      wrapper = createWrapper()
      await nextTick()

      const registerTab = wrapper.findAll('button').find((btn: any) => 
        btn.text().includes('Create Account')
      )
      await registerTab.trigger('click')
      await nextTick()

      expect(wrapper.find('#reg-name').exists()).toBe(true)
      expect(wrapper.find('#reg-email').exists()).toBe(true)
      expect(wrapper.find('#reg-phone').exists()).toBe(true)
    })
  })

  describe('Login Functionality', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('calls login with correct credentials when form is submitted', async () => {
      mockLogin.mockResolvedValue({ success: true })
      
      // Set form values directly on component
      wrapper.vm.form.email = 'test@example.com'
      wrapper.vm.form.password = 'password123'
      wrapper.vm.turnstileToken = 'mock-token'
      
      await wrapper.vm.handleLogin()
      
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', 'mock-token')
    })

    it('redirects to home page on successful login', async () => {
      mockLogin.mockResolvedValue({ success: true })
      
      wrapper.vm.form.email = 'test@example.com'
      wrapper.vm.form.password = 'password123'
      wrapper.vm.turnstileToken = 'mock-token'
      
      await wrapper.vm.handleLogin()
      
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('displays error message on login failure', async () => {
      mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' })
      
      wrapper.vm.form.email = 'test@example.com'
      wrapper.vm.form.password = 'wrongpassword'
      wrapper.vm.turnstileToken = 'mock-token'
      
      await wrapper.vm.handleLogin()
      await nextTick()
      
      expect(wrapper.vm.error).toBe('Invalid credentials')
      expect(wrapper.text()).toContain('Invalid credentials')
    })

    it('shows loading state during login', async () => {
      let resolveLogin: any
      const loginPromise = new Promise(resolve => { resolveLogin = resolve })
      mockLogin.mockReturnValue(loginPromise)
      
      wrapper.vm.form.email = 'test@example.com'
      wrapper.vm.form.password = 'password123'
      wrapper.vm.turnstileToken = 'mock-token'
      
      const loginPromiseCall = wrapper.vm.handleLogin()
      await nextTick()
      
      expect(wrapper.vm.loading).toBe(true)
      
      resolveLogin({ success: true })
      await loginPromiseCall
      
      expect(wrapper.vm.loading).toBe(false)
    })

    it('handles login exceptions', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'))
      
      wrapper.vm.form.email = 'test@example.com'
      wrapper.vm.form.password = 'password123'
      wrapper.vm.turnstileToken = 'mock-token'
      
      await wrapper.vm.handleLogin()
      await nextTick()
      
      expect(wrapper.vm.error).toBe('Network error')
    })
  })

  describe('Registration Functionality', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      // Switch to register tab
      wrapper.vm.activeTab = 'register'
      await nextTick()
    })

    it('calls register with correct data when registration form is submitted', async () => {
      mockRegister.mockResolvedValue({ success: true })
      mockLogin.mockResolvedValue({ success: true })
      
      // Set form values directly on component
      wrapper.vm.registerForm.name = 'John Doe'
      wrapper.vm.registerForm.email = 'john@example.com'
      wrapper.vm.registerForm.phone = '9876543210'
      wrapper.vm.registerForm.password = 'password123'
      wrapper.vm.registerForm.confirmPassword = 'password123'
      wrapper.vm.registerForm.legalAccepted = true
      wrapper.vm.registerTurnstileToken = 'mock-token'
      
      await wrapper.vm.handleRegister()
      
      expect(mockRegister).toHaveBeenCalledWith(
        'john@example.com',
        'password123',
        'John Doe',
        'mock-token',
        '9876543210',
        '+91',
        '',
        true
      )
    })

    it('auto-logs in user after successful registration', async () => {
      mockRegister.mockResolvedValue({ success: true })
      mockLogin.mockResolvedValue({ success: true })
      
      wrapper.vm.registerForm.name = 'John Doe'
      wrapper.vm.registerForm.email = 'john@example.com'
      wrapper.vm.registerForm.phone = '9876543210'
      wrapper.vm.registerForm.password = 'password123'
      wrapper.vm.registerForm.confirmPassword = 'password123'
      wrapper.vm.registerForm.legalAccepted = true
      wrapper.vm.registerTurnstileToken = 'mock-token'
      
      await wrapper.vm.handleRegister()
      
      expect(mockLogin).toHaveBeenCalledWith('john@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('displays error message on registration failure', async () => {
      mockRegister.mockResolvedValue({ success: false, error: 'Email already exists' })
      
      wrapper.vm.registerForm.name = 'John Doe'
      wrapper.vm.registerForm.email = 'john@example.com'
      wrapper.vm.registerForm.phone = '9876543210'
      wrapper.vm.registerForm.password = 'password123'
      wrapper.vm.registerForm.confirmPassword = 'password123'
      wrapper.vm.registerForm.legalAccepted = true
      wrapper.vm.registerTurnstileToken = 'mock-token'
      
      await wrapper.vm.handleRegister()
      await nextTick()
      
      expect(wrapper.vm.error).toBe('Email already exists')
      expect(wrapper.text()).toContain('Email already exists')
    })

    it('shows loading state during registration', async () => {
      let resolveRegister: any
      const registerPromise = new Promise(resolve => { resolveRegister = resolve })
      mockRegister.mockReturnValue(registerPromise)
      
      wrapper.vm.registerForm.name = 'John Doe'
      wrapper.vm.registerForm.email = 'john@example.com'
      wrapper.vm.registerForm.phone = '9876543210'
      wrapper.vm.registerForm.password = 'password123'
      wrapper.vm.registerForm.confirmPassword = 'password123'
      wrapper.vm.registerForm.legalAccepted = true
      wrapper.vm.registerTurnstileToken = 'mock-token'
      
      const registerPromiseCall = wrapper.vm.handleRegister()
      await nextTick()
      
      expect(wrapper.vm.registerLoading).toBe(true)
      
      resolveRegister({ success: true })
      await registerPromiseCall
      
      expect(wrapper.vm.registerLoading).toBe(false)
    })

    it('hides register form when back to login button is clicked', async () => {
      const backButton = wrapper.findAll('button').find((btn: any) => 
        btn.text().includes('Back to Login')
      )
      await backButton.trigger('click')
      await nextTick()
      
      expect(wrapper.vm.activeTab).toBe('login')
      expect(wrapper.find('#email').exists()).toBe(true)
    })

    it('handles registration exceptions', async () => {
      mockRegister.mockRejectedValue(new Error('Server error'))
      
      wrapper.vm.registerForm.name = 'John Doe'
      wrapper.vm.registerForm.email = 'john@example.com'
      wrapper.vm.registerForm.phone = '9876543210'
      wrapper.vm.registerForm.password = 'password123'
      wrapper.vm.registerForm.confirmPassword = 'password123'
      wrapper.vm.registerForm.legalAccepted = true
      wrapper.vm.registerTurnstileToken = 'mock-token'
      
      await wrapper.vm.handleRegister()
      await nextTick()
      
      expect(wrapper.vm.error).toBe('Server error')
      expect(wrapper.text()).toContain('Server error')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('clears error when starting new login attempt', async () => {
      wrapper.vm.error = 'Previous error'
      
      wrapper.vm.form.email = 'test@example.com'
      wrapper.vm.form.password = 'password123'
      wrapper.vm.turnstileToken = 'mock-token'
      
      mockLogin.mockResolvedValue({ success: true })
      await wrapper.vm.handleLogin()
      
      expect(wrapper.vm.error).toBe('')
    })

    it('displays generic error message for login errors without specific message', async () => {
      mockLogin.mockResolvedValue({ success: false })
      
      wrapper.vm.form.email = 'test@example.com'
      wrapper.vm.form.password = 'password123'
      wrapper.vm.turnstileToken = 'mock-token'
      
      await wrapper.vm.handleLogin()
      await nextTick()
      
      expect(wrapper.vm.error).toBe('Login failed')
      expect(wrapper.text()).toContain('Login failed')
    })

    it('displays generic error message for registration errors without specific message', async () => {
      mockRegister.mockResolvedValue({ success: false })
      
      wrapper.vm.activeTab = 'register'
      wrapper.vm.registerForm.name = 'John Doe'
      wrapper.vm.registerForm.email = 'john@example.com'
      wrapper.vm.registerForm.phone = '9876543210'
      wrapper.vm.registerForm.password = 'password123'
      wrapper.vm.registerForm.confirmPassword = 'password123'
      wrapper.vm.registerForm.legalAccepted = true
      wrapper.vm.registerTurnstileToken = 'mock-token'
      
      await wrapper.vm.handleRegister()
      await nextTick()
      
      expect(wrapper.vm.error).toBe('Registration failed')
      expect(wrapper.text()).toContain('Registration failed')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('has proper labels for form inputs', async () => {
      // Login form
      expect(wrapper.find('label[for="email"]').exists()).toBe(true)
      expect(wrapper.find('label[for="password"]').exists()).toBe(true)
      
      // Switch to register tab
      wrapper.vm.activeTab = 'register'
      await nextTick()
      
      expect(wrapper.find('label[for="reg-name"]').exists()).toBe(true)
      expect(wrapper.find('label[for="reg-email"]').exists()).toBe(true)
      expect(wrapper.find('label[for="reg-phone"]').exists()).toBe(true)
    })

    it('has proper autocomplete attributes', async () => {
      const emailInput = wrapper.find('#email')
      const passwordInput = wrapper.find('#password')
      
      expect(emailInput.attributes('autocomplete')).toBe('email')
      expect(passwordInput.attributes('autocomplete')).toBe('current-password')
    })

    it('uses proper input types', async () => {
      expect(wrapper.find('#email').attributes('type')).toBe('email')
      expect(wrapper.find('#password').attributes('type')).toBe('password')
      
      wrapper.vm.activeTab = 'register'
      await nextTick()
      
      expect(wrapper.find('#reg-email').attributes('type')).toBe('email')
      expect(wrapper.find('#reg-phone').attributes('type')).toBe('tel')
      expect(wrapper.find('#reg-password').attributes('type')).toBe('password')
      expect(wrapper.find('#reg-confirm-password').attributes('type')).toBe('password')
    })
  })
})