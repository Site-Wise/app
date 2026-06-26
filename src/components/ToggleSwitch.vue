<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    class="relative inline-flex flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-snap focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink-3 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[
      trackSize,
      modelValue ? 'bg-amber-500' : 'bg-stone-300 dark:bg-ink-4',
    ]"
    @click="toggle"
  >
    <span
      class="inline-block transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-snap"
      :class="[knobSize, modelValue ? knobOn : 'translate-x-0.5']"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    disabled?: boolean;
    size?: 'md' | 'lg';
    ariaLabel?: string;
  }>(),
  { disabled: false, size: 'md' },
);

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const trackSize = computed(() => (props.size === 'lg' ? 'h-7 w-12' : 'h-6 w-11'));
const knobSize = computed(() => (props.size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'));
const knobOn = computed(() => (props.size === 'lg' ? 'translate-x-5' : 'translate-x-[1.375rem]'));

const toggle = () => {
  if (props.disabled) return;
  emit('update:modelValue', !props.modelValue);
};
</script>
