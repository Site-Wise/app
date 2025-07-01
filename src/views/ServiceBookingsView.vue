<template>
  <div>
    <!-- Desktop Header with Add Button -->
    <div class="hidden md:flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('serviceBookings.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('serviceBookings.subtitle') }}
        </p>
      </div>
      <button @click="showAddModal = true" class="btn-primary" v-if="canCreate">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('serviceBookings.bookService') }}
      </button>
    </div>

    <!-- Mobile Header with Search -->
    <div class="md:hidden mb-6">
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('serviceBookings.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('serviceBookings.subtitle') }}
        </p>
      </div>
      
      <!-- Mobile Search Box -->
      <div class="relative">
        <input
          type="text"
          :placeholder="t('search.serviceBookings')"
          v-model="searchQuery"
          class="w-full px-4 py-3 pl-10 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div v-if="searchLoading" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Loader2 class="h-4 w-4 animate-spin text-gray-400" />
        </div>
      </div>
    </div>

    <!-- Service Bookings Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <!-- Desktop Headers -->
        <thead class="bg-gray-50 dark:bg-gray-700 hidden lg:table-header-group">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('services.service') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.vendor') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('serviceBookings.startDate') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('serviceBookings.duration') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('serviceBookings.rate') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.total') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.status') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('serviceBookings.paymentStatus') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        
        <!-- Mobile Headers -->
        <thead class="bg-gray-50 dark:bg-gray-700 lg:hidden">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('services.service') }}</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('services.details') }}</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="booking in serviceBookings" :key="booking.id">
            <!-- Desktop Row -->
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ booking.expand?.service?.name || 'Unknown Service' }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ booking.expand?.service?.category || 'Unknown Type' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div class="text-sm text-gray-900 dark:text-white">{{ booking.expand?.vendor?.name || 'Unknown Vendor' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              {{ formatDate(booking.start_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              {{ booking.duration }} {{ booking.expand?.service?.unit || 'units' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              ₹{{ booking.unit_rate.toFixed(2) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div class="text-sm text-gray-900 dark:text-white">₹{{ booking.total_amount.toFixed(2) }}</div>
              <div v-if="booking.paid_amount > 0" class="text-xs text-green-600 dark:text-green-400">
                {{ t('serviceBookings.paid') }}: ₹{{ booking.paid_amount.toFixed(2) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <span :class="`status-${booking.status === 'scheduled' ? 'pending' : booking.status === 'completed' ? 'paid' : 'partial'}`">
                {{ t(`serviceBookings.statuses.${booking.status}`) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <span :class="`status-${booking.payment_status}`">
                {{ t(`common.${booking.payment_status}`) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium hidden lg:table-cell">
              <div class="flex items-center space-x-2">
                <button @click="viewBooking(booking)" class="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300" :title="t('common.view')">
                  <Eye class="h-4 w-4" />
                </button>
                <button @click="editBooking(booking)" class="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300" :title="t('common.edit')" v-if="canUpdate">
                  <Edit2 class="h-4 w-4" />
                </button>
                <button @click="deleteBooking(booking.id!)" class="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300" :title="t('common.delete')" v-if="canDelete">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>

            <!-- Mobile Row -->
            <td class="px-4 py-4 lg:hidden">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ booking.expand?.service?.name || 'Unknown Service' }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ booking.expand?.vendor?.name || 'Unknown Vendor' }}</div>
              <div class="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                {{ formatDate(booking.start_date) }}
              </div>
            </td>
            <td class="px-4 py-4 lg:hidden">
              <div class="text-right">
                <div :class="[
                  'text-sm font-semibold',
                  booking.payment_status === 'paid' 
                    ? 'text-green-600 dark:text-green-400' 
                    : booking.payment_status === 'partial'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                ]">
                  ₹{{ booking.total_amount.toFixed(2) }}
                </div>
                <div class="mt-1">
                  <span :class="`text-xs status-${booking.status === 'scheduled' ? 'pending' : booking.status === 'completed' ? 'paid' : 'partial'}`">
                    {{ t(`serviceBookings.statuses.${booking.status}`) }}
                  </span>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 lg:hidden">
              <div class="relative flex items-center justify-end">
                <button 
                  @click="toggleMobileMenu(booking.id!)"
                  class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  :title="t('common.actions')"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                  </svg>
                </button>
                
                <!-- Mobile Actions Menu -->
                <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <div 
                    v-if="openMobileMenuId === booking.id"
                    class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[120px] origin-top-right"
                    @click.stop
                  >
                    <button 
                      @click="viewBooking(booking); closeMobileMenu()"
                      class="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <Eye class="h-4 w-4 mr-2" />
                      {{ t('common.view') }}
                    </button>
                    <button 
                      @click="editBooking(booking); closeMobileMenu()"
                      v-if="canUpdate"
                      class="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <Edit2 class="h-4 w-4 mr-2" />
                      {{ t('common.edit') }}
                    </button>
                    <button 
                      @click="deleteBooking(booking.id!); closeMobileMenu()"
                      v-if="canDelete"
                      class="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                    >
                      <Trash2 class="h-4 w-4 mr-2" />
                      {{ t('common.delete') }}
                    </button>
                  </div>
                </Transition>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="serviceBookings.length === 0" class="text-center py-12">
        <Calendar class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('serviceBookings.noBookings') }}</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('serviceBookings.startBooking') }}</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingBooking" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md m-4 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingBooking ? t('serviceBookings.editBooking') : t('serviceBookings.bookService') }}
          </h3>
          
          <form @submit.prevent="saveBooking" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.service') }}</label>
              <select ref="serviceInputRef" v-model="form.service" required class="input mt-1" @change="updateRateFromService" autofocus>
                <option value="">{{ t('forms.selectService') }}</option>
                <option v-for="service in activeServices" :key="service.id" :value="service.id">
                  {{ service.name }} ({{ service.category }})
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}</label>
              <select v-model="form.vendor" required class="input mt-1">
                <option value="">{{ t('forms.selectProvider') }}</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.startDate') }}</label>
              <input v-model="form.start_date" type="date" required class="input mt-1" />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.duration') }}</label>
                <input v-model.number="form.duration" type="number" step="0.5" required class="input mt-1" placeholder="0" @input="calculateTotal" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.unitRate') }}</label>
                <input v-model.number="form.unit_rate" type="number" step="0.01" required class="input mt-1" placeholder="0.00" @input="calculateTotal" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.total') }}</label>
              <input v-model.number="form.total_amount" type="number" step="0.01" required class="input mt-1" readonly />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.status') }}</label>
              <select v-model="form.status" required class="input mt-1">
                <option value="scheduled">{{ t('serviceBookings.statuses.scheduled') }}</option>
                <option value="in_progress">{{ t('serviceBookings.statuses.in_progress') }}</option>
                <option value="completed">{{ t('serviceBookings.statuses.completed') }}</option>
                <option value="cancelled">{{ t('serviceBookings.statuses.cancelled') }}</option>
              </select>
            </div>
            
            <!-- <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.paymentStatus') }}</label>
              <select v-model="form.payment_status" required class="input mt-1">
                <option value="pending">{{ t('common.pending') }}</option>
                <option value="partial">{{ t('common.partial') }}</option>
                <option value="paid">{{ t('common.paid') }}</option>
              </select>
            </div> -->
            
            <div v-if="form.payment_status !== 'pending'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.paidAmount') }}</label>
              <input v-model.number="form.paid_amount" type="number" step="0.01" class="input mt-1" placeholder="0.00" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.notes') }}</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" :placeholder="t('forms.serviceNotes')"></textarea>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingBooking ? t('common.update') : t('common.create') }}
              </button>
              <button type="button" @click="closeModal" class="flex-1 btn-outline">
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Modal -->
    <div v-if="viewingBooking" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="viewingBooking = null">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-4xl m-4 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('serviceBookings.bookingDetails') }}</h3>
            <button @click="viewingBooking = null" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Booking Information -->
            <div class="space-y-4">
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('services.service') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingBooking.expand?.service?.name || 'Unknown Service' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingBooking.expand?.vendor?.name || 'Unknown Vendor' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.startDate') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ formatDateTime(viewingBooking.start_date) }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.duration') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingBooking.duration }} {{ viewingBooking.expand?.service?.unit || 'units' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.total') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">₹{{ viewingBooking.total_amount.toFixed(2) }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.status') }}:</span>
                <span :class="`ml-2 status-${viewingBooking.status === 'scheduled' ? 'pending' : viewingBooking.status === 'completed' ? 'paid' : 'partial'}`">
                  {{ t(`serviceBookings.statuses.${viewingBooking.status}`) }}
                </span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.paymentStatus') }}:</span>
                <span :class="`ml-2 status-${viewingBooking.payment_status}`">
                  {{ t(`common.${viewingBooking.payment_status}`) }}
                </span>
              </div>
              <div v-if="viewingBooking.notes">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.notes') }}:</span>
                <p class="ml-2 text-gray-600 dark:text-gray-400 mt-1">{{ viewingBooking.notes }}</p>
              </div>
            </div>

            <!-- Completion Photos -->
            <div>
              <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-3">{{ t('serviceBookings.completionPhotos') }}</h4>
              <PhotoGallery 
                v-if="viewingBooking.completion_photos && viewingBooking.completion_photos.length > 0"
                :photos="viewingBooking.completion_photos" 
                :item-id="viewingBooking.id"
                collection="service_bookings"
              />
              <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
                {{ t('serviceBookings.noCompletionPhotos') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  Eye, 
  X
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { usePermissions } from '../composables/usePermissions';
import { useSiteData } from '../composables/useSiteData';
import { useServiceBookingSearch } from '../composables/useSearch';
import PhotoGallery from '../components/PhotoGallery.vue';
import { 
  serviceBookingService, 
  serviceService,
  vendorService,
  type ServiceBooking 
} from '../services/pocketbase';

const { t } = useI18n();
const { canCreate, canUpdate, canDelete } = usePermissions();

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults, loadAll } = useServiceBookingSearch();

// Display items: use search results if searching, otherwise all items
const serviceBookings = computed(() => {
  return searchQuery.value.trim() ? searchResults.value : allServiceBookings.value
});

// Use site data management
const { data: allServiceBookingsData, reload: reloadBookings } = useSiteData(
  async () => await serviceBookingService.getAll()
);

const { data: servicesData } = useSiteData(
  async () => await serviceService.getAll()
);

const { data: vendorsData } = useSiteData(
  async () => await vendorService.getAll()
);

// Computed properties from useSiteData
const allServiceBookings = computed(() => allServiceBookingsData.value || []);
const services = computed(() => servicesData.value || []);
const vendors = computed(() => vendorsData.value || []);
const showAddModal = ref(false);
const editingBooking = ref<ServiceBooking | null>(null);
const viewingBooking = ref<ServiceBooking | null>(null);
const loading = ref(false);

const serviceInputRef = ref<HTMLInputElement>();
const openMobileMenuId = ref<string | null>(null);

const form = reactive({
  service: '',
  vendor: '',
  start_date: '',
  duration: 0,
  unit_rate: 0,
  total_amount: 0,
  status: 'scheduled' as ServiceBooking['status'],
  notes: '',
  payment_status: 'pending' as 'pending' | 'partial' | 'paid',
  paid_amount: 0
});

const activeServices = computed(() => {
  return services.value?.filter(service => service.is_active) || [];
});

const reloadAllData = async () => {
  await reloadBookings();
  // Other data will be reloaded automatically by useSiteData
  
  // Load all items for search functionality
  loadAll();
};

const calculateTotal = () => {
  form.total_amount = form.duration * form.unit_rate;
};

const updateRateFromService = () => {
  const selectedService = services.value?.find(service => service.id === form.service);
  if (selectedService && selectedService.standard_rate) {
    form.unit_rate = selectedService.standard_rate;
    calculateTotal();
  }
};

const saveBooking = async () => {
  loading.value = true;
  try {
    const data = { ...form };
    if (data.payment_status === 'pending') {
      data.paid_amount = 0;
    }
    
    // Ensure dates are in proper format (keep as date strings)
    if (data.start_date) {
      data.start_date = data.start_date; // Keep YYYY-MM-DD format
    }
    
    if (editingBooking.value) {
      await serviceBookingService.update(editingBooking.value.id!, data);
    } else {
      await serviceBookingService.create(data);
    }
    
    await reloadAllData();
    closeModal();
  } catch (error) {
    console.error('Error saving service booking:', error);
    alert(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const formatDateForInput = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD format
};

const editBooking = (booking: ServiceBooking) => {
  editingBooking.value = booking;
  Object.assign(form, {
    service: booking.service,
    vendor: booking.vendor,
    start_date: formatDateForInput(booking.start_date),
    duration: booking.duration,
    unit_rate: booking.unit_rate,
    total_amount: booking.total_amount,
    status: booking.status,
    notes: booking.notes || '',
    payment_status: booking.payment_status,
    paid_amount: booking.paid_amount
  });
};

const viewBooking = (booking: ServiceBooking) => {
  viewingBooking.value = booking;
};

const deleteBooking = async (id: string) => {
  if (confirm(t('messages.confirmDelete', { item: t('serviceBookings.booking') }))) {
    try {
      await serviceBookingService.delete(id);
      await reloadAllData();
    } catch (error) {
      console.error('Error deleting service booking:', error);
      alert(t('messages.error'));
    }
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const toggleMobileMenu = (bookingId: string) => {
  openMobileMenuId.value = openMobileMenuId.value === bookingId ? null : bookingId;
};

const closeMobileMenu = () => {
  openMobileMenuId.value = null;
};

const closeModal = () => {
  showAddModal.value = false;
  editingBooking.value = null;
  Object.assign(form, {
    service: '',
    vendor: '',
    start_date: '',
    duration: 0,
    unit_rate: 0,
    total_amount: 0,
    status: 'scheduled',
    notes: '',
    payment_status: 'pending',
    paid_amount: 0
  });
};

const handleQuickAction = async () => {
  if (canCreate.value) {
    showAddModal.value = true;
    await nextTick();
    serviceInputRef.value?.focus();
  }
};

// Site change is handled automatically by useSiteData

const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  if (!target.closest('.relative')) {
    closeMobileMenu();
  }
};

const handleKeyboardShortcut = async (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    if (canCreate.value) {
      showAddModal.value = true;
      await nextTick();
      serviceInputRef.value?.focus();
    }
  }
};

onMounted(() => {
  // Data loading is handled automatically by useSiteData
  // Initial load all for search functionality
  setTimeout(() => loadAll(), 100);
  window.addEventListener('show-add-modal', handleQuickAction);
  window.addEventListener('keydown', handleKeyboardShortcut);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
  window.removeEventListener('keydown', handleKeyboardShortcut);
  document.removeEventListener('click', handleClickOutside);
});
</script>