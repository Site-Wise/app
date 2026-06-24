<template>
  <div>
    <!-- Desktop Header with Add Button -->
    <div class="hidden md:flex items-center justify-between mb-8">
      <div>
        <h1 class="font-display text-2xl font-bold text-ink dark:text-cream">{{ t('quotations.title') }}</h1>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
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
        <h1 class="font-display text-2xl font-bold text-ink dark:text-cream">{{ t('quotations.title') }}</h1>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {{ t('quotations.subtitle') }}
        </p>
      </div>

      <!-- Mobile Search Box -->
      <div class="relative">
        <input
          type="text"
          :placeholder="t('search.quotations')"
          v-model="searchQuery"
          class="input w-full pl-10 pr-10"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div v-if="searchLoading" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Loader2 class="h-4 w-4 animate-spin text-amber" />
        </div>
      </div>
    </div>

    <!-- Quotations List -->
    <div class="overflow-x-auto">

      <!-- xl+: real <table> — only visible at xl breakpoint -->
      <table class="hidden xl:table min-w-full border border-stone-200 dark:border-ink-4 rounded-none bg-white dark:bg-ink-3 shadow-card dark:shadow-inset-hi">
        <thead class="hidden xl:table-header-group bg-cream-2 dark:bg-ink-2 border-b border-stone-200 dark:border-ink-4">
          <tr>
            <th class="py-3 px-4 text-left sw-eyebrow">{{ t('common.item') }}</th>
            <th class="py-3 px-4 text-left sw-eyebrow">{{ t('common.vendor') }}</th>
            <th class="py-3 px-4 text-right sw-eyebrow">{{ t('quotations.unitPrice') }}</th>
            <th class="py-3 px-4 text-right sw-eyebrow">{{ t('quotations.minimumQuantity') }}</th>
            <th class="py-3 px-4 text-right sw-eyebrow">{{ t('quotations.validUntil') }}</th>
            <th class="py-3 px-4 text-left sw-eyebrow">{{ t('common.status') }}</th>
            <th class="py-3 px-4 text-left sw-eyebrow">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200 dark:divide-ink-4">
          <template v-if="quotationsLoading">
            <tr v-for="i in 6" :key="'skel-xl-' + i" class="border-b border-stone-200 dark:border-ink-4">
              <td class="hidden xl:table-cell py-3.5 px-4"><Skeleton height="1rem" width="65%" /></td>
              <td class="hidden xl:table-cell py-3.5 px-4"><Skeleton height="1rem" width="55%" /></td>
              <td class="hidden xl:table-cell py-3.5 px-4 text-right"><Skeleton height="1rem" width="5rem" /></td>
              <td class="hidden xl:table-cell py-3.5 px-4 text-right"><Skeleton height="1rem" width="3rem" /></td>
              <td class="hidden xl:table-cell py-3.5 px-4 text-right"><Skeleton height="1rem" width="5rem" /></td>
              <td class="hidden xl:table-cell py-3.5 px-4"><Skeleton height="1.25rem" width="4.5rem" rounded="rounded-full" /></td>
              <td class="hidden xl:table-cell py-3.5 px-4"><Skeleton height="1rem" width="3.5rem" /></td>
            </tr>
          </template>
          <template v-else>
          <tr
            v-for="quotation in quotations"
            :key="quotation.id"
            class="hover:bg-cream-2 dark:hover:bg-ink-2 transition-colors duration-150 ease-snap"
          >
            <!-- Item + unit -->
            <td class="hidden xl:table-cell py-3.5 px-4">
              <div class="font-medium text-ink dark:text-cream text-sm">{{ quotation.expand?.item?.name }}</div>
              <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{{ getUnitDisplay(quotation.expand?.item?.unit || 'units') }}</div>
            </td>
            <!-- Vendor -->
            <td class="hidden xl:table-cell py-3.5 px-4 text-sm text-stone-600 dark:text-stone-400">
              {{ quotation.expand?.vendor?.contact_person }}
            </td>
            <!-- Unit Price -->
            <td class="hidden xl:table-cell py-3.5 px-4 text-right font-mono sw-tabular text-sm text-forest-700 dark:text-forest-400">
              ₹{{ quotation.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
            <!-- Min Quantity -->
            <td class="hidden xl:table-cell py-3.5 px-4 text-right font-mono sw-tabular text-sm text-stone-600 dark:text-stone-400">
              {{ quotation.minimum_quantity || '-' }}
            </td>
            <!-- Valid Until -->
            <td class="hidden xl:table-cell py-3.5 px-4 text-right font-mono sw-tabular text-sm text-stone-600 dark:text-stone-400">
              {{ quotation.valid_until ? formatDate(quotation.valid_until) : '-' }}
            </td>
            <!-- Status -->
            <td class="hidden xl:table-cell py-3.5 px-4">
              <span :class="getStatusBadgeClass(quotation.status)">
                {{ t(`common.${quotation.status}`) }}
              </span>
            </td>
            <!-- Actions -->
            <td class="hidden xl:table-cell py-3.5 px-4">
              <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150" @click.stop>
                <button
                  @click="editQuotation(quotation)"
                  class="h-8 w-8 flex items-center justify-center text-stone-400 hover:text-ink dark:hover:text-cream rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-150 ease-snap active:scale-[0.98]"
                  :title="t('common.edit')"
                >
                  <Edit2 class="h-4 w-4" />
                </button>
                <button
                  @click="deleteQuotation(quotation.id!)"
                  class="h-8 w-8 flex items-center justify-center text-stone-400 hover:text-clay dark:hover:text-clay-400 rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-150 ease-snap active:scale-[0.98]"
                  :title="t('common.deleteAction')"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
          </template>
        </tbody>
      </table>

      <!-- < xl: stacked card per row -->
      <div class="xl:hidden space-y-3">
        <!-- Skeleton loading state: mobile cards -->
        <template v-if="quotationsLoading">
          <div v-for="i in 6" :key="'skel-mob-' + i" class="card group space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1 space-y-1.5">
                <Skeleton height="1rem" width="65%" />
                <Skeleton height="0.75rem" width="45%" />
              </div>
              <Skeleton height="1.25rem" width="4.5rem" rounded="rounded-full" />
            </div>
            <div class="border-t border-stone-200 dark:border-ink-4 pt-3 grid grid-cols-3 gap-3">
              <div class="space-y-1"><Skeleton height="0.625rem" width="80%" /><Skeleton height="1rem" width="60%" /></div>
              <div class="space-y-1"><Skeleton height="0.625rem" width="80%" /><Skeleton height="1rem" width="40%" /></div>
              <div class="space-y-1"><Skeleton height="0.625rem" width="80%" /><Skeleton height="1rem" width="55%" /></div>
            </div>
          </div>
        </template>
        <div v-else
          v-for="quotation in quotations"
          :key="quotation.id"
          class="card group"
        >
          <!-- Card header: item name + status + dropdown -->
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="font-display text-base font-semibold text-ink dark:text-cream truncate">
                {{ quotation.expand?.item?.name }}
              </div>
              <div class="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                {{ quotation.expand?.vendor?.contact_person }}
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span :class="getStatusBadgeClass(quotation.status)">
                {{ t(`common.${quotation.status}`) }}
              </span>
              <div @click.stop>
                <CardDropdownMenu
                  :actions="getQuotationActions(quotation)"
                  @action="handleQuotationAction(quotation, $event)"
                />
              </div>
            </div>
          </div>

          <!-- Card body: key metrics mini-grid -->
          <div class="mt-auto border-t border-stone-200 dark:border-ink-4 pt-3 mt-3 grid grid-cols-3 gap-3">
            <div>
              <div class="sw-eyebrow mb-0.5">{{ t('quotations.unitPrice') }}</div>
              <div class="font-mono sw-tabular text-base font-semibold text-forest-700 dark:text-forest-400">
                ₹{{ quotation.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </div>
            </div>
            <div>
              <div class="sw-eyebrow mb-0.5">{{ t('quotations.minimumQuantity') }}</div>
              <div class="font-mono sw-tabular text-sm text-stone-600 dark:text-stone-400">
                {{ quotation.minimum_quantity || '-' }}
                <span v-if="quotation.minimum_quantity" class="text-xs ml-0.5">{{ getUnitDisplay(quotation.expand?.item?.unit || 'units') }}</span>
              </div>
            </div>
            <div>
              <div class="sw-eyebrow mb-0.5">{{ t('quotations.validUntil') }}</div>
              <div class="font-mono sw-tabular text-sm text-stone-600 dark:text-stone-400">
                {{ quotation.valid_until ? formatDate(quotation.valid_until) : '-' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="quotations.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <FileText class="h-12 w-12 text-stone-300 dark:text-stone-600 mb-4" />
        <h3 class="font-display text-lg font-semibold text-ink dark:text-cream">{{ t('quotations.noQuotations') }}</h3>
        <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">{{ t('quotations.getStarted') }}</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingQuotation" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60" @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div class="w-full sm:max-w-lg bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden" @click.stop>
        <!-- Grab handle (mobile only) -->
        <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden"></div>

        <!-- Sticky header -->
        <div class="flex items-center gap-3 px-5 sm:px-6 pt-4 pb-3 border-b border-stone-200 dark:border-ink-4">
          <span class="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-amber-500/15">
            <FileText class="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
              {{ editingQuotation ? t('common.edit') : t('common.create') }}
            </p>
            <h3 class="font-display text-lg font-semibold leading-tight text-ink dark:text-cream">
              {{ editingQuotation ? t('quotations.editQuotation') : t('quotations.addQuotation') }}
            </h3>
          </div>
          <button type="button" @click="closeModal" class="ml-auto flex h-8 w-8 flex-none items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 dark:hover:bg-ink-4 dark:text-stone-400">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveQuotation" class="flex flex-col flex-1 overflow-hidden">
          <!-- Scrollable body -->
          <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.item') }}</label>
              <select ref="firstInputRef" v-model="form.item" required class="input mt-1" autofocus>
                <option value="">{{ t('forms.selectItem') }}</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.name }} ({{ getUnitDisplay(item.unit) }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.vendor') }}</label>
              <VendorSearchBox
                v-model="form.vendor"
                :vendors="vendors"
                :deliveries="deliveries"
                :service-bookings="serviceBookings"
                :payments="payments"
                :placeholder="t('forms.selectVendor')"
                :required="true"
                class="mt-1"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('forms.unitPrice') }}</label>
                <input v-model.number="form.unit_price" type="number" step="0.01" required class="input mt-1 font-mono tabular-nums" :placeholder="t('forms.enterAmount')" />
              </div>
              <div>
                <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('quotations.minimumQuantity') }}</label>
                <input v-model.number="form.minimum_quantity" type="number" class="input mt-1" :placeholder="t('forms.optional')" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('quotations.validUntil') }}</label>
              <input v-model="form.valid_until" type="date" class="input mt-1" />
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.status') }}</label>
              <select v-model="form.status" required class="input mt-1">
                <option value="pending">{{ t('common.pending') }}</option>
                <option value="approved">{{ t('common.approved') }}</option>
                <option value="rejected">{{ t('common.rejected') }}</option>
                <option value="expired">{{ t('common.expired') }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.notes') }}</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" :placeholder="t('quotations.additionalNotes')"></textarea>
            </div>
          </div>

          <!-- Sticky footer -->
          <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
            <button type="submit" :disabled="loading" class="flex-1 btn-primary">
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ loading ? (editingQuotation ? t('common.updating') : t('common.creating')) : (editingQuotation ? t('common.update') : t('common.create')) }}
            </button>
            <button type="button" @click="closeModal" class="flex-1 btn-outline">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import { FileText, Plus, Edit2, Trash2, Loader2, X } from 'lucide-vue-next';
