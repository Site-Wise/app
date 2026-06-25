<template>
  <th
    :class="[thClass, 'cursor-pointer select-none group transition-colors', alignClass]"
    :aria-sort="ariaSortValue"
    @click="$emit('sort', sortKey)"
  >
    <span class="inline-flex items-center gap-1" :class="{ 'flex-row-reverse': align === 'right' }">
      <slot>{{ label }}</slot>
      <component
        :is="icon"
        class="h-3.5 w-3.5 flex-none"
        :class="isActive
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-stone-300 dark:text-stone-600 group-hover:text-stone-400 dark:group-hover:text-stone-500'"
        aria-hidden="true"
      />
    </span>
  </th>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-vue-next';

interface Props {
  /** The column's sort key (passed to toggleSort / matched against the active key). */
  sortKey: string;
  /** The currently-active sort key from useTableSort (null = unsorted). */
  activeKey: string | null;
  /** The current sort direction from useTableSort. */
  direction: 'asc' | 'desc';
  /** Header text (or use the default slot). */
  label?: string;
  /** Cell alignment; 'right' mirrors the icon to the left of the label. */
  align?: 'left' | 'right' | 'center';
  /** The original <th>'s classes (padding/typography) to preserve styling. */
  thClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  align: 'left',
  thClass: '',
});

defineEmits<{ (e: 'sort', key: string): void }>();

const isActive = computed(() => props.activeKey === props.sortKey);

const icon = computed(() =>
  !isActive.value ? ArrowUpDown : props.direction === 'asc' ? ArrowUp : ArrowDown
);

const ariaSortValue = computed<'ascending' | 'descending' | 'none'>(() =>
  isActive.value ? (props.direction === 'asc' ? 'ascending' : 'descending') : 'none'
);

const alignClass = computed(() =>
  props.align === 'right' ? 'text-right' : props.align === 'center' ? 'text-center' : 'text-left'
);
</script>
