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
          'hidden md:flex items-center'
        ]"
        :title="!canCreateVendor ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('vendors.addVendor') }}
      </button>
    </div>

    <!-- Search Box -->
    <div class="mb-6">
      <div class="max-w-md">
        <SearchBox
          v-model="searchQuery"
          :placeholder="t('search.vendors')"
          :search-loading="searchLoading"
        />
      </div>
    </div>

    <!-- Vendors Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="vendor in vendors" :key="vendor.id" class="card hover:shadow-md transition-shadow duration-200 cursor-pointer" @click="viewVendorDetail(vendor.id!)">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ vendor.contact_person || vendor.name || 'Unnamed Vendor' }}</h3>
            <div v-if="vendor.name && vendor.contact_person" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {{ vendor.name }}
            </div>
            <div class="mt-2 space-y-1">
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
            
            <!-- Tags -->
            <div v-if="vendorTags.get(vendor.id!)?.length" class="mt-4">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="tag in vendorTags.get(vendor.id!)"
                  :key="tag.id"
                  class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white"
                  :style="{ backgroundColor: tag.color }"
                >
                  {{ tag.name }}
                </span>
              </div>
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
    <div v-if="showAddModal || editingVendor" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingVendor ? t('vendors.editVendor') : t('vendors.addVendor') }}
          </h3>
          
          <form @submit.prevent="saveVendor" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.contactPerson') }}</label>
              <input ref="firstInputRef" v-model="form.contact_person" type="text" class="input mt-1" :placeholder="t('forms.enterContactPerson')" autofocus />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.companyName') }}</label>
              <input v-model="form.name" type="text" class="input mt-1" :placeholder="t('forms.enterCompanyName')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.paymentDetails') }}</label>
              <textarea v-model="form.payment_details" class="input mt-1" rows="2" :placeholder="t('forms.enterPaymentDetails')"></textarea>
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
            
            <!-- Tags -->
            <TagSelector
              v-model="form.tags"
              :label="t('tags.vendorTags')"
              tag-type="specialty"
              :placeholder="t('tags.searchVendorTags')"
            />
            
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
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Users, Plus, Edit2, Trash2, Loader2, Mail, Phone, MapPin } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useSiteData } from '../composables/useSiteData';
import TagSelector from '../components/TagSelector.vue';
import SearchBox from '../components/SearchBox.vue';
import { useVendorSearch } from '../composables/useSearch';
import {
  vendorService,
  deliveryService,
  serviceBookingService,
  paymentService,
  tagService,
  type Vendor,
  type Delivery,
  type ServiceBooking,
  type Payment,
  type Tag as TagType
} from '../services/pocketbase';
import { usePermissions } from '../composables/usePermissions';

const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error } = useToast();
const { canDelete } = usePermissions();

const router = useRouter();

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults } = useVendorSearch();

// Use site data management
const { data: vendorsData, reload: reloadVendors } = useSiteData(
  async () => await vendorService.getAll()
);

const { data: deliveriesData } = useSiteData(
  async () => await deliveryService.getAll()
);

const { data: serviceBookingsData } = useSiteData(
  async () => await serviceBookingService.getAll()
);

const { data: paymentsData } = useSiteData(
  async () => await paymentService.getAll()
);

const { data: allTagsData } = useSiteData(
  async () => await tagService.getAll()
);

// Computed properties from useSiteData
const vendors = computed(() => searchQuery.value.trim() ? searchResults.value : (vendorsData.value || []));
const deliveries = computed(() => deliveriesData.value || []);
const serviceBookings = computed(() => serviceBookingsData.value || []);
const payments = computed(() => paymentsData.value || []);
const vendorTags = ref<Map<string, TagType[]>>(new Map());
const showAddModal = ref(false);
const editingVendor = ref<Vendor | null>(null);
const loading = ref(false);

const firstInputRef = ref<HTMLInputElement>();

const canCreateVendor = computed(() => {
  return !isReadOnly && checkCreateLimit('vendors');
});

const canEditDelete = computed(() => {
  return !isReadOnly && canDelete.value;
});

const form = reactive({
  contact_person: '',
  name: '',
  payment_details: '',
  email: '',
  phone: '',
  address: '',
  tags: [] as string[]
});

