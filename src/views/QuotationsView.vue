<template>
  <div>
    <!-- Desktop Header with Add Button -->
    <div class="hidden md:flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('quotations.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('quotations.subtitle') }}
        </p>
      </div>
      <button 
        @click="handleAddQuotation" 
        class="btn-primary"
        :title="t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
        data-keyboard-shortcut="n"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('quotations.addQuotation') }}
      </button>
    </div>

    <!-- Mobile Header with Search -->
    <div class="md:hidden mb-6">
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('quotations.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('quotations.subtitle') }}
        </p>
      </div>
      
      <!-- Mobile Search Box -->
      <div class="relative">
        <input
          type="text"
          :placeholder="t('search.quotations')"
          v-model="searchQuery"
          class="w-full px-4 py-3 pl-10 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div v-if="searchLoading" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Loader2 class="h-4 w-4 animate-spin text-gray-400" />
        </div>
      </div>
    </div>

    <!-- Quotations Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.item') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.vendor') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('quotations.unitPrice') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('quotations.minimumQuantity') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('quotations.validUntil') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.status') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="quotation in quotations" :key="quotation.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ quotation.expand?.item?.name }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ getUnitDisplay(quotation.expand?.item?.unit || 'units') }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900 dark:text-white">{{ quotation.expand?.vendor?.contact_person }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              ₹{{ quotation.unit_price.toFixed(2) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ quotation.minimum_quantity || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ quotation.valid_until ? formatDate(quotation.valid_until) : '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="`status-${quotation.status}`">
                {{ quotation.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <!-- Desktop Action Buttons -->
              <div class="hidden lg:flex items-center space-x-2" @click.stop>
                <button
                  @click="editQuotation(quotation)"
                  class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  :title="t('common.edit')"
                >
                  <Edit2 class="h-4 w-4" />
                </button>
                <button
                  @click="deleteQuotation(quotation.id!)"
                  class="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  :title="t('common.deleteAction')"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>

              <!-- Mobile Dropdown Menu -->
              <div class="lg:hidden">
                <CardDropdownMenu
                  :actions="getQuotationActions(quotation)"
                  @action="handleQuotationAction(quotation, $event)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="quotations.length === 0" class="text-center py-12">
        <FileText class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('quotations.noQuotations') }}</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('quotations.getStarted') }}</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingQuotation" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingQuotation ? t('quotations.editQuotation') : t('quotations.addQuotation') }}
          </h3>
          
          <form @submit.prevent="saveQuotation" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.item') }}</label>
              <select ref="firstInputRef" v-model="form.item" required class="input mt-1" autofocus>
                <option value="">{{ t('forms.selectItem') }}</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.name }} ({{ getUnitDisplay(item.unit) }})
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}</label>
              <select v-model="form.vendor" required class="input mt-1">
                <option value="">{{ t('forms.selectVendor') }}</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('forms.unitPrice') }}</label>
                <input v-model.number="form.unit_price" type="number" step="0.01" required class="input mt-1" :placeholder="t('forms.enterAmount')" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('quotations.minimumQuantity') }}</label>
                <input v-model.number="form.minimum_quantity" type="number" class="input mt-1" :placeholder="t('forms.optional')" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('quotations.validUntil') }}</label>
              <input v-model="form.valid_until" type="date" class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.status') }}</label>
              <select v-model="form.status" required class="input mt-1">
                <option value="pending">{{ t('common.pending') }}</option>
                <option value="approved">{{ t('common.approved') }}</option>
                <option value="rejected">{{ t('common.rejected') }}</option>
                <option value="expired">{{ t('common.expired') }}</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.notes') }}</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" :placeholder="t('quotations.additionalNotes')"></textarea>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingQuotation ? t('common.update') : t('common.create') }}
              </button>
              <button type="button" @click="closeModal" class="flex-1 btn-outline">
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import { FileText, Plus, Edit2, Trash2, Loader2 } from 'lucide-vue-next';
import { 
  quotationService, 
  itemService, 
  vendorService,
  type Quotation 
} from '../services/pocketbase';
import { useI18n } from '../composables/useI18n';
import { usePermissions } from '../composables/usePermissions';
import { useSiteData } from '../composables/useSiteData';
import { useQuotationSearch } from '../composables/useSearch';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';

const { t } = useI18n();
const { canDelete } = usePermissions();
// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults, loadAll } = useQuotationSearch();

