<template>
  <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
      <!-- Item Selection -->
      <div class="md:col-span-4">
        <ItemSelector
          ref="itemSelectorRef"
          :model-value="item.item"
          @update:model-value="handleItemChange"
          @item-selected="handleItemSelected"
          @create-new-item="$emit('createNewItem', $event)"
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
          ref="quantityInputRef"
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
      <div class="md:col-span-2 relative">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('forms.unitPrice') }} *
        </label>
        <div class="relative">
          <input
            :value="item.unit_price"
            @input="handleUnitPriceChange"
            @blur="validateUnitPrice"
            @keydown="handlePriceKeydown($event, 'unit_price')"
            type="number"
            min="0.01"
            step="0.01"
            required
            class="input pr-10"
            :class="{ 'border-red-300': errors.unit_price }"
            placeholder="0.00"
          />
          <button
            type="button"
            @click="toggleTaxInput('unit_price')"
            class="tax-trigger absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            :title="t('delivery.addTax')"
          >
            <Percent class="h-4 w-4" />
          </button>
        </div>
        <div v-if="errors.unit_price" class="text-red-600 dark:text-red-400 text-xs mt-1">
          {{ errors.unit_price }}
        </div>

        <!-- Tax Input for Unit Price -->
        <div v-if="showTaxInput === 'unit_price'" class="tax-overlay absolute z-10 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <div class="flex items-center space-x-2">
            <input
              v-model.number="taxRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-16 px-2 py-1 text-center text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
              autofocus
              @keydown.enter.prevent="applyTax('unit_price')"
              @keydown.escape="showTaxInput = null"
            />
            <span class="text-sm text-gray-600 dark:text-gray-400">%</span>
            <button
              type="button"
              @click="applyTax('unit_price')"
              class="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
            >
              {{ t('common.apply') }}
            </button>
            <button
              type="button"
              @click="showTaxInput = null"
              class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Total Amount -->
      <div class="md:col-span-2 relative">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('common.total') }} *
        </label>
        <div class="relative">
          <input
            :value="item.total_amount"
            @input="handleTotalAmountChange"
            @blur="validateTotalAmount"
            @keydown="handlePriceKeydown($event, 'total_amount')"
            type="number"
            min="0.01"
            step="0.01"
            required
            class="input pr-10"
            :class="{ 'border-red-300': errors.total_amount }"
            placeholder="0.00"
          />
          <button
            type="button"
            @click="toggleTaxInput('total_amount')"
            class="tax-trigger absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            :title="t('delivery.addTax')"
          >
            <Percent class="h-4 w-4" />
          </button>
        </div>
        <div v-if="errors.total_amount" class="text-red-600 dark:text-red-400 text-xs mt-1">
          {{ errors.total_amount }}
        </div>

        <!-- Tax Input for Total Amount -->
        <div v-if="showTaxInput === 'total_amount'" class="tax-overlay absolute z-10 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <div class="flex items-center space-x-2">
            <input
              v-model.number="taxRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-16 px-2 py-1 text-center text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
              autofocus
              @keydown.enter.prevent="applyTax('total_amount')"
              @keydown.escape="showTaxInput = null"
            />
            <span class="text-sm text-gray-600 dark:text-gray-400">%</span>
            <button
              type="button"
              @click="applyTax('total_amount')"
              class="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
            >
              {{ t('common.apply') }}
            </button>
            <button
              type="button"
              @click="showTaxInput = null"
              class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 invisible">
          {{ t('common.actions') }}
        </label>
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
import { computed, reactive, ref, nextTick, onMounted, onUnmounted } from 'vue';
import { Trash2, Percent } from 'lucide-vue-next';
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
  createNewItem: [searchQuery: string];
}>();

const { t } = useI18n();

// Refs
const quantityInputRef = ref<HTMLInputElement>();
const itemSelectorRef = ref();

// Tax functionality state
const showTaxInput = ref<'unit_price' | 'total_amount' | null>(null);
const taxRate = ref<number>(parseFloat(localStorage.getItem('last_tax_rate') || '0'));

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

// Tax functionality methods
const toggleTaxInput = (field: 'unit_price' | 'total_amount') => {
  if (showTaxInput.value === field) {
    showTaxInput.value = null;
  } else {
    showTaxInput.value = field;
  }
};

const applyTax = (field: 'unit_price' | 'total_amount') => {
  if (taxRate.value <= 0) return;

  // Save the tax rate for next time
  localStorage.setItem('last_tax_rate', taxRate.value.toString());

  const currentValue = field === 'unit_price' ? props.item.unit_price : props.item.total_amount;
  const taxMultiplier = 1 + (taxRate.value / 100);
  const newValue = Math.round(currentValue * taxMultiplier * 100) / 100;

  if (field === 'unit_price') {
    updateItem({ unit_price: newValue }, 'unit_price');
  } else {
    updateItem({ total_amount: newValue }, 'total_amount');
  }

  // Hide the tax input after applying
  showTaxInput.value = null;
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

const handleItemSelected = async (item: Item | null) => {
  // Additional logic when item is selected, if needed
  if (item) {
    // Auto-focus quantity input when item is selected
    await nextTick();
    quantityInputRef.value?.focus();
    quantityInputRef.value?.select(); // Select all text for easy overwriting
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

// Handle keyboard shortcuts for price inputs
const handlePriceKeydown = async (event: KeyboardEvent, field: 'unit_price' | 'total_amount') => {
  // SHIFT + "+" to open tax popup
  if (event.shiftKey && event.key === '+') {
    event.preventDefault();
    showTaxInput.value = field;
    // Focus the tax input after it appears
    await nextTick();
    const taxInput = document.querySelector('.tax-overlay input[type="number"]') as HTMLInputElement;
    if (taxInput) {
      taxInput.focus();
      taxInput.select();
    }
  }
};

// Method to auto-focus the item selector (to be called from parent)
const focusItemSelector = async () => {
  await nextTick();
  itemSelectorRef.value?.focus();
};

// Click outside to close tax input
const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  if (!target.closest('.tax-overlay') && !target.closest('.tax-trigger')) {
    showTaxInput.value = null;
  }
};

// Expose methods for parent component to call
defineExpose({
  focusItemSelector
});

// Add click outside listener
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>