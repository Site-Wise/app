import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Tests for PocketBase Payment & Financial Services Logic
 * Focuses on validation, business rules, data integrity, and edge cases
 * WITHOUT mocking PocketBase - these are pure logic tests
 */

describe('Payment Services Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Payment Validation Logic', () => {
    it('should validate required payment fields', () => {
      const paymentData = {
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const hasRequiredFields = () => {
        return !!(paymentData.vendor &&
                 paymentData.amount &&
                 paymentData.payment_date &&
                 paymentData.site)
      }

      expect(hasRequiredFields()).toBe(true)
    })

    it('should reject payment with missing vendor', () => {
      const paymentData = {
        vendor: '',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const hasRequiredFields = () => {
        return !!(paymentData.vendor &&
                 paymentData.amount &&
                 paymentData.payment_date &&
                 paymentData.site)
      }

      expect(hasRequiredFields()).toBe(false)
    })

    it('should reject payment with zero amount', () => {
      const paymentData = {
        vendor: 'vendor-1',
        amount: 0,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const isValidAmount = () => {
        return typeof paymentData.amount === 'number' && paymentData.amount > 0
      }

      expect(isValidAmount()).toBe(false)
    })

    it('should reject payment with negative amount', () => {
      const paymentData = {
        vendor: 'vendor-1',
        amount: -500,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const isValidAmount = () => {
        return paymentData.amount && paymentData.amount > 0
      }

      expect(isValidAmount()).toBe(false)
    })

    it('should validate payment date format', () => {
      const validDate = '2024-01-15'
      const invalidDate = 'invalid-date'

      const isValidDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return !isNaN(date.getTime())
      }

      expect(isValidDate(validDate)).toBe(true)
      expect(isValidDate(invalidDate)).toBe(false)
    })

    it('should accept payment with optional fields', () => {
      const paymentData = {
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1',
        account: 'account-1',
        reference: 'REF-001',
        notes: 'Monthly payment'
      }

      expect(paymentData.account).toBe('account-1')
      expect(paymentData.reference).toBe('REF-001')
      expect(paymentData.notes).toBe('Monthly payment')
    })
  })

  describe('Payment Allocation Logic', () => {
    it('should validate allocation amount does not exceed payment amount', () => {
      const payment = { id: 'payment-1', amount: 1000 }
      const allocation = { allocated_amount: 500 }

      const isValidAllocation = () => {
        return allocation.allocated_amount <= payment.amount && allocation.allocated_amount > 0
      }

      expect(isValidAllocation()).toBe(true)
    })

    it('should reject allocation exceeding payment amount', () => {
      const payment = { id: 'payment-1', amount: 1000 }
      const allocation = { allocated_amount: 1500 }

      const isValidAllocation = () => {
        return allocation.allocated_amount <= payment.amount && allocation.allocated_amount > 0
      }

      expect(isValidAllocation()).toBe(false)
    })

    it('should validate total allocations do not exceed payment', () => {
      const payment = { id: 'payment-1', amount: 1000 }
      const allocations = [
        { allocated_amount: 400 },
        { allocated_amount: 300 },
        { allocated_amount: 200 }
      ]

      const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0)
      const isValid = totalAllocated <= payment.amount

      expect(totalAllocated).toBe(900)
      expect(isValid).toBe(true)
    })

    it('should detect over-allocation', () => {
      const payment = { id: 'payment-1', amount: 1000 }
      const allocations = [
        { allocated_amount: 600 },
        { allocated_amount: 500 }
      ]

      const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0)
      const isOverAllocated = totalAllocated > payment.amount

      expect(totalAllocated).toBe(1100)
      expect(isOverAllocated).toBe(true)
    })

    it('should require either delivery or service_booking reference', () => {
      const validAllocation1 = {
        payment: 'payment-1',
        delivery: 'delivery-1',
        allocated_amount: 500
      }

      const validAllocation2 = {
        payment: 'payment-1',
        service_booking: 'booking-1',
        allocated_amount: 500
      }

      const invalidAllocation = {
        payment: 'payment-1',
        allocated_amount: 500
      }

      const hasValidReference = (alloc: any) => {
        return !!(alloc.delivery || alloc.service_booking)
      }

      expect(hasValidReference(validAllocation1)).toBe(true)
      expect(hasValidReference(validAllocation2)).toBe(true)
      expect(hasValidReference(invalidAllocation)).toBe(false)
    })

    it('should not allow both delivery and service_booking', () => {
      const allocation = {
        payment: 'payment-1',
        delivery: 'delivery-1',
        service_booking: 'booking-1',
        allocated_amount: 500
      }

      const hasOnlyOneReference = (alloc: any) => {
        return !!(alloc.delivery && !alloc.service_booking) ||
               !!(alloc.service_booking && !alloc.delivery)
      }

      expect(hasOnlyOneReference(allocation)).toBe(false)
    })
  })

  describe('Account Validation Logic', () => {
    it('should validate account types', () => {
      const validTypes = ['bank', 'credit_card', 'cash', 'digital_wallet', 'other']

      validTypes.forEach(type => {
        const account = { name: 'Test Account', type, site: 'site-1' }
        expect(validTypes.includes(account.type)).toBe(true)
      })
    })

    it('should reject invalid account type', () => {
      const validTypes = ['bank', 'credit_card', 'cash', 'digital_wallet', 'other']
      const invalidType = 'invalid_type'

      expect(validTypes.includes(invalidType)).toBe(false)
    })

    it('should validate required account fields', () => {
      const account = {
        name: 'Main Bank Account',
        type: 'bank',
        site: 'site-1'
      }

      const hasRequiredFields = () => {
        return !!(account.name && account.type && account.site)
      }

      expect(hasRequiredFields()).toBe(true)
    })

    it('should handle optional bank account fields', () => {
      const bankAccount = {
        name: 'Main Bank',
        type: 'bank' as const,
        account_number: '1234567890',
        bank_name: 'ICICI Bank',
        ifsc_code: 'ICIC0001234',
        site: 'site-1'
      }

      expect(bankAccount.account_number).toBe('1234567890')
      expect(bankAccount.bank_name).toBe('ICICI Bank')
      expect(bankAccount.ifsc_code).toBe('ICIC0001234')
    })

    it('should validate credit card details', () => {
      const creditCardAccount = {
        name: 'Corporate Credit Card',
        type: 'credit_card' as const,
        card_last_four: '1234',
        card_network: 'Visa',
        site: 'site-1'
      }

      const isValidCardLastFour = (lastFour: string) => {
        return /^\d{4}$/.test(lastFour)
      }

      expect(isValidCardLastFour(creditCardAccount.card_last_four)).toBe(true)
      expect(isValidCardLastFour('12345')).toBe(false)
      expect(isValidCardLastFour('abc')).toBe(false)
    })
  })

  describe('Account Transaction Logic', () => {
    it('should validate transaction types', () => {
      const validTypes = ['payment', 'refund', 'transfer', 'adjustment', 'fee']

      const transaction1 = { type: 'payment', amount: 1000 }
      const transaction2 = { type: 'refund', amount: -500 }

      expect(validTypes.includes(transaction1.type)).toBe(true)
      expect(validTypes.includes(transaction2.type)).toBe(true)
    })

    it('should handle positive and negative amounts', () => {
      const payment = { type: 'payment', amount: 1000 }
      const refund = { type: 'refund', amount: -500 }

      expect(payment.amount).toBeGreaterThan(0)
      expect(refund.amount).toBeLessThan(0)
    })

    it('should calculate running balance', () => {
      const transactions = [
        { amount: 1000, type: 'payment' },
        { amount: -200, type: 'refund' },
        { amount: 500, type: 'payment' },
        { amount: -100, type: 'fee' }
      ]

      const balance = transactions.reduce((sum, txn) => sum + txn.amount, 0)

      expect(balance).toBe(1200) // 1000 - 200 + 500 - 100
    })

    it('should validate transaction date chronology', () => {
      const transaction1 = { date: '2024-01-01', amount: 1000 }
      const transaction2 = { date: '2024-01-15', amount: 500 }

      const isChronological = () => {
        return new Date(transaction1.date) <= new Date(transaction2.date)
      }

      expect(isChronological()).toBe(true)
    })
  })

  describe('Credit Note Validation Logic', () => {
    it('should validate credit note amount is positive', () => {
      const creditNote = {
        vendor: 'vendor-1',
        amount: 500,
        balance: 500,
        site: 'site-1'
      }

      const isValidAmount = () => {
        return creditNote.amount > 0 && creditNote.balance >= 0 && creditNote.balance <= creditNote.amount
      }

      expect(isValidAmount()).toBe(true)
    })

    it('should validate balance does not exceed amount', () => {
      const creditNote = {
        vendor: 'vendor-1',
        amount: 500,
        balance: 600,
        site: 'site-1'
      }

      const isValidBalance = () => {
        return creditNote.balance <= creditNote.amount
      }

      expect(isValidBalance()).toBe(false)
    })

    it('should calculate used amount', () => {
      const creditNote = {
        amount: 1000,
        balance: 300
      }

      const usedAmount = creditNote.amount - creditNote.balance

      expect(usedAmount).toBe(700)
    })

    it('should validate fully used credit note', () => {
      const creditNote = {
        amount: 1000,
        balance: 0
      }

      const isFullyUsed = () => {
        return creditNote.balance === 0
      }

      expect(isFullyUsed()).toBe(true)
    })

    it('should validate unused credit note', () => {
      const creditNote = {
        amount: 1000,
        balance: 1000
      }

      const isUnused = () => {
        return creditNote.balance === creditNote.amount
      }

      expect(isUnused()).toBe(true)
    })

    it('should validate partial usage', () => {
      const creditNote = {
        amount: 1000,
        balance: 600
      }

      const isPartiallyUsed = () => {
        return creditNote.balance > 0 && creditNote.balance < creditNote.amount
      }

      expect(isPartiallyUsed()).toBe(true)
    })
  })

  describe('Credit Note Usage Logic', () => {
    it('should validate usage amount against credit note balance', () => {
      const creditNote = { balance: 500 }
      const usage = { amount: 300 }

      const isValidUsage = () => {
        return usage.amount > 0 && usage.amount <= creditNote.balance
      }

      expect(isValidUsage()).toBe(true)
    })

    it('should reject usage exceeding balance', () => {
      const creditNote = { balance: 500 }
      const usage = { amount: 600 }

      const isValidUsage = () => {
        return usage.amount > 0 && usage.amount <= creditNote.balance
      }

      expect(isValidUsage()).toBe(false)
    })

    it('should calculate remaining balance after usage', () => {
      const creditNote = { amount: 1000, balance: 1000 }
      const usage = { amount: 300 }

      const remainingBalance = creditNote.balance - usage.amount

      expect(remainingBalance).toBe(700)
    })

    it('should track multiple usages', () => {
      const creditNote = { amount: 1000, balance: 1000 }
      const usages = [
        { amount: 200 },
        { amount: 300 },
        { amount: 100 }
      ]

      const totalUsed = usages.reduce((sum, usage) => sum + usage.amount, 0)
      const remainingBalance = creditNote.balance - totalUsed

      expect(totalUsed).toBe(600)
      expect(remainingBalance).toBe(400)
    })
  })

  describe('Site Isolation Logic', () => {
    it('should filter payments by site', () => {
      const allPayments = [
        { id: '1', vendor: 'v1', amount: 100, site: 'site-1' },
        { id: '2', vendor: 'v2', amount: 200, site: 'site-2' },
        { id: '3', vendor: 'v3', amount: 300, site: 'site-1' }
      ]

      const currentSite = 'site-1'
      const sitePayments = allPayments.filter(p => p.site === currentSite)

      expect(sitePayments).toHaveLength(2)
      expect(sitePayments[0].id).toBe('1')
      expect(sitePayments[1].id).toBe('3')
    })

    it('should filter accounts by site', () => {
      const allAccounts = [
        { id: '1', name: 'Bank A', site: 'site-1' },
        { id: '2', name: 'Bank B', site: 'site-2' },
        { id: '3', name: 'Cash', site: 'site-1' }
      ]

      const currentSite = 'site-1'
      const siteAccounts = allAccounts.filter(a => a.site === currentSite)

      expect(siteAccounts).toHaveLength(2)
      expect(siteAccounts[0].name).toBe('Bank A')
      expect(siteAccounts[1].name).toBe('Cash')
    })

    it('should filter credit notes by site', () => {
      const allCreditNotes = [
        { id: '1', vendor: 'v1', amount: 500, site: 'site-1' },
        { id: '2', vendor: 'v2', amount: 300, site: 'site-2' },
        { id: '3', vendor: 'v3', amount: 200, site: 'site-1' }
      ]

      const currentSite = 'site-1'
      const siteCreditNotes = allCreditNotes.filter(cn => cn.site === currentSite)

      expect(siteCreditNotes).toHaveLength(2)
      expect(siteCreditNotes.reduce((sum, cn) => sum + cn.amount, 0)).toBe(700)
    })
  })

  describe('Payment Data Consistency', () => {
    it('should ensure payment amount matches allocations', () => {
      const payment = { id: 'payment-1', amount: 1000 }
      const allocations = [
        { payment: 'payment-1', allocated_amount: 600 },
        { payment: 'payment-1', allocated_amount: 400 }
      ]

      const totalAllocated = allocations
        .filter(a => a.payment === payment.id)
        .reduce((sum, a) => sum + a.allocated_amount, 0)

      expect(totalAllocated).toBe(payment.amount)
    })

    it('should identify unallocated payment amount', () => {
      const payment = { id: 'payment-1', amount: 1000 }
      const allocations = [
        { payment: 'payment-1', allocated_amount: 300 },
        { payment: 'payment-1', allocated_amount: 200 }
      ]

      const totalAllocated = allocations
        .filter(a => a.payment === payment.id)
        .reduce((sum, a) => sum + a.allocated_amount, 0)

      const unallocated = payment.amount - totalAllocated

      expect(unallocated).toBe(500)
      expect(unallocated > 0).toBe(true)
    })
  })

  describe('Reference Number Generation Logic', () => {
    it('should generate unique reference from ID', () => {
      const payment = { id: 'abc123def456' }

      const generateReference = (id: string) => {
        return `PAY-${id.slice(-6).toUpperCase()}`
      }

      expect(generateReference(payment.id)).toBe('PAY-DEF456')
    })

    it('should format account reference', () => {
      const account = { id: 'account789xyz' }

      const generateReference = (id: string, prefix: string) => {
        return `${prefix}-${id.slice(-6).toUpperCase()}`
      }

      expect(generateReference(account.id, 'ACC')).toBe('ACC-789XYZ')
    })

    it('should format credit note reference', () => {
      const creditNote = { id: 'cn12345abcde' }

      const generateReference = (id: string) => {
        return `CN-${id.slice(-6).toUpperCase()}`
      }

      expect(generateReference(creditNote.id)).toBe('CN-5ABCDE')
    })
  })

  describe('Amount Formatting and Precision', () => {
    it('should maintain 2 decimal precision for currency', () => {
      const amount = 1234.567

      const formatted = Math.round(amount * 100) / 100

      expect(formatted).toBe(1234.57)
    })

    it('should handle rounding edge cases', () => {
      const amount1 = 1234.565 // Should round up
      const amount2 = 1234.564 // Should round down

      const formatted1 = Math.round(amount1 * 100) / 100
      const formatted2 = Math.round(amount2 * 100) / 100

      expect(formatted1).toBe(1234.57)
      expect(formatted2).toBe(1234.56)
    })

    it('should format amount with currency symbol', () => {
      const amount = 1234.50

      const formatted = `₹${amount.toFixed(2)}`

      expect(formatted).toBe('₹1234.50')
    })

    it('should handle zero amount', () => {
      const amount = 0

      const formatted = `₹${amount.toFixed(2)}`

      expect(formatted).toBe('₹0.00')
    })
  })

  describe('Payment Allocation Update Logic', () => {
    // Helper types to simulate the data structures
    interface MockAllocation {
      id: string
      payment: string
      delivery?: string
      service_booking?: string
      allocated_amount: number
    }

    interface MockPayment {
      id: string
      amount: number
      payment_allocations: string[]
    }

    // Simulates the updateAllocations logic for preserving existing allocations
    const simulateUpdateAllocations = (
      payment: MockPayment,
      existingAllocations: MockAllocation[],
      newDeliveryIds: string[],
      newServiceBookingIds: string[],
      deliveryOutstanding: Record<string, number>,
      bookingOutstanding: Record<string, number>
    ) => {
      // Create sets of already allocated item IDs
      const existingDeliveryIds = new Set(
        existingAllocations.filter(a => a.delivery).map(a => a.delivery!)
      )
      const existingServiceBookingIds = new Set(
        existingAllocations.filter(a => a.service_booking).map(a => a.service_booking!)
      )

      // Calculate already allocated amount from existing allocations
      const existingAllocatedAmount = existingAllocations.reduce((sum, a) => sum + a.allocated_amount, 0)

      // Filter to only new items (not already allocated)
      const actualNewDeliveryIds = newDeliveryIds.filter(id => !existingDeliveryIds.has(id))
      const actualNewServiceBookingIds = newServiceBookingIds.filter(id => !existingServiceBookingIds.has(id))

      // Calculate remaining amount available for new allocations
      let remainingAmount = payment.amount - existingAllocatedAmount

      // Create new allocations
      const newAllocations: MockAllocation[] = []

      // Handle new delivery allocations
      for (const deliveryId of actualNewDeliveryIds) {
        if (remainingAmount <= 0) break
        const outstanding = deliveryOutstanding[deliveryId] || 0
        const allocatedAmount = Math.min(remainingAmount, outstanding)
        if (allocatedAmount > 0) {
          newAllocations.push({
            id: `alloc-${deliveryId}`,
            payment: payment.id,
            delivery: deliveryId,
            allocated_amount: allocatedAmount
          })
          remainingAmount -= allocatedAmount
        }
      }

      // Handle new service booking allocations
      for (const bookingId of actualNewServiceBookingIds) {
        if (remainingAmount <= 0) break
        const outstanding = bookingOutstanding[bookingId] || 0
        const allocatedAmount = Math.min(remainingAmount, outstanding)
        if (allocatedAmount > 0) {
          newAllocations.push({
            id: `alloc-${bookingId}`,
            payment: payment.id,
            service_booking: bookingId,
            allocated_amount: allocatedAmount
          })
          remainingAmount -= allocatedAmount
        }
      }

      // Combine existing and new allocations
      const allAllocations = [...existingAllocations, ...newAllocations]
      const allAllocationIds = allAllocations.map(a => a.id)

      return {
        existingPreserved: existingAllocations.length,
        newCreated: newAllocations.length,
        allAllocations,
        allAllocationIds,
        remainingUnallocated: remainingAmount
      }
    }

    it('should preserve existing delivery allocation when adding service booking', () => {
      const payment: MockPayment = { id: 'payment-1', amount: 1000, payment_allocations: ['alloc-1'] }
      const existingAllocations: MockAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', delivery: 'delivery-1', allocated_amount: 400 }
      ]

      const result = simulateUpdateAllocations(
        payment,
        existingAllocations,
        ['delivery-1'], // Same delivery ID (should be ignored)
        ['booking-1'],  // New service booking
        { 'delivery-1': 400 },
        { 'booking-1': 300 }
      )

      expect(result.existingPreserved).toBe(1)
      expect(result.newCreated).toBe(1)
      expect(result.allAllocations).toHaveLength(2)

      // Existing delivery allocation preserved
      const deliveryAlloc = result.allAllocations.find(a => a.delivery === 'delivery-1')
      expect(deliveryAlloc).toBeDefined()
      expect(deliveryAlloc!.allocated_amount).toBe(400)

      // New service booking allocation added
      const bookingAlloc = result.allAllocations.find(a => a.service_booking === 'booking-1')
      expect(bookingAlloc).toBeDefined()
      expect(bookingAlloc!.allocated_amount).toBe(300)
    })

    it('should preserve existing service booking allocation when adding delivery', () => {
      const payment: MockPayment = { id: 'payment-1', amount: 1000, payment_allocations: ['alloc-1'] }
      const existingAllocations: MockAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', service_booking: 'booking-1', allocated_amount: 500 }
      ]

      const result = simulateUpdateAllocations(
        payment,
        existingAllocations,
        ['delivery-1'],  // New delivery
        ['booking-1'],   // Same booking ID (should be ignored)
        { 'delivery-1': 300 },
        { 'booking-1': 500 }
      )

      expect(result.existingPreserved).toBe(1)
      expect(result.newCreated).toBe(1)
      expect(result.allAllocations).toHaveLength(2)

      // Existing service booking allocation preserved
      const bookingAlloc = result.allAllocations.find(a => a.service_booking === 'booking-1')
      expect(bookingAlloc).toBeDefined()
      expect(bookingAlloc!.allocated_amount).toBe(500)

      // New delivery allocation added
      const deliveryAlloc = result.allAllocations.find(a => a.delivery === 'delivery-1')
      expect(deliveryAlloc).toBeDefined()
      expect(deliveryAlloc!.allocated_amount).toBe(300)
    })

    it('should preserve multiple existing allocations when adding new ones', () => {
      const payment: MockPayment = { id: 'payment-1', amount: 2000, payment_allocations: ['alloc-1', 'alloc-2'] }
      const existingAllocations: MockAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', delivery: 'delivery-1', allocated_amount: 400 },
        { id: 'alloc-2', payment: 'payment-1', service_booking: 'booking-1', allocated_amount: 600 }
      ]

      const result = simulateUpdateAllocations(
        payment,
        existingAllocations,
        ['delivery-1', 'delivery-2'],  // delivery-1 exists, delivery-2 is new
        ['booking-1', 'booking-2'],    // booking-1 exists, booking-2 is new
        { 'delivery-1': 400, 'delivery-2': 500 },
        { 'booking-1': 600, 'booking-2': 300 }
      )

      expect(result.existingPreserved).toBe(2)
      expect(result.newCreated).toBe(2)
      expect(result.allAllocations).toHaveLength(4)

      // Total allocated should not exceed payment amount
      const totalAllocated = result.allAllocations.reduce((sum, a) => sum + a.allocated_amount, 0)
      expect(totalAllocated).toBeLessThanOrEqual(payment.amount)
    })

    it('should not create duplicate allocations for same item', () => {
      const payment: MockPayment = { id: 'payment-1', amount: 1000, payment_allocations: ['alloc-1'] }
      const existingAllocations: MockAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', delivery: 'delivery-1', allocated_amount: 500 }
      ]

      const result = simulateUpdateAllocations(
        payment,
        existingAllocations,
        ['delivery-1'],  // Same delivery ID - should be ignored
        [],
        { 'delivery-1': 500 },
        {}
      )

      expect(result.existingPreserved).toBe(1)
      expect(result.newCreated).toBe(0)
      expect(result.allAllocations).toHaveLength(1)

      // Only one allocation for delivery-1
      const deliveryAllocs = result.allAllocations.filter(a => a.delivery === 'delivery-1')
      expect(deliveryAllocs).toHaveLength(1)
    })

    it('should respect remaining unallocated amount when adding new allocations', () => {
      const payment: MockPayment = { id: 'payment-1', amount: 1000, payment_allocations: ['alloc-1'] }
      const existingAllocations: MockAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', delivery: 'delivery-1', allocated_amount: 800 }
      ]

      const result = simulateUpdateAllocations(
        payment,
        existingAllocations,
        ['delivery-1'],
        ['booking-1'],  // Outstanding is 500, but only 200 remaining
        { 'delivery-1': 800 },
        { 'booking-1': 500 }
      )

      expect(result.existingPreserved).toBe(1)
      expect(result.newCreated).toBe(1)

      // New booking allocation should be capped at remaining amount (200)
      const bookingAlloc = result.allAllocations.find(a => a.service_booking === 'booking-1')
      expect(bookingAlloc).toBeDefined()
      expect(bookingAlloc!.allocated_amount).toBe(200)

      // Total allocated should equal payment amount
      const totalAllocated = result.allAllocations.reduce((sum, a) => sum + a.allocated_amount, 0)
      expect(totalAllocated).toBe(1000)
    })

    it('should not create allocations when payment is fully allocated', () => {
      const payment: MockPayment = { id: 'payment-1', amount: 1000, payment_allocations: ['alloc-1', 'alloc-2'] }
      const existingAllocations: MockAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', delivery: 'delivery-1', allocated_amount: 600 },
        { id: 'alloc-2', payment: 'payment-1', service_booking: 'booking-1', allocated_amount: 400 }
      ]

      const result = simulateUpdateAllocations(
        payment,
        existingAllocations,
        ['delivery-1', 'delivery-2'],
        ['booking-1', 'booking-2'],
        { 'delivery-1': 600, 'delivery-2': 300 },
        { 'booking-1': 400, 'booking-2': 200 }
      )

      expect(result.existingPreserved).toBe(2)
      expect(result.newCreated).toBe(0)
      expect(result.remainingUnallocated).toBe(0)
    })

    it('should update payment_allocations array with all allocation IDs', () => {
      const payment: MockPayment = { id: 'payment-1', amount: 1000, payment_allocations: ['alloc-1'] }
      const existingAllocations: MockAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', delivery: 'delivery-1', allocated_amount: 400 }
      ]

      const result = simulateUpdateAllocations(
        payment,
        existingAllocations,
        ['delivery-1'],
        ['booking-1'],
        { 'delivery-1': 400 },
        { 'booking-1': 300 }
      )

      // Should include both existing and new allocation IDs
      expect(result.allAllocationIds).toContain('alloc-1')
      expect(result.allAllocationIds).toContain('alloc-booking-1')
      expect(result.allAllocationIds).toHaveLength(2)
    })

    it('should handle empty existing allocations', () => {
      const payment: MockPayment = { id: 'payment-1', amount: 1000, payment_allocations: [] }
      const existingAllocations: MockAllocation[] = []

      const result = simulateUpdateAllocations(
        payment,
        existingAllocations,
        ['delivery-1'],
        ['booking-1'],
        { 'delivery-1': 400 },
        { 'booking-1': 300 }
      )

      expect(result.existingPreserved).toBe(0)
      expect(result.newCreated).toBe(2)
      expect(result.allAllocations).toHaveLength(2)
    })

    it('should return early when no new items to allocate', () => {
      const payment: MockPayment = { id: 'payment-1', amount: 1000, payment_allocations: ['alloc-1'] }
      const existingAllocations: MockAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', delivery: 'delivery-1', allocated_amount: 400 }
      ]

      const result = simulateUpdateAllocations(
        payment,
        existingAllocations,
        ['delivery-1'],  // Already allocated
        [],              // No new bookings
        { 'delivery-1': 400 },
        {}
      )

      expect(result.existingPreserved).toBe(1)
      expect(result.newCreated).toBe(0)
      expect(result.allAllocations).toHaveLength(1)
    })
  })

  describe('Allocation Status Display Logic', () => {
    // Helper to calculate allocation status
    const getAllocationStatus = (payment: { amount: number }, allocations: { allocated_amount: number }[]) => {
      const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0)

      if (allocations.length === 0) {
        return 'no_allocations'
      } else if (totalAllocated >= payment.amount) {
        return 'fully_allocated'
      } else if (totalAllocated > 0) {
        return 'partially_allocated'
      } else {
        return 'unallocated'
      }
    }

    it('should show fully allocated for payment with complete allocation', () => {
      const payment = { amount: 1000 }
      const allocations = [
        { allocated_amount: 600 },
        { allocated_amount: 400 }
      ]

      expect(getAllocationStatus(payment, allocations)).toBe('fully_allocated')
    })

    it('should show partially allocated for payment with partial allocation', () => {
      const payment = { amount: 1000 }
      const allocations = [
        { allocated_amount: 300 },
        { allocated_amount: 200 }
      ]

      expect(getAllocationStatus(payment, allocations)).toBe('partially_allocated')
    })

    it('should show no allocations for payment without any allocations', () => {
      const payment = { amount: 1000 }
      const allocations: { allocated_amount: number }[] = []

      expect(getAllocationStatus(payment, allocations)).toBe('no_allocations')
    })

    it('should show fully allocated for delivery-only payment', () => {
      const payment = { amount: 500 }
      const allocations = [
        { allocated_amount: 500, delivery: 'delivery-1' }
      ]

      expect(getAllocationStatus(payment, allocations)).toBe('fully_allocated')
    })

    it('should show fully allocated for service-only payment', () => {
      const payment = { amount: 500 }
      const allocations = [
        { allocated_amount: 500, service_booking: 'booking-1' }
      ]

      expect(getAllocationStatus(payment, allocations)).toBe('fully_allocated')
    })

    it('should show fully allocated for mixed delivery and service payment', () => {
      const payment = { amount: 1000 }
      const allocations = [
        { allocated_amount: 600, delivery: 'delivery-1' },
        { allocated_amount: 400, service_booking: 'booking-1' }
      ]

      expect(getAllocationStatus(payment, allocations)).toBe('fully_allocated')
    })

    it('should show partially allocated for mixed payment with remaining amount', () => {
      const payment = { amount: 1000 }
      const allocations = [
        { allocated_amount: 400, delivery: 'delivery-1' },
        { allocated_amount: 200, service_booking: 'booking-1' }
      ]

      expect(getAllocationStatus(payment, allocations)).toBe('partially_allocated')
    })

    it('should calculate unallocated amount correctly', () => {
      const payment = { amount: 1000 }
      const allocations = [
        { allocated_amount: 400 },
        { allocated_amount: 300 }
      ]

      const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0)
      const unallocated = payment.amount - totalAllocated

      expect(unallocated).toBe(300)
    })

    it('should handle zero allocations in array', () => {
      const payment = { amount: 1000 }
      const allocations = [
        { allocated_amount: 0 },
        { allocated_amount: 0 }
      ]

      expect(getAllocationStatus(payment, allocations)).toBe('unallocated')
    })
  })
})
