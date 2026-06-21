<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="sw-h2 font-display text-ink dark:text-cream">{{ t('services.title') }}</h1>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
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
      <Loader2 class="h-8 w-8 animate-spin text-amber-500" />
    </div>

    <!-- Services Grid -->
    <div v-else-if="services && services.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      <div v-for="service in services" :key="service.id"
        class="card card-interactive group flex flex-col cursor-pointer"
        @click="viewServiceDetail(service.id!)">

        <!-- Card Header -->
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <!-- Title row: icon + name + inactive badge -->
            <div class="flex items-center gap-2 mb-1">
              <component :is="getServiceIcon(service.category)" class="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
              <h3 class="font-display text-lg font-semibold tracking-tight text-ink dark:text-cream truncate leading-snug">{{ service.name }}</h3>
              <span v-if="!service.is_active" class="sw-badge sw-badge--danger shrink-0">
                {{ t('common.inactive') }}
              </span>
            </div>
            <!-- Secondary meta line: category · unit -->
            <p class="text-sm text-stone-500 dark:text-stone-400 truncate">
              {{ t(`services.categories.${service.category}`) }}
              <span v-if="service.unit" class="mx-1 text-stone-300 dark:text-stone-600">&middot;</span>
              <span v-if="service.unit">{{ service.unit }}</span>
            </p>
          </div>

          <!-- Desktop Action Buttons (ghost, reveal on group-hover) -->
          <div class="hidden lg:flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 ease-snap" @click.stop>
            <button @click="editService(service)" :disabled="!canUpdate" :class="[
              canUpdate
                ? 'text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4'
                : 'text-stone-300 dark:text-stone-600 cursor-not-allowed',
              'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors duration-150 ease-snap'
            ]" :title="t('common.edit')">
              <Edit2 class="h-4 w-4" />
            </button>
            <button @click="toggleServiceStatus(service)" :disabled="!canUpdate" :class="[
              canUpdate
                ? 'text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4'
                : 'text-stone-300 dark:text-stone-600 cursor-not-allowed',
              'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors duration-150 ease-snap'
            ]" :title="service.is_active ? t('services.deactivate') : t('services.activate')">
              <component :is="service.is_active ? EyeOff : Eye" class="h-4 w-4" />
            </button>
            <button @click="deleteService(service.id!)" :disabled="!canDelete" :class="[
              canDelete
                ? 'text-clay-500 hover:text-clay-600 dark:hover:text-clay-400 hover:bg-stone-100 dark:hover:bg-ink-4'
                : 'text-stone-300 dark:text-stone-600 cursor-not-allowed',
              'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors duration-150 ease-snap'
            ]" :title="t('common.deleteAction')">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Mobile Dropdown Menu -->
          <div class="lg:hidden ml-2 shrink-0" @click.stop>
            <CardDropdownMenu :actions="getServiceActions(service)" @action="handleServiceAction(service, $event)" />
          </div>
        </div>

        <!-- Description -->
        <p v-if="service.description" class="mt-2 text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
          {{ service.description }}
        </p>

        <!-- Tags -->
        <div v-if="serviceTags.get(service.id!)?.length" class="mt-3 flex flex-wrap gap-1.5">
          <span v-for="tag in serviceTags.get(service.id!)" :key="tag.id"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 dark:bg-ink-4 text-stone-700 dark:text-stone-300">
            <span class="h-2 w-2 rounded-[2px] shrink-0" :style="{ backgroundColor: tag.color }"></span>
            {{ tag.name }}
          </span>
        </div>

        <!-- Stat Strip Footer (pinned to bottom) -->
        <div class="mt-auto pt-4 border-t border-stone-200 dark:border-ink-4 flex items-end justify-between gap-4">
          <!-- HERO: Standard Rate -->
          <div>
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-0.5">{{ t('services.standardRate') }}</p>
            <p v-if="service.standard_rate" class="sw-stat font-mono sw-tabular text-amber-700 dark:text-amber-400 leading-none">
              ₹{{ service.standard_rate.toLocaleString('en-IN') }}<span class="text-xs font-normal text-stone-400 dark:text-stone-500 ml-0.5">/{{ service.unit }}</span>
            </p>
            <p v-else class="text-base font-mono sw-tabular text-stone-400 dark:text-stone-500 leading-none">—</p>
          </div>
          <!-- SECONDARY: Bookings count + Avg Rate -->
          <div class="text-right">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-0.5">{{ t('services.totalBookings') }}</p>
            <p class="text-base font-mono sw-tabular font-semibold text-ink dark:text-cream leading-none">
              {{ getServiceBookingsCount(service.id!) }}
            </p>
          </div>
        </div>

      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-16 text-center">
      <Wrench class="h-12 w-12 text-stone-300 dark:text-stone-600 mb-4" />
      <h3 class="font-display text-lg font-semibold tracking-tight text-ink dark:text-cream mb-1">{{ t('services.noServices') }}</h3>
      <p class="text-sm text-stone-500 dark:text-stone-400 max-w-xs">{{ t('services.getStarted') }}</p>
      <button v-if="canCreateService" @click="handleAddService" class="mt-6 btn-primary">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('services.addService') }}
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingService"
      class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60"
      @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div
        class="w-full sm:max-w-lg bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
        @click.stop>

        <!-- Grab handle (mobile only) -->
        <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden"></div>

        <!-- Sticky header -->
        <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3">
          <span class="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-amber-500/15">
            <Wrench class="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </span>
          <div>
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ editingService ? t('common.edit') : t('common.create') }}</p>
            <h3 class="font-display text-lg font-semibold text-ink dark:text-cream leading-tight">{{ editingService ? t('services.editService') : t('services.addService') }}</h3>
          </div>
          <button type="button" @click="closeModal"
            class="ml-auto h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors"
            aria-label="Close">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="saveService" class="flex flex-col flex-1 overflow-hidden">
          <!-- Scrollable body -->
          <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('services.serviceName')
              }}</label>
              <input ref="nameInputRef" v-model="form.name" type="text" required class="input mt-1"
                :placeholder="t('forms.enterServiceName')" autofocus />
            </div>

            <!-- <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('services.serviceType') }}</label>
              <input v-model="form.service_type" type="text" required class="input mt-1" :placeholder="t('forms.enterServiceType')" />
            </div> -->

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('services.category')
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
                <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('services.unit')
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
                <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('services.standardRate')
                }}</label>
                <input v-model.number="form.standard_rate" type="number" step="0.01" class="input mt-1"
                  :placeholder="t('forms.enterRate')" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.description')
              }}</label>
              <textarea v-model="form.description" class="input mt-1" rows="3"
                :placeholder="t('forms.enterServiceDescription')"></textarea>
            </div>

            <!-- Tags -->
            <TagSelector v-model="form.tags" :label="t('tags.serviceTags')" tag-type="service_category"
              :placeholder="t('tags.searchServiceTags')" />

            <div class="flex items-center">
              <input v-model="form.is_active" type="checkbox" id="is_active"
                class="rounded-md border-stone-300 dark:border-ink-4 text-amber-600 focus:ring-amber-500" />
              <label for="is_active" class="ml-2 text-sm text-stone-700 dark:text-stone-300">{{ t('services.isActive')
              }}</label>
            </div>
          </div>

          <!-- Sticky footer -->
          <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
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
  Settings,
  X
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { usePermissions } from '../composables/usePermissions';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useSiteData } from '../composables/useSiteData';
import { useQuickActionModal } from '../composables/useQuickActionModal';
import { useModalState } from '../composables/useModalState';
import TagSelector from '../components/TagSelector.vue';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
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

const getServiceActions = (service: Service) => {
  return [
    {
      key: 'edit',
      label: t('common.edit'),
      icon: Edit2,
      variant: 'default' as const,
      hidden: !canUpdate.value
    },
    {
      key: 'toggle-status',
      label: service.is_active ? t('services.deactivate') : t('services.activate'),
      icon: service.is_active ? EyeOff : Eye,
      variant: 'default' as const,
      hidden: !canUpdate.value
    },
    {
      key: 'delete',
      label: t('common.deleteAction'),
      icon: Trash2,
      variant: 'danger' as const,
      disabled: !canDelete
    }
  ];
};

const handleServiceAction = (service: Service, action: string) => {
  switch (action) {
    case 'edit':
      editService(service);
      break;
    case 'toggle-status':
      toggleServiceStatus(service);
      break;
    case 'delete':
      deleteService(service.id!);
      break;
  }
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
useQuickActionModal(handleQuickAction);
useEventListener(window, 'keydown', handleKeyboardShortcut);
</script>