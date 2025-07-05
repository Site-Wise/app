import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { setupTestPinia } from '../utils/test-setup'
import ProfileView from '../../views/ProfileView.vue'

// Mock composables
const mockUser = ref({
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+919876543210'
})

const mockRefreshAuth = vi.fn()

vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    refreshAuth: mockRefreshAuth
  })
}))

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.profile': 'Profile',
        'auth.fullName': 'Full Name',
        'auth.email': 'Email',
        'auth.phoneNumber': 'Phone Number',
        'auth.changePassword': 'Change Password',
        'auth.currentPassword': 'Current Password',
        'auth.newPassword': 'New Password',
        'auth.confirmPassword': 'Confirm Password',
        'auth.currentPasswordRequired': 'Current password is required',
        'auth.passwordsDoNotMatch': 'Passwords do not match',
        'auth.passwordTooShort': 'Password must be at least 6 characters',
        'common.reset': 'Reset',
        'common.save': 'Save',
        'forms.enterFullName': 'Enter your full name',
        'forms.enterEmail': 'Enter your email',
        'forms.enterPhoneNumber': 'Enter your phone number',
        'forms.enterCurrentPassword': 'Enter current password',
        'forms.enterNewPassword': 'Enter new password',
        'forms.confirmNewPassword': 'Confirm new password',
        'messages.error': 'An error occurred'
      }
      return translations[key] || key
    }
  })
}))

// Mock PocketBase
const mockUpdate = vi.fn()
vi.mock('../../services/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      update: mockUpdate
    })),
    authStore: {
      isValid: true,
      model: { id: 'user-1' }
    }
  },
  getCurrentSiteId: vi.fn(() => 'site-1'),
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
  AlertCircle: { name: 'AlertCircle', template: '<div>AlertCircle</div>' },
  Loader2: { name: 'Loader2', template: '<div>Loader2</div>' }
}))

