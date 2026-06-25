import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useCountUp } from '../../composables/useCountUp'

/**
 * useCountUp eases a reactive number toward its source value using rAF +
 * performance.now and easeOutCubic. It short-circuits to an instant set when
 * animation isn't available — notably under NODE_ENV==='test'. To exercise the
 * real animation branch we temporarily flip NODE_ENV and drive a fake rAF clock
 * ourselves. Everything stubbed here is restored in afterEach so no timers,
 * env, or globals leak into sibling suites.
 */

describe('useCountUp', () => {
  // Fake rAF queue we advance manually so the animation is deterministic.
  let rafQueue: Array<(t: number) => void>
  let now: number
  const originalNodeEnv = process.env.NODE_ENV
  const originalRaf = globalThis.requestAnimationFrame
  const originalCancelRaf = globalThis.cancelAnimationFrame
  const originalPerfNow = globalThis.performance?.now

  // Drains one frame of the rAF queue, advancing the clock by `dt` ms.
  const flushFrame = (dt: number) => {
    now += dt
    const callbacks = rafQueue
    rafQueue = []
    callbacks.forEach((cb) => cb(now))
  }

  beforeEach(() => {
    rafQueue = []
    now = 0
    // Make the composable believe it's allowed to animate.
    process.env.NODE_ENV = 'development'
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafQueue.push(cb as (t: number) => void)
      return rafQueue.length
    }) as unknown as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = vi.fn() as unknown as typeof cancelAnimationFrame
    globalThis.performance.now = vi.fn(() => now)
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    globalThis.requestAnimationFrame = originalRaf
    globalThis.cancelAnimationFrame = originalCancelRaf
    if (originalPerfNow) globalThis.performance.now = originalPerfNow
    vi.restoreAllMocks()
  })

  describe('instant set (animation unavailable)', () => {
    it('sets immediately to the source value under NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test'
      const display = useCountUp(() => 250)
      // No rAF scheduled — straight to target.
      expect(display.value).toBe(250)
    })

    it('clamps a non-finite source to 0 in the instant path', () => {
      process.env.NODE_ENV = 'test'
      const display = useCountUp(() => Number.NaN)
      expect(display.value).toBe(0)
    })

    it('starts from 0 before any source emits a positive number (test mode)', () => {
      process.env.NODE_ENV = 'test'
      const display = useCountUp(() => 0)
      expect(display.value).toBe(0)
    })
  })

  describe('animated count-up', () => {
    it('starts at 0 and schedules a frame on first paint', () => {
      const display = useCountUp(() => 100, 800)
      // immediate watch ran -> animate scheduled, but no frame flushed yet.
      expect(display.value).toBe(0)
      expect(rafQueue.length).toBe(1)
    })

    it('eases toward the target and lands exactly on it when the duration elapses', () => {
      const display = useCountUp(() => 100, 800)

      // Mid-way through the duration the eased value is between start and target.
      flushFrame(400)
      expect(display.value).toBeGreaterThan(0)
      expect(display.value).toBeLessThan(100)

      // easeOutCubic at t=0.5 -> 1-(0.5)^3 = 0.875 -> 87.5
      expect(display.value).toBeCloseTo(87.5, 5)

      // Another frame that reaches/exceeds the duration snaps to the exact target.
      flushFrame(400)
      expect(display.value).toBe(100)
      // No further frame queued once complete.
      expect(rafQueue.length).toBe(0)
    })

    it('keeps requesting frames until t reaches 1', () => {
      useCountUp(() => 100, 800)
      // Each partial frame should schedule the next one.
      flushFrame(200)
      expect(rafQueue.length).toBe(1)
      flushFrame(200)
      expect(rafQueue.length).toBe(1)
      // Final frame completes -> nothing more scheduled.
      flushFrame(400)
      expect(rafQueue.length).toBe(0)
    })

    it('re-animates from the current display value when the source changes', async () => {
      const source = ref(100)
      const display = useCountUp(() => source.value, 800)

      flushFrame(800)
      expect(display.value).toBe(100)

      // Change target — cancels the prior rAF and eases from 100 toward 200.
      source.value = 200
      await nextTick()
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled()
      expect(rafQueue.length).toBe(1)

      flushFrame(400) // t=0.5 -> 100 + (200-100)*0.875 = 187.5
      expect(display.value).toBeCloseTo(187.5, 5)

      flushFrame(400)
      expect(display.value).toBe(200)
    })

    it('animates toward 0 when the source becomes nullish (?? 0 path)', async () => {
      const source = ref<number | null>(100)
      const display = useCountUp(() => source.value as number, 800)

      flushFrame(800)
      expect(display.value).toBe(100)

      source.value = null
      await nextTick()
      flushFrame(800)
      expect(display.value).toBe(0)
    })

    it('clamps a non-finite target to 0 in the animated path', () => {
      const display = useCountUp(() => Number.POSITIVE_INFINITY, 800)
      flushFrame(800)
      expect(display.value).toBe(0)
    })

    it('respects a custom duration', () => {
      const display = useCountUp(() => 100, 400)
      // Half of a 400ms duration -> same easeOutCubic 87.5.
      flushFrame(200)
      expect(display.value).toBeCloseTo(87.5, 5)
      flushFrame(200)
      expect(display.value).toBe(100)
    })
  })

  describe('reduced motion', () => {
    it('sets instantly when prefers-reduced-motion is enabled', () => {
      const matchMediaSpy = vi
        .spyOn(window, 'matchMedia')
        .mockImplementation((q: string) => ({
          matches: true,
          media: q,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList)

      const display = useCountUp(() => 500)
      expect(display.value).toBe(500)
      // No animation frame should have been scheduled.
      expect(rafQueue.length).toBe(0)
      matchMediaSpy.mockRestore()
    })
  })
})
