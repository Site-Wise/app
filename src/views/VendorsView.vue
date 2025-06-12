<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('vendors.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('vendors.subtitle') }}
        </p>
      </div>
      <button 
        @click="handleAddVendor" 
        :disabled="!canCreateVendor"
        :class="[
          canCreateVendor ? 'btn-primary' : 'btn-disabled',
          'flex items-center'
        ]"
        :title="!canCreateVendor ? t('subscription.banner.freeTierLimitReached') : ''"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('vendors.addVendor') }}
      </button>
    </div>

    <!-- Vendors Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="vendor in vendors" :key="vendor.id" class="card hover:shadow-md transition-shadow duration-200 cursor-pointer" @click="viewVendorDetail(vendor.id!)">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ vendor.name }}</h3>
            <div class="mt-2 space-y-1">
              <div v-if="vendor.contact_person" class="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <User class="mr-2 h-4 w-4" />
                {{ vendor.contact_person }}
              </div>
              <div v-if="vendor.email" class="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Mail class="mr-2 h-4 w-4" />
                {{ vendor.email }}
              </div>
              <div v-if="vendor.phone" class="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Phone class="mr-2 h-4 w-4" />
                {{ vendor.phone }}
              </div>
              <div v-if="vendor.address" class="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <MapPin class="mr-2 h-4 w-4" />
                {{ vendor.address }}
              </div>
            </div>
            
            <!-- Financial Summary -->
            <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.outstanding') }}</span>
                <span class="text-sm font-semibold text-red-600 dark:text-red-400">₹{{ getVendorOutstanding(vendor.id!).toFixed(2) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.totalPaid') }}</span>
                <span class="text-sm font-semibold text-green-600 dark:text-green-400">₹{{ getVendorPaid(vendor.id!).toFixed(2) }}</span>
              </div>
            </div>
            
            <div v-if="vendor.tags && vendor.tags.length > 0" class="mt-4 flex flex-wrap gap-1">
              <span v-for="tag in vendor.tags" :key="tag" class="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-xs rounded-full">
                {{ tag }}
              </span>
            </div>
          </div>
          <div class="flex items-center space-x-2" @click.stop>
            <button 
              @click="editVendor(vendor)" 
              :disabled="!canEditDelete"
              :class="[
                canEditDelete 
                  ? 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300' 
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                'p-1'
              ]"
              title="Edit"
            >
              <Edit2 class="h-4 w-4" />
            </button>
            <button 
              @click="deleteVendor(vendor.id!)" 
              :disabled="!canEditDelete"
              :class="[
                canEditDelete 
                  ? 'text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400' 
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                'p-1'
              ]"
              title="Delete"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="vendors.length === 0" class="col-span-full">
        <div class="text-center py-12">
          <Users class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('vendors.noVendors') }}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('vendors.getStarted') }}</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingVendor" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingVendor ? t('vendors.editVendor') : t('vendors.addVendor') }}
          </h3>
          
          <form @submit.prevent="saveVendor" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.companyName') }}</label>
              <input v-model="form.name" type="text" required class="input mt-1" :placeholder="t('forms.enterCompanyName')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.contactPerson') }}</label>
              <input v-model="form.contact_person" type="text" class="input mt-1" :placeholder="t('forms.enterContactPerson')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.email') }}</label>
              <input v-model="form.email" type="email" class="input mt-1" :placeholder="t('forms.enterEmail')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.phone') }}</label>
              <input v-model="form.phone" type="tel" class="input mt-1" :placeholder="t('forms.enterPhone')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.address') }}</label>
              <textarea v-model="form.address" class="input mt-1" rows="2" :placeholder="t('forms.enterAddress')"></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('vendors.specialties') }}</label>
              <div class="flex flex-wrap gap-2 mb-2">
                <span v-for="(tag, index) in form.tags" :key="index" class="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-xs rounded-full flex items-center">
                  {{ tag }}
                  <button type="button" @click="removeTag(index)" class="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200">
                    <X class="h-3 w-3" />
                  </button>
                </span>
              </div>
              <div class="flex">
                <input 
                  v-model="newTag" 
                  type="text" 
                  class="input flex-1" 
                  :placeholder="t('vendors.addSpecialty')"
                  @keydown.enter.prevent="addTag"
                />
                <button type="button" @click="addTag" class="ml-2 btn-outline">
                  <Plus class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingVendor ? t('common.update') : t('common.create') }}
              </button>
              <button type="button" @click="closeModal" class="flex-1 btn-outline">
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Users, Plus, Edit2, Trash2, Loader2, User, Mail, Phone, MapPin, X } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { 
  vendorService, 
  incomingItemService, 
  paymentService,
  serviceBookingService,
  type Vendor,
  type IncomingItem,
  type Payment,
  type ServiceBooking
} from '../services/pocketbase';

