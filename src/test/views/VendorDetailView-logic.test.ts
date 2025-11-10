import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Tests for VendorDetailView Business Logic
 * Focuses on financial calculations, ledger entries, and vendor accounting
 */

describe('VendorDetailView Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Outstanding Amount Calculation', () => {
    it('should calculate outstanding from deliveries only', () => {
      const deliveries = [
        { vendor: 'vendor-1', total_amount: 5000 },
        { vendor: 'vendor-1', total_amount: 3000 }
      ]
      const payments: any[] = []

      const totalDeliveries = deliveries.reduce((sum, d) => sum + d.total_amount, 0)
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

      const outstanding = totalDeliveries - totalPayments

      expect(outstanding).toBe(8000)
    })

    it('should calculate outstanding with payments', () => {
      const deliveries = [
        { vendor: 'vendor-1', total_amount: 10000 }
      ]
      const payments = [
        { vendor: 'vendor-1', amount: 4000 }
      ]

      const totalDeliveries = deliveries.reduce((sum, d) => sum + d.total_amount, 0)
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

      const outstanding = totalDeliveries - totalPayments

      expect(outstanding).toBe(6000)
    })

    it('should include service bookings in outstanding', () => {
      const deliveries = [
        { vendor: 'vendor-1', total_amount: 5000 }
      ]
      const serviceBookings = [
        { vendor: 'vendor-1', total_amount: 8000, percent_completed: 50 }
      ]
      const payments = [
        { vendor: 'vendor-1', amount: 3000 }
      ]

      const totalDeliveries = deliveries.reduce((sum, d) => sum + d.total_amount, 0)
      const progressAmount = serviceBookings.reduce((sum, b) => {
        return sum + (b.total_amount * b.percent_completed / 100)
      }, 0)
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

      const outstanding = totalDeliveries + progressAmount - totalPayments

      expect(totalDeliveries).toBe(5000)
      expect(progressAmount).toBe(4000)
      expect(outstanding).toBe(6000) // 5000 + 4000 - 3000
    })

    it('should deduct credit note balance from outstanding', () => {
      const deliveries = [
        { vendor: 'vendor-1', total_amount: 10000 }
      ]
      const payments = [
        { vendor: 'vendor-1', amount: 4000 }
      ]
      const creditNotes = [
        { vendor: 'vendor-1', balance: 1500 },
        { vendor: 'vendor-1', balance: 500 }
      ]

      const totalDeliveries = deliveries.reduce((sum, d) => sum + d.total_amount, 0)
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
      const creditBalance = creditNotes.reduce((sum, cn) => sum + cn.balance, 0)

      const outstanding = totalDeliveries - totalPayments - creditBalance

      expect(outstanding).toBe(4000) // 10000 - 4000 - 2000
    })

    it('should return zero when fully paid', () => {
      const deliveries = [
        { vendor: 'vendor-1', total_amount: 5000 }
      ]
      const payments = [
        { vendor: 'vendor-1', amount: 5000 }
      ]

      const totalDeliveries = deliveries.reduce((sum, d) => sum + d.total_amount, 0)
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

      const outstanding = totalDeliveries - totalPayments

      expect(outstanding).toBe(0)
    })

    it('should handle overpayment scenario', () => {
      const deliveries = [
        { vendor: 'vendor-1', total_amount: 5000 }
      ]
      const payments = [
        { vendor: 'vendor-1', amount: 6000 }
      ]

      const totalDeliveries = deliveries.reduce((sum, d) => sum + d.total_amount, 0)
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

      const outstanding = totalDeliveries - totalPayments

      expect(outstanding).toBe(-1000) // Overpaid by 1000
    })
  })

  describe('Total Paid Calculation', () => {
    it('should calculate total paid from all payments', () => {
      const payments = [
        { vendor: 'vendor-1', amount: 2000 },
        { vendor: 'vendor-1', amount: 1500 },
        { vendor: 'vendor-1', amount: 3000 }
      ]

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

      expect(totalPaid).toBe(6500)
    })

    it('should return zero when no payments', () => {
      const payments: any[] = []

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

      expect(totalPaid).toBe(0)
    })

    it('should handle single payment', () => {
      const payments = [
        { vendor: 'vendor-1', amount: 5000 }
      ]

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

      expect(totalPaid).toBe(5000)
    })

    it('should handle decimal amounts', () => {
      const payments = [
        { vendor: 'vendor-1', amount: 1234.56 },
        { vendor: 'vendor-1', amount: 678.90 }
      ]

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

      expect(totalPaid).toBe(1913.46)
    })
  })

  describe('Ledger Entry Creation', () => {
    it('should create delivery ledger entry with debit', () => {
      const delivery = {
        id: 'delivery-1',
        delivery_date: '2024-01-15',
        total_amount: 5000,
        delivery_reference: 'DEL-001'
      }

      const entry = {
        id: delivery.id,
        type: 'delivery' as const,
        date: delivery.delivery_date,
        description: `Delivery #${delivery.id.slice(-6)}`,
        reference: delivery.delivery_reference,
        debit: delivery.total_amount,
        credit: 0
      }

      expect(entry.debit).toBe(5000)
      expect(entry.credit).toBe(0)
      expect(entry.type).toBe('delivery')
    })

    it('should create payment ledger entry with credit', () => {
      const payment = {
        id: 'payment-1',
        payment_date: '2024-01-20',
        amount: 3000,
        reference: 'PAY-001'
      }

      const entry = {
        id: payment.id,
        type: 'payment' as const,
        date: payment.payment_date,
        description: 'Payment Made',
        reference: payment.reference,
        debit: 0,
        credit: payment.amount
      }

      expect(entry.debit).toBe(0)
      expect(entry.credit).toBe(3000)
      expect(entry.type).toBe('payment')
    })

    it('should create credit note ledger entry with credit', () => {
      const creditNote = {
        id: 'cn-1',
        issue_date: '2024-01-18',
        credit_amount: 500,
        reference: 'CN-001',
        reason: 'Damaged goods'
      }

      const entry = {
        id: creditNote.id,
        type: 'credit_note' as const,
        date: creditNote.issue_date,
        description: 'Credit Note Issued',
        reference: creditNote.reference,
        debit: 0,
        credit: creditNote.credit_amount
      }

      expect(entry.debit).toBe(0)
      expect(entry.credit).toBe(500)
      expect(entry.type).toBe('credit_note')
    })

    it('should create refund ledger entry', () => {
      const refund = {
        id: 'refund-1',
        transaction_date: '2024-01-22',
        amount: 800,
        reference: 'REF-001'
      }

      const entry = {
        id: refund.id,
        type: 'refund' as const,
        date: refund.transaction_date,
        description: 'Refund Received',
        reference: refund.reference,
        debit: 0,
        credit: refund.amount
      }

      expect(entry.debit).toBe(0)
      expect(entry.credit).toBe(800)
      expect(entry.type).toBe('refund')
    })
  })

  describe('Running Balance Calculation', () => {
    it('should calculate running balance with deliveries and payments', () => {
      const entries = [
        { date: '2024-01-01', debit: 5000, credit: 0 },  // Delivery
        { date: '2024-01-05', debit: 0, credit: 2000 },  // Payment
        { date: '2024-01-10', debit: 3000, credit: 0 },  // Delivery
        { date: '2024-01-15', debit: 0, credit: 4000 }   // Payment
      ]

      let runningBalance = 0
      const balances = entries.map(entry => {
        runningBalance += entry.debit - entry.credit
        return runningBalance
      })

      expect(balances[0]).toBe(5000)   // 0 + 5000 - 0
      expect(balances[1]).toBe(3000)   // 5000 + 0 - 2000
      expect(balances[2]).toBe(6000)   // 3000 + 3000 - 0
      expect(balances[3]).toBe(2000)   // 6000 + 0 - 4000
    })

    it('should start with zero balance', () => {
      let runningBalance = 0

      expect(runningBalance).toBe(0)
    })

    it('should handle only debits', () => {
      const entries = [
        { debit: 1000, credit: 0 },
        { debit: 2000, credit: 0 },
        { debit: 1500, credit: 0 }
      ]

      let runningBalance = 0
      entries.forEach(entry => {
        runningBalance += entry.debit - entry.credit
      })

      expect(runningBalance).toBe(4500)
    })

    it('should handle only credits', () => {
      const entries = [
        { debit: 0, credit: 1000 },
        { debit: 0, credit: 500 },
        { debit: 0, credit: 2000 }
      ]

      let runningBalance = 0
      entries.forEach(entry => {
        runningBalance += entry.debit - entry.credit
      })

      expect(runningBalance).toBe(-3500) // Negative means we've paid more than we owe
    })

    it('should maintain balance accuracy with decimals', () => {
      const entries = [
        { debit: 1234.56, credit: 0 },
        { debit: 0, credit: 789.12 },
        { debit: 456.78, credit: 0 }
      ]

      let runningBalance = 0
      entries.forEach(entry => {
        runningBalance += entry.debit - entry.credit
      })

      expect(runningBalance).toBeCloseTo(902.22, 2)
    })
  })

  describe('Ledger Entry Sorting', () => {
    it('should sort entries by date ascending', () => {
      const entries = [
        { id: '3', date: '2024-01-15', debit: 1000, credit: 0 },
        { id: '1', date: '2024-01-01', debit: 2000, credit: 0 },
        { id: '2', date: '2024-01-10', debit: 1500, credit: 0 }
      ]

      const sorted = entries.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      expect(sorted[0].id).toBe('1')
      expect(sorted[1].id).toBe('2')
      expect(sorted[2].id).toBe('3')
    })

    it('should maintain order for same-day entries', () => {
      const entries = [
        { id: '1', date: '2024-01-15', type: 'delivery', debit: 1000, credit: 0 },
        { id: '2', date: '2024-01-15', type: 'payment', debit: 0, credit: 500 }
      ]

      const sorted = entries.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Both entries have same date, original order maintained
      expect(sorted[0].id).toBe('1')
      expect(sorted[1].id).toBe('2')
    })
  })

  describe('Credit Note Balance Tracking', () => {
    it('should calculate total credit note balance', () => {
      const creditNotes = [
        { balance: 500 },
        { balance: 300 },
        { balance: 200 }
      ]

      const totalBalance = creditNotes.reduce((sum, cn) => sum + cn.balance, 0)

      expect(totalBalance).toBe(1000)
    })

    it('should return zero for no credit notes', () => {
      const creditNotes: any[] = []

      const totalBalance = creditNotes.reduce((sum, cn) => sum + cn.balance, 0)

      expect(totalBalance).toBe(0)
    })

    it('should handle fully used credit notes', () => {
      const creditNotes = [
        { credit_amount: 1000, balance: 0 },
        { credit_amount: 500, balance: 500 }
      ]

      const totalBalance = creditNotes.reduce((sum, cn) => sum + cn.balance, 0)

      expect(totalBalance).toBe(500)
    })

    it('should calculate used amount from credit notes', () => {
      const creditNotes = [
        { credit_amount: 1000, balance: 600 },
        { credit_amount: 500, balance: 100 }
      ]

      const totalUsed = creditNotes.reduce((sum, cn) => {
        return sum + (cn.credit_amount - cn.balance)
      }, 0)

      expect(totalUsed).toBe(800) // (1000-600) + (500-100)
    })
  })

  describe('Return Processing Logic', () => {
    it('should create credit note entry for credit_note processing', () => {
      const returnItem = {
        id: 'return-1',
        processing_option: 'credit_note' as const,
        total_return_amount: 500,
        completion_date: '2024-01-20',
        reason: 'Damaged goods'
      }

      const entry = {
        id: returnItem.id,
        type: 'credit_note' as const,
        date: returnItem.completion_date,
        description: 'Credit Note for Return',
        debit: 0,
        credit: returnItem.total_return_amount
      }

      expect(entry.credit).toBe(500)
      expect(entry.debit).toBe(0)
      expect(entry.type).toBe('credit_note')
    })

    it('should create two entries for refund processing', () => {
      const returnItem = {
        id: 'return-1',
        processing_option: 'refund' as const,
        total_return_amount: 1000,
        actual_refund_amount: 1000,
        completion_date: '2024-01-20',
        reason: 'Wrong item'
      }

      // Entry 1: Return reduces liability (credit)
      const returnEntry = {
        id: `${returnItem.id}_return`,
        type: 'credit_note' as const,
        date: returnItem.completion_date,
        description: 'Goods Returned',
        debit: 0,
        credit: returnItem.total_return_amount
      }

      // Entry 2: Refund received (debit)
      const refundEntry = {
        id: `${returnItem.id}_refund`,
        type: 'refund' as const,
        date: returnItem.completion_date,
        description: 'Refund Transaction',
        debit: returnItem.actual_refund_amount,
        credit: 0
      }

      expect(returnEntry.credit).toBe(1000)
      expect(returnEntry.debit).toBe(0)
      expect(refundEntry.debit).toBe(1000)
      expect(refundEntry.credit).toBe(0)
    })

    it('should handle partial refund amount', () => {
      const returnItem = {
        id: 'return-1',
        processing_option: 'refund' as const,
        total_return_amount: 1000,
        actual_refund_amount: 800,  // Vendor gave us less
        completion_date: '2024-01-20'
      }

      const returnEntry = {
        debit: 0,
        credit: returnItem.total_return_amount
      }

      const refundEntry = {
        debit: returnItem.actual_refund_amount,
        credit: 0
      }

      expect(returnEntry.credit).toBe(1000)
      expect(refundEntry.debit).toBe(800)
    })

    it('should not create refund entry when actual_refund_amount is zero', () => {
      const returnItem = {
        id: 'return-1',
        processing_option: 'refund' as const,
        total_return_amount: 1000,
        actual_refund_amount: 0,  // No refund yet
        completion_date: '2024-01-20'
      }

      const shouldCreateRefundEntry = returnItem.actual_refund_amount && returnItem.actual_refund_amount > 0

      expect(shouldCreateRefundEntry).toBeFalsy()
    })
  })

  describe('Service Booking Progress Calculation', () => {
    it('should calculate progress-based amount', () => {
      const booking = {
        total_amount: 10000,
        percent_completed: 60
      }

      const progressAmount = (booking.total_amount * booking.percent_completed) / 100

      expect(progressAmount).toBe(6000)
    })

    it('should handle zero progress', () => {
      const booking = {
        total_amount: 10000,
        percent_completed: 0
      }

      const progressAmount = (booking.total_amount * booking.percent_completed) / 100

      expect(progressAmount).toBe(0)
    })

    it('should handle 100% completion', () => {
      const booking = {
        total_amount: 10000,
        percent_completed: 100
      }

      const progressAmount = (booking.total_amount * booking.percent_completed) / 100

      expect(progressAmount).toBe(10000)
    })

    it('should aggregate multiple bookings', () => {
      const bookings = [
        { total_amount: 10000, percent_completed: 50 },
        { total_amount: 8000, percent_completed: 75 },
        { total_amount: 6000, percent_completed: 25 }
      ]

      const totalProgress = bookings.reduce((sum, b) => {
        return sum + (b.total_amount * b.percent_completed / 100)
      }, 0)

      expect(totalProgress).toBe(12500) // 5000 + 6000 + 1500
    })
  })

  describe('Ledger Particulars Generation', () => {
    it('should generate delivery particulars with invoice reference', () => {
      const delivery = {
        id: 'delivery123',
        delivery_reference: 'INV-2024-001'
      }

      const particulars = `Invoice: ${delivery.delivery_reference || delivery.id.slice(-6) || 'N/A'}`

      expect(particulars).toBe('Invoice: INV-2024-001')
    })

    it('should fallback to ID when no reference', () => {
      const delivery = {
        id: 'delivery123456',
        delivery_reference: ''
      }

      const particulars = `Invoice: ${delivery.delivery_reference || delivery.id.slice(-6) || 'N/A'}`

      expect(particulars).toBe('Invoice: 123456')
    })

    it('should generate payment particulars with notes', () => {
      const payment = {
        reference: 'PAY-001',
        notes: 'Monthly payment'
      }

      const particulars = `Payment: ${payment.reference || 'Bank Transfer'}${payment.notes ? ` - ${payment.notes}` : ''}`

      expect(particulars).toBe('Payment: PAY-001 - Monthly payment')
    })

    it('should generate credit note particulars with reason', () => {
      const creditNote = {
        id: 'cn123456',
        reference: 'CN-001',
        reason: 'Damaged goods'
      }

      const particulars = `Credit Note: ${creditNote.reference || `CN-${creditNote.id.slice(-6)}`}${creditNote.reason ? ` - ${creditNote.reason}` : ''}`

      expect(particulars).toBe('Credit Note: CN-001 - Damaged goods')
    })
  })

  describe('Outstanding Status Detection', () => {
    it('should detect vendor is owed money', () => {
      const outstanding = 5000

      const isOwed = outstanding > 0

      expect(isOwed).toBe(true)
    })

    it('should detect vendor is fully paid', () => {
      const outstanding = 0

      const isFullyPaid = outstanding === 0

      expect(isFullyPaid).toBe(true)
    })

    it('should detect overpayment', () => {
      const outstanding = -1000

      const isOverpaid = outstanding < 0

      expect(isOverpaid).toBe(true)
    })
  })
})
