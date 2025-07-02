<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="flex items-center justify-center">
          <HardHat class="h-12 w-12 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Select a Site
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Choose a construction site to manage
        </p>
      </div>
      
      <div class="card">
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
        </div>
        
        <!-- Pending Invitations Section -->
        <div v-else-if="receivedInvitations.length > 0" class="space-y-4">
          <div class="text-center mb-6">
            <Mail class="mx-auto h-12 w-12 text-blue-500" />
            <h3 class="mt-2 text-lg font-medium text-gray-900 dark:text-white">You have site invitations</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Accept or reject invitations to join construction sites</p>
          </div>
          
          <div class="space-y-3">
            <div v-for="invitation in receivedInvitations" :key="invitation.id" 
                 class="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="text-base font-medium text-gray-900 dark:text-white">{{ invitation.expand?.site?.name || 'Unknown Site' }}</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Role: <span class="font-medium capitalize">{{ invitation.role }}</span>
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Invited by {{ invitation.expand?.invited_by?.name || 'Unknown' }}
                  </p>
                </div>
                <div class="flex space-x-2 ml-4">
                  <button 
                    @click="handleAcceptInvitation(invitation.id!)"
                    :disabled="processingInvitation === invitation.id"
                    class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Loader2 v-if="processingInvitation === invitation.id" class="h-4 w-4 animate-spin" />
                    <Check v-else class="h-4 w-4" />
                  </button>
                  <button 
                    @click="handleRejectInvitation(invitation.id!)"
                    :disabled="processingInvitation === invitation.id"
                    class="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Loader2 v-if="processingInvitation === invitation.id" class="h-4 w-4 animate-spin" />
                    <X v-else class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Show existing sites if any -->
          <div v-if="userSites.length > 0" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Your existing sites</h3>
            <div class="space-y-3">
              <template v-for="userSite in userSites" :key="userSite.id">
                <div v-if="userSite.expand?.site"
                     @click="selectSite(userSite.site)"
                     class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 cursor-pointer transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ userSite.expand?.site?.name }}</h3>
                    <p v-if="userSite.expand?.site?.description" class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ userSite.expand?.site?.description }}</p>
                    <div class="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{{ userSite.expand?.site?.total_units }} units</span>
                      <span>{{ userSite.expand?.site?.total_planned_area?.toLocaleString() || 0 }} sqft</span>
                    </div>
                  </div>
                  <ChevronRight class="h-5 w-5 text-gray-400" />
                </div>
                </div>
              </template>
            </div>
          </div>
        </div>
        
        <div v-else-if="userSites.length === 0 && receivedInvitations.length === 0" class="text-center py-8">
          <Building class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No sites available</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Create your first construction site to get started.</p>
          <button @click="showCreateModal = true" class="mt-4 btn-primary">
            <Plus class="mr-2 h-4 w-4" />
            Create Site
          </button>
        </div>
        
        <div v-else class="space-y-4">
          <template v-for="userSite in userSites" :key="userSite.id">
            <div v-if="userSite.expand?.site"
                 @click="selectSite(userSite.site)"
                 class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 cursor-pointer transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ userSite.expand?.site?.name }}</h3>
                <p v-if="userSite.expand?.site?.description" class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ userSite.expand?.site?.description }}</p>
                <div class="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{{ userSite.expand?.site?.total_units }} units</span>
                  <span>{{ userSite.expand?.site?.total_planned_area?.toLocaleString() || 0 }} sqft</span>
                </div>
              </div>
              <ChevronRight class="h-5 w-5 text-gray-400" />
            </div>
            </div>
          </template>
          
          <div class="pt-4 border-t border-gray-200 dark:border-gray-600">
            <button @click="showCreateModal = true" class="w-full btn-outline">
              <Plus class="mr-2 h-4 w-4" />
              Create New Site
            </button>
          </div>
        </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { HardHat, Building, Plus, ChevronRight, Loader2, Mail, Check, X } from 'lucide-vue-next';
import { useSite } from '../composables/useSite';
import { useInvitations } from '../composables/useInvitations';

let router: ReturnType<typeof useRouter> | null = null;

// Safely initialize router with error handling
try {
  router = useRouter();
} catch (error) {
  console.warn('Router not available during component initialization:', error);
}
const { userSites, isLoading, loadUserSites, selectSite: selectSiteAction, createSite } = useSite();
const { receivedInvitations, loadReceivedInvitations, acceptInvitation, rejectInvitation } = useInvitations();

const showCreateModal = ref(false);
const createLoading = ref(false);
const processingInvitation = ref<string | null>(null);

const createForm = reactive({
  name: '',
  description: '',
  total_units: 0,
  total_planned_area: 0
});

const selectSite = async (siteId: string) => {
  await selectSiteAction(siteId);
  
  // Ensure router is available and navigate safely
  try {
    if (!router) {
      router = useRouter();
    }
    await nextTick(); // Ensure component is fully mounted
    router.push('/');
  } catch (error) {
    console.error('Navigation failed:', error);
    // Fallback: force page reload to dashboard
    window.location.href = '/';
  }
};

const handleCreateSite = async () => {
  createLoading.value = true;
  try {
    await createSite(createForm);
    closeCreateModal();
    
    // Safe navigation after site creation
    try {
      if (!router) {
        router = useRouter();
      }
      await nextTick();
      router.push('/');
    } catch (error) {
      console.error('Navigation failed after site creation:', error);
      window.location.href = '/';
    }
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

const handleAcceptInvitation = async (invitationId: string) => {
  processingInvitation.value = invitationId;
  try {
    await acceptInvitation(invitationId);
    // Reload sites after accepting invitation
    await loadUserSites();
    
    // If this was the only invitation and user now has one site, auto-select it
    if (userSites.value.length === 1 && receivedInvitations.value.length === 0) {
      await selectSite(userSites.value[0].site);
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
  } finally {
    processingInvitation.value = null;
  }
};

const handleRejectInvitation = async (invitationId: string) => {
  processingInvitation.value = invitationId;
  try {
    await rejectInvitation(invitationId);
  } catch (error) {
    console.error('Error rejecting invitation:', error);
  } finally {
    processingInvitation.value = null;
  }
};

onMounted(async () => {
  // Site loading is handled by App.vue, just load invitations
  await loadReceivedInvitations();
  
  // Wait for component to be fully mounted before auto-navigation
  await nextTick();
  
  // Only auto-select if user has exactly one site and no pending invitations
  if (userSites.value.length === 1 && receivedInvitations.value.length === 0) {
    // Add small delay to ensure router is ready
    setTimeout(async () => {
      await selectSite(userSites.value[0].site);
    }, 100);
  }
});
</script>