import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DeliveryItemRow from '../../../components/delivery/DeliveryItemRow.vue'

// Mock translations
vi.mock('../../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.item': 'Item',
        'common.quantity': 'Quantity',
        'common.total': 'Total',
        'forms.selectItem': 'Select Item',
        'forms.unitPrice': 'Unit Price',
        'forms.quantityRequired': 'Quantity is required',
        'forms.unitPriceRequired': 'Unit price is required',
        'forms.validationError': 'Please fix the following errors:',
        'delivery.removeItem': 'Remove Item',
        'delivery.itemNotes': 'Item Notes',
        'delivery.itemNotesPlaceholder': 'Additional notes for this item...',
        'units.kg': 'kg',
        'units.pieces': 'pieces',
        'units.units': 'units'
      }
      return translations[key] || key
    }
  })
}))

describe('DeliveryItemRow', () => {
  let wrapper: any

  const mockItems = [
    { id: 'item-1', name: 'Cement', unit: 'kg' },
    { id: 'item-2', name: 'Bricks', unit: 'pieces' },
    { id: 'item-3', name: 'Steel', unit: 'kg' }
  ]

  const mockDeliveryItem = {
    tempId: 'temp-1',
    item: '',
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    notes: ''
  }

  const createWrapper = (props = {}) => {
    return mount(DeliveryItemRow, {
      props: {
        item: { ...mockDeliveryItem },
        index: 0,
        items: mockItems,
        usedItems: [],
        ...props
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    it('should render all form fields correctly', () => {
      wrapper = createWrapper()

      expect(wrapper.find('select').exists()).toBe(true)
      expect(wrapper.findAll('input[type="number"]')).toHaveLength(3) // quantity, unit_price, total_amount
      expect(wrapper.find('textarea').exists()).toBe(true)
      expect(wrapper.find('button').exists()).toBe(true) // remove button
    })

    it('should display available items in dropdown', () => {
      wrapper = createWrapper()

      const options = wrapper.find('select').findAll('option')
      expect(options).toHaveLength(4) // 3 items + select placeholder
      expect(options[0].text()).toBe('Select Item')
      expect(options[1].text()).toBe('Cement (kg)')
      expect(options[2].text()).toBe('Bricks (pieces)')
      expect(options[3].text()).toBe('Steel (kg)')
    })

    it('should exclude used items from dropdown except current selection', () => {
      wrapper = createWrapper({
        usedItems: ['item-1', 'item-2'],
        item: { ...mockDeliveryItem, item: 'item-1' }
      })

      const options = wrapper.find('select').findAll('option')
      expect(options).toHaveLength(3) // 1 available + 1 current + placeholder
      expect(options[1].text()).toBe('Cement (kg)') // Current selection still available
      expect(options[2].text()).toBe('Steel (kg)') // Only unused item
    })
  })

  describe('Total Calculation', () => {
    it('should calculate total correctly when quantity changes', async () => {
      wrapper = createWrapper({
        item: { ...mockDeliveryItem, item: 'item-1', unit_price: 100 }
      })

      const quantityInput = wrapper.find('input[type="number"]')
      await quantityInput.setValue('5')
      await quantityInput.trigger('input')

      // Check that update event was emitted with correct total
      expect(wrapper.emitted('update')).toBeTruthy()
      const updateEvents = wrapper.emitted('update')
      const lastUpdate = updateEvents[updateEvents.length - 1]
      expect(lastUpdate[1].total_amount).toBe(500) // 5 * 100
    })

    it('should calculate total correctly when unit price changes', async () => {
      wrapper = createWrapper({
        item: { ...mockDeliveryItem, item: 'item-1', quantity: 3 }
      })

      const unitPriceInput = wrapper.findAll('input[type="number"]')[1]
      await unitPriceInput.setValue('250')
      await unitPriceInput.trigger('input')

      // Check that update event was emitted with correct total
      expect(wrapper.emitted('update')).toBeTruthy()
      const updateEvents = wrapper.emitted('update')
      const lastUpdate = updateEvents[updateEvents.length - 1]
      expect(lastUpdate[1].total_amount).toBe(750) // 3 * 250
    })

    it('should calculate total correctly with decimal values', async () => {
      wrapper = createWrapper({
        item: { ...mockDeliveryItem, item: 'item-1', quantity: 2.5 }
      })

      const unitPriceInput = wrapper.findAll('input[type="number"]')[1]
      await unitPriceInput.setValue('123.45')
      await unitPriceInput.trigger('input')

      const updateEvents = wrapper.emitted('update')
      const lastUpdate = updateEvents[updateEvents.length - 1]
      expect(lastUpdate[1].total_amount).toBe(308.63) // 2.5 * 123.45 = 308.625, rounded to 308.63
    })

    it('should round total to 2 decimal places', async () => {
      wrapper = createWrapper({
        item: { ...mockDeliveryItem, item: 'item-1', quantity: 3 }
      })

      const unitPriceInput = wrapper.findAll('input[type="number"]')[1]
      await unitPriceInput.setValue('33.333')
      await unitPriceInput.trigger('input')

      const updateEvents = wrapper.emitted('update')
      const lastUpdate = updateEvents[updateEvents.length - 1]
      expect(lastUpdate[1].total_amount).toBe(100) // 3 * 33.333 = 99.999, rounded to 100
    })

    it('should handle zero values correctly', async () => {
      wrapper = createWrapper({
        item: { ...mockDeliveryItem, item: 'item-1', quantity: 0, unit_price: 100 }
      })

      const quantityInput = wrapper.find('input[type="number"]')
      await quantityInput.setValue('0')
      await quantityInput.trigger('input')

      const updateEvents = wrapper.emitted('update')
      const lastUpdate = updateEvents[updateEvents.length - 1]
      expect(lastUpdate[1].total_amount).toBe(0) // 0 * 100 = 0
    })
  })

  describe('Validation', () => {
    it('should not show validation error summary initially', () => {
      wrapper = createWrapper()

      // The validation summary should not be shown initially
      expect(wrapper.find('.bg-red-50').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Please fix the following errors:')
    })

    it('should validate item selection on blur', async () => {
      wrapper = createWrapper()

      const select = wrapper.find('select')
      await select.trigger('blur')
      await nextTick()

      expect(wrapper.find('.text-red-600').exists()).toBe(true)
      expect(wrapper.text()).toContain('Select Item')
    })

    it('should validate quantity on blur', async () => {
      wrapper = createWrapper({
        item: { ...mockDeliveryItem, quantity: 0 }
      })

      const quantityInput = wrapper.find('input[type="number"]')
      await quantityInput.trigger('blur')
      await nextTick()

      expect(wrapper.find('.text-red-600').exists()).toBe(true)
      expect(wrapper.text()).toContain('Quantity is required')
    })

    it('should validate unit price on blur', async () => {
      wrapper = createWrapper({
        item: { ...mockDeliveryItem, unit_price: 0 }
      })

      const unitPriceInput = wrapper.findAll('input[type="number"]')[1]
      await unitPriceInput.trigger('blur')
      await nextTick()

      expect(wrapper.find('.text-red-600').exists()).toBe(true)
      expect(wrapper.text()).toContain('Unit price is required')
    })

    it('should clear item error when valid item is selected', async () => {
      wrapper = createWrapper()

      // First trigger validation error by blurring empty select
      const select = wrapper.find('select')
      await select.trigger('blur')
      await nextTick()
      
      // Check that item validation error appears
      const itemErrorElements = wrapper.findAll('.text-red-600').filter(
        (el: any) => el.text().includes('Select Item')
      )
      expect(itemErrorElements.length).toBeGreaterThan(0)

      // Then select a valid item - this should clear the item error
      await select.setValue('item-1')
      await select.trigger('change')
      await nextTick()

      // The specific item error should be cleared
      const remainingItemErrors = wrapper.findAll('.text-red-600').filter(
        (el: any) => el.text().includes('Select Item')
      )
      expect(remainingItemErrors).toHaveLength(0)
    })

    it('should show validation summary when there are multiple errors', async () => {
      wrapper = createWrapper()

      // Trigger multiple validation errors
      const select = wrapper.find('select')
      const quantityInput = wrapper.find('input[type="number"]')
      const unitPriceInput = wrapper.findAll('input[type="number"]')[1]

      await select.trigger('blur')
      await quantityInput.trigger('blur')
      await unitPriceInput.trigger('blur')
      await nextTick()

      expect(wrapper.find('.bg-red-50').exists()).toBe(true)
      expect(wrapper.text()).toContain('Please fix the following errors:')
    })
  })

  describe('Event Handling', () => {
    it('should emit update event when item is selected', async () => {
      wrapper = createWrapper()

      const select = wrapper.find('select')
      await select.setValue('item-1')
      await select.trigger('change')

      expect(wrapper.emitted('update')).toBeTruthy()
      const updateEvent = wrapper.emitted('update')[0]
      expect(updateEvent[0]).toBe(0) // index
      expect(updateEvent[1].item).toBe('item-1')
    })

    it('should emit update event when quantity changes', async () => {
      wrapper = createWrapper()

      const quantityInput = wrapper.find('input[type="number"]')
      await quantityInput.setValue('5')
      await quantityInput.trigger('input')

      expect(wrapper.emitted('update')).toBeTruthy()
      const updateEvent = wrapper.emitted('update')[0]
      expect(updateEvent[1].quantity).toBe(5)
    })

    it('should emit update event when unit price changes', async () => {
      wrapper = createWrapper()

      const unitPriceInput = wrapper.findAll('input[type="number"]')[1]
      await unitPriceInput.setValue('100')
      await unitPriceInput.trigger('input')

      expect(wrapper.emitted('update')).toBeTruthy()
      const updateEvent = wrapper.emitted('update')[0]
      expect(updateEvent[1].unit_price).toBe(100)
    })

    it('should emit update event when notes change', async () => {
      wrapper = createWrapper()

      const notesTextarea = wrapper.find('textarea')
      await notesTextarea.setValue('Test notes')
      await notesTextarea.trigger('input')

      expect(wrapper.emitted('update')).toBeTruthy()
      const updateEvent = wrapper.emitted('update')[0]
      expect(updateEvent[1].notes).toBe('Test notes')
    })

    it('should emit remove event when remove button is clicked', async () => {
      wrapper = createWrapper()

      const removeButton = wrapper.find('button')
      await removeButton.trigger('click')

      expect(wrapper.emitted('remove')).toBeTruthy()
      const removeEvent = wrapper.emitted('remove')[0]
      expect(removeEvent[0]).toBe(0) // index
    })
  })

  describe('Unit Display', () => {
    it('should show unit display for selected item', async () => {
      wrapper = createWrapper({
        item: { ...mockDeliveryItem, item: 'item-1' }
      })

      expect(wrapper.text()).toContain('kg')
    })

    it('should update unit display when item changes', async () => {
      wrapper = createWrapper()

      const select = wrapper.find('select')
      await select.setValue('item-2')
      await select.trigger('change')
      await nextTick()

      expect(wrapper.text()).toContain('pieces')
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      wrapper = createWrapper()

      const labels = wrapper.findAll('label')
      expect(labels[0].text()).toBe('Item *')
      expect(labels[1].text()).toBe('Quantity *')
      expect(labels[2].text()).toBe('Unit Price *')
      expect(labels[3].text()).toBe('Total')
      expect(labels[4].text()).toBe('Item Notes')
    })

    it('should have required attributes on mandatory fields', () => {
      wrapper = createWrapper()

      expect(wrapper.find('select').attributes('required')).toBeDefined()
      expect(wrapper.find('input[type="number"]').attributes('required')).toBeDefined()
      expect(wrapper.findAll('input[type="number"]')[1].attributes('required')).toBeDefined()
    })

    it('should mark total field as readonly', () => {
      wrapper = createWrapper()

      const totalInput = wrapper.findAll('input[type="number"]')[2]
      expect(totalInput.attributes('readonly')).toBeDefined()
    })
  })
})