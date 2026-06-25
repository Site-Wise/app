<template>
  <div v-if="service">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center space-x-4">
        <button @click="goBack" class="p-2 rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors">
          <ArrowLeft class="h-5 w-5 text-stone-600 dark:text-stone-400" />
        </button>
        <div>
          <h1 class="sw-h2 font-display text-ink dark:text-cream">{{ service.name }}</h1>
          <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">Service Details & Booking History</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <button @click="exportServiceReport" class="btn-outline">
          <Download class="mr-2 h-4 w-4" />
          Export Report
        </button>
        <button @click="bookService" class="btn-primary">
          <Calendar class="mr-2 h-4 w-4" />
          Book Service
        </button>
      </div>
    </div>

    <!-- Service Info & Summary -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <!-- Service Information -->
      <div class="card">
        <h2 class="sw-h4 font-display text-ink dark:text-cream mb-4">Service Information</h2>
        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-stone-700 dark:text-stone-300">Name:</span>
            <p class="text-ink dark:text-cream">{{ service.name }}</p>
          </div>
          <div v-if="service.description">
            <span class="text-sm font-medium text-stone-700 dark:text-stone-300">Description:</span>
            <p class="text-ink dark:text-cream">{{ service.description }}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-stone-700 dark:text-stone-300">Type:</span>
            <span class="sw-badge sw-badge--accent capitalize">{{ service.service_type.replace('_', ' ') }}</span>
          </div>
          <div>
            <span class="text-sm font-medium text-stone-700 dark:text-stone-300">Unit:</span>
            <p class="text-ink dark:text-cream">{{ service.unit }}</p>
          </div>
          <div v-if="service.category">
            <span class="text-sm font-medium text-stone-700 dark:text-stone-300">Category:</span>
            <span class="sw-badge sw-badge--neutral">{{ service.category }}</span>
          </div>
        </div>
      </div>

      <!-- Booking Summary -->
      <div class="lg:col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card">
            <div class="flex items-center">
              <div class="p-2 bg-stone-100 dark:bg-ink-4 rounded-md">
                <Calendar class="h-6 w-6 text-ink dark:text-cream" />
              </div>
              <div class="ml-4">
                <p class="sw-eyebrow text-stone-500 dark:text-stone-400">Total Bookings</p>
                <p class="sw-stat font-display text-ink dark:text-cream sw-tabular">{{ serviceBookings.length }}</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex items-center">
              <div class="p-2 bg-forest-100 dark:bg-forest-900/30 rounded-md">
                <Clock class="h-6 w-6 text-forest-600 dark:text-forest-400" />
              </div>
              <div class="ml-4">
                <p class="sw-eyebrow text-stone-500 dark:text-stone-400">Total Hours</p>
                <p class="sw-stat font-display text-ink dark:text-cream sw-tabular">{{ totalHours }}</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex items-center">
              <div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                <DollarSign class="h-6 w-6 text-amber-700 dark:text-amber-400" />
              </div>
              <div class="ml-4">
                <p class="sw-eyebrow text-stone-500 dark:text-stone-400">Avg. Rate</p>
                <p class="sw-stat font-display text-ink dark:text-cream sw-tabular">₹{{ averageRate.toFixed(2) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Rate Range -->
        <div class="mt-6 card">
          <h3 class="sw-h4 font-display text-ink dark:text-cream mb-4">Rate Range</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-2xl font-bold font-mono sw-tabular text-forest-600 dark:text-forest-400">₹{{ minRate.toFixed(2) }}</p>
              <p class="text-sm text-stone-600 dark:text-stone-400">Lowest</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold font-mono sw-tabular text-ink dark:text-cream">₹{{ averageRate.toFixed(2) }}</p>
              <p class="text-sm text-stone-600 dark:text-stone-400">Average</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold font-mono sw-tabular text-clay-600 dark:text-clay-400">₹{{ maxRate.toFixed(2) }}</p>
              <p class="text-sm text-stone-600 dark:text-stone-400">Highest</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Booking History -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="sw-h4 font-display text-ink dark:text-cream">Booking History</h2>
        <span class="text-sm text-stone-500 dark:text-stone-400">{{ serviceBookings.length }} bookings</span>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-stone-200 dark:divide-ink-4">
          <thead class="bg-cream-2 dark:bg-ink-2">
            <tr>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">Date</th>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">Vendor</th>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">Duration</th>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">Rate</th>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">Total Amount</th>
              <th class="px-6 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">Progress</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-ink-3 divide-y divide-stone-200 dark:divide-ink-4">
            <tr v-for="booking in serviceBookings" :key="booking.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-ink dark:text-cream">
                {{ formatDate(booking.start_date) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-ink dark:text-cream">
                {{ booking.expand?.vendor?.contact_person || booking.expand?.vendor?.name || 'Unknown Vendor' }}
                <span v-if="booking.expand?.vendor?.name && booking.expand?.vendor?.contact_person" class="block text-xs text-stone-500 dark:text-stone-400">{{ booking.expand?.vendor?.name }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono sw-tabular text-ink dark:text-cream">
                {{ booking.duration }} {{ service.unit }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono sw-tabular text-ink dark:text-cream">
                ₹{{ booking.unit_rate.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono sw-tabular text-ink dark:text-cream">
                ₹{{ booking.total_amount.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                  <div class="flex-1 bg-stone-200 dark:bg-ink-4 rounded-full h-2 max-w-[100px]">
                    <div
                      class="bg-amber h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${booking.percent_completed || 0}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-mono sw-tabular text-stone-600 dark:text-stone-400 font-medium">
                    {{ booking.percent_completed || 0 }}%
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="serviceBookings.length === 0" class="text-center py-12">
          <Calendar class="mx-auto h-12 w-12 text-stone-400" />
          <h3 class="mt-2 text-sm font-medium text-ink dark:text-cream">No bookings recorded</h3>
          <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">Start tracking by booking this service.</p>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="flex items-center justify-center min-h-96">
    <Loader2 class="h-8 w-8 animate-spin text-stone-400" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Clock, 
  DollarSign,
  Loader2
} from 'lucide-vue-next';
import {
  serviceService,
  serviceBookingService,
  type Service,
  type ServiceBooking
} from '../services/pocketbase';
import { selectServiceBookings } from '../utils/detailViewSelectors';

const route = useRoute();
const router = useRouter();

const service = ref<Service | null>(null);
const serviceBookings = ref<ServiceBooking[]>([]);

const totalHours = computed(() => {
  return serviceBookings.value.reduce((sum, booking) => sum + booking.duration, 0);
});

const averageRate = computed(() => {
  if (serviceBookings.value.length === 0) return 0;
  const totalValue = serviceBookings.value.reduce((sum, booking) => sum + booking.total_amount, 0);
  const totalQuantity = serviceBookings.value.reduce((sum, booking) => sum + booking.duration, 0);
  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
});

const minRate = computed(() => {
  if (serviceBookings.value.length === 0) return 0;
  return Math.min(...serviceBookings.value.map(b => b.unit_rate));
});

const maxRate = computed(() => {
  if (serviceBookings.value.length === 0) return 0;
  return Math.max(...serviceBookings.value.map(b => b.unit_rate));
});

const goBack = () => {
  try {
    router.back();
  } catch (error) {
    console.error('Navigation error:', error);
    router.push('/services');
  }
};

const loadServiceData = async () => {
  const serviceId = route.params.id as string;
  
  try {
    // Targeted queries: the single service by id, and only this service's bookings
    // instead of getAll() + JS find()/filter().
    const [serviceRecord, serviceBookingsData] = await Promise.all([
      serviceService.getById(serviceId),
      serviceBookingService.getByService(serviceId)
    ]);

    service.value = serviceRecord;
    // selectServiceBookings re-applies the service-id membership + ascending start_date
    // sort, keeping the displayed set identical to the previous client-side filter.
    serviceBookings.value = selectServiceBookings(serviceBookingsData, serviceId);

    if (!service.value) {
      router.push('/services');
      return;
    }
  } catch (error) {
    console.error('Error loading service data:', error);
    router.push('/services');
  }
};

const bookService = () => {
  router.push('/service-bookings');
};

const exportServiceReport = () => {
  if (!service.value) return;
  
  // Create CSV content
  const csvContent = generateServiceReportCSV();
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${service.value.name}_report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const generateServiceReportCSV = () => {
  if (!service.value) return '';
  
  const headers = ['Date', 'Vendor', 'Duration', 'Rate', 'Total Amount', 'Progress %', 'Notes'];
  
  const rows = serviceBookings.value.map(booking => [
    booking.start_date,
    booking.expand?.vendor?.contact_person || 'Unknown Vendor',
    booking.duration,
    booking.unit_rate,
    booking.total_amount,
    `${booking.percent_completed || 0}%`,
    booking.notes || ''
  ]);
  
  // Add summary row
  rows.push([
    '',
    'SUMMARY',
    totalHours.value,
    averageRate.value.toFixed(2),
    serviceBookings.value.reduce((sum, b) => sum + b.total_amount, 0),
    '',
    `Report generated on ${new Date().toISOString().split('T')[0]}`
  ]);
  
  // Convert to CSV
  const csvRows = [headers, ...rows];
  return csvRows.map(row => 
    row.map(field => 
      typeof field === 'string' && field.includes(',') ? `"${field}"` : field
    ).join(',')
  ).join('\n');
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

onMounted(() => {
  loadServiceData();
});
</script>