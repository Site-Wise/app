import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useToast } from '../../composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
    // Clear toasts between tests
    const { clearAll } = useToast()
    clearAll()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('should add a toast', () => {
    const { addToast, toasts } = useToast()
    
    const toastId = addToast({
      message: 'Test message',
      type: 'success'
    })

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({
      id: toastId,
      message: 'Test message',
      type: 'success',
      duration: 4000,
      persistent: false
    })
  })

  it('should auto-remove non-persistent toasts after duration', async () => {
    const { addToast, toasts } = useToast()
    
    addToast({
      message: 'Test message',
      type: 'success',
      duration: 1000
    })

    expect(toasts.value).toHaveLength(1)
    
    // Fast forward time by 1000ms
    vi.advanceTimersByTime(1000)
    await nextTick()
    
    expect(toasts.value).toHaveLength(0)
  })

  it('should not auto-remove persistent toasts', async () => {
    const { addToast, toasts } = useToast()
    
    addToast({
      message: 'Persistent message',
      type: 'error',
      persistent: true,
      duration: 1000
    })

    expect(toasts.value).toHaveLength(1)
    
    // Fast forward time
    vi.advanceTimersByTime(2000)
    await nextTick()
    
    // Should still be there
    expect(toasts.value).toHaveLength(1)
  })

  it('should manually remove toasts', () => {
    const { addToast, removeToast, toasts } = useToast()
    
    const toastId = addToast({
      message: 'Test message',
      type: 'success'
    })

    expect(toasts.value).toHaveLength(1)
    
    removeToast(toastId)
    
    expect(toasts.value).toHaveLength(0)
  })

  it('should clear all toasts', () => {
    const { addToast, clearAll, toasts } = useToast()
    
    addToast({ message: 'Message 1', type: 'success' })
    addToast({ message: 'Message 2', type: 'info' })
    addToast({ message: 'Message 3', type: 'warning' })

    expect(toasts.value).toHaveLength(3)
    
    clearAll()
    
    expect(toasts.value).toHaveLength(0)
  })

  it('should provide convenience methods', () => {
    const { success, error, warning, info, toasts } = useToast()
    
    success('Success message')
    error('Error message')
    warning('Warning message')
    info('Info message')

    expect(toasts.value).toHaveLength(4)
    expect(toasts.value[0].type).toBe('success')
    expect(toasts.value[1].type).toBe('error')
    expect(toasts.value[2].type).toBe('warning')
    expect(toasts.value[3].type).toBe('info')
    
    // Error toasts should be persistent by default
    expect(toasts.value[1].persistent).toBe(true)
  })

  it('should generate unique IDs for toasts', () => {
    const { addToast, toasts } = useToast()
    
    addToast({ message: 'Message 1', type: 'success' })
    addToast({ message: 'Message 2', type: 'success' })
    
    const ids = toasts.value.map(toast => toast.id)
    expect(new Set(ids).size).toBe(2) // All IDs should be unique
  })
})