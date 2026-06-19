import { ref, watch } from 'vue';

/**
 * Animated number count-up — a signature of the Sitewise design system
 * ("numbers ticking up is core to the FOMO feeling"). Returns a reactive
 * number that eases toward the source value on first paint and whenever it
 * changes. Falls back to an instant set when animation isn't available
 * (reduced-motion preference, tests/SSR without requestAnimationFrame).
 */
export function useCountUp(source: () => number, duration = 800) {
  const display = ref(0);
  let raf = 0;

  const prefersReduced =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // Skip animation under test (happy-dom provides rAF but never advances it,
  // which would leave stats reading 0) and when reduced motion is requested.
  const isTest =
    typeof process !== 'undefined' && !!process.env && process.env.NODE_ENV === 'test';

  const canAnimate =
    typeof requestAnimationFrame === 'function' &&
    typeof performance !== 'undefined' &&
    !prefersReduced &&
    !isTest;

  const animate = (to: number) => {
    const target = Number.isFinite(to) ? to : 0;
    if (!canAnimate) {
      display.value = target;
      return;
    }
    cancelAnimationFrame(raf);
    const from = display.value;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      display.value = from + (target - from) * eased;
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        display.value = target;
      }
    };
    raf = requestAnimationFrame(tick);
  };

  watch(source, (to) => animate(to ?? 0), { immediate: true });

  return display;
}
