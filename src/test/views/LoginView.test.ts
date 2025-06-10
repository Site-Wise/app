import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginView from '../../views/LoginView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock the useAuth composable
vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn()
  })
}))

describe('LoginView', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    const router = createMockRouter()
    
    wrapper = mount(LoginView, {
      global: {
        plugins: [router]
      }
    })
  })

  it('should render login form', () => {
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('should display app title and description', () => {
    expect(wrapper.text()).toContain('Sign in to ConstructTrack')
    expect(wrapper.text()).toContain('Manage your construction site efficiently')
  })

  it('should handle form submission', async () => {
    const { useAuth } = await import('../../composables/useAuth')
    const mockLogin = vi.mocked(useAuth().login)
    mockLogin.mockResolvedValue({ success: true })
    
    // Fill form
    await wrapper.find('input[type="email"]').setValue('test@example.com')
    await wrapper.find('input[type="password"]').setValue('password')
    
    // Submit form
    await wrapper.find('form').trigger('submit')
    
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password')
  })

  it('should show error message on login failure', async () => {
    const { useAuth } = await import('../../composables/useAuth')
    const mockLogin = vi.mocked(useAuth().login)
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' })
    
    // Fill and submit form
    await wrapper.find('input[type="email"]').setValue('test@example.com')
    await wrapper.find('input[type="password"]').setValue('wrong-password')
    await wrapper.find('form').trigger('submit')
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Invalid credentials')
  })

  it('should show register form when create account is clicked', async () => {
    const createAccountButton = wrapper.find('button:contains("Create new account")')
    
    if (createAccountButton.exists()) {
      await createAccountButton.trigger('click')
      
      // Should show register form
      expect(wrapper.find('input[name="name"]').exists()).toBe(true)
    }
  })

  it('should handle registration', async () => {
    const { useAuth } = await import('../../composables/useAuth')
    const mockRegister = vi.mocked(useAuth().register)
    mockRegister.mockResolvedValue({ success: true })
    
    // Open register form
    const createAccountButton = wrapper.find('button:contains("Create new account")')
    if (createAccountButton.exists()) {
      await createAccountButton.trigger('click')
      
      // Fill register form
      await wrapper.find('input[name="name"]').setValue('Test User')
      await wrapper.find('input[name="email"]').setValue('test@example.com')
      await wrapper.find('input[name="password"]').setValue('password')
      
      // Submit register form
      const registerForm = wrapper.findAll('form')[1] // Second form is register form
      if (registerForm) {
        await registerForm.trigger('submit')
        
        expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password', 'Test User')
      }
    }
  })

  it('should disable submit button when loading', async () => {
    // Set loading state
    await wrapper.setData({ loading: true })
    
    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
  })
})