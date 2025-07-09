<template>
  <div class="flex items-center space-x-3">
    <button
      type="button"
      @click="handleClick"
      :disabled="disabled"
      :class="[
        'relative w-5 h-5 rounded border-2 transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        checkboxClasses
      ]"
      :aria-checked="state === 'checked' ? 'true' : state === 'partial' ? 'mixed' : 'false'"
      :aria-label="ariaLabel"
      role="checkbox"
    >
      <!-- Checked State (Full) -->
      <div
        v-if="state === 'checked'"
        class="absolute inset-0 flex items-center justify-center"
      >
        <Check class="w-3 h-3 text-white" />
      </div>
      
      <!-- Partial State -->
      <div
        v-else-if="state === 'partial'"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="w-2 h-2 bg-white rounded-sm"></div>
      </div>
    </button>
    
    <!-- Label and Content -->
    <div class="flex-1">
      <div class="flex items-center justify-between">
        <label
          v-if="label"
          :for="id"
          :class="[
            'text-sm font-medium cursor-pointer',
            disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
          ]"
          @click="handleClick"
        >
          {{ label }}
        </label>
        
        <div class="flex items-center space-x-2">
          <!-- Amount Display -->
          <div class="text-sm">
            <span
              v-if="state === 'checked'"
              class="font-medium text-green-600 dark:text-green-400"
            >
              ₹{{ dueAmount.toFixed(2) }}
            </span>
            <span
              v-else-if="state === 'partial'"
              class="font-medium text-blue-600 dark:text-blue-400"
            >
              ₹{{ allocatedAmount.toFixed(2) }} / ₹{{ dueAmount.toFixed(2) }}
            </span>
            <span
              v-else
              class="font-medium text-gray-500 dark:text-gray-400"
            >
              ₹{{ dueAmount.toFixed(2) }}
            </span>
          </div>
          
          <!-- Status Indicator -->
          <div class="w-2 h-2 rounded-full" :class="statusIndicatorClasses"></div>
        </div>
      </div>
      
      <!-- Secondary Information -->
      <div v-if="secondaryText" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ secondaryText }}
      </div>
      
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Check } from 'lucide-vue-next';

export type TriStateValue = 'unchecked' | 'partial' | 'checked';

interface Props {
  id?: string;
  label?: string;
  secondaryText?: string;
  dueAmount: number;
  allocatedAmount?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

interface Emits {
  (e: 'update:allocatedAmount', value: number): void;
  (e: 'change', data: { allocatedAmount: number }): void;
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  label: '',
  secondaryText: '',
  allocatedAmount: 0,
  disabled: false,
  ariaLabel: ''
});

const emit = defineEmits<Emits>();

// Computed state based on allocated vs due amounts
const state = computed((): TriStateValue => {
  if (props.allocatedAmount <= 0) {
    return 'unchecked';
  } else if (props.allocatedAmount >= props.dueAmount) {
    return 'checked';
  } else {
    return 'partial';
  }
});

// Computed classes
const checkboxClasses = computed(() => {
  const baseClasses = 'border-gray-300 dark:border-gray-600';
  
  switch (state.value) {
    case 'checked':
      return 'bg-green-500 border-green-500 dark:bg-green-600 dark:border-green-600';
    case 'partial':
      return 'bg-blue-500 border-blue-500 dark:bg-blue-600 dark:border-blue-600';
    case 'unchecked':
    default:
      return `bg-white dark:bg-gray-800 ${baseClasses}`;
  }
});

const statusIndicatorClasses = computed(() => {
  switch (state.value) {
    case 'checked':
      return 'bg-green-500 dark:bg-green-400';
    case 'partial':
      return 'bg-blue-500 dark:bg-blue-400';
    case 'unchecked':
    default:
      return 'bg-gray-300 dark:bg-gray-600';
  }
});

// Methods
const handleClick = () => {
  if (props.disabled) return;
  
  // Cycle through allocation amounts: 0 → full → half → 0
  // State is automatically determined by the amounts
  let newAllocatedAmount: number;
  
  switch (state.value) {
    case 'unchecked':
      newAllocatedAmount = props.dueAmount; // Full amount
      break;
    case 'checked':
      newAllocatedAmount = props.dueAmount * 0.5; // Half amount (partial)
      break;
    case 'partial':
      newAllocatedAmount = 0; // No amount
      break;
    default:
      newAllocatedAmount = 0;
  }
  
  emit('update:allocatedAmount', newAllocatedAmount);
  emit('change', { allocatedAmount: newAllocatedAmount });
};

// All amount calculation logic is now handled by PaymentModal
// No need for internal amount tracking or validation
</script>