<template>
  <div class="relative" ref="selectorRef">
    <button
      @click="dropdownOpen = !dropdownOpen"
      class="flex items-center space-x-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
      :class="{ 'ring-2 ring-primary-500': dropdownOpen }"
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
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ currentSite.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Current Site</p>
          </div>
          <Check class="h-4 w-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <p>{{ currentSite.total_units }} units • {{ currentSite.total_planned_area.toLocaleString() }} sqft</p>
        </div>
      </div>
      
      <!-- Other Sites -->
      <div class="py-2">
        <div v-for="site in otherSites" :key="site.id" class="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" @click="selectSite(site.id!)">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ site.name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ site.total_units }} units • {{ site.total_planned_area.toLocaleString() }} sqft</p>
            </div>
          </div>
        </div>
        
        <div v-if="otherSites.length === 0 && currentSite" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
          No other sites available
        </div>
      </div>
      
      <!-- Actions -->
      <div class="border-t border-gray-200 dark:border-gray-700 p-2">
        <button
          @click="showCreateModal = true; dropdownOpen = false"
          class="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
        >
          <Plus class="mr-2 h-4 w-4" />
          Create New Site
        </button>
        <button
          v-if="currentSite"
          @click="showManageModal = true; dropdownOpen = false"
          class="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
        >
          <Settings class="mr-2 h-4 w-4" />
          Manage Site
        </button>
      </div>
    </div>

    <!-- Create Site Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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

    <!-- Manage Site Modal -->
    <div v-if="showManageModal && currentSite" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Manage {{ currentSite.name }}</h3>
          
          <div class="space-y-4">
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 class="font-medium text-gray-900 dark:text-white mb-2">Site Information</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Total Units:</span>
                  <span class="text-gray-900 dark:text-white">{{ currentSite.total_units }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Planned Area:</span>
                  <span class="text-gray-900 dark:text-white">{{ currentSite.total_planned_area.toLocaleString() }} sqft</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Users:</span>
                  <span class="text-gray-900 dark:text-white">{{ currentSite.users?.length || 0 }}</span>
                </div>
              </div>
            </div>
            
            <div class="flex space-x-3">
              <button @click="showManageModal = false" class="flex-1 btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { Building, ChevronDown, Check, Plus, Settings, Loader2 } from 'lucide-vue-next';
import { useSite } from '../composables/useSite';

const { currentSite, userSites, selectSite: selectSiteAction, createSite } = useSite();

const dropdownOpen = ref(false);
const showCreateModal = ref(false);
const showManageModal = ref(false);
const createLoading = ref(false);
const selectorRef = ref<HTMLElement | null>(null);

const createForm = reactive({
  name: '',
  description: '',
  total_units: 0,
  total_planned_area: 0
});

const otherSites = computed(() => {
  return userSites.value.filter(site => site.id !== currentSite.value?.id);
});

const selectSite = async (siteId: string) => {
  await selectSiteAction(siteId);
  dropdownOpen.value = false;
  // Emit event to refresh data in other components
  window.dispatchEvent(new CustomEvent('site-changed'));
};

const handleCreateSite = async () => {
  createLoading.value = true;
  try {
    await createSite(createForm);
    closeCreateModal();
    // Emit event to refresh data in other components
    window.dispatchEvent(new CustomEvent('site-changed'));
  } catch (error) {
    console.error('Error creating site:', error);
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