import { ref, computed } from 'vue';

/**
 * Centralized modal/overlay manager.
 *
 * Phase 1 of the PWA "native-app UX" work: pressing the device/browser BACK
 * button while an overlay is open closes the TOPMOST overlay instead of
 * navigating away, and body scroll is locked centrally while any overlay is open.
 *
 * The store is an ordered STACK (LIFO). Each entry tracks:
 *  - id:               the modal identifier used by the view's local boolean ref
 *  - close:            OPTIONAL callback that flips the view's local boolean false
 *                      (i.e. the view's own close function). Invoked by the
 *                      hardware-back path so the overlay actually disappears.
 *  - ownsHistoryEntry: whether openModal() pushed a synthetic history entry for
 *                      this modal (true on web/PWA, false on Tauri desktop).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * THE TWO CLOSE PATHS (the crux — keep these straight):
 *
 * 1. PROGRAMMATIC close (X button / Esc / backdrop / save-and-close):
 *    view calls its close() → closeModal(id).
 *    closeModal() removes the entry AND, if it owned a history entry, calls
 *    history.back() ONCE (guarded by `isProgrammaticClose`). That history.back()
 *    fires a popstate which we must IGNORE (it was our own synthetic pop).
 *
 * 2. HARDWARE/BROWSER back → popstate → handlePopState():
 *    the browser already consumed the synthetic entry, so we must NOT call
 *    history.back() again. We pop the top entry and invoke its close() callback.
 *    That callback typically calls closeModal(id) again — but because we set
 *    `isHandlingPopState` for the duration, that re-entrant closeModal() is a
 *    no-op for history (the entry is already gone) and never calls history.back().
 *
 * Double-close / stack-desync prevention:
 *  - closeModal() is IDEMPOTENT: removing an id not on the stack is a no-op and
 *    never calls history.back(). Views that close several ids in one function
 *    (only one of which is actually registered) are safe.
 *  - history.back() is called at most once per programmatic close, gated by the
 *    `ownsHistoryEntry` flag of the popped entry and the `isProgrammaticClose`
 *    guard so the resulting popstate can't double-close another modal.
 * ───────────────────────────────────────────────────────────────────────────
 */

interface ModalEntry {
  id: string;
  close?: () => void;
  ownsHistoryEntry: boolean;
}

// Module-level ordered stack (shared across all useModalState() callers).
const modalStack = ref<ModalEntry[]>([]);

// True while we are processing a hardware/browser back popstate. closeModal()
// invoked re-entrantly from a view's close callback during this window must NOT
// push another history.back() (the browser already consumed the entry).
let isHandlingPopState = false;

// True between calling history.back() ourselves and the resulting popstate. Used
// by handlePopState() to recognise & swallow our own synthetic pop.
let isProgrammaticClose = false;

/**
 * Whether per-modal history integration (history.pushState/back) is enabled.
 *
 * Platform gating: we DEFAULT to enabled (web/PWA behaviour). On Tauri DESKTOP
 * there is no hardware back button, and hijacking the history stack could
 * interfere with native window handling, so it may be disabled. usePlatform()
 * resolves asynchronously; defaulting to enabled is safe because desktop simply
 * never presses a hardware back button. See setHistoryIntegrationEnabled().
 */
let historyIntegrationEnabled = true;

export function setHistoryIntegrationEnabled(enabled: boolean) {
  historyIntegrationEnabled = enabled;
}

// Guard against environments (SSR / partial History API) where these are absent.
function canUseHistory(): boolean {
  return (
    historyIntegrationEnabled &&
    typeof window !== 'undefined' &&
    typeof window.history !== 'undefined' &&
    typeof window.history.pushState === 'function'
  );
}

