import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

/**
 * Reliable "open the add modal" hand-off for the global "+ Record" quick actions.
 *
 * The old approach dispatched a one-shot `window` event 100ms after navigating.
 * That raced against route-chunk lazy-loading and site-data loading: if the
 * target view's listener wasn't mounted within 100ms, the event was missed and
 * the modal never appeared. Instead we persist the intent in a module-level ref
 * and let the destination view consume it as soon as it's ready (on mount, and
 * via a watcher for the already-mounted case where navigation is a no-op).
 */
const pending = ref(false);

/** Called by the launcher (AppLayout) right before navigating to the target route. */
export function requestQuickActionModal() {
  pending.value = true;
}

/**
 * Registered by each list view. `open` is the view's own handler that opens its
 * create modal. Consumes the pending intent exactly once. Also keeps listening
 * to the legacy `show-add-modal` window event so other triggers (e.g. the
 * onboarding card) keep working.
 */
export function useQuickActionModal(open: () => void) {
  const consume = () => {
    if (pending.value) {
      pending.value = false;
      open();
    }
  };

  const onLegacyEvent = () => open();

  onMounted(() => {
    window.addEventListener('show-add-modal', onLegacyEvent);
    // Defer one tick so the view's own state is fully initialised first.
    nextTick(consume);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('show-add-modal', onLegacyEvent);
  });

  // Already-mounted case: user is on the page and triggers the action again.
  watch(pending, (isPending) => {
    if (isPending) consume();
  });
}
