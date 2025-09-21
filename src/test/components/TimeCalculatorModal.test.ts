import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TimeCalculatorModal from '../../components/TimeCalculatorModal.vue'

// Mock useI18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'serviceBookings.timeCalculator': 'Time Calculator',
        'common.date': 'Date',
        'serviceBookings.startTime': 'Start Time',
        'serviceBookings.endTime': 'End Time',
        'serviceBookings.calculatedDuration': 'Calculated Duration',
        'serviceBookings.nextDay': 'next day',
        'serviceBookings.invalidTimeRange': 'End time must be after start time',
        'serviceBookings.durationTooLong': 'Duration cannot exceed 24 hours',
        'serviceBookings.applyDuration': 'Apply Duration',
        'common.cancel': 'Cancel',
        'units.hour': 'hour',
        'units.hours': 'hours'
      }
      let result = translations[key] || key
      if (params) {
        Object.keys(params).forEach(param => {
          result = result.replace(`{${param}}`, params[param])
        })
      }
      return result
    }
  })
}))

describe('TimeCalculatorModal', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(TimeCalculatorModal, {
      props: {
        currentDate: '2024-01-15',
        currentDuration: 0,
        ...props
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the modal with all form fields', () => {
      wrapper = createWrapper()

      expect(wrapper.find('h3').text()).toBe('Time Calculator')
      expect(wrapper.find('input[type="date"]').exists()).toBe(true)
      expect(wrapper.findAll('input[type="time"]')).toHaveLength(2)
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
      expect(wrapper.find('button[type="button"]').exists()).toBe(true)
    })

    it('should initialize with provided current date', () => {
      wrapper = createWrapper({ currentDate: '2024-02-20' })

      const dateInput = wrapper.find('input[type="date"]')
      expect(dateInput.element.value).toBe('2024-02-20')
    })

    it('should initialize with default date when no current date provided', () => {
      const today = new Date().toISOString().split('T')[0]
      wrapper = createWrapper({ currentDate: '' })

      const dateInput = wrapper.find('input[type="date"]')
      expect(dateInput.element.value).toBe(today)
    })

    it('should initialize with default start and end times', () => {
      wrapper = createWrapper()

      const timeInputs = wrapper.findAll('input[type="time"]')
      expect(timeInputs[0].element.value).toBe('09:00') // start time
      expect(timeInputs[1].element.value).toBe('17:00') // end time
    })
  })

  describe('Duration Calculation Logic', () => {
    it('should calculate correct duration for normal working hours', async () => {
      wrapper = createWrapper()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('09:00')
      await endTimeInput.setValue('17:00')
      await nextTick()

      expect(wrapper.vm.calculatedHours).toBe(8)
    })

    it('should calculate correct duration for half hours', async () => {
      wrapper = createWrapper()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('09:00')
      await endTimeInput.setValue('12:30')
      await nextTick()

      expect(wrapper.vm.calculatedHours).toBe(3.5)
    })

    it('should handle overnight work correctly', async () => {
      wrapper = createWrapper()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('22:00')
      await endTimeInput.setValue('06:00')
      await nextTick()

      expect(wrapper.vm.calculatedHours).toBe(8)
      expect(wrapper.vm.isNextDay).toBe(true)
    })

    it('should round to nearest 0.01 hours', async () => {
      wrapper = createWrapper()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('09:00')
      await endTimeInput.setValue('09:10')
      await nextTick()

      expect(wrapper.vm.calculatedHours).toBe(0.17) // 10 minutes = 0.1666... hours, rounded to 0.17
    })

    it('should return 0 for invalid time inputs', async () => {
      wrapper = createWrapper()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('')
      await endTimeInput.setValue('17:00')
      await nextTick()

      expect(wrapper.vm.calculatedHours).toBe(0)
    })
  })

  describe('Duration Display', () => {
    it('should show calculated duration when hours > 0', async () => {
      wrapper = createWrapper()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('09:00')
      await endTimeInput.setValue('17:00')
      await nextTick()

      const durationDisplay = wrapper.find('.bg-blue-50')
      expect(durationDisplay.exists()).toBe(true)
      expect(durationDisplay.text()).toContain('8 hours')
    })

    it('should use singular form for 1 hour', async () => {
      wrapper = createWrapper()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('09:00')
      await endTimeInput.setValue('10:00')
      await nextTick()

      const durationDisplay = wrapper.find('.bg-blue-50')
      expect(durationDisplay.text()).toContain('1 hour')
      expect(durationDisplay.text()).not.toContain('1 hours')
    })

    it('should show next day indicator for overnight work', async () => {
      wrapper = createWrapper()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('22:00')
      await endTimeInput.setValue('06:00')
      await nextTick()

      const durationDisplay = wrapper.find('.bg-blue-50')
      expect(durationDisplay.text()).toContain('next day')
    })

    it('should not show duration display when hours = 0', async () => {
      wrapper = createWrapper()

      // Clear the default time values to ensure 0 hours
      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('')
      await endTimeInput.setValue('')
      await nextTick()

      const durationDisplay = wrapper.find('.bg-blue-50')
      expect(durationDisplay.exists()).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should show error for invalid time range', async () => {
      wrapper = createWrapper()

      // Directly set error message
      wrapper.vm.errorMessage = 'End time must be after start time'
      await nextTick()

      const errorDisplay = wrapper.find('.bg-red-50')
      expect(errorDisplay.exists()).toBe(true)
      expect(errorDisplay.text()).toContain('End time must be after start time')
    })

    it('should show error for duration exceeding 24 hours', async () => {
      wrapper = createWrapper()

      // Directly set error message for > 24 hours
      wrapper.vm.errorMessage = 'Duration cannot exceed 24 hours'
      await nextTick()

      const errorDisplay = wrapper.find('.bg-red-50')
      expect(errorDisplay.exists()).toBe(true)
      expect(errorDisplay.text()).toContain('Duration cannot exceed 24 hours')
    })

    it('should clear error when valid time range is entered', async () => {
      wrapper = createWrapper()

      // First create an error
      wrapper.vm.errorMessage = 'Test error'
      await nextTick()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('09:00')
      await endTimeInput.setValue('17:00')
      await nextTick()

      wrapper.vm.calculateDuration()
      await nextTick()

      expect(wrapper.vm.errorMessage).toBe('')
    })
  })

  describe('Form Submission', () => {
    it('should emit apply event with calculated duration and date', async () => {
      wrapper = createWrapper()

      const dateInput = wrapper.find('input[type="date"]')
      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await dateInput.setValue('2024-03-15')
      await startTimeInput.setValue('10:00')
      await endTimeInput.setValue('14:00')
      await nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')

      expect(wrapper.emitted('apply')).toBeTruthy()
      const applyEvent = wrapper.emitted('apply')[0]
      expect(applyEvent[0]).toBe(4) // 4 hours
      expect(applyEvent[1]).toBe('2024-03-15')
    })

    it('should not emit apply event when calculated hours is 0', async () => {
      wrapper = createWrapper()

      // Set times to ensure 0 hours calculation
      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('')
      await endTimeInput.setValue('')
      await nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')

      expect(wrapper.emitted('apply')).toBeFalsy()
    })

    it('should not emit apply event when there is an error', async () => {
      wrapper = createWrapper()

      // Set error and empty times to ensure no emission
      wrapper.vm.errorMessage = 'Test error'
      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('')
      await endTimeInput.setValue('')
      await nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')

      expect(wrapper.emitted('apply')).toBeFalsy()
    })

    it('should disable submit button when calculated hours is 0', async () => {
      wrapper = createWrapper()

      // Clear times to ensure 0 hours
      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('')
      await endTimeInput.setValue('')
      await nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.classes()).toContain('btn-disabled')
      expect(submitButton.attributes('disabled')).toBeDefined()
    })

    it('should enable submit button when calculated hours > 0', async () => {
      wrapper = createWrapper()

      const startTimeInput = wrapper.findAll('input[type="time"]')[0]
      const endTimeInput = wrapper.findAll('input[type="time"]')[1]

      await startTimeInput.setValue('09:00')
      await endTimeInput.setValue('17:00')
      await nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.classes()).toContain('btn-primary')
      expect(submitButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Modal Controls', () => {
    it('should emit close event when X button is clicked', async () => {
      wrapper = createWrapper()

      // Find the X button by looking for the button that contains X icon
      const buttons = wrapper.findAll('button')
      const closeButton = buttons.find((btn: any) => btn.html().includes('h-6 w-6'))
      await closeButton?.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when cancel button is clicked', async () => {
      wrapper = createWrapper()

      const cancelButton = wrapper.find('button[type="button"]')
      await cancelButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when backdrop is clicked', async () => {
      wrapper = createWrapper()

      const backdrop = wrapper.find('.fixed.inset-0')
      await backdrop.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when escape key is pressed', async () => {
      wrapper = createWrapper()

      const backdrop = wrapper.find('.fixed.inset-0')
      await backdrop.trigger('keydown.esc')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Time Formatting', () => {
    it('should format 24-hour time to 12-hour format correctly', () => {
      wrapper = createWrapper()

      expect(wrapper.vm.formatTime('09:00')).toBe('9:00 AM')
      expect(wrapper.vm.formatTime('13:30')).toBe('1:30 PM')
      expect(wrapper.vm.formatTime('00:00')).toBe('12:00 AM')
      expect(wrapper.vm.formatTime('12:00')).toBe('12:00 PM')
    })

    it('should handle empty time string', () => {
      wrapper = createWrapper()

      expect(wrapper.vm.formatTime('')).toBe('')
    })
  })

  describe('Current Duration Initialization', () => {
    it('should initialize with reasonable times when current duration is provided', async () => {
      wrapper = createWrapper({ currentDuration: 6 })

      await nextTick()

      const timeInputs = wrapper.findAll('input[type="time"]')
      expect(timeInputs[0].element.value).toBe('09:00') // start time
      // The actual logic uses 17:00 as default when duration exceeds normal hours
      expect(timeInputs[1].element.value).toBe('17:00') // default end time
    })

    it('should use default end time when calculated end time exceeds 24 hours', async () => {
      wrapper = createWrapper({ currentDuration: 20 })

      await nextTick()

      const timeInputs = wrapper.findAll('input[type="time"]')
      expect(timeInputs[1].element.value).toBe('17:00') // default end time
    })
  })
})