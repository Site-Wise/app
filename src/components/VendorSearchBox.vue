<template>
  <div class="relative">
    <div class="relative">
      <input
        ref="inputRef"
        type="text"
        :placeholder="placeholder"
        :value="inputDisplayValue"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @click="handleClick"
        @keydown.down.prevent="navigateDown"
        @keydown.up.prevent="navigateUp"
        @keydown.enter.prevent="selectCurrent"
        @keydown.escape.prevent="closeDropdown"
        class="w-full px-4 py-3 pl-10 pr-4 text-sm border border-stone-200 dark:border-ink-4 rounded-md bg-white dark:bg-ink-3 text-ink dark:text-cream placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-ink dark:focus:border-cream"
        :class="{
          'border-red-500 dark:border-red-500': hasError,
          'pr-20': selectedVendor && !searchQuery && getVendorBalance(selectedVendor).amount > 0, // Add padding for outstanding amount
          'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-ink-4': disabled
        }"
        :autofocus="autofocus"
        :required="required"
        :name="name"
        :disabled="disabled"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <!-- Outstanding amount display in input -->
      <div v-if="selectedVendor && !searchQuery && getVendorBalance(selectedVendor).amount > 0" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <div class="text-right">
          <div class="text-sm font-mono font-semibold sw-tabular"
               :class="{
                 'text-clay-600 dark:text-clay-400': getVendorBalance(selectedVendor).type === 'due',
                 'text-forest-600 dark:text-forest-400': getVendorBalance(selectedVendor).type === 'advance'
               }">
            ₹{{ getVendorBalance(selectedVendor).amount.toFixed(2) }}
          </div>
          <div class="text-xs text-stone-500 dark:text-stone-400">
            {{ getVendorBalance(selectedVendor).type === 'due' ? t('common.amountDue') : t('common.extraAdvance') }}
          </div>
        </div>
      </div>
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-stone-500 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <div v-if="loading" class="absolute inset-y-0 right-0 flex items-center pointer-events-none"
           :class="selectedVendor && !searchQuery && getVendorBalance(selectedVendor).amount > 0 ? 'pr-24' : 'pr-3'">
        <Loader2 class="h-4 w-4 animate-spin text-amber-500" />
      </div>
    </div>

    <!-- Dropdown with outstanding amount for selected vendor -->
    <div
      v-if="showDropdown && (filteredVendors.length > 0 || selectedVendor)"
      class="absolute z-50 w-full mt-1 bg-white dark:bg-ink-3 border border-stone-200 dark:border-ink-4 rounded-lg shadow-modal max-h-60 overflow-y-auto"
    >
      <!-- Selected vendor with outstanding amount -->
      <div
        v-if="selectedVendor && !searchQuery"
        class="border-b border-stone-200 dark:border-ink-4 bg-amber-50 dark:bg-amber-500/10"
      >
        <VendorOption
          :vendor="selectedVendor"
          :balance="getSignedBalance(selectedVendor)"
          :pending-count="pendingItemsCount"
        />
      </div>

      <!-- Vendor search results -->
      <div v-if="filteredVendors.length > 0" class="py-1">
        <div
          v-for="(vendor, index) in filteredVendors"
          :key="vendor.id"
          @mousedown="selectVendor(vendor)"
          @mouseenter="highlightedIndex = index"
          class="cursor-pointer"
        >
          <VendorOption
            :vendor="vendor"
            :balance="getSignedBalance(vendor)"
            :highlighted="highlightedIndex === index"
            :pending-count="getVendorPendingCount(vendor)"
          />
        </div>
      </div>

      <!-- No results message -->
      <div v-if="filteredVendors.length === 0 && searchQuery && !selectedVendor" class="px-4 py-3 text-sm text-stone-500 dark:text-stone-400">
        {{ t('search.noVendorsFound', { query: searchQuery }) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import type { Vendor, Delivery, ServiceBooking, Payment } from '../services/pocketbase';
import { VendorService } from '../services/pocketbase';
import { useI18n } from '../composables/useI18n';
import VendorOption from './VendorOption.vue';

interface Props {
  modelValue: string;
  vendors: Vendor[];
  deliveries: Delivery[];
  serviceBookings: ServiceBooking[];
  payments: Payment[];
  placeholder?: string;
  loading?: boolean;
  autofocus?: boolean;
  required?: boolean;
  name?: string;
  hasError?: boolean;
  outstandingAmount?: number;
  pendingItemsCount?: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search vendors...',
  loading: false,
  autofocus: false,
  required: false,
  name: 'vendor',
  hasError: false,
  outstandingAmount: 0,
  pendingItemsCount: 0,
  disabled: false
});

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'vendorSelected', vendor: Vendor): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
}

const emit = defineEmits<Emits>();

const { t } = useI18n();

