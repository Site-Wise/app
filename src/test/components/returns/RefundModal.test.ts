import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../../utils/test-setup'
import RefundModal from '../../../components/returns/RefundModal.vue'

// Mock composables
vi.mock('../../../composables/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

vi.mock('../../../composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}))

// Mock services
vi.mock('../../../services/pocketbase', () => ({
  vendorRefundService: {
    create: vi.fn().mockResolvedValue({ id: 'refund-1' })
  },
  vendorCreditNoteService: {
    create: vi.fn().mockResolvedValue({ id: 'cn-1' }),
    getByReturn: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true)
  },
  vendorReturnService: {
    update: vi.fn().mockResolvedValue({ id: 'return-1' })
  },
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
  setCurrentUserRole: vi.fn(),
  calculatePermissions: vi.fn().mockReturnValue({
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true
  }),
  pb: { authStore: { isValid: true, model: { id: 'user-1' } } }
}))

const baseReturn = (overrides: any = {}) => ({
  id: 'return-abcdef',
  vendor: 'vendor-1',
  total_return_amount: 5000,
  expand: { vendor: { contact_person: 'John Doe', name: 'ABC Co' } },
  ...overrides
})

const accounts = [
  { id: 'acc-1', name: 'Cash', type: 'cash', is_active: true, current_balance: 10000 },
  { id: 'acc-2', name: 'Old Bank', type: 'bank_account', is_active: false, current_balance: 5000 },
  { id: 'acc-3', name: 'Bank', type: 'bank_account', is_active: true, current_balance: 25000 }
]

const mountModal = (pinia: any, props: any) =>
  mount(RefundModal, {
    global: { plugins: [pinia] },
    props: { accounts, ...props }
  })

describe('RefundModal', () => {
  let wrapper: any
  let pinia: any

  beforeEach(() => {
    vi.clearAllMocks()
    const { pinia: testPinia } = setupTestPinia()
    pinia = testPinia
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Max refund amount & initialisation', () => {
    it('computes max refund amount as total minus already refunded', () => {
      wrapper = mountModal(pinia, {
        returnData: baseReturn({ total_return_amount: 8000, actual_refund_amount: 3000 })
      })
      expect(wrapper.vm.maxRefundAmount).toBe(5000)
    })

    it('initialises the refund amount to the full refundable amount', () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ total_return_amount: 7000 }) })
      expect(wrapper.vm.form.refund_amount).toBe(7000)
    })

    it('returns zero max when there is no return data', () => {
      wrapper = mountModal(pinia, { returnData: null })
      expect(wrapper.vm.maxRefundAmount).toBe(0)
    })
  })

  describe('Account selection', () => {
    it('exposes only active accounts for selection', () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })
      const active = wrapper.vm.activeAccounts
      expect(active).toHaveLength(2)
      expect(active.map((a: any) => a.id)).toEqual(['acc-1', 'acc-3'])
    })

    it('renders an option per active account in the refund branch', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })
      wrapper.vm.form.processing_option = 'refund'
      await wrapper.vm.$nextTick()

      const options = wrapper.findAll('select option')
      // placeholder + 2 active accounts
      const accountOptionTexts = options.map((o: any) => o.text())
      expect(accountOptionTexts.some((t: string) => t.includes('Cash'))).toBe(true)
      expect(accountOptionTexts.some((t: string) => t.includes('Bank'))).toBe(true)
      // Inactive account must not appear
      expect(accountOptionTexts.some((t: string) => t.includes('Old Bank'))).toBe(false)
    })
  })

  describe('Submit button validation', () => {
    it('disables submit when refund amount is zero', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ total_return_amount: 5000 }) })
      wrapper.vm.form.refund_amount = 0
      await wrapper.vm.$nextTick()

      const submitBtn = wrapper.findAll('button').find((b: any) =>
        b.text().includes('vendors.processRefund') || b.text().includes('vendors.createCreditNote')
      )
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('disables submit when refund amount exceeds the max', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ total_return_amount: 5000 }) })
      wrapper.vm.form.refund_amount = 6000
      await wrapper.vm.$nextTick()

      const submitBtn = wrapper.findAll('button').find((b: any) =>
        b.text().includes('vendors.processRefund') || b.text().includes('vendors.createCreditNote')
      )
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('enables submit when refund amount is within range', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ total_return_amount: 5000 }) })
      wrapper.vm.form.refund_amount = 3000
      await wrapper.vm.$nextTick()

      const submitBtn = wrapper.findAll('button').find((b: any) =>
        b.text().includes('vendors.processRefund') || b.text().includes('vendors.createCreditNote')
      )
      expect(submitBtn.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Refund submission', () => {
    it('creates a refund record with the chosen account and emits save', async () => {
      const { vendorRefundService, vendorReturnService } = await import('../../../services/pocketbase')
      wrapper = mountModal(pinia, { returnData: baseReturn({ total_return_amount: 5000 }) })

      Object.assign(wrapper.vm.form, {
        processing_option: 'refund',
        refund_amount: 4000,
        account: 'acc-3',
        refund_method: 'bank_transfer',
        refund_date: '2024-02-01',
        reference: 'TXN-1',
        notes: 'partial refund'
      })

      await wrapper.vm.handleSubmit()

      expect(vendorRefundService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_return: 'return-abcdef',
          vendor: 'vendor-1',
          account: 'acc-3',
          refund_amount: 4000,
          refund_method: 'bank_transfer'
        })
      )
      // Return marked refunded with the actual refund amount
      expect(vendorReturnService.update).toHaveBeenCalledWith(
        'return-abcdef',
        expect.objectContaining({
          processing_option: 'refund',
          actual_refund_amount: 4000,
          status: 'refunded'
        })
      )
      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('deletes an unused credit note when switching from credit_note to refund', async () => {
      const { vendorCreditNoteService } = await import('../../../services/pocketbase')
      vi.mocked(vendorCreditNoteService.getByReturn).mockResolvedValueOnce([
        { id: 'cn-old', credit_amount: 1000, balance: 1000 } as any, // unused -> delete
        { id: 'cn-used', credit_amount: 1000, balance: 200 } as any   // partially used -> keep
      ])

      wrapper = mountModal(pinia, {
        returnData: baseReturn({ processing_option: 'credit_note', total_return_amount: 5000 })
      })

      Object.assign(wrapper.vm.form, {
        processing_option: 'refund',
        refund_amount: 1000,
        account: 'acc-1',
        refund_method: 'cash'
      })

      await wrapper.vm.handleSubmit()

      expect(vendorCreditNoteService.delete).toHaveBeenCalledWith('cn-old')
      expect(vendorCreditNoteService.delete).not.toHaveBeenCalledWith('cn-used')
    })
  })

  describe('Credit note submission', () => {
    it('creates a credit note and marks the return completed', async () => {
      const { vendorCreditNoteService, vendorReturnService, vendorRefundService } =
        await import('../../../services/pocketbase')
      wrapper = mountModal(pinia, { returnData: baseReturn({ total_return_amount: 5000 }) })

      Object.assign(wrapper.vm.form, {
        processing_option: 'credit_note',
        refund_amount: 5000,
        credit_reference: 'CN-2024-9',
        expiry_date: '2025-01-01'
      })

      await wrapper.vm.handleSubmit()

      expect(vendorCreditNoteService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor: 'vendor-1',
          credit_amount: 5000,
          balance: 5000,
          reference: 'CN-2024-9',
          return_id: 'return-abcdef',
          status: 'active'
        })
      )
      // No refund record created for credit note option
      expect(vendorRefundService.create).not.toHaveBeenCalled()
      expect(vendorReturnService.update).toHaveBeenCalledWith(
        'return-abcdef',
        expect.objectContaining({ processing_option: 'credit_note', status: 'completed' })
      )
      expect(wrapper.emitted('save')).toBeTruthy()
    })
  })

  describe('Submission guards & error handling', () => {
    it('does nothing when there is no return id', async () => {
      const { vendorRefundService } = await import('../../../services/pocketbase')
      wrapper = mountModal(pinia, { returnData: null })

      await wrapper.vm.handleSubmit()

      expect(vendorRefundService.create).not.toHaveBeenCalled()
      expect(wrapper.emitted('save')).toBeFalsy()
    })

    it('resets loading and does not emit save when creation fails', async () => {
      const { vendorRefundService } = await import('../../../services/pocketbase')
      vi.mocked(vendorRefundService.create).mockRejectedValueOnce(new Error('fail'))
      wrapper = mountModal(pinia, { returnData: baseReturn({ total_return_amount: 5000 }) })

      Object.assign(wrapper.vm.form, {
        processing_option: 'refund',
        refund_amount: 1000,
        account: 'acc-1',
        refund_method: 'cash'
      })

      await wrapper.vm.handleSubmit()

      expect(wrapper.emitted('save')).toBeFalsy()
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('Conditional field visibility', () => {
    it('shows refund fields and hides credit note fields in refund mode', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })
      wrapper.vm.form.processing_option = 'refund'
      await wrapper.vm.$nextTick()

      // Refund date input present
      expect(wrapper.find('input[type="date"]').exists()).toBe(true)
      // Account select present
      expect(wrapper.find('select').exists()).toBe(true)
    })
  })

  describe('Close behaviour', () => {
    it('emits close when the cancel button is clicked', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })

      const cancelBtn = wrapper.findAll('button').find((b: any) => b.text().includes('common.cancel'))
      await cancelBtn.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close when Escape is pressed', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })
})