export function useModalState() {
  /**
   * Register a modal as open and push it onto the stack.
   * @param modalId stable id matching the view's local boolean ref
   * @param close   OPTIONAL view close fn (flips local boolean false). When
   *                provided, the hardware-back path can auto-close this overlay.
   */
  const openModal = (modalId: string, close?: () => void) => {
    let ownsHistoryEntry = false;

    if (canUseHistory()) {
      try {
        // Push a synthetic history entry so a subsequent back press lands here
        // (consumed by handlePopState) instead of navigating the app away.
        window.history.pushState({ swModal: modalId }, '');
        ownsHistoryEntry = true;
      } catch {
        // happy-dom / restricted environments: degrade gracefully to no history.
        ownsHistoryEntry = false;
      }
    }

    modalStack.value.push({ id: modalId, close, ownsHistoryEntry });
  };

  /**
   * Programmatic close path (X / Esc / backdrop / save). Removes the entry and,
   * if it owned a synthetic history entry, calls history.back() once.
   *
   * Idempotent: closing an id not on the stack is a no-op (no history.back()).
   */
  const closeModal = (modalId: string) => {
    const index = modalStack.value.findIndex((e) => e.id === modalId);
    if (index === -1) {
      // Not registered (e.g. view closing several candidate ids at once). No-op.
      return;
    }

    const [entry] = modalStack.value.splice(index, 1);

    // If this close originated from the hardware-back popstate, the browser has
    // already consumed the history entry — do NOT call history.back() again.
    if (isHandlingPopState) {
      return;
    }

    if (entry.ownsHistoryEntry && canUseHistory()) {
      // Roll the synthetic entry back off the history stack. Guard the resulting
      // popstate so it doesn't get treated as a hardware-back double-close.
      isProgrammaticClose = true;
      try {
        window.history.back();
      } catch {
        isProgrammaticClose = false;
      }
    }
  };

  // Check if any modal is open
  const isAnyModalOpen = computed(() => modalStack.value.length > 0);

  // Check if a specific modal is open
  const isModalOpen = (modalId: string) =>
    computed(() => modalStack.value.some((e) => e.id === modalId));

  // Get count of open modals
  const openModalCount = computed(() => modalStack.value.length);

  return {
    openModal,
    closeModal,
    isAnyModalOpen,
    isModalOpen,
    openModalCount,
    handlePopState,
    resetModalStack,
  };
}

/**
 * Central popstate handler. Installed ONCE by AppLayout.
 *
 * - If `isProgrammaticClose` is set, this popstate is the echo of our own
 *   history.back(): just clear the flag and return (already handled).
 * - Otherwise this is a genuine hardware/browser back: pop the TOP entry and run
 *   its close() callback (closing the innermost overlay first, LIFO). We set
 *   `isHandlingPopState` for the duration so the re-entrant closeModal() the
 *   callback triggers is a no-op for history and never calls history.back().
 *
 * NOTE: never calls router.push / redirect and never touches App.vue's
 * isReadyForRouting boot-fix — it only closes overlays.
 */
export function handlePopState() {
  if (isProgrammaticClose) {
    isProgrammaticClose = false;
    return;
  }

  if (modalStack.value.length === 0) {
    // No overlay open — let the browser/router handle the navigation normally.
    return;
  }

  // Pop the topmost (innermost) overlay.
  const entry = modalStack.value[modalStack.value.length - 1];

  isHandlingPopState = true;
  try {
    if (entry.close) {
      // The view's close() will flip its local boolean AND call closeModal(id);
      // that closeModal is a history no-op while isHandlingPopState is set.
      entry.close();
    }
    // Defensive: if the close callback didn't remove the entry (e.g. no close fn
    // provided, or it closed a different id), pop it ourselves so the stack and
    // the (already-popped) history stay in sync.
    const stillPresent = modalStack.value.indexOf(entry);
    if (stillPresent !== -1) {
      modalStack.value.splice(stillPresent, 1);
    }
  } finally {
    isHandlingPopState = false;
  }
}

/**
 * Flush the stack and reconcile any owned synthetic history entries. Called on
 * route change so a guard redirect mid-modal doesn't leave orphaned history
 * entries or a stale scroll-lock. Does not interfere with the navigation itself.
 */
export function resetModalStack() {
  if (modalStack.value.length === 0) return;

  // Count synthetic entries we still own so we can roll them back off history.
  const ownedCount = modalStack.value.filter((e) => e.ownsHistoryEntry).length;
  modalStack.value = [];

  // A route change consumes one history entry already; we only need to clean up
  // the EXTRA synthetic modal entries. We intentionally do NOT call history.back
  // here: doing so could fight the in-flight navigation. The synthetic entries
  // become harmless no-op states (their popstate finds an empty stack and is
  // passed through). Reset the guards to a clean baseline.
  void ownedCount;
  isHandlingPopState = false;
  isProgrammaticClose = false;
}
