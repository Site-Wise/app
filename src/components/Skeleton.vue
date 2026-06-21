<template>
  <div
    class="sw-skeleton"
    :class="[rounded, { 'rounded-full': circle }]"
    :style="style"
    aria-hidden="true"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  width?: string;
  height?: string;
  rounded?: string;
  circle?: boolean;
}>(), {
  width: '100%',
  height: '1rem',
  rounded: 'rounded-md',
  circle: false,
});

const style = computed(() => ({
  width: props.width,
  height: props.height,
}));
</script>
