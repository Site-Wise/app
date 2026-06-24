<template>
  <div v-if="hasMore" class="w-full">
    <!-- Bottom-inline loading skeleton (incremental load) -->
    <div v-if="loadingMore" class="py-4">
      <slot name="skeleton">
        <div class="flex items-center justify-center gap-2 text-sm text-stone-500 dark:text-stone-400">
          <Loader2 class="h-4 w-4 animate-spin" />
          <span>{{ t('common.loadingMore') }}</span>
        </div>
      </slot>
    </div>

    <!-- Always-rendered "Load more" button: a11y + slow-network / no-IO fallback -->
    <div v-else class="flex justify-center py-4">
      <button
        type="button"
        class="btn-outline"
        @click="emitLoadMore"
      >
        {{ t('common.loadMore') }}
      </button>
    </div>

    <!-- Observed sentinel: 1px target with rootMargin prefetch -->
    <div ref="sentinelRef" aria-hidden="true" class="h-px w-full"></div>

    <!-- aria-live announcement for screen readers -->
    <div class="sr-only" role="status" aria-live="polite">
      {{ announcement }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import { Loader2 } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';

const props = defineProps<{
  hasMore: boolean;
  loadingMore: boolean;
  /** Optional: number of newly-loaded rows, used for the aria-live announcement. */
  loadedCount?: number;
}>();

const emit = defineEmits<{
  (e: 'loadMore'): void;
}>();

const { t } = useI18n();

const sentinelRef = ref<HTMLElement | null>(null);
const announcement = ref('');

const emitLoadMore = () => {
  emit('loadMore');
};

// Prefetch before the user reaches the bottom on slow networks.
useIntersectionObserver(
  sentinelRef,
  ([entry]) => {
    if (entry?.isIntersecting && props.hasMore && !props.loadingMore) {
      emitLoadMore();
    }
  },
  { rootMargin: '300px' }
);

// Announce newly-loaded rows once a "load more" cycle completes.
watch(
  () => props.loadingMore,
  (now, prev) => {
    if (prev && !now && typeof props.loadedCount === 'number' && props.loadedCount > 0) {
      announcement.value = t('common.loadedMore', { count: props.loadedCount });
    }
  }
);
</script>
