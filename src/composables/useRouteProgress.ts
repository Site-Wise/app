import { ref } from 'vue';

/**
 * Shared navigation-progress state for the top loading bar.
 *
 * The router toggles this around each navigation. For instant (already-cached)
 * client-side navigations, start→end happen within the same tick so the bar
 * never visibly flashes — it only appears when there's real latency (lazy route
 * chunk fetch, slow guard), which is exactly the native-app behaviour we want.
 */
export const routeLoading = ref(false);

export function startRouteProgress() {
  routeLoading.value = true;
}

export function endRouteProgress() {
  routeLoading.value = false;
}
