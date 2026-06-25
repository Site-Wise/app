import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CardDropdownMenu from '../../components/CardDropdownMenu.vue'

// Translate -> key so we can assert/ignore i18n deterministically.
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// A trivial stand-in icon component for action.icon.
const StubIcon = { name: 'StubIcon', render: () => h('svg') }

type Action = {
  key: string
  label: string
  icon: any
  variant?: 'default' | 'danger'
  disabled?: boolean
  hidden?: boolean
}

function makeActions(overrides: Partial<Action>[] = []): Action[] {
  const base: Action[] = [
    { key: 'view', label: 'View', icon: StubIcon },
    { key: 'edit', label: 'Edit', icon: StubIcon },
    { key: 'delete', label: 'Delete', icon: StubIcon, variant: 'danger' },
  ]
  if (overrides.length === 0) return base
  return overrides as Action[]
}

/**
 * The menu content is teleported to <body>, so it lives in document.body and not
 * inside the wrapper element. We query the document for menu/menuitem nodes.
 */
function getMenu(): HTMLElement | null {
  return document.body.querySelector('[role="menu"]')
}
function getMenuItems(): HTMLButtonElement[] {
  return Array.from(document.body.querySelectorAll('[role="menuitem"]')) as HTMLButtonElement[]
}
function getScrim(): HTMLElement | null {
  // The scrim is the fixed inset-0 overlay teleported alongside the menu.
  return document.body.querySelector('.fixed.inset-0')
}

function mountMenu(actions: Action[] = makeActions()) {
  return mount(CardDropdownMenu, {
    props: { actions },
    attachTo: document.body,
  })
}

