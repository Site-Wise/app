<template>
  <!--
    Permission-aware inline cross-reference link.
    - When the viewer lacks the required permission, render plain text (no dead link).
    - Otherwise render a <router-link> so middle-click / open-in-new-tab work.
    - @click.stop ALWAYS applied so it never triggers an outer row/card click handler.
  -->
  <router-link
    v-if="isLinkable"
    :to="to"
    class="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 underline-offset-2 hover:underline transition-colors duration-150 ease-snap"
    @click.stop
  >
    {{ label }}
  </router-link>
  <span
    v-else
    class="text-ink dark:text-cream"
    @click.stop
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { usePermissions } from '../composables/usePermissions';

type RecordType =
  | 'vendor'
  | 'item'
  | 'service'
  | 'account'
  | 'delivery'
  | 'payment'
  | 'booking'
  | 'quotation'
  | 'return';

interface Props {
  type: RecordType;
  id: string;
  label: string;
  /** 'detail' -> entity detail route; 'filter' -> list route with relation query. */
  mode?: 'detail' | 'filter';
  /** For mode='filter': the list route path, e.g. '/deliveries'. */
  target?: string;
  /** For mode='filter': query key, e.g. 'vendor' (defaults derived from type). */
  filterKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'detail',
  target: undefined,
  filterKey: undefined,
});

const { canRead, canViewFinancials } = usePermissions();

// Only these entity types have dedicated detail routes.
const DETAIL_BASE_PATHS: Partial<Record<RecordType, string>> = {
  vendor: '/vendors',
  item: '/items',
  service: '/services',
  account: '/accounts',
};

// Default query key used for mode='filter' when filterKey is not supplied.
const DEFAULT_FILTER_KEYS: Record<RecordType, string> = {
  vendor: 'vendor',
  item: 'item',
  service: 'service',
  account: 'account',
  delivery: 'delivery',
  payment: 'payment',
  booking: 'booking',
  quotation: 'quotation',
  return: 'return',
};

// Effective mode: types without a detail route fall back to 'filter'.
const effectiveMode = computed<'detail' | 'filter'>(() => {
  if (props.mode === 'detail' && !DETAIL_BASE_PATHS[props.type]) {
    return 'filter';
  }
  return props.mode;
});

// Permission gate. Financial entities require canViewFinancials; the rest require canRead.
const hasPermission = computed(() => {
  if (props.type === 'account' || props.type === 'payment') {
    return canViewFinancials.value;
  }
  return canRead.value;
});

// Resolve the target location, or null when it cannot be built (renders plain text).
const to = computed<RouteLocationRaw | null>(() => {
  if (effectiveMode.value === 'detail') {
    const base = DETAIL_BASE_PATHS[props.type];
    if (!base || !props.id) return null;
    return { path: `${base}/${props.id}` };
  }
  // filter mode
  const path = props.target;
  if (!path || !props.id) return null;
  const key = props.filterKey || DEFAULT_FILTER_KEYS[props.type];
  return { path, query: { [key]: props.id } };
});

const isLinkable = computed(() => hasPermission.value && to.value !== null);
</script>
