import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PaymentsView Logic Tests
 * Tests for payment calculations, filtering, allocations, and validation
 */

interface Payment {
  id: string
  vendor: string
  account: string
  amount: number
  payment_date: string
  reference?: string
  notes?: string
  deliveries: string[]
  service_bookings: string[]
  credit_notes?: string[]
  site: string
  expand?: {
    vendor?: { name: string }
    account?: { name: string; type: string }
    deliveries?: Delivery[]
    service_bookings?: ServiceBooking[]
  }
}

interface Delivery {
  id: string
  vendor: string
  total_amount: number
  site: string
}

interface ServiceBooking {
  id: string
  vendor: string
  total_amount: number
  percent_completed: number
  site: string
}

interface PaymentAllocation {
  id: string
  payment: string
  delivery?: string
  service_booking?: string
  allocated_amount: number
  site: string
}

interface CreditNote {
  id: string
  vendor: string
  credit_amount: number
  balance: number
  status: 'active' | 'fully_used' | 'expired'
  site: string
}

describe('PaymentsView Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Payment Filtering', () => {
    const mockPayments: Payment[] = [
      {
        id: 'pay-1',
        vendor: 'vendor-1',
        account: 'account-1',
        amount: 50000,
        payment_date: '2024-01-15',
        deliveries: ['del-1'],
        service_bookings: [],
        site: 'site-1',
        expand: { vendor: { name: 'ABC Suppliers' }, account: { name: 'Bank', type: 'bank' } }
      },
      {
        id: 'pay-2',
        vendor: 'vendor-2',
        account: 'account-2',
        amount: 30000,
        payment_date: '2024-01-10',
        deliveries: [],
        service_bookings: ['sb-1'],
        site: 'site-1',
        expand: { vendor: { name: 'XYZ Services' }, account: { name: 'Cash', type: 'cash' } }
      }
    ]

    it('should filter payments by vendor', () => {
      const filterByVendor = (payments: Payment[], vendorId: string) => {
        return payments.filter(p => p.vendor === vendorId)
      }

      expect(filterByVendor(mockPayments, 'vendor-1')).toHaveLength(1)
      expect(filterByVendor(mockPayments, 'vendor-2')).toHaveLength(1)
    })

    it('should filter payments by account', () => {
      const filterByAccount = (payments: Payment[], accountId: string) => {
        return payments.filter(p => p.account === accountId)
      }

      expect(filterByAccount(mockPayments, 'account-1')).toHaveLength(1)
    })

    it('should filter payments by date range', () => {
      const filterByDateRange = (
        payments: Payment[],
        startDate: string,
        endDate: string
      ) => {
        return payments.filter(p => {
          return p.payment_date >= startDate && p.payment_date <= endDate
        })
      }

      expect(filterByDateRange(mockPayments, '2024-01-10', '2024-01-15')).toHaveLength(2)
      expect(filterByDateRange(mockPayments, '2024-01-12', '2024-01-15')).toHaveLength(1)
    })

    it('should filter payments by search query', () => {
      const filterBySearch = (payments: Payment[], query: string) => {
        const normalizedQuery = query.toLowerCase().trim()
        if (!normalizedQuery) return payments

        return payments.filter(p => {
          const vendorName = p.expand?.vendor?.name?.toLowerCase() || ''
          const reference = p.reference?.toLowerCase() || ''
          return vendorName.includes(normalizedQuery) || reference.includes(normalizedQuery)
        })
      }

      expect(filterBySearch(mockPayments, 'ABC')).toHaveLength(1)
      expect(filterBySearch(mockPayments, 'Services')).toHaveLength(1)
    })

    it('should filter payments by type (delivery/service)', () => {
      const filterByType = (payments: Payment[], type: 'delivery' | 'service' | 'all') => {
        if (type === 'all') return payments
        if (type === 'delivery') return payments.filter(p => p.deliveries.length > 0)
        if (type === 'service') return payments.filter(p => p.service_bookings.length > 0)
        return payments
      }

      expect(filterByType(mockPayments, 'delivery')).toHaveLength(1)
      expect(filterByType(mockPayments, 'service')).toHaveLength(1)
      expect(filterByType(mockPayments, 'all')).toHaveLength(2)
    })
  })

  describe('Payment Sorting', () => {
    const mockPayments: Payment[] = [
      { id: 'pay-1', vendor: 'v1', account: 'a1', amount: 50000, payment_date: '2024-01-15', deliveries: [], service_bookings: [], site: 's-1' },
      { id: 'pay-2', vendor: 'v2', account: 'a2', amount: 30000, payment_date: '2024-01-10', deliveries: [], service_bookings: [], site: 's-1' },
      { id: 'pay-3', vendor: 'v3', account: 'a1', amount: 75000, payment_date: '2024-01-20', deliveries: [], service_bookings: [], site: 's-1' }
    ]

    it('should sort by date descending', () => {
      const sortByDateDesc = (payments: Payment[]) => {
        return [...payments].sort((a, b) =>
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        )
      }

      const sorted = sortByDateDesc(mockPayments)

      expect(sorted[0].id).toBe('pay-3')
      expect(sorted[1].id).toBe('pay-1')
      expect(sorted[2].id).toBe('pay-2')
    })

    it('should sort by amount descending', () => {
      const sortByAmountDesc = (payments: Payment[]) => {
        return [...payments].sort((a, b) => b.amount - a.amount)
      }

      const sorted = sortByAmountDesc(mockPayments)

      expect(sorted[0].id).toBe('pay-3')
      expect(sorted[1].id).toBe('pay-1')
      expect(sorted[2].id).toBe('pay-2')
    })

    it('should sort by amount ascending', () => {
      const sortByAmountAsc = (payments: Payment[]) => {
        return [...payments].sort((a, b) => a.amount - b.amount)
      }

      const sorted = sortByAmountAsc(mockPayments)

      expect(sorted[0].id).toBe('pay-2')
      expect(sorted[1].id).toBe('pay-1')
      expect(sorted[2].id).toBe('pay-3')
    })
  })

  describe('Payment Amount Calculations', () => {
    it('should calculate total payments', () => {
      const payments = [
        { amount: 50000 },
        { amount: 30000 },
        { amount: 25000 }
      ]

      const calculateTotal = (payments: { amount: number }[]) => {
        return payments.reduce((sum, p) => sum + p.amount, 0)
      }

      expect(calculateTotal(payments)).toBe(105000)
    })

    it('should calculate payment with credit notes', () => {
      const calculateFinalPayment = (
        totalAmount: number,
        creditNotesUsed: number
      ) => {
        return totalAmount - creditNotesUsed
      }

      expect(calculateFinalPayment(50000, 10000)).toBe(40000)
      expect(calculateFinalPayment(50000, 0)).toBe(50000)
    })

    it('should validate credit notes do not exceed payment amount', () => {
      const validateCreditNotes = (
        paymentAmount: number,
        creditNotesTotal: number
      ) => {
        return creditNotesTotal <= paymentAmount
      }

      expect(validateCreditNotes(50000, 10000)).toBe(true)
      expect(validateCreditNotes(50000, 50000)).toBe(true)
      expect(validateCreditNotes(50000, 60000)).toBe(false)
    })
  })

  describe('Payment Allocation Logic', () => {
    it('should calculate total allocated to a delivery', () => {
      const allocations: PaymentAllocation[] = [
        { id: 'pa-1', payment: 'pay-1', delivery: 'del-1', allocated_amount: 20000, site: 's-1' },
        { id: 'pa-2', payment: 'pay-2', delivery: 'del-1', allocated_amount: 15000, site: 's-1' },
        { id: 'pa-3', payment: 'pay-1', delivery: 'del-2', allocated_amount: 10000, site: 's-1' }
      ]

      const getTotalAllocated = (allocations: PaymentAllocation[], deliveryId: string) => {
        return allocations
          .filter(a => a.delivery === deliveryId)
          .reduce((sum, a) => sum + a.allocated_amount, 0)
      }

      expect(getTotalAllocated(allocations, 'del-1')).toBe(35000)
      expect(getTotalAllocated(allocations, 'del-2')).toBe(10000)
    }
    )

    it('should calculate remaining allocation for a payment', () => {
      const allocations: PaymentAllocation[] = [
        { id: 'pa-1', payment: 'pay-1', delivery: 'del-1', allocated_amount: 20000, site: 's-1' },
        { id: 'pa-2', payment: 'pay-1', delivery: 'del-2', allocated_amount: 10000, site: 's-1' }
      ]
      const paymentAmount = 50000

      const getRemainingAllocation = (
        allocations: PaymentAllocation[],
        paymentId: string,
        paymentAmount: number
      ) => {
        const totalAllocated = allocations
          .filter(a => a.payment === paymentId)
          .reduce((sum, a) => sum + a.allocated_amount, 0)
        return paymentAmount - totalAllocated
      }

      expect(getRemainingAllocation(allocations, 'pay-1', paymentAmount)).toBe(20000)
    })

    it('should validate allocation does not exceed pending amount', () => {
      const validateAllocation = (
        allocationAmount: number,
        pendingAmount: number
      ) => {
        return allocationAmount > 0 && allocationAmount <= pendingAmount
      }

      expect(validateAllocation(10000, 50000)).toBe(true)
      expect(validateAllocation(50000, 50000)).toBe(true)
      expect(validateAllocation(60000, 50000)).toBe(false)
      expect(validateAllocation(0, 50000)).toBe(false)
      expect(validateAllocation(-10000, 50000)).toBe(false)
    })
  })

  describe('Vendor Outstanding Calculation', () => {
    it('should calculate vendor outstanding from deliveries', () => {
      const deliveries: Delivery[] = [
        { id: 'del-1', vendor: 'v-1', total_amount: 50000, site: 's-1' },
        { id: 'del-2', vendor: 'v-1', total_amount: 30000, site: 's-1' }
      ]
      const allocations: PaymentAllocation[] = [
        { id: 'pa-1', payment: 'pay-1', delivery: 'del-1', allocated_amount: 20000, site: 's-1' },
        { id: 'pa-2', payment: 'pay-2', delivery: 'del-2', allocated_amount: 10000, site: 's-1' }
      ]

      const calculateVendorOutstanding = (
        deliveries: Delivery[],
        allocations: PaymentAllocation[],
        vendorId: string
      ) => {
        const vendorDeliveries = deliveries.filter(d => d.vendor === vendorId)
        let outstanding = 0

        for (const delivery of vendorDeliveries) {
          const totalAllocated = allocations
            .filter(a => a.delivery === delivery.id)
            .reduce((sum, a) => sum + a.allocated_amount, 0)
          outstanding += delivery.total_amount - totalAllocated
        }

        return outstanding
      }

      expect(calculateVendorOutstanding(deliveries, allocations, 'v-1')).toBe(50000)
    })

    it('should calculate vendor outstanding from service bookings', () => {
      const bookings: ServiceBooking[] = [
        { id: 'sb-1', vendor: 'v-1', total_amount: 100000, percent_completed: 50, site: 's-1' }
      ]
      const allocations: PaymentAllocation[] = [
        { id: 'pa-1', payment: 'pay-1', service_booking: 'sb-1', allocated_amount: 30000, site: 's-1' }
      ]

      const calculateBookingOutstanding = (
        bookings: ServiceBooking[],
        allocations: PaymentAllocation[],
        vendorId: string
      ) => {
        const vendorBookings = bookings.filter(b => b.vendor === vendorId)
        let outstanding = 0

        for (const booking of vendorBookings) {
          const progressAmount = (booking.total_amount * booking.percent_completed) / 100
          const totalAllocated = allocations
            .filter(a => a.service_booking === booking.id)
            .reduce((sum, a) => sum + a.allocated_amount, 0)
          outstanding += progressAmount - totalAllocated
        }

        return outstanding
      }

      expect(calculateBookingOutstanding(bookings, allocations, 'v-1')).toBe(20000)
    })
  })

  describe('Credit Note Logic', () => {
    it('should get available credit notes for vendor', () => {
      const creditNotes: CreditNote[] = [
        { id: 'cn-1', vendor: 'v-1', credit_amount: 5000, balance: 3000, status: 'active', site: 's-1' },
        { id: 'cn-2', vendor: 'v-1', credit_amount: 2000, balance: 0, status: 'fully_used', site: 's-1' },
        { id: 'cn-3', vendor: 'v-2', credit_amount: 1000, balance: 1000, status: 'active', site: 's-1' }
      ]

      const getAvailableCreditNotes = (creditNotes: CreditNote[], vendorId: string) => {
        return creditNotes.filter(cn =>
          cn.vendor === vendorId &&
          cn.status === 'active' &&
          cn.balance > 0
        )
      }

      const available = getAvailableCreditNotes(creditNotes, 'v-1')

      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('cn-1')
    })

    it('should calculate total available credit for vendor', () => {
      const creditNotes: CreditNote[] = [
        { id: 'cn-1', vendor: 'v-1', credit_amount: 5000, balance: 3000, status: 'active', site: 's-1' },
        { id: 'cn-2', vendor: 'v-1', credit_amount: 2000, balance: 1500, status: 'active', site: 's-1' }
      ]

      const getTotalAvailableCredit = (creditNotes: CreditNote[], vendorId: string) => {
        return creditNotes
          .filter(cn => cn.vendor === vendorId && cn.status === 'active')
          .reduce((sum, cn) => sum + cn.balance, 0)
      }

      expect(getTotalAvailableCredit(creditNotes, 'v-1')).toBe(4500)
    })
  })

  describe('Form Validation', () => {
    it('should validate required payment fields', () => {
      const validatePaymentForm = (form: Partial<Payment>) => {
        const errors: string[] = []

        if (!form.vendor) errors.push('Vendor is required')
        if (!form.account) errors.push('Account is required')
        if (!form.payment_date) errors.push('Date is required')
        if (!form.amount || form.amount <= 0) errors.push('Valid amount is required')

        return errors
      }

      expect(validatePaymentForm({
        vendor: 'v-1',
        account: 'a-1',
        payment_date: '2024-01-15',
        amount: 50000
      })).toEqual([])

      expect(validatePaymentForm({})).toContain('Vendor is required')
      expect(validatePaymentForm({ amount: 0 })).toContain('Valid amount is required')
    })

    it('should validate payment has allocations', () => {
      const validateHasAllocations = (
        deliveries: string[],
        serviceBookings: string[]
      ) => {
        return (deliveries && deliveries.length > 0) ||
               (serviceBookings && serviceBookings.length > 0)
      }

      expect(validateHasAllocations(['del-1'], [])).toBe(true)
      expect(validateHasAllocations([], ['sb-1'])).toBe(true)
      expect(validateHasAllocations(['del-1'], ['sb-1'])).toBe(true)
      expect(validateHasAllocations([], [])).toBe(false)
    })
  })

  describe('Summary Statistics', () => {
    const mockPayments: Payment[] = [
      { id: 'pay-1', vendor: 'v1', account: 'a1', amount: 50000, payment_date: '2024-01-15', deliveries: ['d1'], service_bookings: [], site: 's-1' },
      { id: 'pay-2', vendor: 'v2', account: 'a2', amount: 30000, payment_date: '2024-01-10', deliveries: [], service_bookings: ['sb1'], site: 's-1' },
      { id: 'pay-3', vendor: 'v1', account: 'a1', amount: 25000, payment_date: '2024-01-20', deliveries: ['d2'], service_bookings: [], site: 's-1' }
    ]

    it('should calculate total payments value', () => {
      const calculateTotalValue = (payments: Payment[]) => {
        return payments.reduce((sum, p) => sum + p.amount, 0)
      }

      expect(calculateTotalValue(mockPayments)).toBe(105000)
    })

    it('should count payments by vendor', () => {
      const countByVendor = (payments: Payment[]) => {
        return payments.reduce((acc, p) => {
          acc[p.vendor] = (acc[p.vendor] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      const counts = countByVendor(mockPayments)

      expect(counts['v1']).toBe(2)
      expect(counts['v2']).toBe(1)
    })

    it('should calculate total value by account', () => {
      const valueByAccount = (payments: Payment[]) => {
        return payments.reduce((acc, p) => {
          acc[p.account] = (acc[p.account] || 0) + p.amount
          return acc
        }, {} as Record<string, number>)
      }

      const values = valueByAccount(mockPayments)

      expect(values['a1']).toBe(75000)
      expect(values['a2']).toBe(30000)
    })
  })

  describe('Payment Deletion Logic', () => {
    it('should check if payment can be deleted', () => {
      const canDeletePayment = (
        hasPermission: boolean,
        isReconciled: boolean = false
      ) => {
        if (!hasPermission) return false
        if (isReconciled) return false
        return true
      }

      expect(canDeletePayment(true, false)).toBe(true)
      expect(canDeletePayment(true, true)).toBe(false)
      expect(canDeletePayment(false, false)).toBe(false)
    })
  })
})

describe('Payment Modal State', () => {
  describe('Modal Mode Logic', () => {
    it('should track modal mode correctly', () => {
      type ModalMode = 'CREATE' | 'EDIT' | null

      const getModalState = (mode: ModalMode) => ({
        isOpen: mode !== null,
        isEditing: mode === 'EDIT',
        isCreating: mode === 'CREATE'
      })

      expect(getModalState('CREATE').isCreating).toBe(true)
      expect(getModalState('EDIT').isEditing).toBe(true)
      expect(getModalState(null).isOpen).toBe(false)
    })
  })

  describe('Form Reset Logic', () => {
    it('should clear form on close', () => {
      const clearForm = () => ({
        vendor: '',
        account: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        reference: '',
        notes: '',
        deliveries: [],
        service_bookings: [],
        credit_notes: []
      })

      const form = clearForm()

      expect(form.vendor).toBe('')
      expect(form.amount).toBe(0)
      expect(form.deliveries).toEqual([])
    })

    it('should populate form for editing', () => {
      const payment: Payment = {
        id: 'pay-1',
        vendor: 'v-1',
        account: 'a-1',
        amount: 50000,
        payment_date: '2024-01-15',
        reference: 'REF-001',
        notes: 'Test payment',
        deliveries: ['del-1'],
        service_bookings: [],
        site: 's-1'
      }

      const populateForm = (payment: Payment) => ({
        vendor: payment.vendor,
        account: payment.account,
        payment_date: payment.payment_date,
        amount: payment.amount,
        reference: payment.reference || '',
        notes: payment.notes || '',
        deliveries: [...payment.deliveries],
        service_bookings: [...payment.service_bookings],
        credit_notes: payment.credit_notes ? [...payment.credit_notes] : []
      })

      const form = populateForm(payment)

      expect(form.vendor).toBe('v-1')
      expect(form.amount).toBe(50000)
      expect(form.deliveries).toEqual(['del-1'])
    })
  })
})

describe('Account Balance Impact', () => {
  it('should calculate account balance change', () => {
    const calculateBalanceChange = (
      paymentAmount: number,
      transactionType: 'debit' | 'credit'
    ) => {
      return transactionType === 'debit' ? -paymentAmount : paymentAmount
    }

    expect(calculateBalanceChange(50000, 'debit')).toBe(-50000)
    expect(calculateBalanceChange(50000, 'credit')).toBe(50000)
  })

  it('should validate sufficient account balance', () => {
    const hasSufficientBalance = (
      currentBalance: number,
      paymentAmount: number
    ) => {
      return currentBalance >= paymentAmount
    }

    expect(hasSufficientBalance(100000, 50000)).toBe(true)
    expect(hasSufficientBalance(50000, 50000)).toBe(true)
    expect(hasSufficientBalance(40000, 50000)).toBe(false)
  })
})
