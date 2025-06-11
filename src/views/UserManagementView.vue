<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('users.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('users.subtitle') }}
        </p>
      </div>
      <button @click="showInviteModal = true" class="btn-primary" v-if="canManageUsers">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('users.inviteUser') }}
      </button>
    </div>

    <!-- Site Users Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.user') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('users.role') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('users.assignedBy') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('users.assignedAt') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.status') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" v-if="canManageUsers">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="siteUser in siteUsers" :key="siteUser.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <div class="h-10 w-10 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center">
                    <span class="text-white font-medium text-sm">{{ getUserInitials(siteUser.expand?.user?.name) }}</span>
                  </div>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">{{ siteUser.expand?.user?.name || 'Unknown User' }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">{{ siteUser.expand?.user?.email || 'No email' }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getRoleBadgeClass(siteUser.role)">
                {{ t(`users.roles.${siteUser.role}`) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ siteUser.expand?.assigned_by?.name || 'System' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ formatDate(siteUser.assigned_at) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="siteUser.is_active ? 'status-paid' : 'status-pending'">
                {{ siteUser.is_active ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" v-if="canManageUsers">
              <div class="flex items-center space-x-2">
                <button @click="editUserRole(siteUser)" class="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300" :title="t('users.changeRole')">
                  <Edit2 class="h-4 w-4" />
                </button>
                <button @click="toggleUserStatus(siteUser)" class="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300" :title="siteUser.is_active ? t('users.deactivate') : t('users.activate')">
                  <UserX v-if="siteUser.is_active" class="h-4 w-4" />
                  <UserCheck v-else class="h-4 w-4" />
                </button>
                <button @click="removeUser(siteUser)" class="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300" :title="t('users.removeUser')">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="siteUsers.length === 0" class="text-center py-12">
        <Users class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('users.noUsers') }}</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('users.getStarted') }}</p>
      </div>
    </div>

    <!-- Role Summary Cards -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Crown class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-blue-700 dark:text-blue-300">{{ t('users.roles.owner') }}</p>
            <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ roleStats.owners }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Shield class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-green-700 dark:text-green-300">{{ t('users.roles.supervisor') }}</p>
            <p class="text-2xl font-bold text-green-900 dark:text-green-100">{{ roleStats.supervisors }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Calculator class="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-yellow-700 dark:text-yellow-300">{{ t('users.roles.accountant') }}</p>
            <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{{ roleStats.accountants }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite User Modal -->
    <div v-if="showInviteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ t('users.inviteUser') }}</h3>
          
          <form @submit.prevent="inviteUser" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('auth.email') }}</label>
              <input v-model="inviteForm.email" type="email" required class="input mt-1" :placeholder="t('forms.enterEmail')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('users.role') }}</label>
              <select v-model="inviteForm.role" required class="input mt-1">
                <option value="">{{ t('users.selectRole') }}</option>
                <option value="supervisor">{{ t('users.roles.supervisor') }}</option>
                <option value="accountant">{{ t('users.roles.accountant') }}</option>
                <option value="owner">{{ t('users.roles.owner') }}</option>
              </select>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="inviteLoading" class="flex-1 btn-primary">
                <Loader2 v-if="inviteLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ t('users.sendInvite') }}
              </button>
              <button type="button" @click="closeInviteModal" class="flex-1 btn-outline">
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Role Modal -->
    <div v-if="editingUser" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ t('users.changeRole') }}</h3>
          
          <form @submit.prevent="saveRoleChange" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.user') }}</label>
              <div class="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div class="flex items-center">
                  <div class="h-8 w-8 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center">
                    <span class="text-white font-medium text-xs">{{ getUserInitials(editingUser.expand?.user?.name) }}</span>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ editingUser.expand?.user?.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ editingUser.expand?.user?.email }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('users.newRole') }}</label>
              <select v-model="roleForm.role" required class="input mt-1">
                <option value="supervisor">{{ t('users.roles.supervisor') }}</option>
                <option value="accountant">{{ t('users.roles.accountant') }}</option>
                <option value="owner">{{ t('users.roles.owner') }}</option>
              </select>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="roleLoading" class="flex-1 btn-primary">
                <Loader2 v-if="roleLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ t('users.updateRole') }}
              </button>
              <button type="button" @click="editingUser = null" class="flex-1 btn-outline">
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
import { ref, reactive, onMounted, computed } from 'vue';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  UserX, 
  UserCheck, 
  Loader2,
  Crown,
  Shield,
  Calculator
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSite } from '../composables/useSite';
// import { usePermissions } from '../composables/usePermissions';
import { 
  siteUserService,
  type SiteUser
} from '../services/pocketbase';

