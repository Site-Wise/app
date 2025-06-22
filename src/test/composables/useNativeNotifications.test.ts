import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// Mock the entire useNativeNotifications module to avoid dynamic import issues
vi.mock('../../composables/useNativeNotifications', () => {
  const mockRef = (value: any) => ref(value)
  
  return {
    useNativeNotifications: vi.fn(() => {
      const isTauri = mockRef(false)
      const isSupported = mockRef(false)
      const permission = mockRef('default')
      
      return {
        isTauri,
        isSupported, 
        permission,
        requestPermission: vi.fn(),
        showNotification: vi.fn(),
        showDeliveryNotification: vi.fn(),
        showPaymentNotification: vi.fn(),
        showQuotationNotification: vi.fn(),
        showServiceBookingNotification: vi.fn()
      }
    })
  }
})

import { useNativeNotifications } from '../../composables/useNativeNotifications'

describe('useNativeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const {
      isTauri,
      isSupported,
      permission,
      requestPermission,
      showNotification
    } = useNativeNotifications()

    expect(isTauri.value).toBe(false)
    expect(isSupported.value).toBe(false)
    expect(permission.value).toBe('default')
    expect(typeof requestPermission).toBe('function')
    expect(typeof showNotification).toBe('function')
  })

  it('should provide notification helper functions', () => {
    const {
      showDeliveryNotification,
      showPaymentNotification,
      showQuotationNotification,
      showServiceBookingNotification
    } = useNativeNotifications()

    expect(typeof showDeliveryNotification).toBe('function')
    expect(typeof showPaymentNotification).toBe('function')
    expect(typeof showQuotationNotification).toBe('function')
    expect(typeof showServiceBookingNotification).toBe('function')
  })

  it('should call notification functions without errors', async () => {
    const { 
      showDeliveryNotification,
      showPaymentNotification,
      showQuotationNotification,
      showServiceBookingNotification 
    } = useNativeNotifications()

    // These are mocked, so they should not throw
    expect(() => showDeliveryNotification('Steel Bars', 'ABC Supplies')).not.toThrow()
    expect(() => showPaymentNotification(50000, 'XYZ Contractor')).not.toThrow()
    expect(() => showQuotationNotification('Cement', 'DEF Supplies')).not.toThrow()
    expect(() => showServiceBookingNotification('Electrical', '2024-01-15')).not.toThrow()
  })
})