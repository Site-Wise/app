<template>
  <div
    class="fixed top-0 left-0 right-0 z-[100] h-0.5 pointer-events-none"
    :class="visible ? 'opacity-100' : 'opacity-0'"
    aria-hidden="true"
  >
    <div
      class="h-full bg-amber-500 shadow-[0_0_8px_rgba(255,184,0,0.6)] transition-[width] ease-out"
      :style="{ width: width + '%', transitionDuration: width >= 100 ? '160ms' : '400ms' }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { routeLoading } from '../composables/useRouteProgress';

const visible = ref(false);
const width = ref(0);
let doneTimer: ReturnType<typeof setTimeout> | undefined;

watch(routeLoading, (loading) => {
  if (loading) {
    clearTimeout(doneTimer);
    visible.value = true;
    width.value = 0;
    // Next frame so the 0% width paints before easing toward 90%.
    requestAnimationFrame(() => { width.value = 90; });
  } else if (visible.value) {
    width.value = 100;
    doneTimer = setTimeout(() => {
      visible.value = false;
      width.value = 0;
    }, 200);
  }
});

onBeforeUnmount(() => clearTimeout(doneTimer));
</script>
