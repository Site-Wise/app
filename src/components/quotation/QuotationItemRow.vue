<template>
  <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
      <!-- Item Selection -->
      <div class="md:col-span-5">
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

      <!-- Unit Price -->
      <div class="md:col-span-3">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('forms.unitPrice') }} *
        </label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
          <input
            ref="unitPriceInputRef"
            :value="item.unit_price"
            @input="handleUnitPriceChange"
            @blur="validateUnitPrice"
            type="number"
            min="0.01"
            step="0.01"
            required
            class="input pl-7"
            :class="{ 'border-red-300': errors.unit_price }"
            placeholder="0.00"
          />
        </div>
        <div v-if="errors.unit_price" class="text-red-600 dark:text-red-400 text-xs mt-1">
          {{ errors.unit_price }}
        </div>
        <div v-if="selectedItemUnit" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ t('quotations.perUnit', { unit: getUnitDisplay(selectedItemUnit) }) }}
        </div>
      </div>

      <!-- Minimum Quantity -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('quotations.minimumQuantity') }}
        </label>
        <input
          :value="item.minimum_quantity"
          @input="handleMinQuantityChange"
          type="number"
          min="0"
          step="1"
          class="input"
          :placeholder="t('forms.optional')"
        />
        <div v-if="selectedItemUnit" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ getUnitDisplay(selectedItemUnit) }}
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
          :title="t('quotations.removeItem')"
        >
          <Trash2 class="h-4 w-4" />
          <span class="ml-2 md:hidden">{{ t('quotations.removeItem') }}</span>
        </button>
      </div>
    </div>

    <!-- Item Notes -->
    <div class="mt-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {{ t('common.notes') }}
      </label>
      <textarea
        :value="item.notes"
        @input="handleNotesChange"
        class="input"
        rows="2"
        :placeholder="t('quotations.itemNotesPlaceholder')"
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
import { computed, reactive, ref, nextTick } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import type { Item } from '../../services/pocketbase';
import ItemSelector from '../ItemSelector.vue';

interface QuotationItemForm {
  tempId: string;
  item: string;
  unit_price: number;
  minimum_quantity?: number;
  notes?: string;
}

interface Props {
  item: QuotationItemForm;
  index: number;
  items: Item[];
  usedItems: string[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  update: [index: number, item: QuotationItemForm];
  remove: [index: number];
  createNewItem: [searchQuery: string];
}>();

const { t } = useI18n();

// Refs
const unitPriceInputRef = ref<HTMLInputElement>();
const itemSelectorRef = ref();

// Validation errors
const errors = reactive({
  item: '',
  unit_price: ''
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

const validateUnitPrice = () => {
  errors.unit_price = '';
  if (props.item.unit_price <= 0) {
    errors.unit_price = t('forms.unitPriceRequired');
  }
};

const updateItem = (updates: Partial<QuotationItemForm>) => {
  const updatedItem = { ...props.item, ...updates };
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
  if (item) {
    // Auto-focus unit price input when item is selected
    await nextTick();
    unitPriceInputRef.value?.focus();
    unitPriceInputRef.value?.select();
  }
};

const handleUnitPriceChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const unit_price = parseFloat(target.value) || 0;
  updateItem({ unit_price });
  // Clear error when user enters a valid value
  if (unit_price > 0) {
    errors.unit_price = '';
  }
};

const handleMinQuantityChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const minimum_quantity = parseFloat(target.value) || undefined;
  updateItem({ minimum_quantity });
};

const handleNotesChange = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  updateItem({ notes: target.value });
};

// Method to auto-focus the item selector (to be called from parent)
const focusItemSelector = async () => {
  await nextTick();
  itemSelectorRef.value?.focus();
};

// Expose methods for parent component to call
defineExpose({
  focusItemSelector
});
</script>
