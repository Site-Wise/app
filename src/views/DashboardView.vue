<template>
  <div>
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('dashboard.title') }}</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ t('dashboard.subtitle', { siteName: currentSite?.name || 'your construction site' }) }}
          </p>
        </div>
        <div v-if="currentSite" class="text-right">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ currentSite.total_units }} {{ t('dashboard.units') }} • {{ currentSite.total_planned_area.toLocaleString() }} {{ t('dashboard.sqft') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <!-- Stats Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Package class="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.totalItems') }}</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ stats.totalItems }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg">
            <Users class="h-8 w-8 text-secondary-600 dark:text-secondary-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.activeVendors') }}</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ stats.totalVendors }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
            <TruckIcon class="h-8 w-8 text-warning-600 dark:text-warning-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.pendingDeliveries') }}</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ stats.pendingDeliveries }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-error-100 dark:bg-error-900/30 rounded-lg">
            <DollarSign class="h-8 w-8 text-error-600 dark:text-error-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.outstandingAmount') }}</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">₹{{ stats.outstandingAmount.toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('dashboard.paymentStatusOverview') }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
          <p class="text-2xl font-bold text-success-600 dark:text-success-400">₹{{ paymentStats.paid.toLocaleString() }}</p>
          <p class="text-sm text-success-700 dark:text-success-300">{{ t('common.paid') }} ({{ paymentStats.paidCount }} deliveries)</p>
        </div>
        <div class="text-center p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
          <p class="text-2xl font-bold text-warning-600 dark:text-warning-400">₹{{ paymentStats.partial.toLocaleString() }}</p>
          <p class="text-sm text-warning-700 dark:text-warning-300">{{ t('common.partial') }} ({{ paymentStats.partialCount }} deliveries)</p>
        </div>
        <div class="text-center p-4 bg-error-50 dark:bg-error-900/20 rounded-lg">
          <p class="text-2xl font-bold text-error-600 dark:text-error-400">₹{{ paymentStats.pending.toLocaleString() }}</p>
          <p class="text-sm text-error-700 dark:text-error-300">{{ t('common.pending') }} ({{ paymentStats.pendingCount }} deliveries)</p>
        </div>
      </div>
    </div>

    <!-- Recent Activities Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      <!-- Recent Deliveries -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('dashboard.recentDeliveries') }}</h2>
          <router-link to="/incoming" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium">
            {{ t('dashboard.viewAll') }}
          </router-link>
        </div>
        <div class="space-y-4">
          <div v-for="delivery in recentDeliveries" :key="delivery.id" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ delivery.expand?.item?.name || 'Unknown Item' }}</p>
              <p class="text-xs text-gray-600 dark:text-gray-400">{{ delivery.expand?.vendor?.name || 'Unknown Vendor' }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(delivery.delivery_date) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ delivery.quantity }} {{ delivery.expand?.item?.unit || t('dashboard.units') }}</p>
              <span :class="`status-${delivery.payment_status}`">
                {{ delivery.payment_status }}
              </span>
            </div>
          </div>
          <div v-if="recentDeliveries.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400">
            {{ t('dashboard.noRecentDeliveries') }}
          </div>
        </div>
      </div>

      <!-- Recent payments -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('dashboard.recentPayments') }}</h2>
          <router-link to="/payments" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium">
            {{ t('dashboard.viewAll') }}
          </router-link>
        </div>
        <div class="space-y-4">
          <div v-for="payment in madePayments" :key="payment.id" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ payment.expand?.vendor?.name || 'Unknown Vendor' }}</p>
              <p class="text-xs text-gray-600 dark:text-gray-400">{{ payment.expand?.account?.name }}</p>
              <p v-if="payment.created" class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(payment.created) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900 dark:text-white">₹{{ payment.amount || 'Unknown Amount' }}</p>
            </div>
          </div>
          <div v-if="madePayments.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400">
            {{ t('dashboard.noRecentPayments') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { Package, Users, TruckIcon, DollarSign, Loader2 } from 'lucide-vue-next';
import { useSite } from '../composables/useSite';
import { useI18n } from '../composables/useI18n';
import { 
  itemService, 
  vendorService, 
  paymentService, 
  incomingItemService,
  type Item,
  type Vendor,
  type Payment,
  type IncomingItem
} from '../services/pocketbase';

const { t } = useI18n();

const { currentSite } = useSite();

const loading = ref(true);
const items = ref<Item[]>([]);
const vendors = ref<Vendor[]>([]);
const payments = ref<Payment[]>([]);
const incomingItems = ref<IncomingItem[]>([]);

const stats = computed(() => {
  const totalItems = items.value.length;
  const totalVendors = vendors.value.length;
  const pendingDeliveries = incomingItems.value.filter(item => item.payment_status === 'pending').length;
  const outstandingAmount = incomingItems.value.reduce((sum, item) => {
    return sum + (item.total_amount - item.paid_amount);
  }, 0);

  return {
    totalItems,
    totalVendors,
    pendingDeliveries,
    outstandingAmount
  };
});

const recentDeliveries = computed(() => 
  incomingItems.value
    .sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime())
    .slice(0, 5)
);

const madePayments = computed(() => 
  payments.value
    .sort((a, b) => new Date(b.created!).getTime() - new Date(a.created!).getTime())
    .slice(0, 5)
);

const paymentStats = computed(() => {
  const paidItems = incomingItems.value.filter(item => item.payment_status === 'paid');
  const partialItems = incomingItems.value.filter(item => item.payment_status === 'partial');
  const pendingItems = incomingItems.value.filter(item => item.payment_status === 'pending');

  const paid = paidItems.reduce((sum, item) => sum + item.total_amount, 0);
  const partial = partialItems.reduce((sum, item) => sum + item.paid_amount, 0);
  const pending = pendingItems.reduce((sum, item) => sum + item.total_amount, 0);

  return { 
    paid, 
    partial, 
    pending,
    paidCount: paidItems.length,
    partialCount: partialItems.length,
    pendingCount: pendingItems.length
  };
});

const loadData = async () => {
  loading.value = true;
  try {
    const [itemsData, vendorsData, paymentsData, incomingData] = await Promise.all([
      itemService.getAll(),
      vendorService.getAll(),
      paymentService.getAll(),
      incomingItemService.getAll()
    ]);
    
    items.value = itemsData;
    vendors.value = vendorsData;
    payments.value = paymentsData;
    incomingItems.value = incomingData;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const handleSiteChange = () => {
  loadData();
};

onMounted(() => {
  loadData();
  window.addEventListener('site-changed', handleSiteChange);
});

onUnmounted(() => {
  window.removeEventListener('site-changed', handleSiteChange);
});
</script>