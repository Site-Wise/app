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
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="sw-card">
        <div class="flex items-center">
          <div class="p-2 bg-stone-100 dark:bg-ink-4 rounded-lg">
            <RotateCcw class="h-6 w-6 text-stone-600 dark:text-stone-400" />
          </div>
          <div class="ml-4">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('vendors.totalReturns') }}</p>
            <p class="sw-stat text-ink dark:text-cream">{{ returns.length }}</p>
          </div>
        </div>
      </div>

      <div class="sw-card">
        <div class="flex items-center">
          <div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Clock class="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div class="ml-4">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('vendors.pendingApproval') }}</p>
            <p class="sw-stat text-ink dark:text-cream">{{ pendingReturns }}</p>
          </div>
        </div>
      </div>

      <div class="sw-card">
        <div class="flex items-center">
          <div class="p-2 bg-forest-100 dark:bg-forest-900/30 rounded-lg">
            <CheckCircle class="h-6 w-6 text-forest-600 dark:text-forest-400" />
          </div>
          <div class="ml-4">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('common.completed') }}</p>
            <p class="sw-stat text-forest-600 dark:text-forest-400">{{ completedReturns }}</p>
          </div>
        </div>
      </div>

      <div class="sw-card">
        <div class="flex items-center">
          <div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <DollarSign class="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div class="ml-4">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('vendors.totalRefunded') }}</p>
            <p class="sw-stat sw-mono text-ink dark:text-cream">₹{{ totalRefunded.toFixed(2) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Returns Table -->
    <div class="sw-card p-0 overflow-hidden">
      <!-- Desktop Table -->
      <div class="hidden lg:block overflow-x-auto">
        <table class="min-w-full divide-y divide-stone-200 dark:divide-ink-4">
          <thead class="bg-cream-2 dark:bg-ink-2">
            <tr>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                {{ t('vendors.returnDetails') }}
              </th>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                {{ t('common.vendor') }}
              </th>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                {{ t('common.amount') }}
              </th>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                {{ t('common.status') }}
              </th>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                {{ t('common.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-ink-3 divide-y divide-stone-200 dark:divide-ink-4">
            <tr v-for="returnItem in filteredReturns" :key="returnItem.id" class="hover:bg-cream-2 dark:hover:bg-ink-2">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <RotateCcw class="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-ink dark:text-cream">
                      Return #{{ returnItem.id?.slice(-6) }}
                    </div>
                    <div class="text-sm text-stone-500 dark:text-stone-400">
                      {{ formatDate(returnItem.return_date) }}
                    </div>
                    <div class="text-xs text-stone-500 dark:text-stone-400">
                      {{ t(`vendors.returnReasons.${returnItem.reason}`) }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-ink dark:text-cream">
                  {{ returnItem.expand?.vendor?.contact_person || returnItem.expand?.vendor?.contact_person || t('common.unknownVendor') }}
                </div>
                <div v-if="returnItem.expand?.vendor?.contact_person && returnItem.expand?.vendor?.name"
                     class="text-sm text-stone-500 dark:text-stone-400">
                  {{ returnItem.expand.vendor.contact_person }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="sw-mono text-sm font-medium text-ink dark:text-cream">
                  ₹{{ returnItem.total_return_amount.toFixed(2) }}
                </div>
                <div v-if="returnItem.processing_option === 'credit_note'" class="text-sm text-amber-700 dark:text-amber-400">
                  {{ t('vendors.noteGenerated') }}
                </div>
                <div v-else-if="returnItem.actual_refund_amount" class="sw-mono text-sm text-forest-600 dark:text-forest-400">
                  {{ t('vendors.refunded') }}: ₹{{ returnItem.actual_refund_amount.toFixed(2) }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span :class="getStatusClass(returnItem.status)">
                  {{ t(`vendors.returnStatuses.${returnItem.status}`) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center space-x-2">
                  <button
                    @click="viewReturn(returnItem)"
                    class="text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    v-if="returnItem.status === 'initiated'"
                    @click="approveReturn(returnItem)"
                    class="text-forest-600 dark:text-forest-400 hover:text-forest-500 dark:hover:text-forest-300"
                  >
                    <Check class="h-4 w-4" />
                  </button>
                  <button
                    v-if="returnItem.status === 'approved' && returnItem.processing_option !== 'credit_note'"
                    @click="processRefund(returnItem)"
                    class="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                  >
                    <DollarSign class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="lg:hidden divide-y divide-stone-200 dark:divide-ink-4">
        <div v-for="returnItem in filteredReturns" :key="returnItem.id" class="p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <div class="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mr-3">
                <RotateCcw class="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div class="text-sm font-medium text-ink dark:text-cream">
                  Return #{{ returnItem.id?.slice(-6) }}
                </div>
                <div class="text-xs text-stone-500 dark:text-stone-400">
                  {{ formatDate(returnItem.return_date) }}
                </div>
              </div>
            </div>
            <span :class="getStatusClass(returnItem.status)">
              {{ t(`vendors.returnStatuses.${returnItem.status}`) }}
            </span>
          </div>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-stone-500 dark:text-stone-400">{{ t('common.vendor') }}:</span>
              <span class="text-ink dark:text-cream font-medium">
                {{ returnItem.expand?.vendor?.contact_person || returnItem.expand?.vendor?.name || t('common.unknownVendor') }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-500 dark:text-stone-400">{{ t('vendors.reason') }}:</span>
              <span class="text-ink dark:text-cream">
                {{ t(`vendors.returnReasons.${returnItem.reason}`) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-500 dark:text-stone-400">{{ t('common.amount') }}:</span>
              <span class="sw-mono text-ink dark:text-cream font-medium">
                ₹{{ returnItem.total_return_amount.toFixed(2) }}
              </span>
            </div>
            <div v-if="returnItem.processing_option === 'credit_note'" class="flex justify-between">
              <span class="text-stone-500 dark:text-stone-400">{{ t('vendors.status') }}:</span>
              <span class="text-amber-700 dark:text-amber-400 font-medium">
                {{ t('vendors.noteGenerated') }}
              </span>
            </div>
            <div v-else-if="returnItem.actual_refund_amount" class="flex justify-between">
              <span class="text-stone-500 dark:text-stone-400">{{ t('vendors.refunded') }}:</span>
              <span class="sw-mono text-forest-600 dark:text-forest-400 font-medium">
                ₹{{ returnItem.actual_refund_amount.toFixed(2) }}
              </span>
            </div>
          </div>

          <div class="flex justify-end space-x-2 mt-4">
            <button 
              @click="viewReturn(returnItem)"
              class="btn-outline text-xs py-1 px-2"
            >
              <Eye class="h-3 w-3 mr-1" />
              {{ t('common.view') }}
            </button>
            <button
              v-if="returnItem.status === 'initiated'"
              @click="approveReturn(returnItem)"
              class="btn-primary text-xs py-1 px-2 bg-forest-600 hover:bg-forest-700"
            >
              <Check class="h-3 w-3 mr-1" />
              {{ t('common.approve') }}
            </button>
            <button
              v-if="returnItem.status === 'approved' && returnItem.processing_option !== 'credit_note'"
              @click="processRefund(returnItem)"
              class="btn-primary text-xs py-1 px-2"
            >
              <DollarSign class="h-3 w-3 mr-1" />
              {{ t('vendors.refund') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredReturns.length === 0" class="text-center py-12">
        <RotateCcw class="mx-auto h-12 w-12 text-stone-400" />
        <h3 class="mt-2 text-sm font-medium text-ink dark:text-cream">{{ t('vendors.noReturnsFound') }}</h3>
        <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
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
  RotateCcw,
  Clock,
  CheckCircle
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useSiteData } from '../composables/useSiteData';
import { useModalState } from '../composables/useModalState';
import {
  vendorReturnService,
  vendorService,
  accountService,
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
const { data: returnsData, reload: reloadReturns } = useSiteData(
  async () => await vendorReturnService.getAll()
);

const { data: vendorsData } = useSiteData(
  async () => await vendorService.getAll()
);

const { data: accountsData } = useSiteData(
  async () => await accountService.getAll()
);

// Computed properties
const returns = computed(() => returnsData.value || []);
const vendors = computed(() => vendorsData.value || []);
const accounts = computed(() => accountsData.value || []);

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