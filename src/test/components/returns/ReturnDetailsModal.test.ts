import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../../utils/test-setup'
import ReturnDetailsModal from '../../../components/returns/ReturnDetailsModal.vue'

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

vi.mock('../../../composables/usePermissions', () => ({
  usePermissions: () => ({
    canUpdate: { value: true },
    canDelete: { value: true }
  })
}))

// Mock services
vi.mock('../../../services/pocketbase', () => ({
  vendorReturnService: {
    approve: vi.fn().mockResolvedValue({ id: 'return-1' }),
    reject: vi.fn().mockResolvedValue({ id: 'return-1' }),
    complete: vi.fn().mockResolvedValue({ id: 'return-1' })
  },
  vendorReturnItemService: {
    getByReturn: vi.fn().mockResolvedValue([])
  },
  vendorCreditNoteService: {
    getByReturn: vi.fn().mockResolvedValue([])
  },
  paymentService: {
    getAll: vi.fn().mockResolvedValue([])
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
  return_date: '2024-01-01',
  reason: 'damaged',
  status: 'initiated',
  total_return_amount: 5000,
  created: '2024-01-01T00:00:00Z',
  expand: { vendor: { contact_person: 'John Doe', name: 'ABC Co' } },
  ...overrides
})

const mountModal = (pinia: any, props: any) =>
  mount(ReturnDetailsModal, {
    global: { plugins: [pinia] },
    props
  })

describe('ReturnDetailsModal', () => {
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

  // Helper: find a button by visible text (translation key passthrough)
  const findButtonByText = (w: any, text: string) =>
    w.findAll('button').find((b: any) => b.text().includes(text))

  describe('Status-driven action availability', () => {
    it('shows approve and reject buttons for initiated status', () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'initiated' }) })

      expect(findButtonByText(wrapper, 'vendors.approveReturn')).toBeTruthy()
      expect(findButtonByText(wrapper, 'vendors.rejectReturn')).toBeTruthy()
      // No complete / refund actions in initiated state
      expect(findButtonByText(wrapper, 'vendors.completeReturn')).toBeFalsy()
      expect(findButtonByText(wrapper, 'vendors.processRefund')).toBeFalsy()
    })

    it('shows complete and refund buttons for approved status', () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'approved' }) })

      expect(findButtonByText(wrapper, 'vendors.completeReturn')).toBeTruthy()
      expect(findButtonByText(wrapper, 'vendors.processRefund')).toBeTruthy()
      // No approve / reject once approved
      expect(findButtonByText(wrapper, 'vendors.approveReturn')).toBeFalsy()
      expect(findButtonByText(wrapper, 'vendors.rejectReturn')).toBeFalsy()
    })

    it('shows only refund button for completed status', () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'completed' }) })

      expect(findButtonByText(wrapper, 'vendors.processRefund')).toBeTruthy()
      expect(findButtonByText(wrapper, 'vendors.completeReturn')).toBeFalsy()
      expect(findButtonByText(wrapper, 'vendors.approveReturn')).toBeFalsy()
    })

    it('shows no status actions for rejected status', () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'rejected' }) })

      expect(findButtonByText(wrapper, 'vendors.approveReturn')).toBeFalsy()
      expect(findButtonByText(wrapper, 'vendors.rejectReturn')).toBeFalsy()
      expect(findButtonByText(wrapper, 'vendors.completeReturn')).toBeFalsy()
      expect(findButtonByText(wrapper, 'vendors.processRefund')).toBeFalsy()
    })
  })

  describe('Approval flow', () => {
    it('opens the nested approval sub-modal when approve is clicked', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'initiated' }) })

      await findButtonByText(wrapper, 'vendors.approveReturn').trigger('click')

      expect(wrapper.vm.showApprovalModal).toBe(true)
    })

    it('calls the approve service with notes and emits approve', async () => {
      const { vendorReturnService } = await import('../../../services/pocketbase')
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'initiated' }) })

      wrapper.vm.showApprovalModal = true
      wrapper.vm.approvalNotes = 'Looks good'
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleApprove()

      expect(vendorReturnService.approve).toHaveBeenCalledWith('return-abcdef', 'Looks good')
      expect(wrapper.vm.showApprovalModal).toBe(false)
      expect(wrapper.emitted('approve')).toBeTruthy()
    })

    it('does not emit approve when the approve service throws', async () => {
      const { vendorReturnService } = await import('../../../services/pocketbase')
      vi.mocked(vendorReturnService.approve).mockRejectedValueOnce(new Error('fail'))
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'initiated' }) })

      await wrapper.vm.handleApprove()

      expect(wrapper.emitted('approve')).toBeFalsy()
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('Rejection flow', () => {
    it('opens the nested rejection sub-modal when reject is clicked', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'initiated' }) })

      await findButtonByText(wrapper, 'vendors.rejectReturn').trigger('click')

      expect(wrapper.vm.showRejectionModal).toBe(true)
    })

    it('calls the reject service with notes and emits reject', async () => {
      const { vendorReturnService } = await import('../../../services/pocketbase')
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'initiated' }) })

      wrapper.vm.showRejectionModal = true
      wrapper.vm.rejectionNotes = 'Damaged beyond use'
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleReject()

      expect(vendorReturnService.reject).toHaveBeenCalledWith('return-abcdef', 'Damaged beyond use')
      expect(wrapper.vm.showRejectionModal).toBe(false)
      expect(wrapper.emitted('reject')).toBeTruthy()
    })
  })

  describe('Complete flow', () => {
    it('calls the complete service and emits complete when complete is clicked', async () => {
      const { vendorReturnService } = await import('../../../services/pocketbase')
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'approved' }) })

      await findButtonByText(wrapper, 'vendors.completeReturn').trigger('click')
      // Poll instead of a fixed setTimeout(0): under full-suite CPU load the async
      // service chain isn't always settled within one macrotask (flaky otherwise).
      await vi.waitFor(() => {
        expect(vendorReturnService.complete).toHaveBeenCalledWith('return-abcdef')
        expect(wrapper.emitted('complete')).toBeTruthy()
      })
    })
  })

  describe('Refund action', () => {
    it('emits refund when the process-refund button is clicked', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn({ status: 'approved' }) })

      await findButtonByText(wrapper, 'vendors.processRefund').trigger('click')

      expect(wrapper.emitted('refund')).toBeTruthy()
    })
  })

  describe('Close behaviour', () => {
    it('emits close when the header close button is clicked', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })

      const closeBtn = wrapper.find('button[aria-label="common.close"]')
      await closeBtn.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close when Escape is pressed', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Return items loading', () => {
    it('loads return items on mount', async () => {
      const { vendorReturnItemService } = await import('../../../services/pocketbase')
      vi.mocked(vendorReturnItemService.getByReturn).mockResolvedValueOnce([
        {
          id: 'ri-1',
          condition: 'damaged',
          quantity_returned: 2,
          return_rate: 100,
          return_amount: 200
        } as any
      ])

      wrapper = mountModal(pinia, { returnData: baseReturn() })
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vendorReturnItemService.getByReturn).toHaveBeenCalledWith('return-abcdef')
      expect(wrapper.vm.returnItems).toHaveLength(1)
    })

    it('does not load when there is no return id', async () => {
      const { vendorReturnItemService } = await import('../../../services/pocketbase')
      wrapper = mountModal(pinia, { returnData: null })
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vendorReturnItemService.getByReturn).not.toHaveBeenCalled()
    })
  })

  describe('Credit note display branch', () => {
    it('loads credit note usage when processing option is credit_note', async () => {
      const { vendorCreditNoteService, paymentService } = await import('../../../services/pocketbase')
      vi.mocked(vendorCreditNoteService.getByReturn).mockResolvedValueOnce([
        { id: 'cn-1', credit_amount: 1000, balance: 400, issue_date: '2024-01-02', reference: 'CN-1' } as any
      ])
      vi.mocked(paymentService.getAll).mockResolvedValueOnce([
        { id: 'pay-1', credit_notes: ['cn-1'], payment_date: '2024-01-03', expand: { vendor: { contact_person: 'John' } } } as any
      ])

      wrapper = mountModal(pinia, { returnData: baseReturn({ processing_option: 'credit_note' }) })
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vendorCreditNoteService.getByReturn).toHaveBeenCalledWith('return-abcdef')
      expect(wrapper.vm.creditNotes).toHaveLength(1)
      // 1000 - 400 = 600 used, recorded against the matching payment
      expect(wrapper.vm.creditNoteUsage).toHaveLength(1)
      expect(wrapper.vm.creditNoteUsage[0].usedAmount).toBe(600)
    })

    it('does not load credit notes for refund processing option', async () => {
      const { vendorCreditNoteService } = await import('../../../services/pocketbase')
      wrapper = mountModal(pinia, { returnData: baseReturn({ processing_option: 'refund' }) })
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vendorCreditNoteService.getByReturn).not.toHaveBeenCalled()
    })

    it('records no usage when credit note is fully unused', async () => {
      const { vendorCreditNoteService, paymentService } = await import('../../../services/pocketbase')
      vi.mocked(vendorCreditNoteService.getByReturn).mockResolvedValueOnce([
        { id: 'cn-2', credit_amount: 1000, balance: 1000, issue_date: '2024-01-02' } as any
      ])
      vi.mocked(paymentService.getAll).mockResolvedValueOnce([
        { id: 'pay-1', credit_notes: ['cn-2'], payment_date: '2024-01-03', expand: {} } as any
      ])

      wrapper = mountModal(pinia, { returnData: baseReturn({ processing_option: 'credit_note' }) })
      await new Promise(resolve => setTimeout(resolve, 0))

      // totalUsed is 0, so nothing pushed to usage
      expect(wrapper.vm.creditNoteUsage).toHaveLength(0)
    })
  })

  describe('Photo lightbox', () => {
    it('opens the photo modal with the selected photo', async () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })

      wrapper.vm.openPhotoModal('photo-1.jpg')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showPhotoModal).toBe(true)
      expect(wrapper.vm.selectedPhoto).toBe('photo-1.jpg')
    })
  })

  describe('Display helpers', () => {
    it('maps statuses to CSS classes', () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })
      expect(wrapper.vm.getStatusClass('approved')).toBe('status-approved')
      expect(wrapper.vm.getStatusClass('refunded')).toBe('status-paid')
      expect(wrapper.vm.getStatusClass('weird')).toBe('status-pending')
    })

    it('maps conditions to CSS classes', () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })
      expect(wrapper.vm.getConditionClass('unopened')).toBe('status-approved')
      expect(wrapper.vm.getConditionClass('damaged')).toBe('status-rejected')
      expect(wrapper.vm.getConditionClass('weird')).toBe('status-pending')
    })

    it('builds a photo URL only when return id is present', () => {
      wrapper = mountModal(pinia, { returnData: baseReturn() })
      expect(wrapper.vm.getPhotoUrl('a.jpg')).toContain('/api/files/vendor_returns/return-abcdef/a.jpg')
    })
  })
})