describe('CardDropdownMenu (mounted)', () => {
  let wrappers: any[] = []

  function track<T>(w: T): T {
    wrappers.push(w)
    return w
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Unmount every wrapper to trigger onUnmounted cleanup (window scroll/resize
    // + document keydown listeners). Then scrub any leftover teleported nodes.
    wrappers.forEach((w) => {
      try {
        w.unmount()
      } catch {
        /* ignore */
      }
    })
    wrappers = []
    document.body.querySelectorAll('[role="menu"], .fixed.inset-0').forEach((n) => n.remove())
    vi.restoreAllMocks()
  })

  it('renders only the trigger button initially (menu closed)', () => {
    const wrapper = track(mountMenu())
    const trigger = wrapper.get('button')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(getMenu()).toBeNull()
  })

  it('opens the menu on trigger click and toggles closed again', async () => {
    const wrapper = track(mountMenu())
    const trigger = wrapper.get('button')

    await trigger.trigger('click')
    await vi.waitFor(() => {
      expect(getMenu()).not.toBeNull()
    })
    expect(trigger.attributes('aria-expanded')).toBe('true')
    // All three actions rendered as menu items.
    expect(getMenuItems()).toHaveLength(3)

    await trigger.trigger('click')
    await vi.waitFor(() => {
      expect(getMenu()).toBeNull()
    })
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  it('emits action with the key and closes when an enabled item is clicked', async () => {
    const wrapper = track(mountMenu())
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(getMenu()).not.toBeNull())

    const items = getMenuItems()
    const editBtn = items.find((b) => b.textContent?.includes('Edit'))!
    editBtn.click()

    await vi.waitFor(() => {
      expect(wrapper.emitted('action')).toBeTruthy()
    })
    expect(wrapper.emitted('action')![0]).toEqual(['edit'])
    await vi.waitFor(() => expect(getMenu()).toBeNull())
  })

  it('does not emit or close when a disabled item is clicked', async () => {
    const actions = makeActions([
      { key: 'view', label: 'View', icon: StubIcon },
      { key: 'edit', label: 'Edit', icon: StubIcon, disabled: true },
    ])
    const wrapper = track(mountMenu(actions))
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(getMenu()).not.toBeNull())

    const editBtn = getMenuItems().find((b) => b.textContent?.includes('Edit'))!
    expect(editBtn.disabled).toBe(true)
    expect(editBtn.className).toContain('cursor-not-allowed')

    editBtn.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('action')).toBeFalsy()
    // Menu remains open.
    expect(getMenu()).not.toBeNull()
  })

  it('does not render hidden actions', async () => {
    const actions = makeActions([
      { key: 'view', label: 'View', icon: StubIcon },
      { key: 'secret', label: 'Secret', icon: StubIcon, hidden: true },
      { key: 'delete', label: 'Delete', icon: StubIcon },
    ])
    const wrapper = track(mountMenu(actions))
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(getMenu()).not.toBeNull())

    const labels = getMenuItems().map((b) => b.textContent?.trim())
    expect(labels.some((l) => l?.includes('Secret'))).toBe(false)
    expect(getMenuItems()).toHaveLength(2)
  })

  it('applies the danger variant styling branch', async () => {
    const wrapper = track(mountMenu())
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(getMenu()).not.toBeNull())

    const deleteBtn = getMenuItems().find((b) => b.textContent?.includes('Delete'))!
    expect(deleteBtn.className).toContain('text-clay-600')

    const viewBtn = getMenuItems().find((b) => b.textContent?.includes('View'))!
    expect(viewBtn.className).toContain('text-stone-700')
    expect(viewBtn.className).not.toContain('text-clay-600')
  })

  it('closes when the Escape key is pressed', async () => {
    const wrapper = track(mountMenu())
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(getMenu()).not.toBeNull())

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await vi.waitFor(() => expect(getMenu()).toBeNull())
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  it('ignores non-Escape keydown events', async () => {
    const wrapper = track(mountMenu())
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(getMenu()).not.toBeNull())

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await wrapper.vm.$nextTick()
    expect(getMenu()).not.toBeNull()
  })

  it('closes when the scrim/backdrop is clicked', async () => {
    const wrapper = track(mountMenu())
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(getMenu()).not.toBeNull())

    const scrim = getScrim()
    expect(scrim).not.toBeNull()
    scrim!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await vi.waitFor(() => expect(getMenu()).toBeNull())
  })

  describe('positioning (menuStyle from trigger rect)', () => {
    function stubRect(trigger: HTMLElement, rect: Partial<DOMRect>) {
      const full: DOMRect = {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
        ...rect,
      } as DOMRect
      vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(full)
    }

    it('computes a right-aligned, viewport-clamped position below the trigger', async () => {
      const wrapper = track(mountMenu())
      const trigger = wrapper.get('button').element as HTMLElement

      // Plenty of room below: top=100, bottom=140, right=500.
      stubRect(trigger, { top: 100, bottom: 140, right: 500, left: 456, width: 44, height: 40 })

      await wrapper.get('button').trigger('click')
      await vi.waitFor(() => expect(getMenu()).not.toBeNull())

      const menu = getMenu()!
      // top = bottom + 4 = 144; left = right - MENU_WIDTH(208) = 292.
      expect(menu.style.top).toBe('144px')
      expect(menu.style.left).toBe('292px')
    })

    it('clamps left to a minimum of 8px when the trigger is near the left edge', async () => {
      const wrapper = track(mountMenu())
      const trigger = wrapper.get('button').element as HTMLElement

      // right - 208 would be negative, so left clamps up to 8.
      stubRect(trigger, { top: 100, bottom: 140, right: 50, left: 6, width: 44, height: 40 })

      await wrapper.get('button').trigger('click')
      await vi.waitFor(() => expect(getMenu()).not.toBeNull())

      expect(getMenu()!.style.left).toBe('8px')
    })

    it('flips the menu above the trigger when there is no room below', async () => {
      const originalInnerHeight = window.innerHeight
      Object.defineProperty(window, 'innerHeight', { value: 600, writable: true, configurable: true })

      try {
        const wrapper = track(mountMenu())
        const trigger = wrapper.get('button').element as HTMLElement

        // Trigger near the bottom: bottom=580 close to innerHeight=600, but top=540
        // leaves room above. estHeight = 3*52 + 8 = 164.
        stubRect(trigger, { top: 540, bottom: 580, right: 500, left: 456, width: 44, height: 40 })

        await wrapper.get('button').trigger('click')
        await vi.waitFor(() => expect(getMenu()).not.toBeNull())

        // Flipped: top = rect.top - estHeight - 4 = 540 - 164 - 4 = 372.
        expect(getMenu()!.style.top).toBe('372px')
      } finally {
        Object.defineProperty(window, 'innerHeight', {
          value: originalInnerHeight,
          writable: true,
          configurable: true,
        })
      }
    })

    it('repositions on window scroll while open', async () => {
      const wrapper = track(mountMenu())
      const trigger = wrapper.get('button').element as HTMLElement

      stubRect(trigger, { top: 100, bottom: 140, right: 500, left: 456, width: 44, height: 40 })
      await wrapper.get('button').trigger('click')
      await vi.waitFor(() => expect(getMenu()).not.toBeNull())
      expect(getMenu()!.style.top).toBe('144px')

      // Move the trigger and fire scroll -> menu should recompute.
      stubRect(trigger, { top: 200, bottom: 240, right: 500, left: 456, width: 44, height: 40 })
      window.dispatchEvent(new Event('scroll'))
      await vi.waitFor(() => expect(getMenu()!.style.top).toBe('244px'))
    })
  })

  it('cleans up listeners on unmount without errors', async () => {
    const removeWinSpy = vi.spyOn(window, 'removeEventListener')
    const removeDocSpy = vi.spyOn(document, 'removeEventListener')

    const wrapper = mountMenu()
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(getMenu()).not.toBeNull())

    wrapper.unmount()

    // Scroll + resize (window) and keydown (document) listeners removed.
    expect(removeWinSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true)
    expect(removeWinSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removeDocSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    // After unmount, dispatching the events that the (removed) listeners handled
    // must not throw and must not resurrect any teleported menu.
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('resize'))
    }).not.toThrow()
    expect(getMenu()).toBeNull()
  })

  it('component import is defined', () => {
    expect(CardDropdownMenu).toBeDefined()
  })
})
