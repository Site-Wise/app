import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Payment, PaymentAllocation, Vendor, Account } from '../../services/pocketbase'

/**
 * Tests for PaymentsView Business Logic
 * Focuses on financial calculations, permissions, validation, and data transformations
 */

describe('PaymentsView Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Payment Allocation Calculations', () => {
    it('should calculate unallocated amount correctly', () => {
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const allocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', allocated_amount: 300, site: 'site-1' } as PaymentAllocation,
        { id: 'alloc-2', payment: 'payment-1', allocated_amount: 200, site: 'site-1' } as PaymentAllocation
      ]

      const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
        const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
        return payment.amount - allocatedAmount
      }

      const unallocated = getUnallocatedAmount(payment, allocations)
      expect(unallocated).toBe(500) // 1000 - 300 - 200
    })

    it('should return full amount when no allocations exist', () => {
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1500,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
        const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
        return payment.amount - allocatedAmount
      }

      const unallocated = getUnallocatedAmount(payment, [])
      expect(unallocated).toBe(1500)
    })

    it('should return zero when fully allocated', () => {
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const allocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', allocated_amount: 600, site: 'site-1' } as PaymentAllocation,
        { id: 'alloc-2', payment: 'payment-1', allocated_amount: 400, site: 'site-1' } as PaymentAllocation
      ]

      const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
        const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
        return payment.amount - allocatedAmount
      }

      const unallocated = getUnallocatedAmount(payment, allocations)
      expect(unallocated).toBe(0)
    })

    it('should calculate total allocated amount correctly', () => {
      const allocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', allocated_amount: 250.50, site: 'site-1' } as PaymentAllocation,
        { id: 'alloc-2', payment: 'payment-1', allocated_amount: 125.75, site: 'site-1' } as PaymentAllocation,
        { id: 'alloc-3', payment: 'payment-1', allocated_amount: 623.25, site: 'site-1' } as PaymentAllocation
      ]

      const getAllocatedAmount = (allocations: PaymentAllocation[]): number => {
        return allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
      }

      const total = getAllocatedAmount(allocations)
      expect(total).toBe(999.50) // 250.50 + 125.75 + 623.25
    })

    it('should return zero for empty allocations array', () => {
      const getAllocatedAmount = (allocations: PaymentAllocation[]): number => {
        return allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
      }

      const total = getAllocatedAmount([])
      expect(total).toBe(0)
    })

    it('should handle single allocation correctly', () => {
      const allocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', allocated_amount: 500, site: 'site-1' } as PaymentAllocation
      ]

      const getAllocatedAmount = (allocations: PaymentAllocation[]): number => {
        return allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
      }

      const total = getAllocatedAmount(allocations)
      expect(total).toBe(500)
    })

    it('should handle over-allocation scenario', () => {
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const allocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', allocated_amount: 700, site: 'site-1' } as PaymentAllocation,
        { id: 'alloc-2', payment: 'payment-1', allocated_amount: 500, site: 'site-1' } as PaymentAllocation
      ]

      const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
        const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
        return payment.amount - allocatedAmount
      }

      const unallocated = getUnallocatedAmount(payment, allocations)
      expect(unallocated).toBe(-200) // Over-allocated by 200
    })
  })

  describe('Payment Edit Permissions', () => {
    it('should allow editing when user is owner and payment has unallocated amount', () => {
      const canEditPayment = true // owner permission
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }
      const allocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', allocated_amount: 300, site: 'site-1' } as PaymentAllocation
      ]

      const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
        const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
        return payment.amount - allocatedAmount
      }

      const canPaymentBeEdited = (payment: Payment, allocations: PaymentAllocation[]): boolean => {
        if (!canEditPayment) return false
        const unallocatedAmount = getUnallocatedAmount(payment, allocations)
        return unallocatedAmount > 0
      }

      expect(canPaymentBeEdited(payment, allocations)).toBe(true)
    })

    it('should not allow editing when fully allocated', () => {
      const canEditPayment = true
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }
      const allocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', allocated_amount: 1000, site: 'site-1' } as PaymentAllocation
      ]

      const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
        const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
        return payment.amount - allocatedAmount
      }

      const canPaymentBeEdited = (payment: Payment, allocations: PaymentAllocation[]): boolean => {
        if (!canEditPayment) return false
        const unallocatedAmount = getUnallocatedAmount(payment, allocations)
        return unallocatedAmount > 0
      }

      expect(canPaymentBeEdited(payment, allocations)).toBe(false)
    })

    it('should not allow editing when user lacks permission', () => {
      const canEditPayment = false // non-owner user
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }
      const allocations: PaymentAllocation[] = []

      const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
        const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
        return payment.amount - allocatedAmount
      }

      const canPaymentBeEdited = (payment: Payment, allocations: PaymentAllocation[]): boolean => {
        if (!canEditPayment) return false
        const unallocatedAmount = getUnallocatedAmount(payment, allocations)
        return unallocatedAmount > 0
      }

      expect(canPaymentBeEdited(payment, allocations)).toBe(false)
    })

    it('should allow editing when payment has no allocations', () => {
      const canEditPayment = true
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1500,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
        const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
        return payment.amount - allocatedAmount
      }

      const canPaymentBeEdited = (payment: Payment, allocations: PaymentAllocation[]): boolean => {
        if (!canEditPayment) return false
        const unallocatedAmount = getUnallocatedAmount(payment, allocations)
        return unallocatedAmount > 0
      }

      expect(canPaymentBeEdited(payment, [])).toBe(true)
    })
  })

  describe('Payment Delete Permissions', () => {
    it('should allow deletion when user is owner and no allocations exist', () => {
      const canEditPayment = true
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const canPaymentBeDeleted = (_payment: Payment, allocations: PaymentAllocation[]): boolean => {
        if (!canEditPayment) return false
        return allocations.length === 0
      }

      expect(canPaymentBeDeleted(payment, [])).toBe(true)
    })

    it('should not allow deletion when allocations exist', () => {
      const canEditPayment = true
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }
      const allocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', allocated_amount: 100, site: 'site-1' } as PaymentAllocation
      ]

      const canPaymentBeDeleted = (_payment: Payment, allocations: PaymentAllocation[]): boolean => {
        if (!canEditPayment) return false
        return allocations.length === 0
      }

      expect(canPaymentBeDeleted(payment, allocations)).toBe(false)
    })

    it('should not allow deletion when user lacks permission', () => {
      const canEditPayment = false
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }

      const canPaymentBeDeleted = (_payment: Payment, allocations: PaymentAllocation[]): boolean => {
        if (!canEditPayment) return false
        return allocations.length === 0
      }

      expect(canPaymentBeDeleted(payment, [])).toBe(false)
    })

    it('should not allow deletion with multiple allocations', () => {
      const canEditPayment = true
      const payment: Payment = {
        id: 'payment-1',
        vendor: 'vendor-1',
        amount: 1000,
        payment_date: '2024-01-01',
        site: 'site-1'
      }
      const allocations: PaymentAllocation[] = [
        { id: 'alloc-1', payment: 'payment-1', allocated_amount: 100, site: 'site-1' } as PaymentAllocation,
        { id: 'alloc-2', payment: 'payment-1', allocated_amount: 200, site: 'site-1' } as PaymentAllocation
      ]

      const canPaymentBeDeleted = (_payment: Payment, allocations: PaymentAllocation[]): boolean => {
        if (!canEditPayment) return false
        return allocations.length === 0
      }

      expect(canPaymentBeDeleted(payment, allocations)).toBe(false)
    })
  })

  describe('Account Icon Selection', () => {
    it('should return correct icon for bank account', () => {
      const getAccountIcon = (type?: Account['type']) => {
        if (!type) return 'Wallet'
        const icons = {
          bank: 'Building2',
          credit_card: 'CreditCard',
          cash: 'Banknote',
          digital_wallet: 'Smartphone',
          other: 'Wallet'
        }
        return icons[type] || 'Wallet'
      }

      expect(getAccountIcon('bank')).toBe('Building2')
    })

    it('should return correct icon for credit card', () => {
      const getAccountIcon = (type?: Account['type']) => {
        if (!type) return 'Wallet'
        const icons = {
          bank: 'Building2',
          credit_card: 'CreditCard',
          cash: 'Banknote',
          digital_wallet: 'Smartphone',
          other: 'Wallet'
        }
        return icons[type] || 'Wallet'
      }

      expect(getAccountIcon('credit_card')).toBe('CreditCard')
    })

    it('should return correct icon for cash', () => {
      const getAccountIcon = (type?: Account['type']) => {
        if (!type) return 'Wallet'
        const icons = {
          bank: 'Building2',
          credit_card: 'CreditCard',
          cash: 'Banknote',
          digital_wallet: 'Smartphone',
          other: 'Wallet'
        }
        return icons[type] || 'Wallet'
      }

      expect(getAccountIcon('cash')).toBe('Banknote')
    })

    it('should return correct icon for digital wallet', () => {
      const getAccountIcon = (type?: Account['type']) => {
        if (!type) return 'Wallet'
        const icons = {
          bank: 'Building2',
          credit_card: 'CreditCard',
          cash: 'Banknote',
          digital_wallet: 'Smartphone',
          other: 'Wallet'
        }
        return icons[type] || 'Wallet'
      }

      expect(getAccountIcon('digital_wallet')).toBe('Smartphone')
    })

    it('should return Wallet for other account type', () => {
      const getAccountIcon = (type?: Account['type']) => {
        if (!type) return 'Wallet'
        const icons = {
          bank: 'Building2',
          credit_card: 'CreditCard',
          cash: 'Banknote',
          digital_wallet: 'Smartphone',
          other: 'Wallet'
        }
        return icons[type] || 'Wallet'
      }

      expect(getAccountIcon('other')).toBe('Wallet')
    })

    it('should return Wallet for undefined type', () => {
      const getAccountIcon = (type?: Account['type']) => {
        if (!type) return 'Wallet'
        const icons = {
          bank: 'Building2',
          credit_card: 'CreditCard',
          cash: 'Banknote',
          digital_wallet: 'Smartphone',
          other: 'Wallet'
        }
        return icons[type] || 'Wallet'
      }

      expect(getAccountIcon(undefined)).toBe('Wallet')
    })

    it('should return Wallet as fallback for unknown type', () => {
      const getAccountIcon = (type?: Account['type']) => {
        if (!type) return 'Wallet'
        const icons = {
          bank: 'Building2',
          credit_card: 'CreditCard',
          cash: 'Banknote',
          digital_wallet: 'Smartphone',
          other: 'Wallet'
        }
        return icons[type] || 'Wallet'
      }

      // Type assertion for testing unknown values
      expect(getAccountIcon('unknown_type' as any)).toBe('Wallet')
    })
  })

  describe('Date Formatting', () => {
    it('should format date string to locale date string', () => {
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
      }

      const formatted = formatDate('2024-01-15')
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should handle different date formats', () => {
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
      }

      const formatted1 = formatDate('2024-12-25')
      const formatted2 = formatDate('2024-06-30')

      expect(formatted1).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
      expect(formatted2).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should create valid date object from string', () => {
      const dateString = '2024-03-20'
      const date = new Date(dateString)

      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(2) // March is month 2 (0-indexed)
      expect(date.getDate()).toBe(20)
    })
  })

  describe('Search Results Summary', () => {
    it('should count search results correctly', () => {
      const searchQuery = 'vendor'
      const payments: Payment[] = [
        { id: '1', vendor: 'v1', amount: 100, payment_date: '2024-01-01', site: 'site-1' },
        { id: '2', vendor: 'v2', amount: 200, payment_date: '2024-01-02', site: 'site-1' }
      ]

      const count = searchQuery.trim() ? payments.length : 0
      expect(count).toBe(2)
    })

    it('should return zero count for empty search query', () => {
      const searchQuery = ''
      const payments: Payment[] = [
        { id: '1', vendor: 'v1', amount: 100, payment_date: '2024-01-01', site: 'site-1' }
      ]

      const count = searchQuery.trim() ? payments.length : 0
      expect(count).toBe(0)
    })

    it('should calculate total amount of search results', () => {
      const searchQuery = 'test'
      const payments: Payment[] = [
        { id: '1', vendor: 'v1', amount: 150.50, payment_date: '2024-01-01', site: 'site-1' },
        { id: '2', vendor: 'v2', amount: 249.50, payment_date: '2024-01-02', site: 'site-1' },
        { id: '3', vendor: 'v3', amount: 100, payment_date: '2024-01-03', site: 'site-1' }
      ]

      const total = searchQuery.trim() && payments.length > 0
        ? payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
        : 0

      expect(total).toBe(500)
    })

    it('should return zero total for empty search', () => {
      const searchQuery = ''
      const payments: Payment[] = [
        { id: '1', vendor: 'v1', amount: 100, payment_date: '2024-01-01', site: 'site-1' }
      ]

      const total = searchQuery.trim() && payments.length > 0
        ? payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
        : 0

      expect(total).toBe(0)
    })

    it('should return zero total for empty results', () => {
      const searchQuery = 'test'
      const payments: Payment[] = []

      const total = searchQuery.trim() && payments.length > 0
        ? payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
        : 0

      expect(total).toBe(0)
    })

    it('should handle null amounts in total calculation', () => {
      const searchQuery = 'test'
      const payments: any[] = [
        { id: '1', vendor: 'v1', amount: 100, payment_date: '2024-01-01', site: 'site-1' },
        { id: '2', vendor: 'v2', amount: null, payment_date: '2024-01-02', site: 'site-1' },
        { id: '3', vendor: 'v3', amount: 50, payment_date: '2024-01-03', site: 'site-1' }
      ]

      const total = searchQuery.trim() && payments.length > 0
        ? payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
        : 0

      expect(total).toBe(150)
    })
  })

  describe('URL Relation-Filter Loader Branching', () => {
    // Mirrors PaymentsView's loadPayments() branch: ?vendor -> getByVendor,
    // ?account -> getByAccount, otherwise the unfiltered getAll().
    const paymentService = {
      getAll: vi.fn().mockResolvedValue([]),
      getByVendor: vi.fn().mockResolvedValue([]),
      getByAccount: vi.fn().mockResolvedValue([])
    }

    // Stubs that the broader (mounted) view would need; declared here so the
    // global RecordLink stub + useUrlFilters mock shape stay documented alongside
    // the loader contract this test exercises.
    const useUrlFiltersMock = () => ({
      filters: {} as Record<string, string>,
      hasActiveFilter: false,
      clearFilter: vi.fn(),
      setFilter: vi.fn(),
      activeFilterEntries: [],
      openRecord: vi.fn()
    })

    const loadPayments = (filters: Record<string, string>, sortParam = '-payment_date') => {
      if (filters.vendor) return paymentService.getByVendor(filters.vendor)
      if (filters.account) return paymentService.getByAccount(filters.account)
      return paymentService.getAll({ sort: sortParam })
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('exposes the expected useUrlFilters mock shape', () => {
      const f = useUrlFiltersMock()
      expect(f.filters).toEqual({})
      expect(f.hasActiveFilter).toBe(false)
      expect(typeof f.clearFilter).toBe('function')
      expect(typeof f.setFilter).toBe('function')
      expect(f.activeFilterEntries).toEqual([])
      expect(typeof f.openRecord).toBe('function')
    })

    it('calls getByVendor when filters.vendor is set', async () => {
      await loadPayments({ vendor: 'vendor-1' })
      expect(paymentService.getByVendor).toHaveBeenCalledWith('vendor-1')
      expect(paymentService.getByAccount).not.toHaveBeenCalled()
      expect(paymentService.getAll).not.toHaveBeenCalled()
    })

    it('calls getByAccount when filters.account is set (and no vendor)', async () => {
      await loadPayments({ account: 'account-1' })
      expect(paymentService.getByAccount).toHaveBeenCalledWith('account-1')
      expect(paymentService.getByVendor).not.toHaveBeenCalled()
      expect(paymentService.getAll).not.toHaveBeenCalled()
    })

    it('calls getAll when no relation-filter is active', async () => {
      await loadPayments({})
      expect(paymentService.getAll).toHaveBeenCalledWith({ sort: '-payment_date' })
      expect(paymentService.getByVendor).not.toHaveBeenCalled()
      expect(paymentService.getByAccount).not.toHaveBeenCalled()
    })

    it('prefers the vendor filter over the account filter', async () => {
      await loadPayments({ vendor: 'vendor-1', account: 'account-1' })
      expect(paymentService.getByVendor).toHaveBeenCalledWith('vendor-1')
      expect(paymentService.getByAccount).not.toHaveBeenCalled()
    })

    it('derives chip label from first loaded vendor row', () => {
      const filters: Record<string, string> = { vendor: 'vendor-1' }
      const payments = [
        { id: 'p1', expand: { vendor: { contact_person: 'Acme Co.' } } }
      ] as any[]
      const filterLabel = filters.vendor
        ? payments[0]?.expand?.vendor?.contact_person || ''
        : filters.account
          ? payments[0]?.expand?.account?.name || ''
          : ''
      expect(filterLabel).toBe('Acme Co.')
    })

    it('derives chip label from first loaded account row', () => {
      const filters: Record<string, string> = { account: 'account-1' }
      const payments = [
        { id: 'p1', expand: { account: { name: 'HDFC Bank' } } }
      ] as any[]
      const filterLabel = filters.vendor
        ? payments[0]?.expand?.vendor?.contact_person || ''
        : filters.account
          ? payments[0]?.expand?.account?.name || ''
          : ''
      expect(filterLabel).toBe('HDFC Bank')
    })
  })
})
