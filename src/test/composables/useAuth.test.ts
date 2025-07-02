import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuth } from '../../composables/useAuth'
import { mockUser } from '../mocks/pocketbase'

// Mock the auth service
vi.mock('../../services/pocketbase', () => ({
  authService: {
    currentUser: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      sites: ['site-1'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    },
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return authenticated user', () => {
    const { user, isAuthenticated } = useAuth()
    
    expect(user.value).toEqual(mockUser)
    expect(isAuthenticated.value).toBe(true)
  })

  it('should handle successful login', async () => {
    const { login } = useAuth()
    const { authService } = await import('../../services/pocketbase')
    
    vi.mocked(authService.login).mockResolvedValue({
      record: mockUser,
      token: 'mock-token'
    } as any)
    
    const result = await login('test@example.com', 'password')
    
    expect(result.success).toBe(true)
    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password', undefined)
  })

  it('should handle login failure', async () => {
    const { login } = useAuth()
    const { authService } = await import('../../services/pocketbase')
    
    vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'))
    
    const result = await login('test@example.com', 'wrong-password')
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid credentials')
  })

  it('should handle successful registration', async () => {
    const { register } = useAuth()
    const { authService } = await import('../../services/pocketbase')
    
    vi.mocked(authService.register).mockResolvedValue(mockUser as any)
    
    const result = await register('new@example.com', 'password', 'New User')
    
    expect(result.success).toBe(true)
    expect(authService.register).toHaveBeenCalledWith('new@example.com', 'password', 'New User', undefined, undefined, undefined, undefined, undefined)
  })

  it('should handle registration failure', async () => {
    const { register } = useAuth()
    const { authService } = await import('../../services/pocketbase')
    
    vi.mocked(authService.register).mockRejectedValue(new Error('Email already exists'))
    
    const result = await register('existing@example.com', 'password', 'User')
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Email already exists')
  })

  it('should logout user', async () => {
    const { logout } = useAuth()
    const { authService } = await import('../../services/pocketbase')
    
    logout()
    
    expect(authService.logout).toHaveBeenCalled()
  })
})