import { watch } from 'vue';
import { useModalState } from './useModalState';

/**
 * Centralized body-scroll-lock driven by the modal stack.
 *
 * When the number of open overlays goes 0 → >0 we lock the body (saving the
 * current scroll position and pinning the body with position:fixed); when it
 * returns to 0 we restore scroll. Mounted once by AppLayout so every inline
 * modal gets scroll-lock for free without per-modal code.
 *
 * Mirrors the approach used by the (orphaned) BottomSheet.vue but adds scroll
 * position preservation so the page doesn't jump to the top on close.
 */
export function useBodyScrollLock() {
  const { openModalCount } = useModalState();

  let savedScrollY = 0;
  let isLocked = false;

  const lock = () => {
    if (isLocked || typeof document === 'undefined') return;
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    isLocked = true;
  };

  const unlock = () => {
    if (!isLocked || typeof document === 'undefined') return;
    const body = document.body;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    // Restore the scroll position the user was at before locking.
    window.scrollTo(0, savedScrollY);
    isLocked = false;
  };

  watch(
    openModalCount,
    (count, prev) => {
      if (count > 0 && (prev === 0 || prev === undefined)) {
        lock();
      } else if (count === 0 && prev && prev > 0) {
        unlock();
      }
    },
    { immediate: true }
  );

  return { lock, unlock };
}
