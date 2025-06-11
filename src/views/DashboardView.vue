<template>
  <div>
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Overview of {{ currentSite?.name || 'your construction site' }} management
          </p>
        </div>
        <div v-if="currentSite" class="text-right">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ currentSite.total_units }} units • {{ currentSite.total_planned_area.toLocaleString() }} sqft
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
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
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
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Active Vendors</p>
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
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Deliveries</p>
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
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Outstanding Amount</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">₹{{ stats.outstandingAmount.toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activities Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Recent Deliveries -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Deliveries</h2>
          <router-link to="/incoming" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium">
            View all
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
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ delivery.quantity }} {{ delivery.expand?.item?.unit || 'units' }}</p>
              <span :class="`status-${delivery.payment_status}`">
                {{ delivery.payment_status }}
              </span>
            </div>
          </div>
          <div v-if="recentDeliveries.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400">
            No recent deliveries
          </div>
        </div>
      </div>

      <!-- Pending Quotations -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Pending Quotations</h2>
          <router-link to="/quotations" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium">
            View all
          </router-link>
        </div>
        <div class="space-y-4">
          <div v-for="quotation in pendingQuotations" :key="quotation.id" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ quotation.expand?.item?.name || 'Unknown Item' }}</p>
              <p class="text-xs text-gray-600 dark:text-gray-400">{{ quotation.expand?.vendor?.name || 'Unknown Vendor' }}</p>
              <p v-if="quotation.valid_until" class="text-xs text-gray-500 dark:text-gray-400">Valid until: {{ formatDate(quotation.valid_until) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900 dark:text-white">₹{{ quotation.unit_price.toLocaleString() }}</p>
              <span class="status-pending">{{ quotation.status }}</span>
            </div>
          </div>
          <div v-if="pendingQuotations.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400">
            No pending quotations
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Status Overview -->
    <div class="mt-8">
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Status Overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
            <p class="text-2xl font-bold text-success-600 dark:text-success-400">₹{{ paymentStats.paid.toLocaleString() }}</p>
            <p class="text-sm text-success-700 dark:text-success-300">Paid ({{ paymentStats.paidCount }} deliveries)</p>
          </div>
          <div class="text-center p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
            <p class="text-2xl font-bold text-warning-600 dark:text-warning-400">₹{{ paymentStats.partial.toLocaleString() }}</p>
            <p class="text-sm text-warning-700 dark:text-warning-300">Partial ({{ paymentStats.partialCount }} deliveries)</p>
          </div>
          <div class="text-center p-4 bg-error-50 dark:bg-error-900/20 rounded-lg">
            <p class="text-2xl font-bold text-error-600 dark:text-error-400">₹{{ paymentStats.pending.toLocaleString() }}</p>
            <p class="text-sm text-error-700 dark:text-error-300">Pending ({{ paymentStats.pendingCount }} deliveries)</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="mt-8">
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <router-link to="/items" class="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <Package class="h-8 w-8 text-primary-600 dark:text-primary-400 mb-2" />
            <span class="text-sm font-medium text-gray-900 dark:text-white">Add Item</span>
          </router-link>
          <router-link to="/vendors" class="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <Users class="h-8 w-8 text-secondary-600 dark:text-secondary-400 mb-2" />
            <span class="text-sm font-medium text-gray-900 dark:text-white">Add Vendor</span>
          </router-link>
          <router-link to="/incoming" class="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <TruckIcon class="h-8 w-8 text-warning-600 dark:text-warning-400 mb-2" />
            <span class="text-sm font-medium text-gray-900 dark:text-white">Record Delivery</span>
          </router-link>
          <router-link to="/payments" class="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <DollarSign class="h-8 w-8 text-success-600 dark:text-success-400 mb-2" />
            <span class="text-sm font-medium text-gray-900 dark:text-white">Record Payment</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { Package, Users, TruckIcon, DollarSign, Loader2 } from 'lucide-vue-next';
import { useSite } from '../composables/useSite';
import { 
  itemService, 
  vendorService, 
  quotationService, 
  incomingItemService,
  type Item,
  type Vendor,
  type Quotation,
  type IncomingItem
} from '../services/pocketbase';

const { currentSite } = useSite();

const loading = ref(true);
const items = ref<Item[]>([]);
const vendors = ref<Vendor[]>([]);
const quotations = ref<Quotation[]>([]);
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

const pendingQuotations = computed(() => 
  quotations.value
    .filter(q => q.status === 'pending')
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
    const [itemsData, vendorsData, quotationsData, incomingData] = await Promise.all([
      itemService.getAll(),
      vendorService.getAll(),
      quotationService.getAll(),
      incomingItemService.getAll()
    ]);
    
    items.value = itemsData;
    vendors.value = vendorsData;
    quotations.value = quotationsData;
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