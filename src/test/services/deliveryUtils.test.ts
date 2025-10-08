import { describe, it, expect } from 'vitest'
import { DeliveryPaymentCalculator, type DeliveryWithPaymentStatus } from '../../services/deliveryUtils'
import type { Delivery, PaymentAllocation } from '../../services/pocketbase'

describe('DeliveryPaymentCalculator Logic', () => {
  // Mock data
  const mockDelivery: Delivery = {
    id: 'delivery-1',
    site: 'site-1',
    vendor: 'vendor-1',
    delivery_date: '2024-01-15',
    invoice_number: 'INV-001',
    total_amount: 10000,
    notes: 'Test delivery',
    created: '2024-01-15T10:00:00Z',
    updated: '2024-01-15T10:00:00Z'
  }

  const mockDelivery2: Delivery = {
    id: 'delivery-2',
    site: 'site-1',
    vendor: 'vendor-1',
    delivery_date: '2024-01-20',
    invoice_number: 'INV-002',
    total_amount: 5000,
    notes: 'Second delivery',
    created: '2024-01-20T10:00:00Z',
    updated: '2024-01-20T10:00:00Z'
  }

  describe('calculatePaymentStatus', () => {
    it('should return "pending" when no payment allocations exist', () => {
      const status = DeliveryPaymentCalculator.calculatePaymentStatus(mockDelivery, [])
      expect(status).toBe('pending')
    })

    it('should return "pending" when allocations are for different deliveries', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-other',
        allocated_amount: 5000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(mockDelivery, allocations)
      expect(status).toBe('pending')
    })

    it('should return "pending" when allocated amount is zero', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 0,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(mockDelivery, allocations)
      expect(status).toBe('pending')
    })

    it('should return "partial" when allocated amount is less than total', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 5000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(mockDelivery, allocations)
      expect(status).toBe('partial')
    })

    it('should return "paid" when allocated amount equals total', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 10000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(mockDelivery, allocations)
      expect(status).toBe('paid')
    })

    it('should return "paid" when allocated amount exceeds total', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 12000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(mockDelivery, allocations)
      expect(status).toBe('paid')
    })

    it('should sum multiple allocations for same delivery', () => {
      const allocations: PaymentAllocation[] = [
        {
          id: 'alloc-1',
          payment: 'payment-1',
          delivery: 'delivery-1',
          allocated_amount: 3000,
          created: '2024-01-16T10:00:00Z',
          updated: '2024-01-16T10:00:00Z'
        },
        {
          id: 'alloc-2',
          payment: 'payment-2',
          delivery: 'delivery-1',
          allocated_amount: 7000,
          created: '2024-01-17T10:00:00Z',
          updated: '2024-01-17T10:00:00Z'
        }
      ]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(mockDelivery, allocations)
      expect(status).toBe('paid')
    })

    it('should ignore allocations for other deliveries when summing', () => {
      const allocations: PaymentAllocation[] = [
        {
          id: 'alloc-1',
          payment: 'payment-1',
          delivery: 'delivery-1',
          allocated_amount: 4000,
          created: '2024-01-16T10:00:00Z',
          updated: '2024-01-16T10:00:00Z'
        },
        {
          id: 'alloc-2',
          payment: 'payment-2',
          delivery: 'delivery-other',
          allocated_amount: 10000,
          created: '2024-01-17T10:00:00Z',
          updated: '2024-01-17T10:00:00Z'
        }
      ]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(mockDelivery, allocations)
      expect(status).toBe('partial')
    })
  })

  describe('calculateOutstandingAmount', () => {
    it('should return total amount when no allocations exist', () => {
      const outstanding = DeliveryPaymentCalculator.calculateOutstandingAmount(mockDelivery, [])
      expect(outstanding).toBe(10000)
    })

    it('should return total amount when allocations are for different delivery', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-other',
        allocated_amount: 5000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const outstanding = DeliveryPaymentCalculator.calculateOutstandingAmount(mockDelivery, allocations)
      expect(outstanding).toBe(10000)
    })

    it('should calculate remaining amount after partial payment', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 6000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const outstanding = DeliveryPaymentCalculator.calculateOutstandingAmount(mockDelivery, allocations)
      expect(outstanding).toBe(4000)
    })

    it('should return 0 when fully paid', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 10000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const outstanding = DeliveryPaymentCalculator.calculateOutstandingAmount(mockDelivery, allocations)
      expect(outstanding).toBe(0)
    })

    it('should return 0 when overpaid (not negative)', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 15000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const outstanding = DeliveryPaymentCalculator.calculateOutstandingAmount(mockDelivery, allocations)
      expect(outstanding).toBe(0)
    })

    it('should sum multiple allocations correctly', () => {
      const allocations: PaymentAllocation[] = [
        {
          id: 'alloc-1',
          payment: 'payment-1',
          delivery: 'delivery-1',
          allocated_amount: 2500,
          created: '2024-01-16T10:00:00Z',
          updated: '2024-01-16T10:00:00Z'
        },
        {
          id: 'alloc-2',
          payment: 'payment-2',
          delivery: 'delivery-1',
          allocated_amount: 3500,
          created: '2024-01-17T10:00:00Z',
          updated: '2024-01-17T10:00:00Z'
        }
      ]

      const outstanding = DeliveryPaymentCalculator.calculateOutstandingAmount(mockDelivery, allocations)
      expect(outstanding).toBe(4000) // 10000 - (2500 + 3500)
    })
  })

  describe('calculatePaidAmount', () => {
    it('should return 0 when no allocations exist', () => {
      const paid = DeliveryPaymentCalculator.calculatePaidAmount(mockDelivery, [])
      expect(paid).toBe(0)
    })

    it('should return 0 when allocations are for different delivery', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-other',
        allocated_amount: 5000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const paid = DeliveryPaymentCalculator.calculatePaidAmount(mockDelivery, allocations)
      expect(paid).toBe(0)
    })

    it('should return allocated amount for single payment', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 7000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const paid = DeliveryPaymentCalculator.calculatePaidAmount(mockDelivery, allocations)
      expect(paid).toBe(7000)
    })

    it('should sum multiple allocations', () => {
      const allocations: PaymentAllocation[] = [
        {
          id: 'alloc-1',
          payment: 'payment-1',
          delivery: 'delivery-1',
          allocated_amount: 4000,
          created: '2024-01-16T10:00:00Z',
          updated: '2024-01-16T10:00:00Z'
        },
        {
          id: 'alloc-2',
          payment: 'payment-2',
          delivery: 'delivery-1',
          allocated_amount: 6000,
          created: '2024-01-17T10:00:00Z',
          updated: '2024-01-17T10:00:00Z'
        }
      ]

      const paid = DeliveryPaymentCalculator.calculatePaidAmount(mockDelivery, allocations)
      expect(paid).toBe(10000)
    })

    it('should handle overpayment correctly', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 15000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const paid = DeliveryPaymentCalculator.calculatePaidAmount(mockDelivery, allocations)
      expect(paid).toBe(15000)
    })
  })

  describe('enhanceDeliveriesWithPaymentStatus', () => {
    it('should return empty array for non-array input', () => {
      const result = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(
        null as any,
        []
      )
      expect(result).toEqual([])
    })

    it('should return empty array for undefined input', () => {
      const result = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(
        undefined as any,
        []
      )
      expect(result).toEqual([])
    })

    it('should enhance empty deliveries array', () => {
      const result = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus([], [])
      expect(result).toEqual([])
    })

    it('should enhance single delivery with no payments', () => {
      const result = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(
        [mockDelivery],
        []
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        ...mockDelivery,
        payment_status: 'pending',
        outstanding: 10000,
        paid_amount: 0
      })
    })

    it('should enhance single delivery with partial payment', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 4000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const result = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(
        [mockDelivery],
        allocations
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        ...mockDelivery,
        payment_status: 'partial',
        outstanding: 6000,
        paid_amount: 4000
      })
    })

    it('should enhance single delivery with full payment', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 10000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const result = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(
        [mockDelivery],
        allocations
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        ...mockDelivery,
        payment_status: 'paid',
        outstanding: 0,
        paid_amount: 10000
      })
    })

    it('should enhance multiple deliveries with different statuses', () => {
      const allocations: PaymentAllocation[] = [
        {
          id: 'alloc-1',
          payment: 'payment-1',
          delivery: 'delivery-1',
          allocated_amount: 10000,
          created: '2024-01-16T10:00:00Z',
          updated: '2024-01-16T10:00:00Z'
        },
        {
          id: 'alloc-2',
          payment: 'payment-2',
          delivery: 'delivery-2',
          allocated_amount: 2000,
          created: '2024-01-21T10:00:00Z',
          updated: '2024-01-21T10:00:00Z'
        }
      ]

      const result = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(
        [mockDelivery, mockDelivery2],
        allocations
      )

      expect(result).toHaveLength(2)

      // First delivery - fully paid
      expect(result[0]).toMatchObject({
        ...mockDelivery,
        payment_status: 'paid',
        outstanding: 0,
        paid_amount: 10000
      })

      // Second delivery - partially paid
      expect(result[1]).toMatchObject({
        ...mockDelivery2,
        payment_status: 'partial',
        outstanding: 3000,
        paid_amount: 2000
      })
    })

    it('should preserve all original delivery properties', () => {
      const result = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(
        [mockDelivery],
        []
      )

      expect(result[0]).toHaveProperty('id', mockDelivery.id)
      expect(result[0]).toHaveProperty('site', mockDelivery.site)
      expect(result[0]).toHaveProperty('vendor', mockDelivery.vendor)
      expect(result[0]).toHaveProperty('delivery_date', mockDelivery.delivery_date)
      expect(result[0]).toHaveProperty('invoice_number', mockDelivery.invoice_number)
      expect(result[0]).toHaveProperty('total_amount', mockDelivery.total_amount)
      expect(result[0]).toHaveProperty('notes', mockDelivery.notes)
      expect(result[0]).toHaveProperty('created', mockDelivery.created)
      expect(result[0]).toHaveProperty('updated', mockDelivery.updated)
    })
  })

  describe('getPaymentStatusClass', () => {
    it('should return correct class for pending status', () => {
      const className = DeliveryPaymentCalculator.getPaymentStatusClass('pending')
      expect(className).toBe('status-pending')
    })

    it('should return correct class for partial status', () => {
      const className = DeliveryPaymentCalculator.getPaymentStatusClass('partial')
      expect(className).toBe('status-partial')
    })

    it('should return correct class for paid status', () => {
      const className = DeliveryPaymentCalculator.getPaymentStatusClass('paid')
      expect(className).toBe('status-paid')
    })
  })

  describe('getPaymentStatusTextKey', () => {
    it('should return correct i18n key for pending status', () => {
      const key = DeliveryPaymentCalculator.getPaymentStatusTextKey('pending')
      expect(key).toBe('common.pending')
    })

    it('should return correct i18n key for partial status', () => {
      const key = DeliveryPaymentCalculator.getPaymentStatusTextKey('partial')
      expect(key).toBe('common.partial')
    })

    it('should return correct i18n key for paid status', () => {
      const key = DeliveryPaymentCalculator.getPaymentStatusTextKey('paid')
      expect(key).toBe('common.paid')
    })
  })

  describe('Edge Cases and Integration', () => {
    it('should handle delivery with zero total amount', () => {
      const zeroDelivery: Delivery = {
        ...mockDelivery,
        total_amount: 0
      }

      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 0,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(zeroDelivery, allocations)
      expect(status).toBe('pending')

      const outstanding = DeliveryPaymentCalculator.calculateOutstandingAmount(zeroDelivery, allocations)
      expect(outstanding).toBe(0)
    })

    it('should handle negative allocated amounts gracefully', () => {
      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: -1000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(mockDelivery, allocations)
      expect(status).toBe('pending') // Negative treated as pending

      const paid = DeliveryPaymentCalculator.calculatePaidAmount(mockDelivery, allocations)
      expect(paid).toBe(-1000)
    })

    it('should handle very large numbers correctly', () => {
      const largeDelivery: Delivery = {
        ...mockDelivery,
        total_amount: 999999999
      }

      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 500000000,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const status = DeliveryPaymentCalculator.calculatePaymentStatus(largeDelivery, allocations)
      expect(status).toBe('partial')

      const outstanding = DeliveryPaymentCalculator.calculateOutstandingAmount(largeDelivery, allocations)
      expect(outstanding).toBe(499999999)
    })

    it('should handle fractional amounts correctly', () => {
      const fractionalDelivery: Delivery = {
        ...mockDelivery,
        total_amount: 1000.50
      }

      const allocations: PaymentAllocation[] = [{
        id: 'alloc-1',
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 500.25,
        created: '2024-01-16T10:00:00Z',
        updated: '2024-01-16T10:00:00Z'
      }]

      const outstanding = DeliveryPaymentCalculator.calculateOutstandingAmount(fractionalDelivery, allocations)
      expect(outstanding).toBe(500.25)

      const paid = DeliveryPaymentCalculator.calculatePaidAmount(fractionalDelivery, allocations)
      expect(paid).toBe(500.25)
    })
  })
})
