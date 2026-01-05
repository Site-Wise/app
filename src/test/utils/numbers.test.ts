import { describe, it, expect } from 'vitest'
import { roundToTwoDecimals, calculateItemTotal, calculateUnitPrice } from '../../utils/numbers'

describe('numbers utility functions', () => {
  describe('roundToTwoDecimals', () => {
    it('should round normal numbers to 2 decimal places', () => {
      expect(roundToTwoDecimals(3.14159)).toBe(3.14)
      expect(roundToTwoDecimals(10.999)).toBe(11)
      expect(roundToTwoDecimals(2.555)).toBe(2.56)
    })

    it('should handle floating-point precision issues', () => {
      expect(roundToTwoDecimals(0.1 + 0.2)).toBe(0.3)
      expect(roundToTwoDecimals(3.33 * 150)).toBe(499.5)
      // 1.005 rounds to 1, not 1.01 due to Math.round behavior
      expect(roundToTwoDecimals(1.005)).toBe(1)
    })

    it('should handle whole numbers', () => {
      expect(roundToTwoDecimals(100)).toBe(100)
      expect(roundToTwoDecimals(42.0)).toBe(42)
    })

    it('should handle small decimal numbers', () => {
      expect(roundToTwoDecimals(0.001)).toBe(0)
      expect(roundToTwoDecimals(0.004)).toBe(0)
      expect(roundToTwoDecimals(0.005)).toBe(0.01)
      expect(roundToTwoDecimals(0.009)).toBe(0.01)
    })

    it('should handle negative numbers', () => {
      expect(roundToTwoDecimals(-3.14159)).toBe(-3.14)
      expect(roundToTwoDecimals(-10.999)).toBe(-11)
    })

    it('should handle zero', () => {
      expect(roundToTwoDecimals(0)).toBe(0)
      expect(roundToTwoDecimals(0.0)).toBe(0)
    })

    it('should handle Infinity', () => {
      expect(roundToTwoDecimals(Infinity)).toBe(0)
      expect(roundToTwoDecimals(-Infinity)).toBe(0)
    })

    it('should handle NaN', () => {
      expect(roundToTwoDecimals(NaN)).toBe(0)
    })

    it('should handle very large numbers', () => {
      expect(roundToTwoDecimals(999999.999)).toBe(1000000)
    })

    it('should handle very small negative numbers', () => {
      // -0.001 rounds to -0 (which is 0 for practical purposes)
      const result = roundToTwoDecimals(-0.001)
      expect(Object.is(result, -0) || result === 0).toBe(true)
    })
  })

  describe('calculateItemTotal', () => {
    it('should calculate quantity × unit price correctly', () => {
      expect(calculateItemTotal(10, 5.5)).toBe(55)
      expect(calculateItemTotal(3, 100)).toBe(300)
      expect(calculateItemTotal(2.5, 4)).toBe(10)
    })

    it('should handle decimal quantities and prices', () => {
      expect(calculateItemTotal(1.5, 10.5)).toBe(15.75)
      expect(calculateItemTotal(3.33, 150)).toBe(499.5)
    })

    it('should round result to 2 decimal places', () => {
      // 3 * 1.333 = 3.999, rounds to 4
      expect(calculateItemTotal(3, 1.333)).toBe(4)
      expect(calculateItemTotal(7, 7.777)).toBe(54.44)
    })

    it('should handle zero quantity', () => {
      expect(calculateItemTotal(0, 10)).toBe(0)
      expect(calculateItemTotal(0, 0)).toBe(0)
    })

    it('should handle zero unit price', () => {
      expect(calculateItemTotal(10, 0)).toBe(0)
    })

    it('should handle null/undefined values safely', () => {
      expect(calculateItemTotal(null as any, 10)).toBe(0)
      expect(calculateItemTotal(10, null as any)).toBe(0)
      expect(calculateItemTotal(null as any, null as any)).toBe(0)
      expect(calculateItemTotal(undefined as any, 10)).toBe(0)
      expect(calculateItemTotal(10, undefined as any)).toBe(0)
    })

    it('should handle negative values by treating them as zero', () => {
      expect(calculateItemTotal(-5, 10)).toBe(0)
      expect(calculateItemTotal(10, -5)).toBe(0)
      expect(calculateItemTotal(-5, -5)).toBe(0)
    })

    it('should handle large quantities and prices', () => {
      expect(calculateItemTotal(1000, 99.99)).toBe(99990)
      expect(calculateItemTotal(9999, 9999)).toBe(99980001)
    })

    it('should handle very small quantities', () => {
      // Math.max(0, 0.001) = 0.001, 0.001 * 1000 = 1, rounds to 1
      expect(calculateItemTotal(0.001, 1000)).toBe(1)
      expect(calculateItemTotal(0.1, 10)).toBe(1)
    })
  })

  describe('calculateUnitPrice', () => {
    it('should calculate unit price from total and quantity', () => {
      expect(calculateUnitPrice(100, 10)).toBe(10)
      expect(calculateUnitPrice(55, 5)).toBe(11)
      expect(calculateUnitPrice(15.75, 1.5)).toBe(10.5)
    })

    it('should round result to 2 decimal places', () => {
      expect(calculateUnitPrice(100, 3)).toBe(33.33)
      expect(calculateUnitPrice(10, 3)).toBe(3.33)
      expect(calculateUnitPrice(1, 3)).toBe(0.33)
    })

    it('should handle zero quantity by using 0.01 minimum', () => {
      expect(calculateUnitPrice(100, 0)).toBe(10000)
      expect(calculateUnitPrice(50, 0.01)).toBe(5000)
    })

    it('should handle very small quantities', () => {
      expect(calculateUnitPrice(10, 0.1)).toBe(100)
      expect(calculateUnitPrice(5, 0.01)).toBe(500)
    })

    it('should handle zero total amount', () => {
      expect(calculateUnitPrice(0, 10)).toBe(0)
      expect(calculateUnitPrice(0, 1)).toBe(0)
    })

    it('should handle null/undefined values safely', () => {
      // null/undefined total becomes 0
      expect(calculateUnitPrice(null as any, 10)).toBe(0)
      expect(calculateUnitPrice(undefined as any, 10)).toBe(0)
      // null/undefined quantity becomes 0.01 minimum
      expect(calculateUnitPrice(100, null as any)).toBe(10000)
      expect(calculateUnitPrice(100, undefined as any)).toBe(10000)
      expect(calculateUnitPrice(null as any, null as any)).toBe(0)
    })

    it('should handle negative values by treating them as zero', () => {
      // negative total becomes 0
      expect(calculateUnitPrice(-100, 10)).toBe(0)
      // negative quantity becomes 0.01 minimum
      expect(calculateUnitPrice(100, -10)).toBe(10000)
      expect(calculateUnitPrice(-100, -10)).toBe(0)
    })

    it('should handle large total amounts', () => {
      expect(calculateUnitPrice(99990, 1000)).toBe(99.99)
      expect(calculateUnitPrice(99980001, 9999)).toBe(9999)
    })

    it('should prevent division by zero with minimum quantity', () => {
      const result = calculateUnitPrice(100, 0)
      expect(result).toBeGreaterThan(0)
      expect(Number.isFinite(result)).toBe(true)
    })

    it('should handle decimal results correctly', () => {
      expect(calculateUnitPrice(1, 3)).toBe(0.33)
      expect(calculateUnitPrice(2, 3)).toBe(0.67)
      expect(calculateUnitPrice(10, 9)).toBe(1.11)
    })
  })

  describe('Integration scenarios', () => {
    it('should work correctly for delivery item calculations', () => {
      const quantity = 5
      const unitPrice = 12.5
      const total = calculateItemTotal(quantity, unitPrice)
      
      expect(total).toBe(62.5)
      
      const calculatedUnitPrice = calculateUnitPrice(total, quantity)
      expect(calculatedUnitPrice).toBe(unitPrice)
    })

    it('should maintain precision through multiple calculations', () => {
      const total1 = calculateItemTotal(3.33, 150)
      const total2 = calculateItemTotal(2.5, 200)
      const grandTotal = roundToTwoDecimals(total1 + total2)
      
      expect(total1).toBe(499.5)
      expect(total2).toBe(500)
      expect(grandTotal).toBe(999.5)
    })

    it('should handle real-world invoice calculations', () => {
      const items = [
        { qty: 10, price: 5.5 },
        { qty: 3, price: 12.99 },
        { qty: 1.5, price: 100 }
      ]
      
      const totals = items.map(item => calculateItemTotal(item.qty, item.price))
      const grandTotal = roundToTwoDecimals(totals.reduce((sum, t) => sum + t, 0))
      
      expect(totals[0]).toBe(55)
      expect(totals[1]).toBe(38.97)
      expect(totals[2]).toBe(150)
      expect(grandTotal).toBe(243.97)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle extremely large numbers without overflow', () => {
      const result = roundToTwoDecimals(Number.MAX_SAFE_INTEGER)
      expect(result).toBeGreaterThan(0)
    })

    it('should handle values that would cause precision loss', () => {
      expect(roundToTwoDecimals(0.1 + 0.2 + 0.3 + 0.4 + 0.5)).toBe(1.5)
    })

    it('should handle alternating negative and positive operations', () => {
      expect(roundToTwoDecimals(10.555 - 5.555)).toBe(5)
    })

    it('should handle quantity-price reversal gracefully', () => {
      const total1 = calculateItemTotal(10, 5)
      const total2 = calculateItemTotal(5, 10)
      
      expect(total1).toBe(50)
      expect(total2).toBe(50)
    })
  })
})
