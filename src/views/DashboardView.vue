<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="mt-1 text-sm text-gray-600">
        Overview of your construction site management
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-primary-100 rounded-lg">
            <Package class="h-8 w-8 text-primary-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Items</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.totalItems }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-secondary-100 rounded-lg">
            <Users class="h-8 w-8 text-secondary-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Active Vendors</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.totalVendors }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-warning-100 rounded-lg">
            <TruckIcon class="h-8 w-8 text-warning-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Pending Deliveries</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.pendingDeliveries }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-success-100 rounded-lg">
            <DollarSign class="h-8 w-8 text-success-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Outstanding Amount</p>
            <p class="text-2xl font-semibold text-gray-900">${{ stats.outstandingAmount.toFixed(2) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activities Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Recent Deliveries -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Recent Deliveries</h2>
          <router-link to="/incoming" class="text-primary-600 hover:text-primary-500 text-sm font-medium">
            View all
          </router-link>
        </div>
        <div class="space-y-4">
          <div v-for="delivery in recentDeliveries" :key="delivery.id" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">{{ delivery.expand?.item?.name }}</p>
              <p class="text-xs text-gray-600">{{ delivery.expand?.vendor?.name }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900">{{ delivery.quantity }} {{ delivery.expand?.item?.unit }}</p>
              <span :class="`status-${delivery.payment_status}`">
                {{ delivery.payment_status }}
              </span>
            </div>
          </div>
          <div v-if="recentDeliveries.length === 0" class="text-center py-4 text-gray-500">
            No recent deliveries
          </div>
        </div>
      </div>

      <!-- Pending Quotations -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Pending Quotations</h2>
          <router-link to="/quotations" class="text-primary-600 hover:text-primary-500 text-sm font-medium">
            View all
          </router-link>
        </div>
        <div class="space-y-4">
          <div v-for="quotation in pendingQuotations" :key="quotation.id" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">{{ quotation.expand?.item?.name }}</p>
              <p class="text-xs text-gray-600">{{ quotation.expand?.vendor?.name }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900">${{ quotation.unit_price }}</p>
              <span class="status-pending">{{ quotation.status }}</span>
            </div>
          </div>
          <div v-if="pendingQuotations.length === 0" class="text-center py-4 text-gray-500">
            No pending quotations
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Status Overview -->
    <div class="mt-8">
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Payment Status Overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-success-50 rounded-lg">
            <p class="text-2xl font-bold text-success-600">${{ paymentStats.paid.toFixed(2) }}</p>
            <p class="text-sm text-success-700">Paid</p>
          </div>
          <div class="text-center p-4 bg-warning-50 rounded-lg">
            <p class="text-2xl font-bold text-warning-600">${{ paymentStats.partial.toFixed(2) }}</p>
            <p class="text-sm text-warning-700">Partial</p>
          </div>
          <div class="text-center p-4 bg-error-50 rounded-lg">
            <p class="text-2xl font-bold text-error-600">${{ paymentStats.pending.toFixed(2) }}</p>
            <p class="text-sm text-error-700">Pending</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Package, Users, TruckIcon, DollarSign } from 'lucide-vue-next';
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

const items = ref<Item[]>([]);
const vendors = ref<Vendor[]>([]);
const quotations = ref<Quotation[]>([]);
const incomingItems = ref<IncomingItem[]>([]);

const stats = computed(() => ({
  totalItems: items.value.length,
  totalVendors: vendors.value.length,
  pendingDeliveries: incomingItems.value.filter(item => item.payment_status === 'pending').length,
  outstandingAmount: incomingItems.value.reduce((sum, item) => sum + (item.total_amount - item.paid_amount), 0)
}));

const recentDeliveries = computed(() => 
  incomingItems.value
    .sort((a, b) => new Date(b.created!).getTime() - new Date(a.created!).getTime())
    .slice(0, 5)
);

const pendingQuotations = computed(() => 
  quotations.value
    .filter(q => q.status === 'pending')
    .slice(0, 5)
);

const paymentStats = computed(() => {
  const paid = incomingItems.value
    .filter(item => item.payment_status === 'paid')
    .reduce((sum, item) => sum + item.total_amount, 0);
  
  const partial = incomingItems.value
    .filter(item => item.payment_status === 'partial')
    .reduce((sum, item) => sum + item.paid_amount, 0);
  
  const pending = incomingItems.value
    .filter(item => item.payment_status === 'pending')
    .reduce((sum, item) => sum + item.total_amount, 0);
  
  return { paid, partial, pending };
});

const loadData = async () => {
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
  }
};

onMounted(() => {
  loadData();
});
</script>