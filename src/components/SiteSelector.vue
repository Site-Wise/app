<template>
  <div class="relative" ref="selectorRef">
    <button
      @click="dropdownOpen = !dropdownOpen"
      class="flex items-center space-x-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
      :class="{ 'ring-2 ring-primary-500': dropdownOpen }"
      :aria-expanded="dropdownOpen"
      aria-haspopup="menu"
      :aria-label="t('sites.selectSite')"
    >
      <Building class="h-4 w-4 text-gray-500 dark:text-gray-400" />
      <span class="text-gray-900 dark:text-gray-100 font-medium">
        {{ currentSite?.name || 'Select Site' }}
      </span>
      <ChevronDown class="h-4 w-4 text-gray-500 dark:text-gray-400" :class="{ 'rotate-180': dropdownOpen }" />
    </button>
    
    <div
      v-if="dropdownOpen"
      class="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto"
    >
      <!-- Current Site -->
      <div v-if="currentSite" class="p-3 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ currentSite.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Current Site</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="isCurrentUserAdmin"
              @click="openManageModal(); dropdownOpen = false"
              class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Manage Site"
            >
              <Settings class="h-4 w-4" />
            </button>
            <Check class="h-4 w-4 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <p>{{ currentSite.total_units }} units • {{ currentSite.total_planned_area?.toLocaleString() || 0 }} sqft</p>
        </div>
      </div>
      
      <!-- Other Sites -->
      <div class="py-2">
        <div v-for="site in otherSites" :key="site.id" class="group px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" @click="selectSite(site.id!)">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ site.name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ site.total_units }} units • {{ site.total_planned_area?.toLocaleString() || 0 }} sqft</p>
            </div>
            <button
              v-if="site.isOwner"
              @click.stop="openManageModalForSite(site); dropdownOpen = false"
              class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors opacity-0 group-hover:opacity-100"
              title="Manage Site"
            >
              <Settings class="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div v-if="otherSites.length === 0 && currentSite" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
          No other sites available
        </div>
      </div>
      
      <!-- Actions -->
      <div class="border-t border-gray-200 dark:border-gray-700 p-2">
        <button
          @click="canCreateSite ? (showCreateModal = true, dropdownOpen = false) : null"
          :disabled="!canCreateSite"
          :class="[
            'w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200',
            canCreateSite 
              ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700' 
              : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          ]"
          :title="!canCreateSite ? t('subscription.banner.freeTierLimitReached') : ''"
        >
          <Plus class="mr-2 h-4 w-4" />
          Create New Site
        </button>
      </div>
    </div>

    <!-- Create Site Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeCreateModal">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Site</h3>
          
          <form @submit.prevent="handleCreateSite" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Name</label>
              <input v-model="createForm.name" type="text" required class="input mt-1" placeholder="Enter site name" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea v-model="createForm.description" class="input mt-1" rows="2" placeholder="Site description (optional)"></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Units</label>
                <input v-model.number="createForm.total_units" type="number" required class="input mt-1" placeholder="0" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Planned Area (sqft)</label>
                <input v-model.number="createForm.total_planned_area" type="number" required class="input mt-1" placeholder="0" />
              </div>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="createLoading" class="flex-1 btn-primary">
                <Loader2 v-if="createLoading" class="mr-2 h-4 w-4 animate-spin" />
                Create Site
              </button>
              <button type="button" @click="closeCreateModal" class="flex-1 btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Enhanced Manage Site Modal -->
    <div v-if="showManageModal && managingSite" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" @click="closeManageModal">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg" @click.stop>
        <div class="p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Settings class="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">Manage Site</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">Update site information and settings</p>
            </div>
          </div>
          
          <form @submit.prevent="handleUpdateSite" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site Name</label>
              <input 
                v-model="editForm.name" 
                type="text" 
                required 
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                placeholder="Enter site name" 
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea 
                v-model="editForm.description" 
                rows="3"
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                placeholder="Site description (optional)"
              ></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Units</label>
                <input 
                  v-model.number="editForm.total_units" 
                  type="number" 
                  required 
                  min="1"
                  class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  placeholder="0" 
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Planned Area (sqft)</label>
                <input 
                  v-model.number="editForm.total_planned_area" 
                  type="number" 
                  required 
                  min="1"
                  class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  placeholder="0" 
                />
              </div>
            </div>

            <!-- Site Stats -->
            <div class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-xl p-4">
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">Current Site Stats</h4>
              <div class="grid grid-cols-3 gap-4 text-center">
                <!-- <div>
                  <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ managingSite.users?.length || 0 }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">Team Members</p>
                </div> -->
                <div>
                  <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ formatDate(managingSite.created) }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">Created</p>
                </div>
                <div>
                  <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ managingSite.total_units }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">Units</p>
                </div>
              </div>
            </div>
            
            <div class="flex gap-3 pt-4">
              <button 
                type="submit" 
                :disabled="updateLoading"
                :class="[
                  'flex-1 gap-2',
                  !updateLoading ? 'btn-primary' : 'btn-disabled',
                ]"
              >
                <Loader2 v-if="updateLoading" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                {{ updateLoading ? 'Updating...' : 'Update Site' }}
              </button>
              <button 
                type="button" 
                @click="closeManageModal" 
                class="btn-outline flex-1"
              >
                Cancel
              </button>
            </div>

            <!-- Delete Site Button - Only for Owners -->
            <div v-if="isOwnerOfManagingSite" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="openDeleteModal"
                class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 class="h-4 w-4" />
                {{ t('sites.delete.title') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Site Modal -->
    <SiteDeleteModal
      :visible="showDeleteModal"
      :site="managingSite"
      @close="showDeleteModal = false"
      @deleted="handleSiteDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { Building, ChevronDown, Check, Plus, Settings, Loader2, Save, Trash2 } from 'lucide-vue-next';
import { useSite } from '../composables/useSite';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import SiteDeleteModal from './SiteDeleteModal.vue';

const { currentSite, userSites, selectSite: selectSiteAction, createSite, updateSite, isCurrentUserAdmin } = useSite();
const { t } = useI18n();
const { checkCreateLimit } = useSubscription();

// Type for sites with additional ownership information
interface SiteWithOwnership {
  id?: string;
  name: string;
  description?: string;
  total_units: number;
  total_planned_area: number;
  admin_user: string;
  created?: string;
  updated?: string;
  userRole?: 'owner' | 'supervisor' | 'accountant';
  isOwner?: boolean;
  expand?: any;
}

const dropdownOpen = ref(false);
const showCreateModal = ref(false);
const showManageModal = ref(false);
const showDeleteModal = ref(false);
const createLoading = ref(false);
const updateLoading = ref(false);
const selectorRef = ref<HTMLElement | null>(null);
const managingSite = ref<SiteWithOwnership | null>(null);

const createForm = reactive({
  name: '',
  description: '',
  total_units: 0,
  total_planned_area: 0
});

const editForm = reactive({
  name: '',
  description: '',
  total_units: 0,
  total_planned_area: 0
});

const otherSites = computed(() => {
  return userSites.value
    .filter(userSite => userSite.expand?.site && userSite.expand.site.id !== currentSite.value?.id)
    .map(userSite => ({
      ...userSite.expand!.site!,
      userRole: userSite.role,
      isOwner: userSite.role === 'owner'
    } as SiteWithOwnership));
});

const canCreateSite = computed(() => {
  return checkCreateLimit('sites');
});

const selectSite = async (siteId: string) => {
  await selectSiteAction(siteId);
  dropdownOpen.value = false;
  // Note: Removed custom event emission as watchers handle site changes
};

const handleCreateSite = async () => {
  // Double-check subscription limit
  if (!canCreateSite.value) {
    alert(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  
  createLoading.value = true;
  try {
    await createSite(createForm);
    closeCreateModal();
    // Note: Removed custom event emission as watchers handle site changes
  } catch (error) {
    console.error('Error creating site:', error);
    alert('Failed to create site. Please try again.');
  } finally {
    createLoading.value = false;
  }
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  Object.assign(createForm, {
    name: '',
    description: '',
    total_units: 0,
    total_planned_area: 0
  });
};

const openManageModal = () => {
  if (currentSite.value) {
    managingSite.value = currentSite.value;
    Object.assign(editForm, {
      name: currentSite.value.name,
      description: currentSite.value.description || '',
      total_units: currentSite.value.total_units,
      total_planned_area: currentSite.value.total_planned_area
    });
    showManageModal.value = true;
  }
};

const openManageModalForSite = (site: SiteWithOwnership) => {
  managingSite.value = site;
  Object.assign(editForm, {
    name: site.name,
    description: site.description || '',
    total_units: site.total_units,
    total_planned_area: site.total_planned_area
  });
  showManageModal.value = true;
};

const closeManageModal = () => {
  showManageModal.value = false;
  managingSite.value = null;
  Object.assign(editForm, {
    name: '',
    description: '',
    total_units: 0,
    total_planned_area: 0
  });
};

const handleUpdateSite = async () => {
  if (!managingSite.value) return;
  
  updateLoading.value = true;
  try {
    await updateSite(managingSite.value.id!, editForm);
    closeManageModal();
    // Note: Removed custom event emission as watchers handle site changes
  } catch (error) {
    console.error('Error updating site:', error);
    alert('Failed to update site. Please try again.');
  } finally {
    updateLoading.value = false;
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

const isOwnerOfManagingSite = computed(() => {
  return managingSite.value?.isOwner === true;
});

const openDeleteModal = () => {
  showDeleteModal.value = true;
};

const handleSiteDeleted = () => {
  closeManageModal();
};

const handleClickOutside = (event: Event) => {
  if (selectorRef.value && !selectorRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>