// Display items: use search results if searching, otherwise all items
const quotations = computed(() => {
  return searchQuery.value.trim() ? searchResults.value : allQuotations.value
});

// Use site data management
const { data: allQuotationsData, reload: reloadQuotations } = useSiteData(
  async () => await quotationService.getAll()
);

const { data: itemsData } = useSiteData(
  async () => await itemService.getAll()
);

const { data: vendorsData } = useSiteData(
  async () => await vendorService.getAll()
);

// Computed properties from useSiteData
const allQuotations = computed(() => allQuotationsData.value || []);
const items = computed(() => itemsData.value || []);
const vendors = computed(() => vendorsData.value || []);
const showAddModal = ref(false);
const editingQuotation = ref<Quotation | null>(null);
const loading = ref(false);

const firstInputRef = ref<HTMLSelectElement>();

const form = reactive({
  vendor: '',
  item: '',
  unit_price: 0,
  minimum_quantity: 0,
  valid_until: '',
  notes: '',
  status: 'pending' as 'pending' | 'approved' | 'rejected' | 'expired'
});

const reloadAllData = async () => {
  await reloadQuotations();
  // Other data will be reloaded automatically by useSiteData
  
  // Load all items for search functionality
  loadAll();
};

const saveQuotation = async () => {
  loading.value = true;
  try {
    const data = { ...form };
    
    // Create a clean data object without optional empty fields
    const cleanData: Partial<Quotation> = {
      vendor: data.vendor,
      item: data.item,
      unit_price: data.unit_price,
      status: data.status
    };
    
    if (data.minimum_quantity) {
      cleanData.minimum_quantity = data.minimum_quantity;
    }
    
    if (data.valid_until) {
      cleanData.valid_until = data.valid_until;
    }
    
    if (data.notes) {
      cleanData.notes = data.notes;
    }
    
    if (editingQuotation.value) {
      await quotationService.update(editingQuotation.value.id!, cleanData);
    } else {
      await quotationService.create(cleanData as Omit<Quotation, 'id' | 'site'>);
    }
    await reloadAllData();
    closeModal();
  } catch (error) {
    console.error('Error saving quotation:', error);
  } finally {
    loading.value = false;
  }
};

const editQuotation = (quotation: Quotation) => {
  editingQuotation.value = quotation;
  Object.assign(form, {
    vendor: quotation.vendor,
    item: quotation.item,
    unit_price: quotation.unit_price,
    minimum_quantity: quotation.minimum_quantity || 0,
    valid_until: quotation.valid_until || '',
    notes: quotation.notes || '',
    status: quotation.status
  });
};

const deleteQuotation = async (id: string) => {
  if (confirm(t('messages.confirmDelete', { item: t('common.item') }))) {
    try {
      await quotationService.delete(id);
      await reloadAllData();
    } catch (error) {
      console.error('Error deleting quotation:', error);
    }
  }
};

const getUnitDisplay = (unitKey: string) => {
  // If translation exists, show "Translation (key)", otherwise just show the key
  const translationKey = `units.${unitKey}`;
  const translation = t(translationKey);
  
  // If translation is the same as the key, it means translation doesn't exist
  if (translation === translationKey) {
    return unitKey;
  }
  
  return `${translation} (${unitKey})`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const closeModal = () => {
  showAddModal.value = false;
  editingQuotation.value = null;
  Object.assign(form, {
    vendor: '',
    item: '',
    unit_price: 0,
    minimum_quantity: 0,
    valid_until: '',
    notes: '',
    status: 'pending'
  });
};

const handleAddQuotation = async () => {
  showAddModal.value = true;
  await nextTick();
  firstInputRef.value?.focus();
};

// Site change is handled automatically by useSiteData

const getQuotationActions = (_quotation: Quotation) => {
  return [
    {
      key: 'edit',
      label: t('common.edit'),
      icon: Edit2,
      variant: 'default' as const
    },
    {
      key: 'delete',
      label: t('common.deleteAction'),
      icon: Trash2,
      variant: 'danger' as const,
      disabled: !canDelete.value
    }
  ];
};

const handleQuotationAction = (quotation: Quotation, action: string) => {
  switch (action) {
    case 'edit':
      editQuotation(quotation);
      break;
    case 'delete':
      deleteQuotation(quotation.id!);
      break;
  }
};

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    handleAddQuotation();
  }
};

// Event listeners using @vueuse/core
useEventListener(window, 'keydown', handleKeyboardShortcut);
</script>