describe('ProfileView', () => {
  let wrapper: any
  let pinia: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset user data
    mockUser.value = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+919876543210'
    }
    
    const { pinia: testPinia } = setupTestPinia()
    pinia = testPinia
    
    wrapper = mount(ProfileView, {
      global: {
        plugins: [pinia]
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Profile Display', () => {
    it('should render user profile information', () => {
      expect(wrapper.text()).toContain('Profile')
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('john@example.com')
      expect(wrapper.text()).toContain('+919876543210')
    })

    it('should show user initials correctly', () => {
      expect(wrapper.text()).toContain('JD') // John Doe initials
    })

    it('should handle single name initials', async () => {
      mockUser.value = {
        id: 'user-1',
        name: 'John',
        email: 'john@example.com',
        phone: ''
      }

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.userInitials).toBe('J')
    })

    it('should handle long names with multiple words', async () => {
      mockUser.value = {
        id: 'user-1',
        name: 'John Michael Smith Doe',
        email: 'john@example.com',
        phone: ''
      }

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.userInitials).toBe('JM') // Should only take first 2 initials
    })

    it('should handle empty name', async () => {
      mockUser.value = {
        id: 'user-1',
        name: '',
        email: 'john@example.com',
        phone: ''
      }

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.userInitials).toBe('U') // Default 'U' for unknown
    })

    it('should handle missing phone number', async () => {
      mockUser.value = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com'
        // no phone property
      }

      // Need to remount wrapper to get updated user data
      wrapper.unmount()
      wrapper = mount(ProfileView, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.find('input[name="phone"]').element.value).toBe('')
    })
  })

  describe('Form Handling', () => {
    it('should populate form with user data on mount', () => {
      const nameInput = wrapper.find('input[name="name"]')
      const emailInput = wrapper.find('input[name="email"]')
      const phoneInput = wrapper.find('input[name="phone"]')

      expect(nameInput.element.value).toBe('John Doe')
      expect(emailInput.element.value).toBe('john@example.com')
      expect(phoneInput.element.value).toBe('9876543210') // Should strip +91
    })

    it('should handle phone number parsing correctly', () => {
      expect(wrapper.vm.profileForm.phone).toBe('9876543210')
      expect(wrapper.vm.profileForm.countryCode).toBe('+91')
    })

    it('should handle non-+91 phone numbers', async () => {
      mockUser.value = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      }

      wrapper = mount(ProfileView, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.profileForm.phone).toBe('1234567890')
    })

    it('should reset form when reset button is clicked', async () => {
      // Change form values
      await wrapper.find('input[name="name"]').setValue('Changed Name')
      await wrapper.find('input[name="new-password"]').setValue('newpass123')
      
      expect(wrapper.vm.profileForm.name).toBe('Changed Name')
      expect(wrapper.vm.profileForm.newPassword).toBe('newpass123')

      // Click reset button
      const resetButton = wrapper.findAll('button').find(btn => btn.text().includes('Reset'))
      await resetButton?.trigger('click')

      expect(wrapper.vm.profileForm.name).toBe('John Doe')
      expect(wrapper.vm.profileForm.newPassword).toBe('')
    })

    it('should clear error when form is reset', async () => {
      wrapper.vm.error = 'Some error'
      
      const resetButton = wrapper.findAll('button').find(btn => btn.text().includes('Reset'))
      await resetButton?.trigger('click')

      expect(wrapper.vm.error).toBe('')
    })
  })

  describe('Profile Update', () => {
    it('should update profile successfully', async () => {
      mockUpdate.mockResolvedValue({})

      // Fill form
      await wrapper.find('input[name="name"]').setValue('Jane Doe')
      await wrapper.find('input[name="email"]').setValue('jane@example.com')
      await wrapper.find('input[name="phone"]').setValue('9876543211')

      // Submit form
      await wrapper.find('form').trigger('submit')

      expect(mockUpdate).toHaveBeenCalledWith('user-1', {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+919876543211'
      })
      expect(mockRefreshAuth).toHaveBeenCalled()
    })

    it('should handle empty phone number correctly', async () => {
      mockUpdate.mockResolvedValue({})

      await wrapper.find('input[name="phone"]').setValue('')
      await wrapper.find('form').trigger('submit')

      expect(mockUpdate).toHaveBeenCalledWith('user-1', {
        name: 'John Doe',
        email: 'john@example.com',
        phone: undefined
      })
    })

    it('should show loading state during update', async () => {
      // Create a promise that we can control
      let resolvePromise: () => void
      const slowPromise = new Promise<void>(resolve => {
        resolvePromise = resolve
      })
      mockUpdate.mockReturnValue(slowPromise)

      // Submit the form 
      const form = wrapper.find('form')
      const submitPromise = form.trigger('submit')

      // Check loading state immediately after triggering but before promise resolves
      expect(wrapper.vm.loading).toBe(true)

      // Resolve the promise to clean up
      resolvePromise!()
      await submitPromise
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should handle update errors', async () => {
      const errorMessage = 'Update failed'
      mockUpdate.mockRejectedValue(new Error(errorMessage))

      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.error).toBe(errorMessage)
      expect(wrapper.text()).toContain(errorMessage)
    })

    it('should handle no user state', async () => {
      mockUser.value = null

      await wrapper.find('form').trigger('submit')

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Password Change', () => {
    it('should update password successfully', async () => {
      mockUpdate.mockResolvedValue({})

      // Fill password fields
      await wrapper.find('input[name="current-password"]').setValue('oldpass123')
      await wrapper.find('input[name="new-password"]').setValue('newpass123')
      await wrapper.find('input[name="confirm-password"]').setValue('newpass123')

      await wrapper.find('form').trigger('submit')

      expect(mockUpdate).toHaveBeenCalledWith('user-1', {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+919876543210',
        oldPassword: 'oldpass123',
        password: 'newpass123',
        passwordConfirm: 'newpass123'
      })

      // Password fields should be cleared after successful update
      expect(wrapper.vm.profileForm.currentPassword).toBe('')
      expect(wrapper.vm.profileForm.newPassword).toBe('')
      expect(wrapper.vm.profileForm.confirmPassword).toBe('')
    })

    it('should validate current password is required', async () => {
      await wrapper.find('input[name="new-password"]').setValue('newpass123')
      await wrapper.find('input[name="confirm-password"]').setValue('newpass123')

      await wrapper.find('form').trigger('submit')

      expect(wrapper.vm.error).toBe('Current password is required')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should validate passwords match', async () => {
      await wrapper.find('input[name="current-password"]').setValue('oldpass123')
      await wrapper.find('input[name="new-password"]').setValue('newpass123')
      await wrapper.find('input[name="confirm-password"]').setValue('differentpass')

      await wrapper.find('form').trigger('submit')

      expect(wrapper.vm.error).toBe('Passwords do not match')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should validate password length', async () => {
      await wrapper.find('input[name="current-password"]').setValue('oldpass123')
      await wrapper.find('input[name="new-password"]').setValue('short')
      await wrapper.find('input[name="confirm-password"]').setValue('short')

      await wrapper.find('form').trigger('submit')

      expect(wrapper.vm.error).toBe('Password must be at least 6 characters')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should validate when only some password fields are filled', async () => {
      await wrapper.find('input[name="current-password"]').setValue('oldpass123')
      await wrapper.find('input[name="new-password"]').setValue('newpass123')
      // Don't fill confirm password - this will cause passwords to not match

      await wrapper.find('form').trigger('submit')

      // The validation checks password match before password length
      expect(wrapper.vm.error).toBe('Passwords do not match')
    })

    it('should validate when only confirm password is filled', async () => {
      await wrapper.find('input[name="confirm-password"]').setValue('newpass123')

      await wrapper.find('form').trigger('submit')

      expect(wrapper.vm.error).toBe('Current password is required')
    })
  })

  describe('Error Handling', () => {
    it('should show error messages', async () => {
      wrapper.vm.error = 'Test error message'
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Test error message')
      expect(wrapper.find('.bg-error-50').exists()).toBe(true)
    })

    it('should handle PocketBase errors without message', async () => {
      mockUpdate.mockRejectedValue({}) // Error without message

      await wrapper.find('form').trigger('submit')

      expect(wrapper.vm.error).toBe('An error occurred')
    })

    it('should clear error on successful form submission', async () => {
      mockUpdate.mockResolvedValue({})
      wrapper.vm.error = 'Previous error'

      await wrapper.find('form').trigger('submit')

      expect(wrapper.vm.error).toBe('')
    })
  })

  describe('Form Validation', () => {
    it('should have required attributes on inputs', () => {
      const nameInput = wrapper.find('input[name="name"]')
      const emailInput = wrapper.find('input[name="email"]')

      expect(nameInput.attributes('required')).toBeDefined()
      expect(emailInput.attributes('required')).toBeDefined()
      expect(emailInput.attributes('type')).toBe('email')
    })

    it('should disable form inputs when loading', async () => {
      wrapper.vm.loading = true
      await wrapper.vm.$nextTick()

      const inputs = wrapper.findAll('input')
      inputs.forEach(input => {
        expect(input.attributes('disabled')).toBeDefined()
      })

      const buttons = wrapper.findAll('button')
      buttons.forEach(button => {
        expect(button.attributes('disabled')).toBeDefined()
      })
    })

    it('should have proper input types', () => {
      expect(wrapper.find('input[name="email"]').attributes('type')).toBe('email')
      expect(wrapper.find('input[name="phone"]').attributes('type')).toBe('tel')
      expect(wrapper.find('input[name="current-password"]').attributes('type')).toBe('password')
      expect(wrapper.find('input[name="new-password"]').attributes('type')).toBe('password')
      expect(wrapper.find('input[name="confirm-password"]').attributes('type')).toBe('password')
    })

    it('should have disabled country code select', () => {
      const countryCodeSelect = wrapper.find('select#country-code')
      expect(countryCodeSelect.attributes('disabled')).toBeDefined()
      expect(countryCodeSelect.element.value).toBe('+91')
    })
  })
})