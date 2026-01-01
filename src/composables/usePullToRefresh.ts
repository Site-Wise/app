import { ref, onUnmounted } from 'vue';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export function usePullToRefresh(options: UsePullToRefreshOptions) {
  const {
    onRefresh,
    threshold = 80,
    maxPull = 120,
    disabled = false
  } = options;

  const isPulling = ref(false);
  const isRefreshing = ref(false);
  const pullDistance = ref(0);
  const canRefresh = ref(false);

  let startY = 0;
  let currentY = 0;
  let containerEl: HTMLElement | null = null;

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || isRefreshing.value) return;

    // Only trigger pull-to-refresh if at the top of the scroll container
    if (containerEl && containerEl.scrollTop > 0) return;

    const touch = e.touches[0];
    startY = touch.clientY;
    isPulling.value = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.value || disabled || isRefreshing.value) return;

    // Only trigger if we're at the top
    if (containerEl && containerEl.scrollTop > 0) {
      isPulling.value = false;
      pullDistance.value = 0;
      return;
    }

    const touch = e.touches[0];
    currentY = touch.clientY;
    const delta = currentY - startY;

    // Only pull down, not up
    if (delta <= 0) {
      pullDistance.value = 0;
      canRefresh.value = false;
      return;
    }

    // Apply resistance factor for more natural feel
    const resistance = 0.5;
    pullDistance.value = Math.min(delta * resistance, maxPull);
    canRefresh.value = pullDistance.value >= threshold;

    // Prevent default scroll if we're pulling
    if (pullDistance.value > 0) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.value || disabled) return;

    isPulling.value = false;

    if (canRefresh.value && !isRefreshing.value) {
      isRefreshing.value = true;
      pullDistance.value = threshold; // Keep at threshold during refresh

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        isRefreshing.value = false;
        pullDistance.value = 0;
        canRefresh.value = false;
      }
    } else {
      pullDistance.value = 0;
      canRefresh.value = false;
    }
  };

  const bindToElement = (el: HTMLElement | null) => {
    if (containerEl) {
      containerEl.removeEventListener('touchstart', handleTouchStart as any);
      containerEl.removeEventListener('touchmove', handleTouchMove as any);
      containerEl.removeEventListener('touchend', handleTouchEnd);
    }

    containerEl = el;

    if (containerEl) {
      containerEl.addEventListener('touchstart', handleTouchStart as any, { passive: true });
      containerEl.addEventListener('touchmove', handleTouchMove as any, { passive: false });
      containerEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
  };

  onUnmounted(() => {
    if (containerEl) {
      containerEl.removeEventListener('touchstart', handleTouchStart as any);
      containerEl.removeEventListener('touchmove', handleTouchMove as any);
      containerEl.removeEventListener('touchend', handleTouchEnd);
    }
  });

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    canRefresh,
    bindToElement,
  };
}