const { t } = useI18n();
const { checkCreateLimit, incrementUsage, decrementUsage, isReadOnly } = useSubscription();

const router = useRouter();
const vendors = ref<Vendor[]>([]);
const incomingItems = ref<IncomingItem[]>([]);
const serviceBookings = ref<ServiceBooking[]>([]);
const payments = ref<Payment[]>([]);
const showAddModal = ref(false);
const editingVendor = ref<Vendor | null>(null);
const loading = ref(false);
const newTag = ref('');

const canCreateVendor = computed(() => {
  return !isReadOnly.value && checkCreateLimit('vendors');
});

const canEditDelete = computed(() => {
  return !isReadOnly.value;
});

const form = reactive({
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  tags: [] as string[]
});

const getVendorOutstanding = (vendorId: string) => {
  // Include incoming items outstanding
  const incomingOutstanding = incomingItems.value
    .filter(item => item.vendor === vendorId)
    .reduce((sum, item) => sum + (item.total_amount - item.paid_amount), 0);
  
  // Include service bookings outstanding
  const serviceOutstanding = serviceBookings.value
    .filter(booking => booking.vendor === vendorId)
    .reduce((sum, booking) => sum + (booking.total_amount - booking.paid_amount), 0);
    
  return incomingOutstanding + serviceOutstanding;
};

const getVendorPaid = (vendorId: string) => {
  return payments.value
    .filter(payment => payment.vendor === vendorId)
    .reduce((sum, payment) => sum + payment.amount, 0);
};

const viewVendorDetail = (vendorId: string) => {
  try {
    router.push(`/vendors/${vendorId}`);
  } catch (error) {
    console.error('Navigation error:', error);
  }
};

const loadData = async () => {
  try {
    const [vendorsData, incomingData, serviceBookingsData, paymentsData] = await Promise.all([
      vendorService.getAll(),
      incomingItemService.getAll(),
      serviceBookingService.getAll(),
      paymentService.getAll()
    ]);
    
    vendors.value = vendorsData;
    incomingItems.value = incomingData;
    serviceBookings.value = serviceBookingsData;
    payments.value = paymentsData;
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const handleAddVendor = () => {
  if (!canCreateVendor.value) {
    alert(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  showAddModal.value = true;
};

const saveVendor = async () => {
  loading.value = true;
  try {
    if (editingVendor.value) {
      await vendorService.update(editingVendor.value.id!, form);
    } else {
      if (!checkCreateLimit('vendors')) {
        alert(t('subscription.banner.freeTierLimitReached'));
        return;
      }
      const newVendor = await vendorService.create(form);
      console.log('Vendor created successfully:', newVendor);
      
      try {
        await incrementUsage('vendors');
        console.log('Usage incremented successfully for vendors');
      } catch (usageError) {
        console.error('Error incrementing usage for vendors:', usageError);
        // Continue even if usage tracking fails
      }
    }
    await loadData();
    closeModal();
  } catch (error) {
    console.error('Error saving vendor:', error);
    alert('Error saving vendor. Please try again.');
  } finally {
    loading.value = false;
  }
};

const editVendor = (vendor: Vendor) => {
  editingVendor.value = vendor;
  Object.assign(form, {
    name: vendor.name,
    contact_person: vendor.contact_person || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    address: vendor.address || '',
    tags: [...vendor.tags]
  });
};

const deleteVendor = async (id: string) => {
  if (!canEditDelete.value) {
    alert(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  if (confirm(t('messages.confirmDelete', { vendor: t('common.vendor') }))) {
    try {
      await vendorService.delete(id);
      await decrementUsage('vendors');
      await loadData();
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  }
};

const addTag = () => {
  if (newTag.value.trim() && !form.tags.includes(newTag.value.trim())) {
    form.tags.push(newTag.value.trim());
    newTag.value = '';
  }
};

const removeTag = (index: number) => {
  form.tags.splice(index, 1);
};

const closeModal = () => {
  showAddModal.value = false;
  editingVendor.value = null;
  Object.assign(form, {
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tags: []
  });
  newTag.value = '';
};

const handleQuickAction = () => {
  showAddModal.value = true;
};

const handleSiteChange = () => {
  loadData();
};

onMounted(() => {
  loadData();
  window.addEventListener('show-add-modal', handleQuickAction);
  window.addEventListener('site-changed', handleSiteChange);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
  window.removeEventListener('site-changed', handleSiteChange);
});
</script>