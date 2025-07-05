import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useModalEscape } from '../../composables/useModalEscape'

describe('useModalEscape', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('should call close handler when ESC key is pressed', () => {
    const closeHandler = vi.fn()
    
    const TestComponent = defineComponent({
      setup() {
        useModalEscape(closeHandler)
        return {}
      },
      template: '<div>Test</div>'
    })

    const wrapper = mount(TestComponent)

    // Verify event listener was added
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)

    // Simulate ESC key press
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      altKey: false,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false
    })

    document.dispatchEvent(keydownEvent)
    expect(closeHandler).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('should NOT call close handler when ESC is pressed with ALT+SHIFT modifiers', () => {
    const closeHandler = vi.fn()
    
    const TestComponent = defineComponent({
      setup() {
        useModalEscape(closeHandler)
        return {}
      },
      template: '<div>Test</div>'
    })

    const wrapper = mount(TestComponent)

    // Simulate ESC key press with ALT+SHIFT (should not trigger)
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      altKey: true,
      shiftKey: true,
      ctrlKey: false,
      metaKey: false
    })

    document.dispatchEvent(keydownEvent)
    expect(closeHandler).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('should NOT call close handler when ESC is pressed with any other modifier', () => {
    const closeHandler = vi.fn()
    
    const TestComponent = defineComponent({
      setup() {
        useModalEscape(closeHandler)
        return {}
      },
      template: '<div>Test</div>'
    })

    const wrapper = mount(TestComponent)

    // Test with different modifier combinations
    const modifierCombinations = [
      { altKey: true, shiftKey: false, ctrlKey: false, metaKey: false },
      { altKey: false, shiftKey: true, ctrlKey: false, metaKey: false },
      { altKey: false, shiftKey: false, ctrlKey: true, metaKey: false },
      { altKey: false, shiftKey: false, ctrlKey: false, metaKey: true },
      { altKey: true, shiftKey: false, ctrlKey: true, metaKey: false },
    ]

    modifierCombinations.forEach(modifiers => {
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        ...modifiers
      })

      document.dispatchEvent(keydownEvent)
    })

    expect(closeHandler).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('should respect isActive function when provided', () => {
    const closeHandler = vi.fn()
    const isActive = vi.fn().mockReturnValue(false) // Modal not active
    
    const TestComponent = defineComponent({
      setup() {
        useModalEscape(closeHandler, isActive)
        return {}
      },
      template: '<div>Test</div>'
    })

    const wrapper = mount(TestComponent)

    // Simulate ESC key press when modal is not active
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      altKey: false,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false
    })

    document.dispatchEvent(keydownEvent)
    expect(closeHandler).not.toHaveBeenCalled()
    expect(isActive).toHaveBeenCalled()

    // Now make modal active
    isActive.mockReturnValue(true)
    document.dispatchEvent(keydownEvent)
    expect(closeHandler).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('should remove event listener on component unmount', () => {
    const closeHandler = vi.fn()
    
    const TestComponent = defineComponent({
      setup() {
        useModalEscape(closeHandler)
        return {}
      },
      template: '<div>Test</div>'
    })

    const wrapper = mount(TestComponent)
    
    // Verify event listener was added
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)

    wrapper.unmount()

    // Verify event listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
  })

  it('should handle non-ESC keys gracefully', () => {
    const closeHandler = vi.fn()
    
    const TestComponent = defineComponent({
      setup() {
        useModalEscape(closeHandler)
        return {}
      },
      template: '<div>Test</div>'
    })

    const wrapper = mount(TestComponent)

    // Simulate other key presses
    const otherKeys = ['Enter', 'Space', 'ArrowDown', 'Tab', 'a', 'A']
    
    otherKeys.forEach(key => {
      const keydownEvent = new KeyboardEvent('keydown', {
        key,
        altKey: false,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false
      })

      document.dispatchEvent(keydownEvent)
    })

    expect(closeHandler).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})