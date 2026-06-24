<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold text-ink dark:text-cream">{{ t('vendors.returns') }}</h1>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">{{ t('vendors.returnsSubtitle') }}</p>
      </div>
      <div class="mt-4 md:mt-0 flex space-x-3">
        <button
          @click="exportReturns"
          class="btn-outline"
        >
          <Download class="mr-2 h-4 w-4" />
          {{ t('common.export') }}
        </button>
        <button
          @click="openCreateModal"
          :disabled="!canCreateReturn"
          :class="[
            canCreateReturn ? 'btn-primary' : 'btn-disabled'
          ]"
          :title="!canCreateReturn ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
          data-keyboard-shortcut="n"
        >
          <Plus class="mr-2 h-4 w-4" />
          {{ t('vendors.addReturn') }}
        </button>
      </div>
    </div>

    <!-- Mobile Search -->
    <div class="md:hidden">
      <SearchBox
        v-model="searchQuery"
        :placeholder="t('search.returns')"
        :search-loading="loading"
      />
    </div>

    <!-- Filters -->
    <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
      <div class="flex-1">
        <div class="hidden md:block">
          <SearchBox
            v-model="searchQuery"
            :placeholder="t('search.returns')"
            :search-loading="loading"
          />
        </div>
      </div>

      <div class="flex space-x-2">
        <select v-model="statusFilter" class="input min-w-0">
          <option value="">{{ t('filters.allStatuses') }}</option>
          <option value="initiated">{{ t('vendors.returnStatuses.initiated') }}</option>
          <option value="approved">{{ t('vendors.returnStatuses.approved') }}</option>
          <option value="rejected">{{ t('vendors.returnStatuses.rejected') }}</option>
          <option value="completed">{{ t('vendors.returnStatuses.completed') }}</option>
          <option value="refunded">{{ t('vendors.returnStatuses.refunded') }}</option>
        </select>

        <select v-model="vendorFilter" class="input min-w-0">
          <option value="">{{ t('filters.allVendors') }}</option>
          <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
            {{ vendor.name || vendor.contact_person || t('common.unnamedVendor') }}
          </option>
        </select>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="card p-4">
        <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('vendors.totalReturns') }}</p>
        <p class="sw-stat font-mono sw-tabular text-ink dark:text-cream mt-1">{{ returns.length.toLocaleString('en-IN') }}</p>
      </div>

      <div class="card p-4">
        <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('vendors.pendingApproval') }}</p>
        <p class="sw-stat font-mono sw-tabular text-amber-700 dark:text-amber-400 mt-1">{{ pendingReturns.toLocaleString('en-IN') }}</p>
      </div>

      <div class="card p-4">
        <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('common.completed') }}</p>
        <p class="sw-stat font-mono sw-tabular text-forest-700 dark:text-forest-400 mt-1">{{ completedReturns.toLocaleString('en-IN') }}</p>
      </div>

      <div class="card p-4">
        <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('vendors.totalRefunded') }}</p>
        <p class="sw-stat font-mono sw-tabular text-forest-700 dark:text-forest-400 mt-1">₹{{ totalRefunded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
      </div>
    </div>

    <!-- Returns Table -->
    <div class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-stone-200 dark:divide-ink-4">
          <!-- xl Desktop Headers -->
          <thead class="bg-cream-2 dark:bg-ink-2 hidden xl:table-header-group">
            <tr>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">
                {{ t('common.vendor') }}
              </th>
              <th class="px-4 py-3 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">
                {{ t('vendors.returnDate') }}
              </th>
              <th class="px-4 py-3 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">
                {{ t('vendors.returnAmount') }}
              </th>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">
                {{ t('common.status') }}
              </th>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">
                {{ t('common.actions') }}
              </th>
            </tr>
          </thead>

          <tbody class="bg-white dark:bg-ink-3 divide-y divide-stone-200 dark:divide-ink-4">
            <!-- Skeleton loading state: xl+ table rows + < xl cards -->
            <template v-if="returnsLoading">
              <tr v-for="i in 6" :key="'skel-' + i" class="border-b border-stone-200 dark:border-ink-4">
                <!-- xl+ skeleton cells -->
                <td class="hidden xl:table-cell px-4 py-3.5"><Skeleton height="1rem" width="65%" /></td>
                <td class="hidden xl:table-cell px-4 py-3.5 text-right"><Skeleton height="1rem" width="5rem" /></td>
                <td class="hidden xl:table-cell px-4 py-3.5 text-right"><Skeleton height="1rem" width="6rem" /></td>
                <td class="hidden xl:table-cell px-4 py-3.5"><Skeleton height="1.25rem" width="5rem" rounded="rounded-full" /></td>
                <td class="hidden xl:table-cell px-4 py-3.5"><Skeleton height="1rem" width="4rem" /></td>
                <!-- < xl skeleton card -->
                <td class="xl:hidden px-0 py-0" colspan="5">
                  <div class="p-4 space-y-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="h-9 w-9 rounded-lg bg-stone-100 dark:bg-ink-2 flex-shrink-0"></div>
                        <div class="space-y-1.5 min-w-0">
                          <Skeleton height="1rem" width="10rem" />
                          <Skeleton height="0.75rem" width="7rem" />
                        </div>
                      </div>
                      <Skeleton height="1.25rem" width="5rem" rounded="rounded-full" />
                    </div>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div class="space-y-1"><Skeleton height="0.625rem" width="70%" /><Skeleton height="0.875rem" width="55%" /></div>
                      <div class="space-y-1"><Skeleton height="0.625rem" width="70%" /><Skeleton height="0.875rem" width="65%" /></div>
                    </div>
                    <div class="pt-3 border-t border-stone-100 dark:border-ink-4 flex gap-2">
                      <Skeleton height="1.5rem" width="4rem" rounded="rounded-md" />
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-else v-for="returnItem in filteredReturns" :key="returnItem.id" class="hover:bg-cream-2 dark:hover:bg-ink-2 transition-colors duration-150 ease-snap">
              <!-- xl table cells -->
              <td class="hidden xl:table-cell px-4 py-3.5">
                <div class="font-medium text-ink dark:text-cream">
                  {{ returnItem.expand?.vendor?.contact_person || returnItem.expand?.vendor?.name || t('common.unknownVendor') }}
                </div>
                <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {{ t(`vendors.returnReasons.${returnItem.reason}`) }}
                </div>
              </td>
              <td class="hidden xl:table-cell px-4 py-3.5 text-right">
                <span class="font-mono sw-tabular text-sm text-stone-600 dark:text-stone-400">
                  {{ formatDate(returnItem.return_date) }}
                </span>
              </td>
              <td class="hidden xl:table-cell px-4 py-3.5 text-right">
                <div class="font-mono sw-tabular text-sm font-medium text-ink dark:text-cream">
                  ₹{{ returnItem.total_return_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </div>
                <div v-if="returnItem.processing_option === 'credit_note'" class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {{ t('vendors.noteGenerated') }}
                </div>
                <div v-else-if="returnItem.actual_refund_amount" class="font-mono sw-tabular text-xs text-forest-700 dark:text-forest-400 mt-0.5">
                  {{ t('vendors.refunded') }}: ₹{{ returnItem.actual_refund_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </div>
              </td>
              <td class="hidden xl:table-cell px-4 py-3.5">
                <span :class="getStatusClass(returnItem.status)">
                  {{ t(`vendors.returnStatuses.${returnItem.status}`) }}
                </span>
              </td>
              <td class="hidden xl:table-cell px-4 py-3.5">
                <div class="flex items-center space-x-2">
                  <button
                    @click="viewReturn(returnItem)"
                    class="h-8 w-8 flex items-center justify-center rounded-md text-stone-400 hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-150 ease-snap"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    v-if="returnItem.status === 'initiated'"
                    @click="approveReturn(returnItem)"
                    class="h-8 w-8 flex items-center justify-center rounded-md text-forest-600 dark:text-forest-400 hover:text-forest-500 dark:hover:text-forest-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-150 ease-snap"
                  >
                    <Check class="h-4 w-4" />
                  </button>
                  <button
                    v-if="returnItem.status === 'approved' && returnItem.processing_option !== 'credit_note'"
                    @click="processRefund(returnItem)"
                    class="h-8 w-8 flex items-center justify-center rounded-md text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors duration-150 ease-snap"
                  >
                    <DollarSign class="h-4 w-4" />
                  </button>
                </div>
              </td>

              <!-- < xl card row (hidden at xl) -->
              <td class="xl:hidden px-0 py-0" colspan="5">
                <div class="p-4">
                  <!-- Top row: vendor + status -->
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                        <RotateCcw class="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div class="min-w-0">
                        <div class="font-medium text-ink dark:text-cream truncate">
                          {{ returnItem.expand?.vendor?.contact_person || returnItem.expand?.vendor?.name || t('common.unknownVendor') }}
                        </div>
                        <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          {{ t(`vendors.returnReasons.${returnItem.reason}`) }}
                        </div>
                      </div>
                    </div>
                    <span :class="getStatusClass(returnItem.status)" class="flex-shrink-0">
                      {{ t(`vendors.returnStatuses.${returnItem.status}`) }}
                    </span>
                  </div>

                  <!-- Mini-grid: date + amount + refund -->
                  <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                    <div>
                      <p class="text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('vendors.returnDate') }}</p>
                      <p class="font-mono sw-tabular text-stone-700 dark:text-stone-300 mt-0.5">{{ formatDate(returnItem.return_date) }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('vendors.returnAmount') }}</p>
                      <p class="font-mono sw-tabular font-medium text-ink dark:text-cream mt-0.5">₹{{ returnItem.total_return_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                    </div>
                    <div v-if="returnItem.processing_option === 'credit_note'">
                      <p class="text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('vendors.status') }}</p>
                      <p class="text-amber-700 dark:text-amber-400 mt-0.5">{{ t('vendors.noteGenerated') }}</p>
                    </div>
                    <div v-else-if="returnItem.actual_refund_amount">
                      <p class="text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('vendors.refunded') }}</p>
                      <p class="font-mono sw-tabular text-forest-700 dark:text-forest-400 mt-0.5">₹{{ returnItem.actual_refund_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                    </div>
                  </div>

                  <!-- Actions row -->
                  <div class="flex items-center gap-2 pt-3 border-t border-stone-100 dark:border-ink-4">
                    <button
                      @click="viewReturn(returnItem)"
                      class="btn-outline text-xs py-1 px-2 flex items-center"
                    >
                      <Eye class="h-3 w-3 mr-1" />
                      {{ t('common.view') }}
                    </button>
                    <button
                      v-if="returnItem.status === 'initiated'"
                      @click="approveReturn(returnItem)"
                      class="btn-primary text-xs py-1 px-2 flex items-center bg-forest-600 hover:bg-forest-700"
                    >
                      <Check class="h-3 w-3 mr-1" />
                      {{ t('common.approve') }}
                    </button>
                    <button
                      v-if="returnItem.status === 'approved' && returnItem.processing_option !== 'credit_note'"
                      @click="processRefund(returnItem)"
                      class="btn-primary text-xs py-1 px-2 flex items-center"
                    >
                      <DollarSign class="h-3 w-3 mr-1" />
                      {{ t('vendors.refund') }}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-if="filteredReturns.length === 0" class="flex flex-col items-center justify-center py-16 px-4 text-center">
        <RotateCcw class="h-12 w-12 text-stone-300 dark:text-stone-600 mb-4" />
        <h3 class="font-display text-base font-semibold text-ink dark:text-cream">{{ t('vendors.noReturnsFound') }}</h3>
        <p class="mt-1 text-sm text-stone-500 dark:text-stone-400 max-w-sm">
          {{ searchQuery || statusFilter || vendorFilter ? t('vendors.tryAdjustingFilters') : t('vendors.getStartedReturn') }}
        </p>
      </div>
    </div>

    <!-- Create/Edit Return Modal -->
    <ReturnModal
      v-if="showReturnModal"
      :is-edit="isEditMode"
      :return-data="selectedReturn"
      :vendors="vendors"
      :deliveries="deliveries"
      :service-bookings="serviceBookings"
      :payments="payments"
      @close="closeReturnModal"
      @save="handleReturnSave"
    />

    <!-- Return Details Modal -->
    <ReturnDetailsModal
      v-if="showDetailsModal"
      :return-data="selectedReturn"
      @close="closeDetailsModal"
      @approve="handleApprove"
      @reject="handleReject"
      @complete="handleComplete"
      @refund="handleRefund"
    />

    <!-- Refund Modal -->
    <RefundModal
      v-if="showRefundModal"
      :return-data="selectedReturn"
      :accounts="accounts"
      @close="closeRefundModal"
      @save="handleRefundSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Plus,
  Download,
  Eye,
  Check,
  DollarSign,
  RotateCcw
} from 'lucide-vue-next';
import Skeleton from '../components/Skeleton.vue';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useSiteData } from '../composables/useSiteData';
import { useModalState } from '../composables/useModalState';
import { useKeyboardShortcutSingle } from '../composables/useKeyboardShortcut';
import {
  vendorReturnService,
  vendorService,
  accountService,
  deliveryService,
  serviceBookingService,
  paymentService,
  type VendorReturn
} from '../services/pocketbase';
import ReturnModal from '../components/returns/ReturnModal.vue';
import ReturnDetailsModal from '../components/returns/ReturnDetailsModal.vue';
import RefundModal from '../components/returns/RefundModal.vue';
import SearchBox from '../components/SearchBox.vue';

const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { openModal, closeModal: closeModalState } = useModalState();

// State
const searchQuery = ref('');
const statusFilter = ref('');
const vendorFilter = ref('');
const loading = ref(false);
const showReturnModal = ref(false);
const showDetailsModal = ref(false);
const showRefundModal = ref(false);
const isEditMode = ref(false);
const selectedReturn = ref<VendorReturn | null>(null);

// Use site data management
const { data: returnsData, loading: returnsLoading, reload: reloadReturns } = useSiteData(
  async () => await vendorReturnService.getAll()
);

const { data: vendorsData } = useSiteData(
  async () => await vendorService.getAll()
);

const { data: accountsData } = useSiteData(
  async () => await accountService.getAll()
);

// Load deliveries, service bookings and payments so the vendor picker in the
// return modal can show each vendor's outstanding balance
const { data: deliveriesData } = useSiteData(
  async () => await deliveryService.getAll()
);

const { data: serviceBookingsData } = useSiteData(
  async () => await serviceBookingService.getAll()
);

const { data: paymentsData } = useSiteData(
  async () => await paymentService.getAll()
);

// Computed properties
const returns = computed(() => returnsData.value || []);
const vendors = computed(() => vendorsData.value || []);
const accounts = computed(() => accountsData.value || []);
const deliveries = computed(() => deliveriesData.value || []);
const serviceBookings = computed(() => serviceBookingsData.value || []);
const payments = computed(() => paymentsData.value || []);

const filteredReturns = computed(() => {
  let filtered = returns.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(r =>
      r.id?.toLowerCase().includes(query) ||
      r.expand?.vendor?.contact_person?.toLowerCase().includes(query) ||
      r.expand?.vendor?.name?.toLowerCase().includes(query) ||
      r.reason?.toLowerCase().includes(query)
    );
  }

  if (statusFilter.value) {
    filtered = filtered.filter(r => r.status === statusFilter.value);
  }

  if (vendorFilter.value) {
    filtered = filtered.filter(r => r.vendor === vendorFilter.value);
  }

  return filtered;
});

const pendingReturns = computed(() =>
  returns.value.filter(r => r.status === 'initiated').length
);

const completedReturns = computed(() =>
  returns.value.filter(r => r.status === 'completed').length
);

const totalRefunded = computed(() =>
  returns.value.reduce((sum, r) => sum + (r.actual_refund_amount || 0), 0)
);

const canCreateReturn = computed(() => {
  return checkCreateLimit('vendor_returns') && !isReadOnly.value;
});

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const getStatusClass = (status: string) => {
  const classes = {
    'initiated': 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    'approved': 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-800 dark:bg-ink-4 dark:text-stone-300',
    'rejected': 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-clay-100 text-clay-800 dark:bg-clay-900 dark:text-clay-300',
    'completed': 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-forest-100 text-forest-800 dark:bg-forest-900 dark:text-forest-300',
    'refunded': 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-forest-100 text-forest-800 dark:bg-forest-900 dark:text-forest-300'
  };
  return classes[status as keyof typeof classes] || classes.initiated;
};

const exportReturns = () => {
  // TODO: Implement export functionality
  console.log('Export returns');
};

const openCreateModal = () => {
  isEditMode.value = false;
  selectedReturn.value = null;
  showReturnModal.value = true;
  openModal('vendor-returns-add-modal');
};

// Shift+Alt+N opens the create-return modal (respects the create limit, matching the button)
useKeyboardShortcutSingle('n', () => {
  if (!canCreateReturn.value) return;
  openCreateModal();
}, { shiftKey: true, altKey: true });

const closeReturnModal = () => {
  showReturnModal.value = false;
  selectedReturn.value = null;
  closeModalState('vendor-returns-add-modal');
  closeModalState('vendor-returns-edit-modal');
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  selectedReturn.value = null;
  closeModalState('vendor-returns-details-modal');
};

const closeRefundModal = () => {
  showRefundModal.value = false;
  closeModalState('vendor-returns-refund-modal');
};

const viewReturn = (returnItem: VendorReturn) => {
  selectedReturn.value = returnItem;
  showDetailsModal.value = true;
  openModal('vendor-returns-details-modal');
};

const approveReturn = async (returnItem: VendorReturn) => {
  try {
    await vendorReturnService.update(returnItem.id!, { status: 'approved' });
    await reloadReturns();
  } catch (error) {
    console.error('Error approving return:', error);
  }
};

const processRefund = (returnItem: VendorReturn) => {
  selectedReturn.value = returnItem;
  showRefundModal.value = true;
  openModal('vendor-returns-refund-modal');
};

const handleReturnSave = async () => {
  await reloadReturns();
  closeReturnModal();
};

const handleApprove = async () => {
  if (selectedReturn.value) {
    await approveReturn(selectedReturn.value);
    closeDetailsModal();
  }
};

const handleReject = async () => {
  if (selectedReturn.value) {
    try {
      await vendorReturnService.update(selectedReturn.value.id!, { status: 'rejected' });
      await reloadReturns();
      closeDetailsModal();
    } catch (error) {
      console.error('Error rejecting return:', error);
    }
  }
};

const handleComplete = async () => {
  if (selectedReturn.value) {
    try {
      await vendorReturnService.update(selectedReturn.value.id!, { status: 'completed' });
      await reloadReturns();
      closeDetailsModal();
    } catch (error) {
      console.error('Error completing return:', error);
    }
  }
};

const handleRefund = () => {
  closeDetailsModal();
  if (selectedReturn.value) {
    processRefund(selectedReturn.value);
  }
};

const handleRefundSave = async () => {
  await reloadReturns();
  closeRefundModal();
};
</script>
