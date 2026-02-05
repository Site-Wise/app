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
      <!-- Desktop Actions -->
      <div class="hidden md:flex items-center space-x-3">
        <button @click="exportServiceReport" class="btn-outline">
          <Download class="mr-2 h-4 w-4" />
          Export Report
        </button>
        <button @click="bookService" class="btn-primary">
          <Calendar class="mr-2 h-4 w-4" />
          Book Service
        </button>
        <button @click="openEditModal()" class="btn-outline flex items-center">
          <Edit2 class="mr-2 h-4 w-4" />
          {{ t('common.edit') }}
        </button>
        <button @click="handleDelete()" class="btn-outline text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20 flex items-center">
          <Trash2 class="mr-2 h-4 w-4" />
          {{ t('common.deleteAction') }}
        </button>
      </div>

      <!-- Mobile Menu -->
      <div class="md:hidden relative mobile-menu">
        <button @click="showMobileMenu = !showMobileMenu" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <MoreVertical class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div v-if="showMobileMenu" class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
          <div class="py-1">
            <button @click="showMobileMenu = false; exportServiceReport()" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Download class="mr-3 h-5 w-5 text-gray-600" />
              Export Report
            </button>
            <button @click="showMobileMenu = false; bookService()" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Calendar class="mr-3 h-5 w-5 text-gray-600" />
              Book Service
            </button>
            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button @click="showMobileMenu = false; openEditModal()" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Edit2 class="mr-3 h-5 w-5 text-gray-600" />
              {{ t('common.edit') }}
            </button>
            <button @click="showMobileMenu = false; handleDelete()" class="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 class="mr-3 h-5 w-5 text-red-500" />
              {{ t('common.deleteAction') }}
            </button>
          </div>
        </div>
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Progress</th>
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
                <div class="flex items-center space-x-2">
                  <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-[100px]">
                    <div 
                      class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${booking.percent_completed || 0}%` }"
                    ></div>
                  </div>
                  <span class="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {{ booking.percent_completed || 0 }}%
                  </span>
                </div>
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

    <!-- Edit Service Modal -->
    <div v-if="showEditModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]" @click="closeEditModal"
      @keydown.esc="closeEditModal" tabindex="-1">
      <div
        class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4 mb-20 lg:mb-4"
        @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ t('services.editService') }}
          </h3>

          <form @submit.prevent="saveService" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.serviceName') }}</label>
              <input ref="editNameInputRef" v-model="editForm.name" type="text" required class="input mt-1"
                :placeholder="t('forms.enterServiceName')" autofocus />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.category') }}</label>
              <select v-model="editForm.category" required class="input mt-1">
                <option value="">{{ t('forms.selectCategory') }}</option>
                <option value="labor">{{ t('services.categories.labor') }}</option>
                <option value="equipment">{{ t('services.categories.equipment') }}</option>
                <option value="professional">{{ t('services.categories.professional') }}</option>
                <option value="transport">{{ t('services.categories.transport') }}</option>
                <option value="other">{{ t('services.categories.other') }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.unit') }}</label>
                <select v-model="editForm.unit" required class="input mt-1">
                  <option value="">{{ t('forms.selectUnit') }}</option>
                  <option value="hour">{{ t('services.units.hour') }}</option>
                  <option value="day">{{ t('services.units.day') }}</option>
                  <option value="job">{{ t('services.units.job') }}</option>
                  <option value="sqft">{{ t('services.units.sqft') }}</option>
                  <option value="month">{{ t('services.units.month') }}</option>
                  <option value="kg">{{ t('services.units.kg') }}</option>
                  <option value="rft">{{ t('services.units.rft') }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.standardRate') }}</label>
                <input v-model.number="editForm.standard_rate" type="number" step="0.01" class="input mt-1"
                  :placeholder="t('forms.enterRate')" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.description') }}</label>
              <textarea v-model="editForm.description" class="input mt-1" rows="3"
                :placeholder="t('forms.enterServiceDescription')"></textarea>
            </div>

            <div class="flex items-center">
              <input v-model="editForm.is_active" type="checkbox" id="edit_is_active"
                class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
              <label for="edit_is_active" class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ t('services.isActive') }}</label>
            </div>

            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="editLoading" class="flex-1 btn-primary">
                <Loader2 v-if="editLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ t('common.update') }}
              </button>
              <button type="button" @click="closeEditModal" class="flex-1 btn-outline">
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]" @click="closeDeleteModal"
      @keydown.esc="closeDeleteModal" tabindex="-1">
      <div
        class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4"
        @click.stop>
        <div class="mt-3">
          <div class="flex items-center mb-4">
            <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-full mr-3">
              <AlertTriangle class="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ t('common.deleteAction') }} {{ t('common.service') }}
            </h3>
          </div>

          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {{ deleteConfirmMessage }}
          </p>

          <div class="flex space-x-3 pt-2">
            <button @click="confirmDelete" :disabled="deleteLoading" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              <Loader2 v-if="deleteLoading" class="mr-2 h-4 w-4 animate-spin inline" />
              {{ t('common.deleteAction') }}
            </button>
            <button @click="closeDeleteModal" class="flex-1 btn-outline">
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center min-h-96">
    <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  Download,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  Edit2,
  Trash2,
  AlertTriangle,
  MoreVertical
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useToast } from '../composables/useToast';
import {
  serviceService,
  serviceBookingService,
  type Service,
  type ServiceBooking
} from '../services/pocketbase';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { success, error: showError } = useToast();

const service = ref<Service | null>(null);
const serviceBookings = ref<ServiceBooking[]>([]);
const showMobileMenu = ref(false);

// Edit/Delete state
const showEditModal = ref(false);
const editLoading = ref(false);
const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const editNameInputRef = ref<HTMLInputElement>();
const editForm = reactive({
  name: '',
  service_type: '',
  category: '' as Service['category'],
  unit: '',
  standard_rate: 0,
  description: '',
  is_active: true
});

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

// Delete confirmation message with related entries info
const deleteConfirmMessage = computed(() => {
  if (serviceBookings.value.length > 0) {
    return t('messages.confirmDeleteWithRelated', {
      item: t('common.service'),
      details: t('messages.relatedServiceBookings', { count: serviceBookings.value.length })
    });
  }
  return t('messages.confirmDelete', { item: t('common.service') });
});

// Edit service functions
const openEditModal = async () => {
  if (!service.value) return;
  Object.assign(editForm, {
    name: service.value.name,
    service_type: service.value.service_type,
    category: service.value.category,
    unit: service.value.unit,
    standard_rate: service.value.standard_rate || 0,
    description: service.value.description || '',
    is_active: service.value.is_active
  });
  showEditModal.value = true;
  await nextTick();
  editNameInputRef.value?.focus();
};

const closeEditModal = () => {
  showEditModal.value = false;
};

const saveService = async () => {
  if (!service.value) return;

  editLoading.value = true;
  try {
    await serviceService.update(service.value.id!, editForm);
    success(t('messages.updateSuccess', { item: t('common.service') }));
    closeEditModal();
    await loadServiceData();
  } catch (err) {
    console.error('Error updating service:', err);
    showError(t('messages.error'));
  } finally {
    editLoading.value = false;
  }
};

// Delete service functions
const handleDelete = () => {
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
};

const confirmDelete = async () => {
  if (!service.value) return;

  deleteLoading.value = true;
  try {
    await serviceService.delete(service.value.id!);
    success(t('messages.deleteSuccess', { item: t('common.service') }));
    router.push('/services');
  } catch (err) {
    console.error('Error deleting service:', err);
    showError(t('messages.error'));
  } finally {
    deleteLoading.value = false;
  }
};

// Click outside handler for mobile menu
const handleClickOutside = (event: Event) => {
  const mobileMenu = document.querySelector('.mobile-menu');
  if (mobileMenu && !mobileMenu.contains(event.target as Node)) {
    showMobileMenu.value = false;
  }
};

useEventListener(document, 'click', handleClickOutside);

onMounted(() => {
  loadServiceData();
});
</script>