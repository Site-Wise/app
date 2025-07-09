<template>
  <div v-if="service">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center space-x-4">
        <button @click="goBack" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ service.name }}</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Service Details & Booking History</p>
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
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Information</h2>
        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Name:</span>
            <p class="text-gray-900 dark:text-white">{{ service.name }}</p>
          </div>
          <div v-if="service.description">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</span>
            <p class="text-gray-900 dark:text-white">{{ service.description }}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
            <span class="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-xs rounded-full capitalize">{{ service.service_type.replace('_', ' ') }}</span>
          </div>
          <div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Unit:</span>
            <p class="text-gray-900 dark:text-white">{{ service.unit }}</p>
          </div>
          <div v-if="service.category">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</span>
            <span class="px-2 py-1 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-300 text-xs rounded-full">{{ service.category }}</span>
          </div>
        </div>
      </div>

      <!-- Booking Summary -->
      <div class="lg:col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
            <div class="flex items-center">
              <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar class="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-blue-700 dark:text-blue-300">Total Bookings</p>
                <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ serviceBookings.length }}</p>
              </div>
            </div>
          </div>

          <div class="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
            <div class="flex items-center">
              <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock class="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-green-700 dark:text-green-300">Total Hours</p>
                <p class="text-2xl font-bold text-green-900 dark:text-green-100">{{ totalHours }}</p>
              </div>
            </div>
          </div>

          <div class="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
            <div class="flex items-center">
              <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <DollarSign class="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-yellow-700 dark:text-yellow-300">Avg. Rate</p>
                <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">₹{{ averageRate.toFixed(2) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Rate Range -->
        <div class="mt-6 card">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rate Range</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">₹{{ minRate.toFixed(2) }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Lowest</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{{ averageRate.toFixed(2) }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Average</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-600 dark:text-red-400">₹{{ maxRate.toFixed(2) }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Highest</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Booking History -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Booking History</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ serviceBookings.length }} bookings</span>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vendor</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rate</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Amount</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="booking in serviceBookings" :key="booking.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ formatDate(booking.start_date) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ booking.expand?.vendor?.name || 'Unknown Vendor' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ booking.duration }} {{ service.unit }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ₹{{ booking.unit_rate.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ₹{{ booking.total_amount.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="`status-${booking.status}`">
                  {{ booking.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="serviceBookings.length === 0" class="text-center py-12">
          <Calendar class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No bookings recorded</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Start tracking by booking this service.</p>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="flex items-center justify-center min-h-96">
    <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
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
    const [allServices, allBookings] = await Promise.all([
      serviceService.getAll(),
      serviceBookingService.getAll()
    ]);
    
    service.value = allServices.find(s => s.id === serviceId) || null;
    serviceBookings.value = allBookings
      .filter(booking => booking.service === serviceId)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      
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
  
  const headers = ['Date', 'Vendor', 'Duration', 'Rate', 'Total Amount', 'Status', 'Notes'];
  
  const rows = serviceBookings.value.map(booking => [
    booking.start_date,
    booking.expand?.vendor?.contact_person || 'Unknown Vendor',
    booking.duration,
    booking.unit_rate,
    booking.total_amount,
    booking.status,
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