<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('services.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('services.subtitle') }}
        </p>
      </div>
      <button @click="showAddModal = true" class="btn-primary hidden md:flex items-center" v-if="canCreate">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('services.addService') }}
      </button>
    </div>

    <!-- Services Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="service in services" :key="service.id" class="card hover:shadow-md transition-shadow duration-200 cursor-pointer" @click="viewServiceDetail(service.id!)">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <component :is="getServiceIcon(service.category)" class="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ service.name }}</h3>
              <span v-if="!service.is_active" class="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded-full">
                {{ t('common.inactive') }}
              </span>
            </div>
            
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('services.serviceType') }}:</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ service.service_type }}</span>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('services.category') }}:</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white capitalize">{{ t(`services.categories.${service.category}`) }}</span>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('services.unit') }}:</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ service.unit }}</span>
              </div>
              
              <div v-if="service.standard_rate" class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.standardRate') }}:</span>
                <span class="text-lg font-bold text-primary-600 dark:text-primary-400">
                  ₹{{ service.standard_rate.toFixed(2) }}/{{ service.unit }}
                </span>
              </div>
            </div>
            
            <div v-if="service.description" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {{ service.description }}
            </div>

            <div v-if="service.tags && service.tags.length > 0" class="mt-4 flex flex-wrap gap-1">
              <span v-for="tag in service.tags" :key="tag" class="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-xs rounded-full">
                {{ tag }}
              </span>
            </div>

            <!-- Service Summary -->
            <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.totalBookings') }}</span>
                <span class="text-sm font-semibold text-blue-600 dark:text-blue-400">{{ getServiceBookingsCount(service.id!) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.avgRate') }}</span>
                <span class="text-sm font-semibold text-green-600 dark:text-green-400">₹{{ getServiceAverageRate(service.id!).toFixed(2) }}</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2 ml-4" @click.stop v-if="canUpdate || canDelete">
            <button @click="editService(service)" class="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" :title="t('common.edit')" v-if="canUpdate">
              <Edit2 class="h-4 w-4" />
            </button>
            <button @click="toggleServiceStatus(service)" class="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" :title="service.is_active ? t('services.deactivate') : t('services.activate')" v-if="canUpdate">
              <EyeOff class="h-4 w-4" v-if="service.is_active"></EyeOff>
              <Eye class="h-4 w-4" v-if="!service.is_active"></Eye>
            </button>
            <button @click="deleteService(service.id!)" class="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" :title="t('common.delete')" v-if="canDelete">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="services.length === 0" class="col-span-full">
        <div class="text-center py-12">
          <Wrench class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('services.noServices') }}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('services.getStarted') }}</p>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Wrench class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-blue-700 dark:text-blue-300">{{ t('services.totalServices') }}</p>
            <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ activeServicesCount }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Users class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-green-700 dark:text-green-300">{{ t('services.laborServices') }}</p>
            <p class="text-2xl font-bold text-green-900 dark:text-green-100">{{ laborServicesCount }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Truck class="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-yellow-700 dark:text-yellow-300">{{ t('services.equipmentServices') }}</p>
            <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{{ equipmentServicesCount }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Calendar class="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-purple-700 dark:text-purple-300">{{ t('services.totalBookings') }}</p>
            <p class="text-2xl font-bold text-purple-900 dark:text-purple-100">{{ totalBookingsCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingService" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingService ? t('services.editService') : t('services.addService') }}
          </h3>
          
          <form @submit.prevent="saveService" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.serviceName') }}</label>
              <input v-model="form.name" type="text" required class="input mt-1" :placeholder="t('forms.enterServiceName')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.serviceType') }}</label>
              <input v-model="form.service_type" type="text" required class="input mt-1" :placeholder="t('forms.enterServiceType')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.category') }}</label>
              <select v-model="form.category" required class="input mt-1">
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
                <select v-model="form.unit" required class="input mt-1">
                  <option value="">{{ t('forms.selectUnit') }}</option>
                  <option value="hour">{{ t('services.units.hour') }}</option>
                  <option value="day">{{ t('services.units.day') }}</option>
                  <option value="job">{{ t('services.units.job') }}</option>
                  <option value="sqft">{{ t('services.units.sqft') }}</option>
                  <option value="month">{{ t('services.units.month') }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.standardRate') }}</label>
                <input v-model.number="form.standard_rate" type="number" step="0.01" class="input mt-1" :placeholder="t('forms.enterRate')" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.description') }}</label>
              <textarea v-model="form.description" class="input mt-1" rows="3" :placeholder="t('forms.enterServiceDescription')"></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('common.tags') }}</label>
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
                  :placeholder="t('services.addTag')"
                  @keydown.enter.prevent="addTag"
                />
                <button type="button" @click="addTag" class="ml-2 btn-outline">
                  <Plus class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div class="flex items-center">
              <input v-model="form.is_active" type="checkbox" id="is_active" class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
              <label for="is_active" class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ t('services.isActive') }}</label>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingService ? t('common.update') : t('common.create') }}
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
import { 
  Wrench, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  Eye, 
  EyeOff, 
  X,
  Users,
  Truck,
  Calendar,
  Briefcase,
  Car,
  Settings
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { usePermissions } from '../composables/usePermissions';
import { 
  serviceService, 
  serviceBookingService,
  type Service,
  type ServiceBooking
} from '../services/pocketbase';

const { t } = useI18n();
const { canCreate, canUpdate, canDelete } = usePermissions();
const router = useRouter();

const services = ref<Service[]>([]);
const serviceBookings = ref<ServiceBooking[]>([]);
const showAddModal = ref(false);
const editingService = ref<Service | null>(null);
const loading = ref(false);
const newTag = ref('');

const form = reactive({
  name: '',
  service_type: '',
  category: '' as Service['category'],
  unit: '',
  standard_rate: 0,
  description: '',
  tags: [] as string[],
  is_active: true
});

const activeServicesCount = computed(() => {
  return services.value.filter(service => service.is_active).length;
});

const laborServicesCount = computed(() => {
  return services.value.filter(service => service.category === 'labor' && service.is_active).length;
});

const equipmentServicesCount = computed(() => {
  return services.value.filter(service => service.category === 'equipment' && service.is_active).length;
});

const totalBookingsCount = computed(() => {
  return serviceBookings.value.length;
});

const getServiceIcon = (category: Service['category']) => {
  const icons = {
    labor: Users,
    equipment: Truck,
    professional: Briefcase,
    transport: Car,
    other: Settings
  };
  return icons[category] || Wrench;
};

const getServiceBookingsCount = (serviceId: string) => {
  return serviceBookings.value.filter(booking => booking.service === serviceId).length;
};

const getServiceAverageRate = (serviceId: string) => {
  const serviceBookingsForService = serviceBookings.value.filter(booking => booking.service === serviceId);
  if (serviceBookingsForService.length === 0) return 0;
  
  const totalAmount = serviceBookingsForService.reduce((sum, booking) => sum + booking.total_amount, 0);
  const totalDuration = serviceBookingsForService.reduce((sum, booking) => sum + booking.duration, 0);
  
  return totalDuration > 0 ? totalAmount / totalDuration : 0;
};

const viewServiceDetail = (serviceId: string) => {
  router.push(`/services/${serviceId}`);
};

const loadData = async () => {
  try {
    const [servicesData, bookingsData] = await Promise.all([
      serviceService.getAll(),
      serviceBookingService.getAll()
    ]);
    
    services.value = servicesData;
    serviceBookings.value = bookingsData;
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const saveService = async () => {
  loading.value = true;
  try {
    if (editingService.value) {
      await serviceService.update(editingService.value.id!, form);
    } else {
      await serviceService.create(form);
    }
    await loadData();
    closeModal();
  } catch (error) {
    console.error('Error saving service:', error);
    alert(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const editService = (service: Service) => {
  editingService.value = service;
  Object.assign(form, {
    name: service.name,
    service_type: service.service_type,
    category: service.category,
    unit: service.unit,
    standard_rate: service.standard_rate || 0,
    description: service.description || '',
    tags: [...service.tags],
    is_active: service.is_active
  });
};

const toggleServiceStatus = async (service: Service) => {
  try {
    await serviceService.update(service.id!, { is_active: !service.is_active });
    await loadData();
  } catch (error) {
    console.error('Error updating service status:', error);
    alert(t('messages.error'));
  }
};

const deleteService = async (id: string) => {
  if (confirm(t('messages.confirmDelete', { item: t('services.service') }))) {
    try {
      await serviceService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert(t('messages.error'));
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
  editingService.value = null;
  Object.assign(form, {
    name: '',
    service_type: '',
    category: '',
    unit: '',
    standard_rate: 0,
    description: '',
    tags: [],
    is_active: true
  });
  newTag.value = '';
};

const handleQuickAction = () => {
  if (canCreate.value) {
    showAddModal.value = true;
  }
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