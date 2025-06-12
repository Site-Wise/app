import { describe, it, expect } from 'vitest'

// Test the account number masking functionality
describe('Account Number Masking', () => {
  // Helper function to simulate the masking logic from our views
  const maskAccountNumber = (accountNumber: string | number) => {
    if (!accountNumber) return accountNumber
    const accountStr = String(accountNumber)
    if (accountStr.length <= 4) return accountStr
    const lastFour = accountStr.slice(-4)
    const masked = '*'.repeat(accountStr.length - 4)
    return masked + lastFour
  }

  it('should handle numeric account numbers', () => {
    expect(maskAccountNumber(1234567890)).toBe('******7890')
    expect(maskAccountNumber(123456789012345)).toBe('***********2345')
  })

  it('should handle string account numbers', () => {
    expect(maskAccountNumber('1234567890')).toBe('******7890')
    expect(maskAccountNumber('ABC123XYZ')).toBe('*****3XYZ')
  })

  it('should handle alphanumeric account numbers', () => {
    expect(maskAccountNumber('HDFC1234567890')).toBe('**********7890')
    expect(maskAccountNumber('ICICI123XYZ789')).toBe('**********Z789')
  })

  it('should not mask short account numbers', () => {
    expect(maskAccountNumber('1234')).toBe('1234')
    expect(maskAccountNumber('ABC')).toBe('ABC')
    expect(maskAccountNumber(1234)).toBe('1234')
  })

  it('should handle empty or null values', () => {
    expect(maskAccountNumber('')).toBe('')
    expect(maskAccountNumber(null as any)).toBe(null)
    expect(maskAccountNumber(undefined as any)).toBe(undefined)
  })

  it('should handle edge cases', () => {
    expect(maskAccountNumber(0)).toBe('0')
    expect(maskAccountNumber('0000')).toBe('0000')
    expect(maskAccountNumber('00000')).toBe('*0000')
  })
})