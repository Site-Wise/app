<template>
  <div
    class="flex items-center justify-between gap-3 px-4 min-h-touch py-2 transition-colors duration-150 ease-snap"
    :class="highlighted ? 'bg-stone-50 dark:bg-ink-4' : ''"
  >
    <!-- Identity: contact person (prominent) + company (muted sub-text) -->
    <div class="min-w-0 flex-1">
      <div class="text-sm font-medium text-ink dark:text-cream truncate">
        {{ vendor.contact_person || vendor.name || t('vendors.unnamedVendor') }}
      </div>
      <div
        v-if="vendor.name && vendor.contact_person"
        class="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5"
      >
        {{ vendor.name }}
      </div>
    </div>

    <!-- Balance: signed outstanding, right-aligned -->
    <div v-if="showBalance || pendingCount > 0" class="flex-none text-right">
      <div
        v-if="showBalance"
        class="text-sm font-mono font-semibold sw-tabular leading-none"
        :class="isDue
          ? 'text-clay-600 dark:text-clay-400'
          : 'text-forest-600 dark:text-forest-400'"
      >
        ₹{{ Math.abs(balance!).toFixed(2) }}
      </div>
      <div v-if="showBalance" class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
        {{ isDue ? t('common.amountDue') : t('common.extraAdvance') }}
      </div>
      <div v-if="pendingCount > 0" class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
        {{ t('vendors.pendingItems', { count: pendingCount }) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Vendor } from '../services/pocketbase';
import { useI18n } from '../composables/useI18n';

interface Props {
  vendor: Vendor;
  balance?: number;       // SIGNED outstanding: > 0 = due (clay), < 0 = advance (forest), 0/undefined = hidden
  highlighted?: boolean;
  pendingCount?: number;  // optional sub-line, e.g. "N pending item(s)"
}

const props = withDefaults(defineProps<Props>(), {
  balance: undefined,
  highlighted: false,
  pendingCount: 0,
});

const { t } = useI18n();

const showBalance = computed(() => props.balance !== undefined && props.balance !== 0);
const isDue = computed(() => (props.balance ?? 0) > 0);
</script>
