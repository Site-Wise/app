import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DuePaymentsModal from '../../components/DuePaymentsModal.vue'

/**
 * DuePaymentsModal lists vendors that still owe money, summing per-vendor
 * outstanding amounts via VendorService.calculateOutstandingFromData, filtering
 * out fully-paid vendors, showing a total, and emitting `pay-vendor` when a row
 * is tapped. The outstanding calculation itself is unit-tested elsewhere, so
 * here we stub it to return a deterministic amount per vendor and assert the
 * modal's own list-building / filtering / emit behaviour.
 */

// Per-vendor outstanding lookup the stub reads from.
const outstandingByVendor: Record<string, number> = {}

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('../../services/pocketbase', () => ({
  VendorService: {
    calculateOutstandingFromData: (vendorId: string) => outstandingByVendor[vendorId] ?? 0,
  },
}))

const makeVendor = (id: string, contact: string) => ({
  id,
  name: contact,
  contact_person: contact,
  email: '',
  phone: '',
  address: '',
}) as any

const makeDelivery = (vendor: string, total: number) => ({
  id: `del-${vendor}-${total}`,
  vendor,
  total_amount: total,
}) as any

const makeBooking = (vendor: string, percent: number) => ({
  id: `bk-${vendor}-${percent}`,
  vendor,
  percent_completed: percent,
  total_amount: 1000,
}) as any

describe('DuePaymentsModal (mounted)', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  const mountModal = (props: Record<string, unknown> = {}) =>
    mount(DuePaymentsModal as any, {
      props: {
        isVisible: true,
        vendors: [],
        deliveries: [],
        serviceBookings: [],
        payments: [],
        ...props,
      },
      global: { stubs: { AlertCircle: true, X: true, CheckCircle: true } },
    })

  beforeEach(() => {
    for (const k of Object.keys(outstandingByVendor)) delete outstandingByVendor[k]
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('does not render when isVisible is false', () => {
    wrapper = mountModal({ isVisible: false })
    expect(wrapper.find('.fixed.inset-0').exists()).toBe(false)
  })

  it('shows the empty state when no vendor has an outstanding balance', () => {
    outstandingByVendor['v1'] = 0
    wrapper = mountModal({ vendors: [makeVendor('v1', 'Alice')] })

    expect(wrapper.text()).toContain('payments.noOutstandingAmounts')
    expect(wrapper.text()).toContain('payments.allPaymentsCurrent')
    // No total-outstanding banner when there's nothing owed.
    expect(wrapper.text()).not.toContain('payments.totalOutstanding')
  })

  it('lists only vendors with a positive outstanding amount', () => {
    outstandingByVendor['v1'] = 500
    outstandingByVendor['v2'] = 0
    wrapper = mountModal({
      vendors: [makeVendor('v1', 'Alice'), makeVendor('v2', 'Bob')],
    })

    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).not.toContain('Bob')
    // Per-row formatted amount.
    expect(wrapper.text()).toContain('₹500.00')
  })

  it('renders the total outstanding as the sum across owing vendors', () => {
    outstandingByVendor['v1'] = 500
    outstandingByVendor['v2'] = 250
    wrapper = mountModal({
      vendors: [makeVendor('v1', 'Alice'), makeVendor('v2', 'Bob')],
    })

    expect(wrapper.text()).toContain('payments.totalOutstanding')
    // 500 + 250 = 750.
    expect(wrapper.text()).toContain('₹750.00')
  })

  it('counts pending deliveries and in-progress bookings per vendor', () => {
    outstandingByVendor['v1'] = 900
    wrapper = mountModal({
      vendors: [makeVendor('v1', 'Alice')],
      // Two deliveries with positive totals + one booking with progress > 0
      deliveries: [makeDelivery('v1', 400), makeDelivery('v1', 100), makeDelivery('v1', 0)],
      serviceBookings: [makeBooking('v1', 50), makeBooking('v1', 0)],
    })

    // 2 deliveries with total>0 + 1 booking with percent>0 = 3 pending items.
    expect(wrapper.text()).toContain('3 payments.pendingDeliveries')
  })

  it('emits pay-vendor with the enriched vendor when a row is clicked', async () => {
    outstandingByVendor['v1'] = 500
    wrapper = mountModal({
      vendors: [makeVendor('v1', 'Alice')],
      deliveries: [makeDelivery('v1', 500)],
    })

    const row = wrapper.find('.cursor-pointer')
    expect(row.exists()).toBe(true)
    await row.trigger('click')

    const emitted = wrapper.emitted('pay-vendor')
    expect(emitted).toBeTruthy()
    const payload = emitted![0][0] as any
    expect(payload.id).toBe('v1')
    expect(payload.outstandingAmount).toBe(500)
    expect(payload.pendingItems).toBe(1)
  })

  it('emits close from the footer close button', async () => {
    wrapper = mountModal({ vendors: [] })
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('common.close'))!
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close on backdrop click', async () => {
    wrapper = mountModal({ vendors: [] })
    await wrapper.find('.fixed.inset-0').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('handles a null/undefined vendors prop without throwing', () => {
    expect(() => {
      wrapper = mountModal({ vendors: undefined })
    }).not.toThrow()
    expect(wrapper!.text()).toContain('payments.noOutstandingAmounts')
  })
})
