<template>
  <div>
    <!-- Desktop Header with Add Button -->
    <div class="hidden md:flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('delivery.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('delivery.subtitle') }}
        </p>
      </div>
      <button 
        @click="handleAddDelivery" 
        :disabled="!canCreateDelivery"
        :class="[
          canCreateDelivery ? 'btn-primary' : 'btn-disabled',
          'hidden md:flex items-center'
        ]"
        :title="!canCreateDelivery ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
        data-keyboard-shortcut="n"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('delivery.recordDelivery') }}
      </button>
    </div>

    <!-- Mobile Header with Search -->
    <div class="md:hidden mb-6">
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('delivery.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('delivery.subtitle') }}
        </p>
      </div>
      
      <!-- Mobile Search Box -->
      <SearchBox
        v-model="searchQuery"
        :placeholder="t('search.delivery')"
        :search-loading="searchLoading"
      />
    </div>

    <!-- Desktop Search (if needed) -->
    <div class="hidden md:block mb-6">
      <div class="max-w-md">
        <SearchBox
          v-model="searchQuery"
          :placeholder="t('search.delivery')"
          :search-loading="searchLoading"
        />
      </div>
    </div>

    <!-- Table Desktop View -->
    <div class="hidden lg:block">
      <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <!-- Desktop Table Headers -->
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ t('common.vendor') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ t('delivery.reference') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ t('delivery.itemCount') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ t('common.total') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ t('delivery.paymentStatus') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ t('delivery.deliveryDate') }}
              </th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">{{ t('common.actions') }}</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-if="loading" class="border-b border-gray-200 dark:border-gray-700">
              <td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                <Loader2 class="w-6 h-6 animate-spin mx-auto" />
              </td>
            </tr>
            <tr v-else-if="deliveries.length === 0" class="border-b border-gray-200 dark:border-gray-700">
              <td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                {{ searchQuery.trim() ? t('delivery.noSearchResults') : t('delivery.noDeliveries') }}
              </td>
            </tr>
            <tr v-else v-for="delivery in deliveries" :key="delivery.id" 
                class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ delivery.expand?.vendor?.name || 'Unknown Vendor' }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ delivery.delivery_reference || '-' }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ delivery.expand?.delivery_items?.length || 0 }} {{ t('delivery.items') }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  ₹{{ delivery.total_amount.toFixed(2) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="`status-${delivery.payment_status}`">
                  {{ t(`common.${delivery.payment_status}`) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ formatDate(delivery.delivery_date) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <!-- Desktop Action Buttons -->
                <div class="hidden lg:flex items-center space-x-2" @click.stop>
                  <button 
                    @click="viewDelivery(delivery)" 
                    class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    :title="t('common.view')"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button 
                    v-if="canEditDelete && delivery.payment_status === 'pending'" 
                    @click="editDelivery(delivery)" 
                    class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    :title="t('common.edit')"
                  >
                    <Edit2 class="h-4 w-4" />
                  </button>
                  <button 
                    v-if="canEditDelete && delivery.payment_status === 'pending'" 
                    @click="deleteDelivery(delivery)" 
                    class="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    :title="t('common.delete')"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>

                <!-- Mobile Dropdown Menu -->
                <div class="lg:hidden">
                  <CardDropdownMenu
                    :actions="getDeliveryActions(delivery)"
                    @action="handleDeliveryAction(delivery, $event)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile/Tablet List View -->
    <div class="lg:hidden">
      <div class="space-y-4">
        <div v-if="loading" class="text-center py-8">
          <Loader2 class="w-8 h-8 animate-spin mx-auto text-gray-400" />
        </div>
        <div v-else-if="deliveries.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          {{ searchQuery.trim() ? t('delivery.noSearchResults') : t('delivery.noDeliveries') }}
        </div>
        <div v-else v-for="delivery in deliveries" :key="delivery.id" 
             class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          
          <!-- Mobile Card Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ delivery.expand?.vendor?.name || 'Unknown Vendor' }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ formatDate(delivery.delivery_date) }}
                <span v-if="delivery.delivery_reference" class="ml-2">
                  • Ref: {{ delivery.delivery_reference }}
                </span>
              </p>
            </div>
            
            <!-- Mobile Actions Menu -->
            <div class="relative">
              <CardDropdownMenu
                :actions="getDeliveryActions(delivery)"
                @action="handleDeliveryAction(delivery, $event)"
              />
            </div>
          </div>

          <!-- Mobile Card Content -->
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ t('delivery.itemCount') }}:</span>
              <span class="ml-1 text-gray-900 dark:text-white font-medium">
                {{ delivery.expand?.delivery_items?.length || 0 }}
              </span>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ t('common.total') }}:</span>
              <span class="ml-1 text-gray-900 dark:text-white font-medium">
                ₹{{ delivery.total_amount.toFixed(2) }}
              </span>
            </div>
            <div class="col-span-2">
              <span class="text-gray-500 dark:text-gray-400">{{ t('delivery.paymentStatus') }}:</span>
              <span :class="`ml-1 status-${delivery.payment_status}`">
                {{ t(`common.${delivery.payment_status}`) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Multi-Item Delivery Modal -->
    <MultiItemDeliveryModal
      v-if="showAddModal"
      :editing-delivery="editingDelivery || undefined"
      @close="closeAddModal"
      @saved="handleDeliverySaved"
      @success="handleDeliveryEditSuccess"
    />

    <!-- View Modal -->
    <div v-if="viewingDelivery" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @keydown.esc="viewingDelivery = null" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('delivery.deliveryDetails') }}</h3>
            <button @click="viewingDelivery = null" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Delivery Information -->
            <div class="space-y-4">
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingDelivery.expand?.vendor?.name || 'Unknown Vendor' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('delivery.deliveryDate') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ formatDate(viewingDelivery.delivery_date) }}</span>
              </div>
              <div v-if="viewingDelivery.delivery_reference">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('delivery.reference') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingDelivery.delivery_reference }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.total') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">₹{{ viewingDelivery.total_amount.toFixed(2) }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('delivery.paymentStatus') }}:</span>
                <span :class="`ml-2 status-${viewingDelivery.payment_status}`">
                  {{ t(`common.${viewingDelivery.payment_status}`) }}
                </span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('delivery.paidAmount') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">₹{{ viewingDelivery.paid_amount.toFixed(2) }}</span>
              </div>
              <div v-if="viewingDelivery.notes">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.notes') }}:</span>
                <p class="ml-2 text-gray-600 dark:text-gray-400 mt-1">{{ viewingDelivery.notes }}</p>
              </div>
            </div>

            <!-- Photos -->
            <div>
              <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-3">{{ t('delivery.photos') }}</h4>
              <div v-if="viewingDelivery.photos && viewingDelivery.photos.length > 0" class="grid grid-cols-2 gap-4">
                <img
                  v-for="(photo, index) in viewingDelivery.photos"
                  :key="index"
                  :src="getPhotoUrl(viewingDelivery.id!, photo)"
                  :alt="`Photo ${index + 1}`"
                  class="w-full h-32 object-cover rounded-lg cursor-pointer border border-gray-200 dark:border-gray-600"
                  @click="openPhotoGallery(viewingDelivery, index)"
                />
              </div>
              <div v-else class="text-gray-500 dark:text-gray-400">
                {{ t('delivery.noPhotos') }}
              </div>
            </div>
          </div>

          <!-- Delivery Items -->
          <div class="mt-6">
            <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-3">{{ t('delivery.items') }}</h4>
            
            <!-- Loading state -->
            <div v-if="loadingDeliveryDetails" class="flex justify-center py-8">
              <Loader2 class="w-6 h-6 animate-spin text-gray-400" />
            </div>
            
            <!-- Items table -->
            <div v-else class="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {{ t('common.item') }}
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {{ t('common.quantity') }}
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {{ t('delivery.unitPrice') }}
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {{ t('common.total') }}
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {{ t('returns.returnStatus') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr v-if="!viewingDelivery.expand?.delivery_items || viewingDelivery.expand.delivery_items.length === 0">
                    <td colspan="5" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div class="space-y-2">
                        <div>{{ t('delivery.noItemsInDelivery') }}</div>
                        <div class="text-xs">
                          {{ t('delivery.oldDataNotice') }}
                        </div>
                        <div v-if="isDev" class="text-xs mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                          <div>Debug Info:</div>
                          <div>Delivery ID: {{ viewingDelivery.id }}</div>
                          <div>Has expand: {{ !!viewingDelivery.expand }}</div>
                          <div>Has delivery_items: {{ !!viewingDelivery.expand?.delivery_items }}</div>
                          <div>Items count: {{ viewingDelivery.expand?.delivery_items?.length || 0 }}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr v-else v-for="deliveryItem in viewingDelivery.expand.delivery_items" :key="deliveryItem.id">
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      <div>{{ deliveryItem.expand?.item?.name || 'Unknown Item' }}</div>
                      <div v-if="deliveryItem.notes" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {{ deliveryItem.notes }}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {{ deliveryItem.quantity }} {{ getUnitDisplay(deliveryItem.expand?.item?.unit || 'units') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      ₹{{ deliveryItem.unit_price.toFixed(2) }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      ₹{{ deliveryItem.total_amount.toFixed(2) }}
                    </td>
                    <td class="px-4 py-3 text-sm">
                      <div v-if="returnInfo[deliveryItem.id!]" class="space-y-1">
                        <div v-if="returnInfo[deliveryItem.id!].totalReturned > 0" class="text-red-600 dark:text-red-400 text-xs">
                          {{ returnInfo[deliveryItem.id!].totalReturned }} returned
                        </div>
                        <div v-if="returnInfo[deliveryItem.id!].availableForReturn > 0" class="text-green-600 dark:text-green-400 text-xs">
                          {{ returnInfo[deliveryItem.id!].availableForReturn }} available
                        </div>
                        <div v-if="returnInfo[deliveryItem.id!].returns.length > 0" class="text-blue-600 dark:text-blue-400 text-xs cursor-pointer hover:underline" @click="showReturnDetails(deliveryItem.id!)">
                          {{ returnInfo[deliveryItem.id!].returns.length }} return(s)
                        </div>
                        <div v-if="returnInfo[deliveryItem.id!].totalReturned === 0 && returnInfo[deliveryItem.id!].availableForReturn === deliveryItem.quantity" class="text-gray-500 dark:text-gray-400 text-xs">
                          No returns
                        </div>
                      </div>
                      <div v-else class="text-gray-400 text-xs">
                        Loading...
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Photo Gallery -->
    <PhotoGallery
      v-if="showPhotoGallery && galleryDelivery"
      :photos="getPhotoUrls(galleryDelivery)"
      :initial-index="galleryIndex"
      @close="showPhotoGallery = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import { Plus, Edit2, Trash2, Loader2, Eye, X } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useSiteData } from '../composables/useSiteData';
import { useDeliverySearch } from '../composables/useSearch';
import PhotoGallery from '../components/PhotoGallery.vue';
import MultiItemDeliveryModal from '../components/delivery/MultiItemDeliveryModal.vue';
import SearchBox from '../components/SearchBox.vue';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import { 
  deliveryService,
  vendorReturnService,
  type Delivery
} from '../services/pocketbase';
import { usePermissions } from '../composables/usePermissions';

const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error } = useToast();
const { canDelete } = usePermissions();

// Use site data management
const { data: allDeliveriesData, loading: deliveriesLoading, reload: reloadDeliveries } = useSiteData(
  async () => {
    const deliveryData = await deliveryService.getAll();
    // Sort deliveries by delivery date descending (newest first)
    return deliveryData.sort((a, b) => 
      new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()
    );
  }
);

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults, loadAll } = useDeliverySearch();

// Display items: use search results if searching, otherwise all items
const deliveries = computed(() => {
  return searchQuery.value.trim() ? searchResults.value : (allDeliveriesData.value || [])
});

// Removed unused allDeliveries computed property
const showAddModal = ref(false);
const editingDelivery = ref<Delivery | null>(null);
const viewingDelivery = ref<Delivery | null>(null);
const loadingDeliveryDetails = ref(false);

// Return information storage
const returnInfo = ref<Record<string, {
  totalReturned: number;
  availableForReturn: number;
  returns: Array<{
    id: string;
    returnDate: string;
    quantityReturned: number;
    status: string;
    reason: string;
  }>;
}>>({});

// Development mode check for debugging
const isDev = computed(() => import.meta.env.DEV);
const showPhotoGallery = ref(false);
const galleryDelivery = ref<Delivery | null>(null);
const galleryIndex = ref(0);
const loading = computed(() => deliveriesLoading.value);

const canCreateDelivery = computed(() => {
  return !isReadOnly.value && checkCreateLimit('deliveries');
});

const canEditDelete = computed(() => {
  return !isReadOnly.value && canDelete.value;
});

const getDeliveryActions = (delivery: Delivery) => {
  return [
    {
      key: 'view',
      label: t('common.view'),
      icon: Eye,
      variant: 'default' as const
    },
    {
      key: 'edit',
      label: t('common.edit'),
      icon: Edit2,
      variant: 'default' as const,
      disabled: !canEditDelete.value || delivery.payment_status !== 'pending'
    },
    {
      key: 'delete',
      label: t('common.delete'),
      icon: Trash2,
      variant: 'danger' as const,
      disabled: !canEditDelete.value || delivery.payment_status !== 'pending'
    }
  ];
};

const handleDeliveryAction = (delivery: Delivery, action: string) => {
  switch (action) {
    case 'view':
      viewDelivery(delivery);
      break;
    case 'edit':
      editDelivery(delivery);
      break;
    case 'delete':
      deleteDelivery(delivery);
      break;
  }
};

const reloadAllData = async () => {
  try {
    await reloadDeliveries();
    // Load all items for search functionality
    loadAll();
  } catch (err) {
    console.error('Error loading deliveries:', err);
    error(t('delivery.loadError'));
  }
};

const handleAddDelivery = () => {
  editingDelivery.value = null;
  showAddModal.value = true;
};

const editDelivery = (delivery: Delivery) => {
  editingDelivery.value = delivery;
  showAddModal.value = true;
};

const viewDelivery = async (delivery: Delivery) => {
  try {
    loadingDeliveryDetails.value = true;
    // Fetch the full delivery with all expanded relationships
    const fullDelivery = await deliveryService.getById(delivery.id!);
    
    // If no delivery items found, try to fetch them separately as a fallback
    if (!fullDelivery.expand?.delivery_items || fullDelivery.expand.delivery_items.length === 0) {
      try {
        const { deliveryItemService } = await import('../services/pocketbase');
        const separateItems = await deliveryItemService.getByDelivery(delivery.id!);
        
        if (separateItems.length > 0) {
          // If we found items separately, add them to the delivery object
          if (!fullDelivery.expand) fullDelivery.expand = {};
          fullDelivery.expand.delivery_items = separateItems;
        }
      } catch (separateErr) {
        console.error('Failed to fetch delivery items separately:', separateErr);
      }
    }
    
    viewingDelivery.value = fullDelivery;
    
    // Load return information for each delivery item
    if (fullDelivery.expand?.delivery_items) {
      await loadReturnInfo(fullDelivery.expand.delivery_items);
    }
  } catch (err) {
    console.error('Error loading delivery details:', err);
    error(t('delivery.loadError'));
    // Fallback to the delivery object we have
    viewingDelivery.value = delivery;
  } finally {
    loadingDeliveryDetails.value = false;
  }
};

const loadReturnInfo = async (deliveryItems: any[]) => {
  try {
    for (const item of deliveryItems) {
      if (item.id) {
        const info = await vendorReturnService.getReturnInfoForDeliveryItem(item.id);
        returnInfo.value[item.id] = info;
      }
    }
  } catch (err) {
    console.error('Error loading return information:', err);
  }
};

const showReturnDetails = (deliveryItemId: string) => {
  const info = returnInfo.value[deliveryItemId];
  if (!info || info.returns.length === 0) return;
  
  const returnsList = info.returns.map(ret => 
    `• ${ret.quantityReturned} units on ${new Date(ret.returnDate).toLocaleDateString()} (${ret.status}) - ${ret.reason}`
  ).join('\n');
  
  alert(`Return Details:\n\n${returnsList}`);
};

const deleteDelivery = async (delivery: Delivery) => {
  if (!confirm(t('delivery.confirmDelete'))) return;
  
  try {
    await deliveryService.delete(delivery.id!);
    success(t('delivery.deleteSuccess'));
    await reloadAllData();
  } catch (err) {
    console.error('Error deleting delivery:', err);
    error(t('delivery.deleteError'));
  }
};

const closeAddModal = () => {
  showAddModal.value = false;
  editingDelivery.value = null;
};

const handleDeliverySaved = () => {
  // For new deliveries, modal stays open but refreshes the list
  reloadAllData();
};

const handleDeliveryEditSuccess = () => {
  // For edits, close the modal and refresh
  closeAddModal();
  reloadAllData();
};



const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-IN');
};

const getUnitDisplay = (unit: string) => {
  const unitMap: Record<string, string> = {
    'pieces': 'pcs',
    'kg': 'kg',
    'liters': 'L',
    'meters': 'm',
    'units': 'units'
  };
  return unitMap[unit] || unit;
};

const getPhotoUrl = (deliveryId: string, filename: string) => {
  return `${import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'}/api/files/deliveries/${deliveryId}/${filename}`;
};

const getPhotoUrls = (delivery: Delivery) => {
  if (!delivery.photos) return [];
  return delivery.photos.map(photo => getPhotoUrl(delivery.id!, photo));
};

const openPhotoGallery = (delivery: Delivery, index: number) => {
  galleryDelivery.value = delivery;
  galleryIndex.value = index;
  showPhotoGallery.value = true;
};


// Handle 'show-add-modal' event from FAB
const handleShowAddModal = () => {
  handleAddDelivery();
};

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    handleAddDelivery();
  }
};

// Event listeners using @vueuse/core
useEventListener(window, 'show-add-modal', handleShowAddModal);
useEventListener(window, 'keydown', handleKeyboardShortcut);
</script>

<style scoped>
.status-pending {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300;
}

.status-partial {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300;
}

.status-paid {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300;
}

.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150 ease-in-out;
}

.btn-disabled {
  @apply bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-medium py-2 px-4 rounded-lg cursor-not-allowed;
}
</style>