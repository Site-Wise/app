<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('services.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('services.subtitle') }}
        </p>
      </div>
      <button @click="handleAddService" :disabled="!canCreateService" :class="[
        canCreateService ? 'btn-primary' : 'btn-disabled',
        'hidden md:flex items-center'
      ]"
        :title="!canCreateService ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
        data-keyboard-shortcut="n">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('services.addService') }}
      </button>
    </div>

    <!-- Search Box -->
    <div class="w-full md:w-96 mb-6" data-tour="search-bar">
      <SearchBox v-model="searchQuery" :placeholder="t('search.services')" :search-loading="searchLoading" />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <Loader2 class="h-8 w-8 animate-spin text-primary-600" />
    </div>

    <!-- Services Grid -->
    <div v-else-if="services && services.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="service in services" :key="service.id"
        class="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
        @click="viewServiceDetail(service.id!)">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <component :is="getServiceIcon(service.category)" class="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ service.name }}</h3>
              <span v-if="!service.is_active"
                class="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded-full">
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
                <span class="text-sm font-medium text-gray-900 dark:text-white capitalize">{{
                  t(`services.categories.${service.category}`) }}</span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('services.unit') }}:</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ service.unit }}</span>
              </div>

              <div v-if="service.standard_rate"
                class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.standardRate')
                }}:</span>
                <span class="text-lg font-bold text-primary-600 dark:text-primary-400">
                  ₹{{ service.standard_rate.toFixed(2) }}/{{ service.unit }}
                </span>
              </div>
            </div>

            <div v-if="service.description" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {{ service.description }}
            </div>

            <!-- Tags -->
            <div v-if="serviceTags.get(service.id!)?.length" class="mt-4">
              <div class="flex flex-wrap gap-1">
                <span v-for="tag in serviceTags.get(service.id!)" :key="tag.id"
                  class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white"
                  :style="{ backgroundColor: tag.color }">
                  {{ tag.name }}
                </span>
              </div>
            </div>

            <!-- Service Summary -->
            <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.totalBookings')
                }}</span>
                <span class="text-sm font-semibold text-blue-600 dark:text-blue-400">{{
                  getServiceBookingsCount(service.id!) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.avgRate') }}</span>
                <span class="text-sm font-semibold text-green-600 dark:text-green-400">₹{{
                  getServiceAverageRate(service.id!).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Desktop Action Buttons -->
          <div class="hidden lg:flex items-center space-x-2" @click.stop>
            <button @click="editService(service)" :disabled="!canUpdate" :class="[
              canUpdate
                ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
              'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
            ]" :title="t('common.edit')">
              <Edit2 class="h-4 w-4" />
            </button>
            <button @click="toggleServiceStatus(service)" :disabled="!canUpdate" :class="[
              canUpdate
                ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
              'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
            ]" :title="service.is_active ? t('services.deactivate') : t('services.activate')">
              <component :is="service.is_active ? EyeOff : Eye" class="h-4 w-4" />
            </button>
            <button @click="deleteService(service.id!)" :disabled="!canDelete" :class="[
              canDelete
                ? 'text-red-400 hover:text-red-600 dark:hover:text-red-300'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
              'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
            ]" :title="t('common.deleteAction')">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

        </div>
      </div>

    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <Wrench class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('services.noServices') }}</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('services.getStarted') }}</p>
      <button v-if="canCreateService" @click="handleAddService" class="mt-4 btn-primary">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('services.addService') }}
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingService"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]" @click="closeModal"
      @keydown.esc="closeModal" tabindex="-1">
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 mb-20 lg:mb-4"
        @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingService ? t('services.editService') : t('services.addService') }}
          </h3>

          <form @submit.prevent="saveService" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.serviceName')
              }}</label>
              <input ref="nameInputRef" v-model="form.name" type="text" required class="input mt-1"
                :placeholder="t('forms.enterServiceName')" autofocus />
            </div>

            <!-- <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.serviceType') }}</label>
              <input v-model="form.service_type" type="text" required class="input mt-1" :placeholder="t('forms.enterServiceType')" />
            </div> -->

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.category')
              }}</label>
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
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.unit')
                }}</label>
                <select v-model="form.unit" required class="input mt-1">
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
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.standardRate')
                }}</label>
                <input v-model.number="form.standard_rate" type="number" step="0.01" class="input mt-1"
                  :placeholder="t('forms.enterRate')" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.description')
              }}</label>
              <textarea v-model="form.description" class="input mt-1" rows="3"
                :placeholder="t('forms.enterServiceDescription')"></textarea>
            </div>

            <!-- Tags -->
            <TagSelector v-model="form.tags" :label="t('tags.serviceTags')" tag-type="service_category"
              :placeholder="t('tags.searchServiceTags')" />

            <div class="flex items-center">
              <input v-model="form.is_active" type="checkbox" id="is_active"
                class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
              <label for="is_active" class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ t('services.isActive')
              }}</label>
            </div>

            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="saveLoading" class="flex-1 btn-primary">
                <Loader2 v-if="saveLoading" class="mr-2 h-4 w-4 animate-spin" />
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
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useRouter } from 'vue-router';
import {
  Wrench,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Users,
  Truck,
  Briefcase,
  Car,
  Settings
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { usePermissions } from '../composables/usePermissions';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useSiteData } from '../composables/useSiteData';
import { useModalState } from '../composables/useModalState';
import TagSelector from '../components/TagSelector.vue';
import SearchBox from '../components/SearchBox.vue';
import {
  serviceService,
  serviceBookingService,
  tagService,
  type Service,
  type Tag as TagType
} from '../services/pocketbase';
import { useServiceSearch } from '../composables/useSearch';

