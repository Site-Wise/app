import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import LoginComponent from '../../views/LoginView.vue'

// Mock the router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock the auth composable
const mockLogin = vi.fn()
const mockRegister = vi.fn()
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister
  })
}))

// Mock Lucide icons
vi.mock('lucide-vue-next', () => ({
  HardHat: { template: '<div data-testid="hard-hat-icon"></div>' },
  AlertCircle: { template: '<div data-testid="alert-circle-icon"></div>' },
  Loader2: { template: '<div data-testid="loader-icon"></div>' }
}))

describe('LoginComponent', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    wrapper = mount(LoginComponent, {
      global: {
        stubs: {
          HardHat: true,
          AlertCircle: true,
          Loader2: true
        }
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Component Rendering', () => {
    it('renders the login form correctly', () => {
      expect(wrapper.find('h2').text()).toBe('Sign in to ConstructTrack')
      expect(wrapper.find('p').text()).toBe('Manage your construction site efficiently')
      expect(wrapper.find('input[type="email"]').exists()).toBe(true)
      expect(wrapper.find('input[type="password"]').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').text()).toBe('Sign in')
    })

    it('renders the hard hat icon', () => {
      expect(wrapper.find('[data-testid="hard-hat-icon"]').exists()).toBe(true)
    })

    it('does not show register form initially', () => {
      expect(wrapper.find('h3').exists()).toBe(false)
      expect(wrapper.find('input[name="name"]').exists()).toBe(false)
    })

    it('shows register form when "Create new account" is clicked', async () => {
      const buttons = wrapper.findAll('button')
      const createAccountBtn = buttons.find(btn => 
        btn.text() === 'Create new account'
      )
      
      await createAccountBtn!.trigger('click')
      
      expect(wrapper.find('h3').text()).toBe('Create Account')
      expect(wrapper.find('input[name="name"]').exists()).toBe(true)
      expect(wrapper.find('#reg-email').exists()).toBe(true)
      expect(wrapper.find('#reg-password').exists()).toBe(true)
    })
  })

  describe('Form Validation', () => {
    it('requires email and password fields for login', () => {
      const emailInput = wrapper.find('#email')
      const passwordInput = wrapper.find('#password')
      
      expect(emailInput.attributes('required')).toBeDefined()
      expect(passwordInput.attributes('required')).toBeDefined()
      expect(emailInput.attributes('type')).toBe('email')
      expect(passwordInput.attributes('type')).toBe('password')
    })

    it('requires all fields for registration', async () => {
      const buttons = wrapper.findAll('button')
      const createAccountBtn = buttons.find(btn => 
        btn.text() === 'Create new account'
      )
      await createAccountBtn!.trigger('click')
      
      const nameInput = wrapper.find('#reg-name')
      const emailInput = wrapper.find('#reg-email')
      const passwordInput = wrapper.find('#reg-password')
      
      expect(nameInput.attributes('required')).toBeDefined()
      expect(emailInput.attributes('required')).toBeDefined()
      expect(passwordInput.attributes('required')).toBeDefined()
    })
  })

  describe('Login Functionality', () => {
    it('calls login with correct credentials when form is submitted', async () => {
      mockLogin.mockResolvedValue({ success: true })
      
      await wrapper.find('#email').setValue('test@example.com')
      await wrapper.find('#password').setValue('password123')
      
      await wrapper.find('form').trigger('submit.prevent')
      
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })

    it('redirects to home page on successful login', async () => {
      mockLogin.mockResolvedValue({ success: true })
      
      await wrapper.find('#email').setValue('test@example.com')
      await wrapper.find('#password').setValue('password123')
      await wrapper.find('form').trigger('submit.prevent')
      
      await nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('displays error message on login failure', async () => {
      mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' })
      
      await wrapper.find('#email').setValue('test@example.com')
      await wrapper.find('#password').setValue('wrong-password')
      await wrapper.find('form').trigger('submit.prevent')
      
      await nextTick()
      
      expect(wrapper.find('.bg-error-50').exists()).toBe(true)
      expect(wrapper.text()).toContain('Invalid credentials')
    })

    it('shows loading state during login', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      await wrapper.find('#email').setValue('test@example.com')
      await wrapper.find('#password').setValue('password123')
      
      const submitButton = wrapper.find('button[type="submit"]')
      // await submitButton.trigger('click')
      await wrapper.find('form').trigger('submit.prevent')
      
      expect(submitButton.text()).toBe('Signing in...')
      expect(submitButton.attributes('disabled')).toBeDefined()
      expect(wrapper.findComponent({ name: 'Loader2' }).exists()).toBe(false)
    })

    it('handles login exceptions', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'))
      
      await wrapper.find('#email').setValue('test@example.com')
      await wrapper.find('#password').setValue('password123')
      await wrapper.find('form').trigger('submit.prevent')
      
      await nextTick()
      
      expect(wrapper.text()).toContain('Network error')
    })
  })

  describe('Registration Functionality', () => {
    beforeEach(async () => {
      // Show register form for these tests
      const buttons = wrapper.findAll('button')
      const createAccountBtn = buttons.find(btn => 
        btn.text() === 'Create new account'
      )
      await createAccountBtn!.trigger('click')
    })

    it('calls register with correct data when registration form is submitted', async () => {
      mockRegister.mockResolvedValue({ success: true })
      
      await wrapper.find('#reg-name').setValue('John Doe')
      await wrapper.find('#reg-email').setValue('john@example.com')
      await wrapper.find('#reg-password').setValue('password123')
      
      const registerForms = wrapper.findAll('form')
      await registerForms[1].trigger('submit.prevent')
      
      expect(mockRegister).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe')
    })

    it('auto-logs in user after successful registration', async () => {
      mockRegister.mockResolvedValue({ success: true })
      mockLogin.mockResolvedValue({ success: true })
      
      await wrapper.find('#reg-name').setValue('John Doe')
      await wrapper.find('#reg-email').setValue('john@example.com')
      await wrapper.find('#reg-password').setValue('password123')
      
      const registerForm  = wrapper.findAll('form').filter(form => 
        form.find('#reg-name').exists()
      )[0]
      // await wrapper.find('form').trigger('submit.prevent')
      await registerForm.trigger('submit.prevent')
      
      // wait for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(mockLogin).toHaveBeenCalledWith('john@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('displays error message on registration failure', async () => {
      mockRegister.mockResolvedValue({ success: false, error: 'Email already exists' })
      
      await wrapper.find('#reg-name').setValue('John Doe')
      await wrapper.find('#reg-email').setValue('existing@example.com')
      await wrapper.find('#reg-password').setValue('password123')
      
      const registerForms = wrapper.findAll('form')
      await registerForms[1].trigger('submit.prevent')
      
      await nextTick()
      
      expect(wrapper.text()).toContain('Email already exists')
    })

    it('shows loading state during registration', async () => {
      mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      await wrapper.find('#reg-name').setValue('John Doe')
      await wrapper.find('#reg-email').setValue('john@example.com')
      await wrapper.find('#reg-password').setValue('password123')
      
      const buttons = wrapper.findAll('button')
      const createAccountBtn = buttons.find(btn => 
        btn.text() === 'Create Account'
      )
      
      const registerForm  = wrapper.findAll('form').filter(form => 
        form.find('#reg-name').exists()
      )[0]
      // await wrapper.find('form').trigger('submit.prevent')
      await registerForm.trigger('submit.prevent')
      await createAccountBtn!.trigger('click')
      
      expect(createAccountBtn!.attributes('disabled')).toBeDefined()
    })

    it('hides register form when cancel button is clicked', async () => {
      const buttons = wrapper.findAll('button')
      const cancelBtn = buttons.find(btn => 
        btn.text() === 'Cancel'
      )
      
      await cancelBtn!.trigger('click')
      
      expect(wrapper.find('h3').exists()).toBe(false)
      expect(wrapper.find('#reg-name').exists()).toBe(false)
    })

    it('handles registration exceptions', async () => {
      mockRegister.mockRejectedValue(new Error('Server error'))
      
      await wrapper.find('#reg-name').setValue('John Doe')
      await wrapper.find('#reg-email').setValue('john@example.com')
      await wrapper.find('#reg-password').setValue('password123')
      
      const registerForms = wrapper.findAll('form')
      await registerForms[1].trigger('submit.prevent')
      
      await nextTick()
      
      expect(wrapper.text()).toContain('Server error')
    })
  })

  describe('Error Handling', () => {
    it('clears error when starting new login attempt', async () => {
      // First, set an error
      mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' })
      await wrapper.find('form').trigger('submit.prevent')
      await nextTick()
      
      expect(wrapper.text()).toContain('Invalid credentials')
      
      // Then start a new login attempt
      mockLogin.mockResolvedValue({ success: true })
      await wrapper.find('form').trigger('submit.prevent')
      
      // Error should be cleared immediately when starting new attempt
      expect(wrapper.find('.bg-error-50').exists()).toBe(false)
    })

    it('displays generic error message for login errors without specific message', async () => {
      mockLogin.mockResolvedValue({ success: false })
      
      await wrapper.find('form').trigger('submit.prevent')
      await nextTick()
      
      expect(wrapper.text()).toContain('Login failed')
    })

    it('displays generic error message for registration errors without specific message', async () => {
      const buttons = wrapper.findAll('button')
      const createAccountBtn = buttons.find(btn => 
        btn.text() === 'Create new account'
      )
      await createAccountBtn!.trigger('click')
      
      mockRegister.mockResolvedValue({ success: false })
      
      const registerForms = wrapper.findAll('form')
      await registerForms[1].trigger('submit.prevent')
      await nextTick()
      
      expect(wrapper.text()).toContain('Registration failed')
    })
  })

  describe('Accessibility', () => {
    it('has proper labels for form inputs', () => {
      const emailLabel = wrapper.find('label[for="email"]')
      const passwordLabel = wrapper.find('label[for="password"]')
      
      expect(emailLabel.text()).toBe('Email address')
      expect(passwordLabel.text()).toBe('Password')
    })

    it('has proper autocomplete attributes', () => {
      expect(wrapper.find('#email').attributes('autocomplete')).toBe('email')
      expect(wrapper.find('#password').attributes('autocomplete')).toBe('current-password')
    })

    it('uses proper input types', () => {
      expect(wrapper.find('#email').attributes('type')).toBe('email')
      expect(wrapper.find('#password').attributes('type')).toBe('password')
    })
  })
})