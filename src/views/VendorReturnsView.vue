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
          class="btn-primary"
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
                  {{ returnItem.expand?.vendor?.name || returnItem.expand?.vendor?.contact_person || t('common.unknownVendor') }}
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
                <div v-if="returnItem.actual_refund_amount" class="text-sm text-green-600 dark:text-green-400">
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
                    v-if="returnItem.status === 'approved'" 
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
                {{ returnItem.expand?.vendor?.name || returnItem.expand?.vendor?.contact_person || t('common.unknownVendor') }}
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
            <div v-if="returnItem.actual_refund_amount" class="flex justify-between">
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
              v-if="returnItem.status === 'approved'" 
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
      :delivery-items="deliveryItems"
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
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  Plus,
  Search,
  Download,
  Eye,
  Check,
  DollarSign,
  RotateCcw,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSiteData } from '../composables/useSiteData';
import { useVendorReturnSearch } from '../composables/useSearch';
import ReturnModal from '../components/returns/ReturnModal.vue';
import ReturnDetailsModal from '../components/returns/ReturnDetailsModal.vue';
import RefundModal from '../components/returns/RefundModal.vue';
import SearchBox from '../components/SearchBox.vue';

const { t } = useI18n();
const route = useRoute();

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults, loadAll } = useVendorReturnSearch();

// Use site data management
const { data: returnsData, reload: reloadReturns } = useSiteData(
  async () => await vendorReturnService.getAll()
);

const { data: vendorsData } = useSiteData(
  async () => await vendorService.getAll()
);

const { data: deliveriesData } = useSiteData(
  async () => await deliveryService.getAll()
);

const { data: accountsData } = useSiteData(
  async () => await accountService.getAll()
);

// Computed properties from useSiteData
const returns = computed(() => returnsData.value || []);
const vendors = computed(() => vendorsData.value || []);
const deliveries = computed(() => deliveriesData.value || []);
const accounts = computed(() => accountsData.value || []);

const deliveryItems = ref<DeliveryItem[]>([]);
const loading = ref(false);


// Search and filters
const statusFilter = ref('');
const vendorFilter = ref('');

// Modals
const showReturnModal = ref(false);
const showDetailsModal = ref(false);
const showRefundModal = ref(false);
const selectedReturn = ref<VendorReturn | null>(null);
const isEditMode = ref(false);

// Computed properties
const filteredReturns = computed(() => {
  if (!returns.value) return [];
  let filtered = searchQuery.value.trim() ? searchResults.value : returns.value;

  if (statusFilter.value) {
    filtered = filtered.filter(returnItem => returnItem.status === statusFilter.value);
  }

  if (vendorFilter.value) {
    filtered = filtered.filter(returnItem => returnItem.vendor === vendorFilter.value);
  }

  return filtered;
});

const pendingReturns = computed(() => {
  return returns.value?.filter(returnItem => returnItem.status === 'initiated').length || 0;
});

const completedReturns = computed(() => {
  return returns.value?.filter(returnItem => 
    returnItem.status === 'completed' || returnItem.status === 'refunded'
  ).length || 0;
});

const totalRefunded = computed(() => {
  return returns.value?.reduce((sum, returnItem) => {
    return sum + (returnItem.actual_refund_amount || 0);
  }, 0) || 0;
});

// Methods
const loadDeliveryItems = async () => {
  if (!deliveries.value || deliveries.value.length === 0) return;
  
  loading.value = true;
  try {
    // Extract delivery items from deliveries
    const allDeliveryItems: DeliveryItem[] = [];
    
    // Try to extract from expanded delivery data first
    deliveries.value.forEach(delivery => {
      if (delivery.expand?.delivery_items) {
        delivery.expand.delivery_items.forEach(deliveryItem => {
          allDeliveryItems.push({
            ...deliveryItem,
            expand: {
              ...deliveryItem.expand,
              delivery: delivery
            }
          });
        });
      }
    });
    
    // If no delivery items found via expand, fetch them directly
    if (allDeliveryItems.length === 0 && deliveries.value.length > 0) {
      for (const delivery of deliveries.value) {
        try {
          const items = await deliveryItemService.getByDelivery(delivery.id!);
          items.forEach((deliveryItem: DeliveryItem) => {
            allDeliveryItems.push({
              ...deliveryItem,
              expand: {
                ...deliveryItem.expand,
                delivery: delivery
              }
            });
          });
        } catch (err) {
          console.error('Error fetching delivery items for delivery', delivery.id, err);
        }
      }
    }
    
    deliveryItems.value = allDeliveryItems;
  } catch (error) {
    console.error('Error loading delivery items:', error);
  } finally {
    loading.value = false;
  }
};