const { t } = useI18n();
const { currentSite, canManageUsers, changeUserRole } = useSite();
// const { canManageUsers: hasUserManagementPermission } = usePermissions();

const siteUsers = ref<SiteUser[]>([]);
const showInviteModal = ref(false);
const editingUser = ref<SiteUser | null>(null);
const inviteLoading = ref(false);
const roleLoading = ref(false);

const inviteForm = reactive({
  email: '',
  role: '' as 'owner' | 'supervisor' | 'accountant' | ''
});

const roleForm = reactive({
  role: '' as 'owner' | 'supervisor' | 'accountant'
});

const roleStats = computed(() => {
  const stats = {
    owners: 0,
    supervisors: 0,
    accountants: 0
  };

  siteUsers.value.forEach(user => {
    if (!user.is_active) return;
    
    switch (user.role) {
      case 'owner':
        stats.owners++;
        break;
      case 'supervisor':
        stats.supervisors++;
        break;
      case 'accountant':
        stats.accountants++;
        break;
    }
  });

  return stats;
});

const getUserInitials = (name?: string) => {
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
    accountant: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
  };
  return classes[role as keyof typeof classes] || 'status-badge';
};

const loadSiteUsers = async () => {
  if (!currentSite.value) return;
  
  try {
    const users = await siteUserService.getBySite(currentSite.value.id!);
    siteUsers.value = users;
  } catch (error) {
    console.error('Error loading site users:', error);
  }
};

const inviteUser = async () => {
  if (!currentSite.value) return;
  
  inviteLoading.value = true;
  try {
    // In a real implementation, this would send an email invitation
    // For now, we'll just show a message
    alert(t('users.inviteEmailSent', { email: inviteForm.email }));
    closeInviteModal();
  } catch (error) {
    console.error('Error inviting user:', error);
  } finally {
    inviteLoading.value = false;
  }
};

const editUserRole = (siteUser: SiteUser) => {
  editingUser.value = siteUser;
  roleForm.role = siteUser.role;
};

const saveRoleChange = async () => {
  if (!editingUser.value || !currentSite.value) return;
  
  roleLoading.value = true;
  try {
    await changeUserRole(editingUser.value.user, currentSite.value.id!, roleForm.role);
    await loadSiteUsers();
    editingUser.value = null;
  } catch (error) {
    console.error('Error changing user role:', error);
    alert(t('messages.error'));
  } finally {
    roleLoading.value = false;
  }
};

const toggleUserStatus = async (siteUser: SiteUser) => {
  try {
    await siteUserService.updateRole(siteUser.id!, { is_active: !siteUser.is_active });
    await loadSiteUsers();
  } catch (error) {
    console.error('Error toggling user status:', error);
    alert(t('messages.error'));
  }
};

const removeUser = async (siteUser: SiteUser) => {
  if (!confirm(t('users.confirmRemoveUser', { name: siteUser.expand?.user?.name || 'this user' }))) {
    return;
  }
  
  try {
    await siteUserService.delete(siteUser.id!);
    await loadSiteUsers();
  } catch (error) {
    console.error('Error removing user:', error);
    alert(t('messages.error'));
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const closeInviteModal = () => {
  showInviteModal.value = false;
  Object.assign(inviteForm, {
    email: '',
    role: ''
  });
};

onMounted(() => {
  loadSiteUsers();
});
</script>