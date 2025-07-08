<template>
  <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
      <!-- Item Selection -->
      <div class="md:col-span-4">
        <ItemSelector
          :model-value="item.item"
          @update:model-value="handleItemChange"
          @item-selected="handleItemSelected"
          :items="props.items"
          :used-items="props.usedItems"
          :label="t('common.item') + ' *'"
          :placeholder="t('forms.selectItem')"
        />
        <div v-if="errors.item" class="text-red-600 dark:text-red-400 text-xs mt-1">
          {{ errors.item }}
        </div>
      </div>

      <!-- Quantity -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('common.quantity') }} *
        </label>
        <input 
          :value="item.quantity"
          @input="handleQuantityChange"
          @blur="validateQuantity"
          type="number" 
          min="0.01"
          step="0.01"
          required 
          class="input"
          :class="{ 'border-red-300': errors.quantity }"
          placeholder="0"
        />
        <div v-if="errors.quantity" class="text-red-600 dark:text-red-400 text-xs mt-1">
          {{ errors.quantity }}
        </div>
        <div v-if="selectedItemUnit" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ getUnitDisplay(selectedItemUnit) }}
        </div>
      </div>

      <!-- Unit Price -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('forms.unitPrice') }} *
        </label>
        <input 
          :value="item.unit_price"
          @input="handleUnitPriceChange"
          @blur="validateUnitPrice"
          type="number" 
          min="0.01"
          step="0.01"
          required 
          class="input"
          :class="{ 'border-red-300': errors.unit_price }"
          placeholder="0.00"
        />
        <div v-if="errors.unit_price" class="text-red-600 dark:text-red-400 text-xs mt-1">
          {{ errors.unit_price }}
        </div>
      </div>

      <!-- Total Amount -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('common.total') }} *
        </label>
        <input 
          :value="item.total_amount"
          @input="handleTotalAmountChange"
          @blur="validateTotalAmount"
          type="number" 
          min="0.01"
          step="0.01"
          required 
          class="input"
          :class="{ 'border-red-300': errors.total_amount }"
          placeholder="0.00"
        />
        <div v-if="errors.total_amount" class="text-red-600 dark:text-red-400 text-xs mt-1">
          {{ errors.total_amount }}
        </div>
      </div>

      <!-- Actions -->
      <div class="md:col-span-2 flex items-end">
        <button 
          @click="$emit('remove', index)"
          class="btn-outline text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-300 hover:border-red-400 dark:border-red-600 dark:hover:border-red-500 w-full md:w-auto"
          :title="t('delivery.removeItem')"
        >
          <Trash2 class="h-4 w-4" />
          <span class="ml-2 md:hidden">{{ t('delivery.removeItem') }}</span>
        </button>
      </div>
    </div>

    <!-- Item Notes -->
    <div class="mt-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {{ t('delivery.itemNotes') }}
      </label>
      <textarea 
        :value="item.notes"
        @input="handleNotesChange"
        class="input" 
        rows="2" 
        :placeholder="t('delivery.itemNotesPlaceholder')"
      ></textarea>
    </div>

    <!-- Validation Messages -->
    <div v-if="hasErrors" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      <div class="text-red-800 dark:text-red-200 text-sm">
        <div class="font-medium mb-1">{{ t('forms.validationError') }}</div>
        <ul class="list-disc list-inside space-y-1">
          <li v-for="(error, key) in Object.values(errors).filter(e => e)" :key="key">{{ error }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import type { Item } from '../../services/pocketbase';
import ItemSelector from '../ItemSelector.vue';

interface DeliveryItemForm {
  tempId: string;
  item: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  notes?: string;
}

interface Props {
  item: DeliveryItemForm;
  index: number;
  items: Item[];
  usedItems: string[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  update: [index: number, item: DeliveryItemForm];
  remove: [index: number];
}>();

const { t } = useI18n();

// Validation errors
const errors = reactive({
  item: '',
  quantity: '',
  unit_price: '',
  total_amount: ''
});

// Computed properties
const selectedItem = computed(() => {
  return props.items.find(item => item.id === props.item.item);
});

const selectedItemUnit = computed(() => {
  return selectedItem.value?.unit || '';
});

const hasErrors = computed(() => {
  return Object.values(errors).some(error => error !== '');
});

// Methods
const getUnitDisplay = (unit: string) => {
  const unitMap: Record<string, string> = {
    'pieces': t('units.pieces'),
    'pcs': t('units.pcs'),
    'kg': t('units.kg'),
    'tons': t('units.tons'),
    'ton': t('units.ton'),
    'liters': t('units.liters'),
    'l': t('units.l'),
    'meters': t('units.meters'),
    'feet': t('units.feet'),
    'ft': t('units.ft'),
    'units': t('units.units'),
    'bag': t('units.bag'),
    'box': t('units.box'),
    'sqft': t('units.sqft'),
    'm2': t('units.m2'),
    'm3': t('units.m3')
  };
  return unitMap[unit] || unit;
};

const validateQuantity = () => {
  errors.quantity = '';
  if (props.item.quantity <= 0) {
    errors.quantity = t('forms.quantityRequired');
  }
};

const validateUnitPrice = () => {
  errors.unit_price = '';
  if (props.item.unit_price <= 0) {
    errors.unit_price = t('forms.unitPriceRequired');
  }
};

const validateTotalAmount = () => {
  errors.total_amount = '';
  if (props.item.total_amount <= 0) {
    errors.total_amount = t('forms.totalAmountRequired');
  }
};

const calculateTotal = (quantity: number, unit_price: number) => {
  // Ensure positive values for calculation
  const safeQuantity = Math.max(0, quantity || 0);
  const safeUnitPrice = Math.max(0, unit_price || 0);
  const total = safeQuantity * safeUnitPrice;
  return Math.round(total * 100) / 100; // Round to 2 decimal places
};

const calculateUnitPrice = (total_amount: number, quantity: number) => {
  // Ensure positive values and prevent division by zero
  const safeTotal = Math.max(0, total_amount || 0);
  const safeQuantity = Math.max(0.01, quantity || 0.01); // Minimum 0.01 to prevent division by zero
  const unit_price = safeTotal / safeQuantity;
  return Math.round(unit_price * 100) / 100; // Round to 2 decimal places
};

const updateItem = (updates: Partial<DeliveryItemForm>, updateSource?: 'unit_price' | 'total_amount' | 'quantity') => {
  const updatedItem = { ...props.item, ...updates };
  
  // Handle two-way sync based on what was changed
  if (updateSource === 'unit_price' || updateSource === 'quantity') {
    // If unit price or quantity changed, recalculate total
    updatedItem.total_amount = calculateTotal(updatedItem.quantity, updatedItem.unit_price);
  } else if (updateSource === 'total_amount') {
    // If total amount changed, recalculate unit price (only if quantity > 0)
    if (updatedItem.quantity > 0) {
      updatedItem.unit_price = calculateUnitPrice(updatedItem.total_amount, updatedItem.quantity);
    }
  }
  
  emit('update', props.index, updatedItem);
};

const handleItemChange = (itemId: string) => {
  updateItem({ item: itemId });
  // Clear error when user makes a selection
  if (itemId) {
    errors.item = '';
  }
};

const handleItemSelected = (item: Item | null) => {
  // Additional logic when item is selected, if needed
  if (item) {
    // Could auto-populate unit price based on item history, etc.
  }
};

const handleQuantityChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const quantity = parseFloat(target.value) || 0;
  updateItem({ quantity }, 'quantity');
  // Clear error when user enters a valid value
  if (quantity > 0) {
    errors.quantity = '';
  }
};

const handleUnitPriceChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const unit_price = parseFloat(target.value) || 0;
  updateItem({ unit_price }, 'unit_price');
  // Clear error when user enters a valid value
  if (unit_price > 0) {
    errors.unit_price = '';
  }
};

const handleTotalAmountChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const total_amount = parseFloat(target.value) || 0;
  updateItem({ total_amount }, 'total_amount');
  // Clear error when user enters a valid value
  if (total_amount > 0) {
    errors.total_amount = '';
  }
};

const handleNotesChange = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  updateItem({ notes: target.value });
};
</script>