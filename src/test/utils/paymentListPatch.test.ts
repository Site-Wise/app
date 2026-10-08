import { describe, it, expect } from 'vitest'
import { upsertSavedPayment } from '../../utils/paymentListPatch'
import type { Payment } from '../../services/pocketbase'

const payment = (id: string, vendor = 'vendor-1', account = 'account-1', amount = 100): Payment => ({
  id, vendor, account, amount, payment_date: '2024-01-01', deliveries: [], service_bookings: []
} as Payment)

describe('upsertSavedPayment', () => {
  it('prepends a newly created payment', () => {
    const list = [payment('p1'), payment('p2')]
    const result = upsertSavedPayment(list, payment('p3'))
    expect(result.map(p => p.id)).toEqual(['p3', 'p1', 'p2'])
    expect(list.map(p => p.id)).toEqual(['p1', 'p2']) // input untouched
  })

  it('replaces an edited payment instead of duplicating it', () => {
    const list = [payment('p1'), payment('p2', 'vendor-1', 'account-1', 100)]
    const result = upsertSavedPayment(list, payment('p2', 'vendor-1', 'account-1', 250))
    expect(result.map(p => p.id)).toEqual(['p2', 'p1'])
    expect(result[0].amount).toBe(250)
  })

  it('keeps a payment that matches the active vendor/account filter', () => {
    const result = upsertSavedPayment([], payment('p1', 'vendor-1', 'account-2'), { vendor: 'vendor-1', account: 'account-2' })
    expect(result.map(p => p.id)).toEqual(['p1'])
  })

  it('leaves out a payment outside the active vendor filter', () => {
    const result = upsertSavedPayment([payment('p1')], payment('p2', 'vendor-2'), { vendor: 'vendor-1' })
    expect(result.map(p => p.id)).toEqual(['p1'])
  })

  it('removes an edited payment that no longer matches the account filter', () => {
    const list = [payment('p1', 'vendor-1', 'account-1')]
    const result = upsertSavedPayment(list, payment('p1', 'vendor-1', 'account-2'), { account: 'account-1' })
    expect(result).toEqual([])
  })
})