const reloadAllData = async () => {
  await reloadReturns();
  // Other data will be reloaded automatically by useSiteData
  await loadDeliveryItems();
};

const getStatusClass = (status: string) => {
  const classes = {
    initiated: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
    completed: 'status-completed',
    refunded: 'status-paid'
  };
  return classes[status as keyof typeof classes] || 'status-pending';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

// Modal handlers
const openCreateModal = () => {
  selectedReturn.value = null;
  isEditMode.value = false;
  showReturnModal.value = true;
  
  // Pre-select vendor if coming from vendor detail page
  if (route.query.vendor && typeof route.query.vendor === 'string') {
    vendorFilter.value = route.query.vendor;
  }
};

const closeReturnModal = () => {
  showReturnModal.value = false;
  selectedReturn.value = null;
};

const viewReturn = (returnItem: VendorReturn) => {
  selectedReturn.value = returnItem;
  showDetailsModal.value = true;
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  selectedReturn.value = null;
};

const approveReturn = (returnItem: VendorReturn) => {
  selectedReturn.value = returnItem;
  showDetailsModal.value = true;
};

const processRefund = (returnItem: VendorReturn) => {
  selectedReturn.value = returnItem;
  showRefundModal.value = true;
};

const closeRefundModal = () => {
  showRefundModal.value = false;
  selectedReturn.value = null;
};

// Event handlers
const handleReturnSave = async () => {
  await reloadAllData();
  closeReturnModal();
};

const handleApprove = async () => {
  await reloadAllData();
  closeDetailsModal();
};

const handleReject = async () => {
  await reloadAllData();
  closeDetailsModal();
};

const handleComplete = async () => {
  await reloadAllData();
  closeDetailsModal();
};

const handleRefund = () => {
  closeDetailsModal();
  showRefundModal.value = true;
};

const handleRefundSave = async () => {
  await reloadAllData();
  closeRefundModal();
};

const exportReturns = () => {
  // Create CSV content
  const headers = [
    t('vendors.returnId'), 
    t('common.date'), 
    t('common.vendor'), 
    t('vendors.reason'), 
    t('common.status'), 
    t('vendors.returnAmount'), 
    t('vendors.refundAmount')
  ];
  const rows = filteredReturns.value.map(returnItem => [
    returnItem.id?.slice(-6) || '',
    returnItem.return_date,
    returnItem.expand?.vendor?.name || returnItem.expand?.vendor?.contact_person || t('common.unknownVendor'),
    t(`vendors.returnReasons.${returnItem.reason}`),
    t(`vendors.returnStatuses.${returnItem.status}`),
    returnItem.total_return_amount,
    returnItem.actual_refund_amount || 0
  ]);

  // Convert to CSV
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => 
      typeof field === 'string' && field.includes(',') ? `"${field}"` : field
    ).join(','))
    .join('\n');

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `vendor-returns-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    openCreateModal();
  }
};

onMounted(() => {
  // Pre-select vendor filter if specified in query
  if (route.query.vendor && typeof route.query.vendor === 'string') {
    vendorFilter.value = route.query.vendor;
  }
  
  // Data loading is handled automatically by useSiteData
  // Load delivery items when deliveries are available
  setTimeout(() => loadDeliveryItems(), 500);
  setTimeout(() => loadAll(), 100);
  
  window.addEventListener('keydown', handleKeyboardShortcut);
});

// Watch for deliveries changes to reload delivery items
computed(() => {
  if (deliveries.value && deliveries.value.length > 0) {
    setTimeout(() => loadDeliveryItems(), 100);
  }
  return null;
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardShortcut);
});
</script>