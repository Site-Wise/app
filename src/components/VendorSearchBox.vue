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
        class="w-full px-4 py-3 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        :class="{ 
          'border-red-500 dark:border-red-500': hasError,
          'pr-20': selectedVendor && !searchQuery && getVendorBalance(selectedVendor).amount > 0, // Add padding for outstanding amount
          'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700': disabled
        }"
        :autofocus="autofocus"
        :required="required"
        :name="name"
        :disabled="disabled"
      />
      <!-- Outstanding amount display in input -->
      <div v-if="selectedVendor && !searchQuery && getVendorBalance(selectedVendor).amount > 0" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <div class="text-right">
          <div class="text-sm font-semibold"
               :class="{
                 'text-orange-600 dark:text-orange-400': getVendorBalance(selectedVendor).type === 'due',
                 'text-green-600 dark:text-green-400': getVendorBalance(selectedVendor).type === 'advance'
               }">
            ₹{{ getVendorBalance(selectedVendor).amount.toFixed(2) }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ getVendorBalance(selectedVendor).type === 'due' ? t('common.amountDue') : t('common.extraAdvance') }}
          </div>
        </div>
      </div>
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <div v-if="loading" class="absolute inset-y-0 right-0 flex items-center pointer-events-none"
           :class="selectedVendor && !searchQuery && getVendorBalance(selectedVendor).amount > 0 ? 'pr-24' : 'pr-3'">
        <Loader2 class="h-4 w-4 animate-spin text-gray-400" />
      </div>
    </div>

    <!-- Dropdown with outstanding amount for selected vendor -->
    <div 
      v-if="showDropdown && (filteredVendors.length > 0 || selectedVendor)"
      class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
      <!-- Selected vendor with outstanding amount -->
      <div 
        v-if="selectedVendor && !searchQuery"
        class="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ selectedVendor.contact_person }}
            </span>
          </div>
          <div class="text-right">
            <div v-if="getVendorBalance(selectedVendor).amount > 0" class="text-sm font-semibold"
                 :class="{
                   'text-orange-600 dark:text-orange-400': getVendorBalance(selectedVendor).type === 'due',
                   'text-green-600 dark:text-green-400': getVendorBalance(selectedVendor).type === 'advance'
                 }">
              ₹{{ getVendorBalance(selectedVendor).amount.toFixed(2) }}
            </div>
            <div v-if="getVendorBalance(selectedVendor).amount > 0" class="text-xs text-gray-500 dark:text-gray-400">
              {{ getVendorBalance(selectedVendor).type === 'due' ? t('common.amountDue') : t('common.extraAdvance') }}
            </div>
            <div v-if="pendingItemsCount > 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ pendingItemsCount }} pending {{ pendingItemsCount === 1 ? 'item' : 'items' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Vendor search results -->
      <div v-if="filteredVendors.length > 0" class="py-1">
        <div
          v-for="(vendor, index) in filteredVendors"
          :key="vendor.id"
          @mousedown="selectVendor(vendor)"
          @mouseenter="highlightedIndex = index"
          class="px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          :class="{ 'bg-gray-50 dark:bg-gray-700': highlightedIndex === index }"
        >
          <div class="flex items-center justify-between">
            <span class="text-gray-900 dark:text-white">{{ vendor.contact_person }}</span>
            <div class="text-right">
              <div v-if="getVendorBalance(vendor).amount > 0" class="text-xs"
                   :class="{
                     'text-orange-600 dark:text-orange-400': getVendorBalance(vendor).type === 'due',
                     'text-green-600 dark:text-green-400': getVendorBalance(vendor).type === 'advance'
                   }">
                ₹{{ getVendorBalance(vendor).amount.toFixed(2) }}
              </div>
              <div v-if="getVendorBalance(vendor).amount > 0" class="text-xs text-gray-500 dark:text-gray-400">
                {{ getVendorBalance(vendor).type === 'due' ? t('common.amountDue') : t('common.extraAdvance') }}
              </div>
              <div v-if="getVendorPendingCount(vendor) > 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ getVendorPendingCount(vendor) }} pending {{ getVendorPendingCount(vendor) === 1 ? 'item' : 'items' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No results message -->
      <div v-if="filteredVendors.length === 0 && searchQuery && !selectedVendor" class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        No vendors found matching "{{ searchQuery }}"
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