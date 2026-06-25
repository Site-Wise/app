import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TopProgressBar from '../../components/TopProgressBar.vue'
import {
  routeLoading,
  startRouteProgress,
  endRouteProgress,
} from '../../composables/useRouteProgress'

/**
 * TopProgressBar mirrors the shared routeLoading ref into a visible amber bar:
 * on start it shows + eases to 90% (on the next frame), on finish it jumps to
 * 100% then hides after a 200ms timeout. We drive a controllable rAF and fake
 * timers so the width/visibility transitions are deterministic. All globals,
 * timers, and the shared ref are reset in afterEach so no state leaks.
 */

describe('TopProgressBar', () => {
  let wrapper: ReturnType<typeof mount> | null = null
  let rafQueue: Array<() => void>
  const originalRaf = globalThis.requestAnimationFrame
  const originalWindowRaf = window.requestAnimationFrame

  const flushRaf = () => {
    const cbs = rafQueue
    rafQueue = []
    cbs.forEach((cb) => cb())
  }

  beforeEach(() => {
    rafQueue = []
    // Fake only setTimeout/clearTimeout — keep rAF under our manual control.
    // (vitest's default fake timers would otherwise hijack requestAnimationFrame.)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const fakeRaf = vi.fn((cb: FrameRequestCallback) => {
      rafQueue.push(() => cb(0))
      return rafQueue.length
    }) as unknown as typeof requestAnimationFrame
    // The component reads a bare `requestAnimationFrame`, which resolves to
    // window in happy-dom — stub both to be safe.
    globalThis.requestAnimationFrame = fakeRaf
    window.requestAnimationFrame = fakeRaf
    // Reset shared module state before each test.
    routeLoading.value = false
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.clearAllTimers()
    vi.useRealTimers()
    globalThis.requestAnimationFrame = originalRaf
    window.requestAnimationFrame = originalWindowRaf
    routeLoading.value = false
  })

  // happy-dom's getAttribute('style') is flaky after re-render, so read the
  // serialized markup which reliably contains the bound inline style.
  const barStyle = () => wrapper!.html()

  it('renders hidden (opacity-0) with 0 width initially', () => {
    wrapper = mount(TopProgressBar)
    expect(wrapper.classes()).toContain('opacity-0')
    expect(wrapper.classes()).not.toContain('opacity-100')
    expect(barStyle()).toContain('width: 0%')
  })

  it('becomes visible and eases to 90% when route loading starts', async () => {
    wrapper = mount(TopProgressBar)

    startRouteProgress()
    await nextTick()

    // Visible immediately; width pinned to 0 until the next frame paints.
    expect(wrapper.classes()).toContain('opacity-100')
    expect(barStyle()).toContain('width: 0%')

    // Next frame eases toward 90%.
    flushRaf()
    await nextTick()
    expect(barStyle()).toContain('width: 90%')
    // Below 100 -> slower 400ms transition.
    expect(barStyle()).toContain('transition-duration: 400ms')
  })

  it('jumps to 100% then hides after the 200ms finish timeout', async () => {
    wrapper = mount(TopProgressBar)

    startRouteProgress()
    await nextTick()
    flushRaf()
    await nextTick()

    endRouteProgress()
    await nextTick()

    // Snaps to 100% and stays visible during the brief settle window.
    expect(barStyle()).toContain('width: 100%')
    expect(barStyle()).toContain('transition-duration: 160ms')
    expect(wrapper.classes()).toContain('opacity-100')

    // After the timeout it hides and resets width.
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(wrapper.classes()).toContain('opacity-0')
    expect(barStyle()).toContain('width: 0%')
  })

  it('does nothing on finish if it was never visible', async () => {
    wrapper = mount(TopProgressBar)

    // routeLoading toggled false while already false / never shown.
    endRouteProgress()
    await nextTick()
    expect(wrapper.classes()).toContain('opacity-0')
    expect(barStyle()).toContain('width: 0%')
  })

  it('cancels a pending hide timer when loading restarts before it fires', async () => {
    wrapper = mount(TopProgressBar)

    startRouteProgress()
    await nextTick()
    flushRaf()
    await nextTick()

    endRouteProgress()
    await nextTick()
    expect(barStyle()).toContain('width: 100%')

    // Restart before the 200ms hide elapses — should clear the timer and reset to 0.
    startRouteProgress()
    await nextTick()
    expect(wrapper.classes()).toContain('opacity-100')
    expect(barStyle()).toContain('width: 0%')

    // Old timer must not later hide the bar.
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(wrapper.classes()).toContain('opacity-100')
  })

  it('clears the hide timer on unmount without throwing', async () => {
    wrapper = mount(TopProgressBar)
    startRouteProgress()
    await nextTick()
    flushRaf()
    await nextTick()
    endRouteProgress()
    await nextTick()

    expect(() => {
      wrapper!.unmount()
      wrapper = null
      vi.advanceTimersByTime(200)
    }).not.toThrow()
  })
})
