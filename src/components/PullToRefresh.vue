<template>
  <div
    ref="containerRef"
    class="relative"
  >
    <!-- Pull indicator -->
    <div
      class="absolute left-0 right-0 flex items-center justify-center overflow-hidden pointer-events-none z-10"
      :style="{
        height: `${pullDistance}px`,
        top: `-${pullDistance}px`,
        opacity: pullDistance > 0 ? 1 : 0,
        transition: isPulling ? 'none' : 'all 0.3s ease-out'
      }"
    >
      <div
        class="w-8 h-8 flex items-center justify-center"
        :class="[
          isRefreshing ? 'animate-spin' : '',
          canRefresh && !isRefreshing ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
        ]"
      >
        <RefreshCw class="w-5 h-5" :class="{ 'rotate-180': canRefresh && !isRefreshing }" />
      </div>
    </div>

    <!-- Content container -->
    <div
      :style="{
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { RefreshCw } from 'lucide-vue-next';
import { usePullToRefresh } from '../composables/usePullToRefresh';

const props = withDefaults(defineProps<{
  disabled?: boolean;
}>(), {
  disabled: false
});

const emit = defineEmits<{
  (e: 'refresh'): Promise<void>;
}>();

const containerRef = ref<HTMLElement | null>(null);

const handleRefresh = async () => {
  await emit('refresh');
};

const {
  isPulling,
  isRefreshing,
  pullDistance,
  canRefresh,
  bindToElement
} = usePullToRefresh({
  onRefresh: handleRefresh,
  disabled: props.disabled
});

onMounted(() => {
  bindToElement(containerRef.value);
});

watch(containerRef, (el) => {
  bindToElement(el);
});
</script>
