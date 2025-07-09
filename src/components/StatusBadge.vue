<template>
  <span :class="badgeClasses">
    {{ badgeText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';

interface Props {
  type: 'new' | 'beta';
  size?: 'xs' | 'sm' | 'md';
  position?: 'absolute' | 'inline';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'xs',
  position: 'inline'
});

const { t } = useI18n();

const badgeText = computed(() => {
  return t(`badges.${props.type}`);
});

const badgeClasses = computed(() => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-sm',
    md: 'px-3 py-1.5 text-sm'
  };
  
  const colorClasses = {
    new: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    beta: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  };
  
  const positionClasses = props.position === 'absolute' 
    ? 'absolute top-1/2 right-2 -translate-y-1/2' 
    : '';
  
  return `${baseClasses} ${sizeClasses[props.size]} ${colorClasses[props.type]} ${positionClasses}`;
});
</script>