import Skeleton from '../components/Skeleton.vue';
import {
  quotationService,
  itemService,
  vendorService,
  deliveryService,
  serviceBookingService,
  paymentService,
  type Quotation
} from '../services/pocketbase';
import { useI18n } from '../composables/useI18n';
import { usePermissions } from '../composables/usePermissions';
import { useSiteData } from '../composables/useSiteData';
import { useQuotationSearch } from '../composables/useSearch';
import { useModalState } from '../composables/useModalState';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import VendorSearchBox from '../components/VendorSearchBox.vue';

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
const { data: allQuotationsData, loading: quotationsLoading, reload: reloadQuotations } = useSiteData(
  async () => await quotationService.getAll()
);

const { data: itemsData } = useSiteData(
  async () => await itemService.getAll()
);

const { data: vendorsData } = useSiteData(
  async () => await vendorService.getAll()
);

// Load deliveries, service bookings and payments so the vendor picker can show balances
const { data: deliveriesData } = useSiteData(
  async () => await deliveryService.getAll()
);

const { data: serviceBookingsData } = useSiteData(
  async () => await serviceBookingService.getAll()
);

const { data: paymentsData } = useSiteData(
  async () => await paymentService.getAll()
);

// Computed properties from useSiteData
const allQuotations = computed(() => allQuotationsData.value || []);
const items = computed(() => itemsData.value || []);
const vendors = computed(() => vendorsData.value || []);
const deliveries = computed(() => deliveriesData.value || []);
const serviceBookings = computed(() => serviceBookingsData.value || []);
const payments = computed(() => paymentsData.value || []);
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
  showAddModal.value = true;
  openModal('quotations-edit-modal');
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

const getStatusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    pending:  'sw-badge sw-badge--accent',
    approved: 'sw-badge sw-badge--success',
    rejected: 'sw-badge sw-badge--danger',
    expired:  'sw-badge sw-badge--neutral',
  };
  return map[status] ?? 'sw-badge sw-badge--neutral';
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
  closeModalState('quotations-add-modal');
  closeModalState('quotations-edit-modal');
};

const handleAddQuotation = async () => {
  showAddModal.value = true;
  openModal('quotations-add-modal');
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