const getVendorOutstanding = (vendorId: string) => {
  // Include deliveries outstanding
  const deliveriesOutstanding = deliveries.value
    ?.filter((delivery: Delivery) => delivery.vendor === vendorId)
    ?.reduce((sum: number, delivery: Delivery) => {
      const outstanding = delivery.total_amount - delivery.paid_amount;
      return sum + (outstanding > 0 ? outstanding : 0);
    }, 0) || 0;
  
  // Include service bookings outstanding
  const serviceOutstanding = serviceBookings.value
    ?.filter((booking: ServiceBooking) => booking.vendor === vendorId)
    ?.reduce((sum: number, booking: ServiceBooking) => {
      const outstanding = booking.total_amount - booking.paid_amount;
      return sum + (outstanding > 0 ? outstanding : 0);
    }, 0) || 0;
    
  return deliveriesOutstanding + serviceOutstanding;
};

const getVendorPaid = (vendorId: string) => {
  return payments.value
    ?.filter((payment: Payment) => payment.vendor === vendorId)
    ?.reduce((sum: number, payment: Payment) => sum + payment.amount, 0) || 0;
};

const viewVendorDetail = (vendorId: string) => {
  try {
    router.push(`/vendors/${vendorId}`);
  } catch (error) {
    console.error('Navigation error:', error);
  }
};

// Watch for changes in vendors and tags to update tag mapping
const updateVendorTags = () => {
  if (vendors.value && allTagsData.value) {
    const tagMap = new Map<string, TagType[]>();
    for (const vendor of vendors.value) {
      if (vendor.tags && vendor.tags.length > 0) {
        const vendorTagObjects = allTagsData.value.filter(tag => vendor.tags!.includes(tag.id!));
        tagMap.set(vendor.id!, vendorTagObjects);
      }
    }
    vendorTags.value = tagMap;
  }
};

// Watch for data changes to update tags
const watchForTagUpdates = () => {
  if (vendors.value && allTagsData.value) {
    updateVendorTags();
  }
};

const reloadAllData = async () => {
  await reloadVendors();
  // Other data will be reloaded automatically by useSiteData
};

const handleAddVendor = async () => {
  if (!canCreateVendor) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  showAddModal.value = true;
  await nextTick();
  firstInputRef.value?.focus();
};

const saveVendor = async () => {
  // Validation: require either contact_person or name
  if (!form.contact_person.trim() && !form.name.trim()) {
    error('Please provide either a contact person or company name');
    return;
  }
  
  loading.value = true;
  try {
    if (editingVendor.value) {
      await vendorService.update(editingVendor.value.id!, form);
      success(t('messages.updateSuccess', { item: t('common.vendor') }));
    } else {
      if (!checkCreateLimit('vendors')) {
        error(t('subscription.banner.freeTierLimitReached'));
        return;
      }
      await vendorService.create(form);
      success(t('messages.createSuccess', { item: t('common.vendor') }));
      // Usage is automatically incremented by PocketBase hooks
    }
    await reloadAllData();
    closeModal();
  } catch (err) {
    console.error('Error saving vendor:', err);
    error(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const editVendor = (vendor: Vendor) => {
  editingVendor.value = vendor;
  Object.assign(form, {
    contact_person: vendor.contact_person || '',
    name: vendor.name || '',
    payment_details: vendor.payment_details || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    address: vendor.address || '',
    tags: vendor.tags ? [...vendor.tags] : []
  });
};

const deleteVendor = async (id: string) => {
  if (!canEditDelete.value) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  if (confirm(t('messages.confirmDelete', { item: t('common.vendor') }))) {
    try {
      await vendorService.delete(id);
      success(t('messages.deleteSuccess', { item: t('common.vendor') }));
      await reloadAllData();
      // Usage is automatically decremented by PocketBase hooks
    } catch (err) {
      console.error('Error deleting vendor:', err);
      error(t('messages.error'));
    }
  }
};


const closeModal = () => {
  showAddModal.value = false;
  editingVendor.value = null;
  Object.assign(form, {
    contact_person: '',
    name: '',
    payment_details: '',
    email: '',
    phone: '',
    address: '',
    tags: []
  });
};

const handleQuickAction = async () => {
  showAddModal.value = true;
  await nextTick();
  firstInputRef.value?.focus();
};

// Site change is handled automatically by useSiteData

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    handleAddVendor();
  }
};

onMounted(() => {
  // Data loading is handled automatically by useSiteData
  // Set up watchers for tag updates
  setTimeout(watchForTagUpdates, 100);
  window.addEventListener('show-add-modal', handleQuickAction);
  window.addEventListener('keydown', handleKeyboardShortcut);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
  window.removeEventListener('keydown', handleKeyboardShortcut);
});

// Watch for changes in vendors and tags to update mapping
computed(() => {
  watchForTagUpdates();
  return null;
});
</script>