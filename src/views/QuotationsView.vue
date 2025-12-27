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
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('quotations.title') }}</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ t('quotations.subtitle') }}
          </p>
        </div>
        <button
          @click="handleAddQuotation"
          class="btn-primary p-3"
          :title="t('quotations.addQuotation')"
        >
          <Plus class="h-5 w-5" />
        </button>
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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.vendor') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.items') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('quotations.validUntil') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.status') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="quotation in quotations" :key="quotation.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ quotation.expand?.vendor?.contact_person }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ quotation.expand?.vendor?.name }}</div>
            </td>
            <td class="px-6 py-4">
              <div v-if="quotation.expand?.quotation_items?.length" class="space-y-1">
                <div v-for="(qItem, idx) in quotation.expand.quotation_items.slice(0, 3)" :key="qItem.id" class="text-sm">
                  <span class="font-medium text-gray-900 dark:text-white">{{ qItem.expand?.item?.name || 'Unknown Item' }}</span>
                  <span class="text-gray-500 dark:text-gray-400 ml-2">₹{{ qItem.unit_price.toFixed(2) }}/{{ qItem.expand?.item?.unit || 'unit' }}</span>
                  <span v-if="qItem.minimum_quantity" class="text-gray-400 dark:text-gray-500 ml-1">(min: {{ qItem.minimum_quantity }})</span>
                </div>
                <div v-if="quotation.expand.quotation_items.length > 3" class="text-xs text-gray-400 dark:text-gray-500">
                  +{{ quotation.expand.quotation_items.length - 3 }} {{ t('delivery.moreItems') }}
                </div>
              </div>
              <div v-else class="text-sm text-gray-400 dark:text-gray-500">
                {{ t('quotations.noItems') }}
              </div>
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
    <MultiItemQuotationModal
      v-if="showAddModal"
      :editing-quotation="editingQuotation || undefined"
      @close="closeModal"
      @success="handleQuotationSuccess"
      @saved="handleQuotationSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import { FileText, Plus, Edit2, Trash2, Loader2 } from 'lucide-vue-next';
import {
  quotationService,
  type Quotation
} from '../services/pocketbase';
import { useI18n } from '../composables/useI18n';
import { usePermissions } from '../composables/usePermissions';
import { useSiteData } from '../composables/useSiteData';
import { useQuotationSearch } from '../composables/useSearch';
import { useModalState } from '../composables/useModalState';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import MultiItemQuotationModal from '../components/quotation/MultiItemQuotationModal.vue';

const { t } = useI18n();
const { canDelete } = usePermissions();
const { openModal, closeModal: closeModalState } = useModalState();
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

// Computed properties from useSiteData
const allQuotations = computed(() => allQuotationsData.value || []);
const showAddModal = ref(false);
const editingQuotation = ref<Quotation | null>(null);

const reloadAllData = async () => {
  await reloadQuotations();
  // Load all items for search functionality
  loadAll();
};

const editQuotation = (quotation: Quotation) => {
  editingQuotation.value = quotation;
  showAddModal.value = true;
  openModal('quotations-edit-modal');
};

// Handle successful quotation update (for editing)
const handleQuotationSuccess = async () => {
  await reloadAllData();
  closeModal();
};

// Handle new quotations saved (keep modal open for more)
const handleQuotationSaved = async () => {
  await reloadAllData();
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const closeModal = () => {
  showAddModal.value = false;
  editingQuotation.value = null;
  closeModalState('quotations-add-modal');
  closeModalState('quotations-edit-modal');
};

const handleAddQuotation = () => {
  editingQuotation.value = null;
  showAddModal.value = true;
  openModal('quotations-add-modal');
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