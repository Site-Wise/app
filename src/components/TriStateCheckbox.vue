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
              ₹{{ totalAmount.toFixed(2) }}
            </span>
            <span
              v-else-if="state === 'partial'"
              class="font-medium text-blue-600 dark:text-blue-400"
            >
              ₹{{ allocatedAmount.toFixed(2) }} / ₹{{ totalAmount.toFixed(2) }}
            </span>
            <span
              v-else
              class="font-medium text-gray-500 dark:text-gray-400"
            >
              ₹{{ totalAmount.toFixed(2) }}
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
      
      <!-- Partial Amount Input (when partial state and editable) -->
      <div
        v-if="state === 'partial' && allowPartialEdit"
        class="mt-2 flex items-center space-x-2"
      >
        <label class="text-xs text-gray-600 dark:text-gray-400">
          Partial amount:
        </label>
        <input
          v-model.number="partialAmount"
          type="number"
          step="0.01"
          :min="0"
          :max="totalAmount"
          @input="handlePartialAmountChange"
          @blur="validatePartialAmount"
          class="w-24 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="0.00"
        />
        <span class="text-xs text-gray-500 dark:text-gray-400">
          / ₹{{ totalAmount.toFixed(2) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Check } from 'lucide-vue-next';

export type TriStateValue = 'unchecked' | 'partial' | 'checked';

interface Props {
  id?: string;
  label?: string;
  secondaryText?: string;
  state: TriStateValue;
  totalAmount: number;
  allocatedAmount?: number;
  disabled?: boolean;
  allowPartialEdit?: boolean;
  ariaLabel?: string;
}

interface Emits {
  (e: 'update:state', value: TriStateValue): void;
  (e: 'update:allocatedAmount', value: number): void;
  (e: 'change', data: { state: TriStateValue; allocatedAmount: number }): void;
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  label: '',
  secondaryText: '',
  allocatedAmount: 0,
  disabled: false,
  allowPartialEdit: false,
  ariaLabel: ''
});

const emit = defineEmits<Emits>();

// Internal state for partial amount editing
const partialAmount = ref(props.allocatedAmount);

// Computed classes
const checkboxClasses = computed(() => {
  const baseClasses = 'border-gray-300 dark:border-gray-600';
  
  switch (props.state) {
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
  switch (props.state) {
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
  
  // Cycle through states: unchecked → checked → partial → unchecked
  let newState: TriStateValue;
  let newAllocatedAmount: number;
  
  switch (props.state) {
    case 'unchecked':
      newState = 'checked';
      newAllocatedAmount = props.totalAmount;
      break;
    case 'checked':
      newState = props.allowPartialEdit ? 'partial' : 'unchecked';
      newAllocatedAmount = props.allowPartialEdit ? props.totalAmount * 0.5 : 0;
      break;
    case 'partial':
      newState = 'unchecked';
      newAllocatedAmount = 0;
      break;
    default:
      newState = 'unchecked';
      newAllocatedAmount = 0;
  }
  
  partialAmount.value = newAllocatedAmount;
  emit('update:state', newState);
  emit('update:allocatedAmount', newAllocatedAmount);
  emit('change', { state: newState, allocatedAmount: newAllocatedAmount });
};

const handlePartialAmountChange = () => {
  const amount = Number(partialAmount.value) || 0;
  const clampedAmount = Math.max(0, Math.min(amount, props.totalAmount));
  
  partialAmount.value = clampedAmount;
  emit('update:allocatedAmount', clampedAmount);
  emit('change', { state: 'partial', allocatedAmount: clampedAmount });
};

const validatePartialAmount = () => {
  const amount = Number(partialAmount.value) || 0;
  
  if (amount <= 0) {
    partialAmount.value = 0;
    emit('update:state', 'unchecked');
    emit('update:allocatedAmount', 0);
    emit('change', { state: 'unchecked', allocatedAmount: 0 });
  } else if (amount >= props.totalAmount) {
    partialAmount.value = props.totalAmount;
    emit('update:state', 'checked');
    emit('update:allocatedAmount', props.totalAmount);
    emit('change', { state: 'checked', allocatedAmount: props.totalAmount });
  } else {
    emit('update:state', 'partial');
    emit('update:allocatedAmount', amount);
    emit('change', { state: 'partial', allocatedAmount: amount });
  }
};

// Watch for external changes to allocatedAmount
watch(() => props.allocatedAmount, (newValue) => {
  partialAmount.value = newValue;
});

// Watch for external state changes to sync partial amount
watch(() => props.state, (newState) => {
  if (newState === 'checked') {
    partialAmount.value = props.totalAmount;
  } else if (newState === 'unchecked') {
    partialAmount.value = 0;
  }
});
</script>