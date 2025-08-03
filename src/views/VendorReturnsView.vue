<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('vendors.returns') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ t('vendors.returnsSubtitle') }}</p>
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
      <div class="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <RotateCcw class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-blue-700 dark:text-blue-300">{{ t('vendors.totalReturns') }}</p>
            <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ returns.length }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Clock class="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-yellow-700 dark:text-yellow-300">{{ t('vendors.pendingApproval') }}</p>
            <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{{ pendingReturns }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-green-700 dark:text-green-300">{{ t('common.completed') }}</p>
            <p class="text-2xl font-bold text-green-900 dark:text-green-100">{{ completedReturns }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <DollarSign class="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-purple-700 dark:text-purple-300">{{ t('vendors.totalRefunded') }}</p>
            <p class="text-2xl font-bold text-purple-900 dark:text-purple-100">₹{{ totalRefunded.toFixed(2) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Returns Table -->
    <div class="card p-0 overflow-hidden">
      <!-- Desktop Table -->
      <div class="hidden lg:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {{ t('vendors.returnDetails') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {{ t('common.vendor') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {{ t('common.amount') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {{ t('common.status') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {{ t('common.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="returnItem in filteredReturns" :key="returnItem.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <RotateCcw class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      Return #{{ returnItem.id?.slice(-6) }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(returnItem.return_date) }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {{ t(`vendors.returnReasons.${returnItem.reason}`) }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ returnItem.expand?.vendor?.contact_person || returnItem.expand?.vendor?.contact_person || t('common.unknownVendor') }}
                </div>
                <div v-if="returnItem.expand?.vendor?.contact_person && returnItem.expand?.vendor?.name" 
                     class="text-sm text-gray-500 dark:text-gray-400">
                  {{ returnItem.expand.vendor.contact_person }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  ₹{{ returnItem.total_return_amount.toFixed(2) }}
                </div>
                <div v-if="returnItem.processing_option === 'credit_note'" class="text-sm text-blue-600 dark:text-blue-400">
                  {{ t('vendors.noteGenerated') }}
                </div>
                <div v-else-if="returnItem.actual_refund_amount" class="text-sm text-green-600 dark:text-green-400">
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
                    class="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button 
                    v-if="returnItem.status === 'initiated'" 
                    @click="approveReturn(returnItem)"
                    class="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                  >
                    <Check class="h-4 w-4" />
                  </button>
                  <button 
                    v-if="returnItem.status === 'approved' && returnItem.processing_option !== 'credit_note'" 
                    @click="processRefund(returnItem)"
                    class="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
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
      <div class="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
        <div v-for="returnItem in filteredReturns" :key="returnItem.id" class="p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <div class="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                <RotateCcw class="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  Return #{{ returnItem.id?.slice(-6) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
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
              <span class="text-gray-500 dark:text-gray-400">{{ t('common.vendor') }}:</span>
              <span class="text-gray-900 dark:text-white font-medium">
                {{ returnItem.expand?.vendor?.contact_person || returnItem.expand?.vendor?.name || t('common.unknownVendor') }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">{{ t('vendors.reason') }}:</span>
              <span class="text-gray-900 dark:text-white">
                {{ t(`vendors.returnReasons.${returnItem.reason}`) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">{{ t('common.amount') }}:</span>
              <span class="text-gray-900 dark:text-white font-medium">
                ₹{{ returnItem.total_return_amount.toFixed(2) }}
              </span>
            </div>
            <div v-if="returnItem.processing_option === 'credit_note'" class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">{{ t('vendors.status') }}:</span>
              <span class="text-blue-600 dark:text-blue-400 font-medium">
                {{ t('vendors.noteGenerated') }}
              </span>
            </div>
            <div v-else-if="returnItem.actual_refund_amount" class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">{{ t('vendors.refunded') }}:</span>
              <span class="text-green-600 dark:text-green-400 font-medium">
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
              class="btn-primary text-xs py-1 px-2 bg-green-600 hover:bg-green-700"
            >
              <Check class="h-3 w-3 mr-1" />
              {{ t('common.approve') }}
            </button>
            <button 
              v-if="returnItem.status === 'approved' && returnItem.processing_option !== 'credit_note'" 
              @click="processRefund(returnItem)"
              class="btn-primary text-xs py-1 px-2 bg-purple-600 hover:bg-purple-700"
            >
              <DollarSign class="h-3 w-3 mr-1" />
              {{ t('vendors.refund') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredReturns.length === 0" class="text-center py-12">
        <RotateCcw class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('vendors.noReturnsFound') }}</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
    'initiated': 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'approved': 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'rejected': 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'completed': 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'refunded': 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
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