const { t } = useI18n();
const { canUpdate, canDelete } = usePermissions();
const { success, error: showError } = useToast();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { openModal, closeModal: closeModalState } = useModalState();
const router = useRouter();

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults } = useServiceSearch();

// Use reactive site data management
const { data: servicesData, loading, reload: reloadServices } = useSiteData(
  async () => await serviceService.getAll()
);

const services = computed(() => searchQuery.value.trim() ? searchResults.value : (servicesData.value || []));

const { data: serviceBookings } = useSiteData(
  async () => await serviceBookingService.getAll()
);

const { data: allTags } = useSiteData(
  async () => await tagService.getAll()
);

const serviceTags = ref<Map<string, TagType[]>>(new Map());
const showAddModal = ref(false);
const editingService = ref<Service | null>(null);
const saveLoading = ref(false);
const nameInputRef = ref<HTMLInputElement>();

const canCreateService = computed(() => {
  return !isReadOnly.value && checkCreateLimit('services');
});


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
  return serviceBookings.value?.filter(booking => booking.service === serviceId).length || 0;
};

const getServiceAverageRate = (serviceId: string) => {
  if (!serviceBookings.value) return 0;

  const serviceBookingsForService = serviceBookings.value.filter(booking => booking.service === serviceId);
  if (serviceBookingsForService.length === 0) return 0;

  const totalAmount = serviceBookingsForService.reduce((sum, booking) => sum + booking.total_amount, 0);
  const totalDuration = serviceBookingsForService.reduce((sum, booking) => sum + booking.duration, 0);

  return totalDuration > 0 ? totalAmount / totalDuration : 0;
};

const viewServiceDetail = (serviceId: string) => {
  router.push(`/services/${serviceId}`);
};

// Watch for changes in services and tags to update tag mapping
watch([services, allTags], () => {
  if (services.value && allTags.value) {
    const tagMap = new Map<string, TagType[]>();
    for (const service of services.value) {
      if (service.tags && service.tags.length > 0) {
        const serviceTagObjects = allTags.value.filter(tag => service.tags!.includes(tag.id!));
        tagMap.set(service.id!, serviceTagObjects);
      }
    }
    serviceTags.value = tagMap;
  }
}, { immediate: true });

const saveService = async () => {
  saveLoading.value = true;
  try {
    if (editingService.value) {
      await serviceService.update(editingService.value.id!, form);
      success(t('messages.updateSuccess', { item: t('common.service') }));
    } else {
      if (!checkCreateLimit('services')) {
        showError(t('subscription.banner.freeTierLimitReached'));
        return;
      }
      await serviceService.create(form);
      success(t('messages.createSuccess', { item: t('common.service') }));
    }
    await reloadServices();
    closeModal();
  } catch (err) {
    console.error('Error saving service:', err);
    showError(t('messages.error'));
  } finally {
    saveLoading.value = false;
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
    tags: service.tags ? [...service.tags] : [],
    is_active: service.is_active
  });
  showAddModal.value = true;
  openModal('services-edit-modal');
};

const toggleServiceStatus = async (service: Service) => {
  try {
    await serviceService.update(service.id!, { is_active: !service.is_active });
    await reloadServices();
  } catch (err) {
    console.error('Error updating service status:', err);
    showError(t('messages.error'));
  }
};

const deleteService = async (id: string) => {
  if (confirm(t('messages.confirmDelete', { item: t('services.service') }))) {
    try {
      await serviceService.delete(id);
      await reloadServices();
    } catch (err) {
      console.error('Error deleting service:', err);
      showError(t('messages.error'));
    }
  }
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
  closeModalState('services-add-modal');
  closeModalState('services-edit-modal');
};


const handleAddService = async () => {
  if (!canCreateService.value) {
    showError(t('subscription.banner.freeTierLimitReached'));
    return;
  }

  showAddModal.value = true;
  openModal('services-add-modal');
  await nextTick();
  nameInputRef.value?.focus();
};

const handleQuickAction = async () => {
  if (canCreateService.value) {
    showAddModal.value = true;
    openModal('services-add-modal');
    await nextTick();
    nameInputRef.value?.focus();
  }
};


const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    handleAddService();
  }
};

// Event listeners using @vueuse/core
useEventListener(window, 'show-add-modal', handleQuickAction);
useEventListener(window, 'keydown', handleKeyboardShortcut);
</script>