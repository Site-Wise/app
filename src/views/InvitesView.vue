<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
    <!-- Header Section -->
    <div class="max-w-6xl mx-auto mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Mail class="h-6 w-6 text-white" />
            </div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Invitations
            </h1>
          </div>
          <p class="text-gray-600 dark:text-gray-400 max-w-2xl">
            Manage your site invitations and join construction teams
          </p>
        </div>
        
        <!-- Quick Stats -->
        <div class="flex items-center gap-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock class="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p class="text-xl font-bold text-gray-900 dark:text-white">{{ receivedInvitations.length }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Loader2 class="h-6 w-6 animate-spin" />
          <span>Loading invitations...</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="receivedInvitations.length === 0" class="text-center py-16">
        <div class="mx-auto w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-3xl flex items-center justify-center mb-6">
          <Mail class="h-16 w-16 text-gray-400" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No invitations</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          You don't have any pending invitations at the moment. When someone invites you to join their construction site, it will appear here.
        </p>
        <button 
          @click="$router.push('/dashboard')" 
          class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
        >
          <ArrowLeft class="mr-2 h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      <!-- Invitations Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div 
          v-for="invitation in receivedInvitations" 
          :key="invitation.id"
          class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
        >
          <!-- Invitation Header -->
          <div class="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-start justify-between">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                  <Building class="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ invitation.expand?.site?.name || 'Construction Site' }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {{ invitation.expand?.site?.description || 'No description available' }}
                  </p>
                  <div class="flex items-center gap-4 mt-3">
                    <div class="flex items-center gap-2">
                      <div class="h-6 w-6 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                        <span class="text-white text-xs font-medium">{{ getInviterInitials(invitation.expand?.invited_by?.name) }}</span>
                      </div>
                      <span class="text-sm text-gray-700 dark:text-gray-300">{{ invitation.expand?.invited_by?.name || 'Unknown' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Urgency Indicator -->
              <div class="flex flex-col items-end gap-2">
                <span :class="getRoleBadgeClass(invitation.role)">{{ t(`users.roles.${invitation.role}`) }}</span>
                <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock class="h-3 w-3" />
                  <span>{{ formatTimeLeft(invitation.expires_at) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Invitation Details -->
          <div class="p-6">
            <div class="space-y-4">
              <!-- Site Information -->
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-1">
                    <Home class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Total Units</span>
                  </div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ invitation.expand?.site?.total_units || 0 }}</p>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-1">
                    <Square class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Area (sq ft)</span>
                  </div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatNumber(invitation.expand?.site?.total_planned_area || 0) }}</p>
                </div>
              </div>

              <!-- Role Description -->
              <div class="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-2">Your Role: {{ t(`users.roles.${invitation.role}`) }}</h4>
                <p class="text-sm text-blue-700 dark:text-blue-300">{{ getRoleDescription(invitation.role) }}</p>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3 pt-2">
                <button 
                  @click="acceptInvitationFixed(invitation.id!)"
                  :disabled="acceptingInvite === invitation.id"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                >
                  <Loader2 v-if="acceptingInvite === invitation.id" class="h-4 w-4 animate-spin" />
                  <CheckCircle v-else class="h-4 w-4" />
                  {{ acceptingInvite === invitation.id ? 'Accepting...' : 'Accept' }}
                </button>
                
                <button 
                  @click="declineInvitation(invitation.id!)"
                  :disabled="decliningInvite === invitation.id"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Loader2 v-if="decliningInvite === invitation.id" class="h-4 w-4 animate-spin" />
                  <X v-else class="h-4 w-4" />
                  {{ decliningInvite === invitation.id ? 'Declining...' : 'Decline' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Mail, 
  Clock, 
  Loader2, 
  Building, 
  Home, 
  Square, 
  CheckCircle, 
  X,
  ArrowLeft
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useInvitations } from '../composables/useInvitations';

const { t } = useI18n();
const router = useRouter();
const { 
  receivedInvitations, 
  isLoading, 
  loadReceivedInvitations, 
  acceptInvitation, 
  rejectInvitation 
} = useInvitations();

const acceptingInvite = ref<string | null>(null);
const decliningInvite = ref<string | null>(null);

const getInviterInitials = (name?: string) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getRoleBadgeClass = (role: string) => {
  const classes = {
    owner: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    supervisor: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    accountant: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
  };
  return classes[role as keyof typeof classes] || 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
};

const getRoleDescription = (role: string) => {
  const descriptions = {
    owner: 'Full access to all features including user management, financial data, and system settings.',
    supervisor: 'Manage daily operations, add/edit items and vendors, but cannot delete records or manage users.',
    accountant: 'Read-only access to view financial reports, payments, and export data for accounting purposes.'
  };
  return descriptions[role as keyof typeof descriptions] || 'Role description not available.';
};

const formatTimeLeft = (expiresAt: string) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expired';
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) return `${diffDays}d left`;
  if (diffHours > 0) return `${diffHours}h left`;
  return 'Expires soon';
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

const acceptInvitationHandler = async (invitationId: string) => {
  acceptingInvite.value = invitationId;
  try {
    await acceptInvitation(invitationId);
    alert('Invitation accepted! You can now access the site.');
    router.push('/dashboard');
  } catch (error) {
    console.error('Error accepting invitation:', error);
    alert(error instanceof Error ? error.message : 'Failed to accept invitation');
  } finally {
    acceptingInvite.value = null;
  }
};

const declineInvitation = async (invitationId: string) => {
  if (!confirm('Are you sure you want to decline this invitation? This action cannot be undone.')) {
    return;
  }
  
  decliningInvite.value = invitationId;
  try {
    await rejectInvitation(invitationId);
    alert('Invitation declined.');
  } catch (error) {
    console.error('Error declining invitation:', error);
    alert('Failed to decline invitation');
  } finally {
    decliningInvite.value = null;
  }
};

// Fix the accept function name
const acceptInvitationFixed = acceptInvitationHandler;

onMounted(() => {
  loadReceivedInvitations();
});
</script>