// Refs
const inputRef = ref<HTMLInputElement>();
const searchQuery = ref('');
const showDropdown = ref(false);
const highlightedIndex = ref(-1);

// Computed properties
const selectedVendor = computed(() => {
  if (!props.modelValue) return null;
  return props.vendors.find(v => v.id === props.modelValue) || null;
});

const inputDisplayValue = computed(() => {
  if (searchQuery.value) {
    return searchQuery.value;
  }
  if (selectedVendor.value) {
    return selectedVendor.value.contact_person;
  }
  return '';
});

const filteredVendors = computed(() => {
  if (!searchQuery.value) return [];

  const query = searchQuery.value.toLowerCase();
  return props.vendors.filter(vendor =>
    (vendor.contact_person?.toLowerCase().includes(query) ||
     vendor.name?.toLowerCase().includes(query)) &&
    vendor.id !== props.modelValue // Don't show already selected vendor
  );
});

// Helper functions
// Signed outstanding for VendorOption: > 0 = due, < 0 = advance, 0 = settled.
const getSignedBalance = (vendor: Vendor): number => {
  return VendorService.calculateOutstandingFromData(
    vendor.id!,
    props.deliveries,
    props.serviceBookings,
    props.payments
  );
};

const getVendorBalance = (vendor: Vendor): { amount: number; type: 'due' | 'advance' | 'settled' } => {
  const outstandingAmount = VendorService.calculateOutstandingFromData(
    vendor.id!,
    props.deliveries,
    props.serviceBookings,
    props.payments
  );
  
  if (outstandingAmount > 0) {
    return { amount: outstandingAmount, type: 'due' };
  } else if (outstandingAmount < 0) {
    return { amount: Math.abs(outstandingAmount), type: 'advance' };
  } else {
    return { amount: 0, type: 'settled' };
  }
};


const getVendorPendingCount = (vendor: Vendor): number => {
  // For now, return the count of all deliveries and bookings for this vendor
  // TODO: Remove this function once payment_status is fully deprecated
  const vendorDeliveries = props.deliveries.filter(d => d.vendor === vendor.id);
  const vendorBookings = props.serviceBookings.filter(b => b.vendor === vendor.id);
  
  return vendorDeliveries.length + vendorBookings.length;
};

// Event handlers
const handleInput = (event: Event) => {
  if (props.disabled) return;
  
  const target = event.target as HTMLInputElement;
  searchQuery.value = target.value;
  highlightedIndex.value = -1;
  
  // If user starts typing and there's a selected vendor, clear the selection
  if (target.value && selectedVendor.value) {
    emit('update:modelValue', '');
  }
  
  if (target.value) {
    showDropdown.value = true;
  } else {
    showDropdown.value = false;
  }
};

const handleFocus = () => {
  if (props.disabled) return;
  
  emit('focus');
  
  // Only show dropdown if user is actively searching
  if (searchQuery.value) {
    showDropdown.value = true;
  }
  
  // Don't automatically show dropdown when focusing on a pre-selected vendor
  // User can start typing to search for a different vendor if needed
};

const handleClick = () => {
  if (props.disabled) return;
  
  // When user clicks on input, show dropdown to allow vendor selection/change
  // This allows users to see the current selection or search for a new vendor
  if (selectedVendor.value && !searchQuery.value) {
    showDropdown.value = true;
    
    // Select all text to make it easy to replace the vendor name
    // Use nextTick to ensure the input is focused first
    setTimeout(() => {
      inputRef.value?.select();
    }, 0);
  }
};

const handleBlur = () => {
  emit('blur');
  
  // Delay hiding dropdown to allow for clicks
  setTimeout(() => {
    showDropdown.value = false;
    searchQuery.value = '';
    highlightedIndex.value = -1;
  }, 200);
};

const selectVendor = (vendor: Vendor) => {
  emit('update:modelValue', vendor.id!);
  emit('vendorSelected', vendor);
  
  searchQuery.value = '';
  showDropdown.value = false;
  highlightedIndex.value = -1;
};

const navigateDown = () => {
  if (filteredVendors.value.length > 0) {
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredVendors.value.length - 1);
  }
};

const navigateUp = () => {
  if (filteredVendors.value.length > 0) {
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
  }
};

const selectCurrent = () => {
  if (highlightedIndex.value >= 0 && filteredVendors.value[highlightedIndex.value]) {
    selectVendor(filteredVendors.value[highlightedIndex.value]);
  }
};

const closeDropdown = () => {
  showDropdown.value = false;
  searchQuery.value = '';
  highlightedIndex.value = -1;
};

// Public methods
const focus = () => {
  inputRef.value?.focus();
};

// Watch for changes to show appropriate display
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    searchQuery.value = '';
  }
});

// Expose focus method
defineExpose({ focus });
</script>

<style scoped>
/* Add custom scrollbar styling for dropdown */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}
</style>