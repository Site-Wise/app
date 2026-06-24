<template>
  <div class="min-h-screen bg-cream dark:bg-ink p-6">
    <!-- Header Section -->
    <div class="max-w-7xl mx-auto mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-xl">
              <Users class="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <h1 class="sw-h1 font-display text-ink dark:text-cream">
              {{ t('users.title') }}
            </h1>
          </div>
          <p class="text-stone-600 dark:text-stone-400 max-w-2xl">
            {{ t('users.subtitle') }}
          </p>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center gap-3" v-if="canManageUsers">
          <button 
            @click="showInviteModal = true" 
            class="btn-primary gap-2"
          >
            <UserPlus class="mr-2 h-5 w-5" />
            {{ t('users.inviteUser') }}
          </button>
          <button 
            @click="showPendingInvites = !showPendingInvites" 
            class="btn-outline gap-2"
          >
            <Mail class="h-5 w-5 text-stone-600 dark:text-stone-400" />
            <span v-if="pendingInvitations.length > 0" class="absolute -top-2 -right-2 bg-clay-500 text-white text-xs font-mono sw-tabular rounded-full h-5 w-5 flex items-center justify-center">
              {{ pendingInvitations.length }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Pending Invitations Panel -->
      <div v-if="showPendingInvites && canManageUsers" class="bg-white dark:bg-ink-3 rounded-xl border border-stone-200 dark:border-ink-4 shadow-card overflow-hidden transition-all duration-300">
        <div class="bg-amber-50 dark:bg-amber-500/10 p-6 border-b border-stone-200 dark:border-ink-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-lg">
                <Clock class="h-5 w-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 class="text-lg font-semibold font-display text-ink dark:text-cream">{{ t('users.pendingInvitations') }}</h3>
                <p class="text-sm text-stone-600 dark:text-stone-400"><span class="font-mono sw-tabular">{{ pendingInvitations.length }}</span> {{ t('users.invitationsAwaiting') }}</p>
              </div>
            </div>
            <button @click="showPendingInvites = false" class="p-2 hover:bg-stone-100 dark:hover:bg-ink-2 rounded-lg transition-colors">
              <X class="h-5 w-5 text-stone-500" />
            </button>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <div v-for="invitation in pendingInvitations" :key="invitation.id" class="flex items-center justify-between p-4 bg-stone-50 dark:bg-ink-2 rounded-xl">
            <div class="flex items-center gap-4">
              <div class="h-10 w-10 bg-amber-500 rounded-full flex items-center justify-center">
                <Mail class="h-5 w-5 text-ink" />
              </div>
              <div>
                <p class="font-medium text-ink dark:text-cream">{{ invitation.email }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span :class="getRoleBadgeClass(invitation.role)">{{ t(`users.roles.${invitation.role}`) }}</span>
                  <span :class="isExpired(invitation.expires_at) ? 'text-xs text-clay-600 dark:text-clay-400' : 'text-xs text-stone-500 dark:text-stone-400'">
                    • {{ isExpired(invitation.expires_at) ? t('common.expired') : `${t('users.expires')} ${formatRelativeTime(invitation.expires_at)}` }}
                  </span>
                </div>
              </div>
            </div>
            <button @click="cancelInvitation(invitation.id!)" class="p-2 text-clay-600 dark:text-clay-400 hover:bg-clay-50 dark:hover:bg-clay-900/20 rounded-lg transition-colors" title="Cancel Invitation">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <div v-if="pendingInvitations.length === 0" class="text-center py-8">
            <CheckCircle class="mx-auto h-12 w-12 text-forest-500" />
            <p class="mt-2 text-stone-600 dark:text-stone-400">{{ t('users.noPendingInvitations') }}</p>
          </div>
        </div>
      </div>

      <!-- Site Users Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Team Members -->
        <div class="lg:col-span-2">
          <div class="bg-white dark:bg-ink-3 rounded-xl border border-stone-200 dark:border-ink-4 shadow-card overflow-hidden">
            <div class="p-6 border-b border-stone-200 dark:border-ink-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-lg">
                    <Users class="h-5 w-5 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold font-display text-ink dark:text-cream">{{ t('users.teamMembers') }}</h3>
                    <p class="text-sm text-stone-600 dark:text-stone-400"><span class="font-mono sw-tabular">{{ filteredSiteUsers.length }}</span> {{ t('users.members') }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="p-6 space-y-4">
              <div v-for="siteUser in filteredSiteUsers" :key="siteUser.id" class="group relative">
                <div class="flex items-center gap-4 p-4 rounded-xl border border-stone-200 dark:border-ink-4 bg-stone-50 dark:bg-ink-2 hover:bg-white dark:hover:bg-ink-2 hover:shadow-card transition-all duration-200">
                  <!-- User Avatar -->
                  <div class="relative">
                    <div :class="getAvatarClass(siteUser.role)">
                      <span class="text-white font-display font-semibold text-sm">{{ getUserInitials(siteUser.expand?.user?.name) }}</span>
                    </div>
                    <div class="absolute -bottom-1 -right-1">
                      <div :class="siteUser.is_active ? 'bg-forest-500' : 'bg-stone-400'" class="h-3 w-3 rounded-full border-2 border-white dark:border-ink-3"></div>
                    </div>
                  </div>

                  <!-- User Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-medium text-ink dark:text-cream truncate">{{ siteUser.expand?.user?.name || t('users.unknownUser') }}</h4>
                      <span :class="getRoleBadgeClass(siteUser.role)">{{ t(`users.roles.${siteUser.role}`) }}</span>
                    </div>
                    <p class="text-sm text-stone-600 dark:text-stone-400 truncate">{{ siteUser.expand?.user?.email || t('users.noEmail') }}</p>
                    <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">{{ t('users.added') }} {{ formatRelativeTime(siteUser.assigned_at) }}</p>
                  </div>
                  
                  <!-- Actions -->
                  <div v-if="canManageUsers" class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="editUserRole(siteUser)" class="p-2 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 rounded-lg transition-colors" :title="t('users.changeRole')">
                      <Edit2 class="h-4 w-4" />
                    </button>
                    <button @click="toggleUserStatus(siteUser)" class="p-2 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 rounded-lg transition-colors" :title="siteUser.is_active ? t('users.deactivate') : t('users.activate')">
                      <UserX v-if="siteUser.is_active" class="h-4 w-4" />
                      <UserCheck v-else class="h-4 w-4" />
                    </button>
                    <button
                      @click="removeUser(siteUser)"
                      :disabled="!canDelete || isCurrentUser(siteUser)"
                      :class="[
                        'p-2 rounded-lg transition-colors',
                        (!canDelete || isCurrentUser(siteUser))
                          ? 'text-stone-400 dark:text-ink-4 cursor-not-allowed'
                          : 'text-clay-600 dark:text-clay-400 hover:bg-clay-50 dark:hover:bg-clay-900/20'
                      ]"
                      :title="isCurrentUser(siteUser) ? t('users.cannotRemoveSelf') : t('users.removeUser')"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div v-if="filteredSiteUsers.length === 0" class="text-center py-12">
                <div class="mx-auto w-24 h-24 bg-stone-100 dark:bg-ink-2 rounded-xl flex items-center justify-center mb-4">
                  <Users class="h-12 w-12 text-stone-400" />
                </div>
                <h3 class="text-lg font-medium font-display text-ink dark:text-cream mb-2">{{ t('users.noUsers') }}</h3>
                <p class="text-stone-600 dark:text-stone-400 mb-4">{{ t('users.getStarted') }}</p>
                <button v-if="canManageUsers" @click="showInviteModal = true" class="inline-flex items-center px-4 py-2 bg-amber-500 text-ink rounded-md hover:bg-amber-600 transition-colors">
                  <UserPlus class="mr-2 h-4 w-4" />
                  {{ t('users.inviteFirstMember') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Role Summary Sidebar -->
        <div class="space-y-6">
          <!-- Role Statistics -->
          <div class="bg-white dark:bg-ink-3 rounded-xl border border-stone-200 dark:border-ink-4 shadow-card p-6">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-2 bg-stone-100 dark:bg-ink-2 rounded-lg">
                <BarChart3 class="h-5 w-5 text-stone-700 dark:text-stone-300" />
              </div>
              <div>
                <h3 class="text-lg font-semibold font-display text-ink dark:text-cream">{{ t('users.roleDistribution') }}</h3>
                <p class="text-sm text-stone-600 dark:text-stone-400">{{ t('users.teamComposition') }}</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                <div class="flex items-center gap-3">
                  <div class="p-1.5 bg-amber-100 dark:bg-amber-500/15 rounded-lg">
                    <Crown class="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-amber-700 dark:text-amber-400">{{ t('users.roles.owner') }}</p>
                    <p class="text-xs text-stone-600 dark:text-stone-400">{{ t('users.fullAccess') }}</p>
                  </div>
                </div>
                <span class="sw-stat font-mono sw-tabular text-ink dark:text-cream">{{ roleStats.owners }}</span>
              </div>

              <div class="flex items-center justify-between p-3 bg-forest-50 dark:bg-forest-900/20 rounded-xl">
                <div class="flex items-center gap-3">
                  <div class="p-1.5 bg-forest-100 dark:bg-forest-900/30 rounded-lg">
                    <Shield class="h-4 w-4 text-forest-700 dark:text-forest-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-forest-700 dark:text-forest-300">{{ t('users.roles.supervisor') }}</p>
                    <p class="text-xs text-stone-600 dark:text-stone-400">{{ t('users.noDeleteAccess') }}</p>
                  </div>
                </div>
                <span class="sw-stat font-mono sw-tabular text-ink dark:text-cream">{{ roleStats.supervisors }}</span>
              </div>

              <div class="flex items-center justify-between p-3 bg-stone-50 dark:bg-ink-2 rounded-xl">
                <div class="flex items-center gap-3">
                  <div class="p-1.5 bg-stone-100 dark:bg-ink-2 rounded-lg">
                    <Calculator class="h-4 w-4 text-stone-700 dark:text-stone-300" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('users.roles.accountant') }}</p>
                    <p class="text-xs text-stone-600 dark:text-stone-400">{{ t('users.readOnlyAccess') }}</p>
                  </div>
                </div>
                <span class="sw-stat font-mono sw-tabular text-ink dark:text-cream">{{ roleStats.accountants }}</span>
              </div>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div v-if="canManageUsers" class="bg-white dark:bg-ink-3 rounded-xl border border-stone-200 dark:border-ink-4 shadow-card p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-stone-100 dark:bg-ink-2 rounded-lg">
                <Zap class="h-5 w-5 text-stone-600 dark:text-stone-400" />
              </div>
              <h3 class="text-lg font-semibold font-display text-ink dark:text-cream">{{ t('users.quickActions') }}</h3>
            </div>

            <div class="space-y-3">
              <button @click="showInviteModal = true" class="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-50 dark:hover:bg-ink-2 rounded-xl transition-colors">
                <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-lg">
                  <UserPlus class="h-4 w-4 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <p class="font-medium text-ink dark:text-cream">{{ t('users.inviteMember') }}</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400">{{ t('users.createInAppInvitation') }}</p>
                </div>
              </button>

              <button @click="showPendingInvites = !showPendingInvites" class="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-50 dark:hover:bg-ink-2 rounded-xl transition-colors">
                <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-lg relative">
                  <Clock class="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  <span v-if="pendingInvitations.length > 0" class="absolute -top-1 -right-1 bg-clay-500 text-white font-mono sw-tabular text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                    {{ pendingInvitations.length }}
                  </span>
                </div>
                <div>
                  <p class="font-medium text-ink dark:text-cream">{{ t('users.pendingInvites') }}</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400"><span class="font-mono sw-tabular">{{ pendingInvitations.length }}</span> {{ t('users.awaitingResponse') }}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Invite User Modal -->
    <div v-if="showInviteModal" class="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div class="bg-white dark:bg-ink-3 rounded-xl shadow-modal border border-stone-200 dark:border-ink-4 w-full max-w-md">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-3 bg-amber-100 dark:bg-amber-500/15 rounded-xl">
              <UserPlus class="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h3 class="sw-h3 font-display text-ink dark:text-cream">{{ t('users.inviteUser') }}</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">{{ t('users.createInvitationDescription') }}</p>
            </div>
          </div>
          
          <form @submit.prevent="inviteUser" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">{{ t('auth.email') }} ({{ t('users.forUserIdentification') }})</label>
              <div class="relative">
                <input
                  v-model="inviteForm.email"
                  type="email"
                  required
                  class="w-full pl-10 pr-4 py-3 border border-stone-300 dark:border-ink-4 rounded-md bg-white dark:bg-ink-2 text-ink dark:text-cream placeholder-stone-500 dark:placeholder-stone-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
:placeholder="t('users.enterUserEmail')"
                />
                <Mail class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">{{ t('users.role') }}</label>
              <div class="grid grid-cols-1 gap-3">
                <label v-for="role in availableRoles" :key="role.value" class="relative">
                  <input 
                    v-model="inviteForm.role" 
                    type="radio" 
                    :value="role.value" 
                    class="sr-only" 
                    required
                  />
                  <div :class="[
                    'flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200',
                    inviteForm.role === role.value
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                      : 'border-stone-200 dark:border-ink-4 hover:border-stone-300 dark:hover:border-ink-4'
                  ]">
                    <div :class="role.iconClass">
                      <component :is="role.icon" class="h-5 w-5" />
                    </div>
                    <div class="flex-1">
                      <p class="font-medium text-ink dark:text-cream">{{ t(`users.roles.${role.value}`) }}</p>
                      <p class="text-sm text-stone-600 dark:text-stone-400">{{ role.description }}</p>
                    </div>
                    <div v-if="inviteForm.role === role.value" class="text-amber-700 dark:text-amber-400">
                      <CheckCircle class="h-5 w-5" />
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            <div class="flex gap-3 pt-4">
              <button 
                type="submit"
                :disabled="inviteLoading"
                :class="[
                  !inviteLoading ? 'btn-primary' : 'btn-disabled',
                  'flex-1 gap-2'
                ]"
              >
                <Loader2 v-if="inviteLoading" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
                {{ inviteLoading ? t('users.sending') : t('users.sendInvite') }}
              </button>
              <button 
                type="button" 
                @click="closeInviteModal" 
                class="flex-1 btn-outline"
              >
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Enhanced Edit Role Modal -->
    <div v-if="editingUser" class="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div class="bg-white dark:bg-ink-3 rounded-xl shadow-modal border border-stone-200 dark:border-ink-4 w-full max-w-md">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-3 bg-amber-100 dark:bg-amber-500/15 rounded-xl">
              <Edit2 class="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h3 class="sw-h3 font-display text-ink dark:text-cream">{{ t('users.changeRole') }}</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">{{ t('users.updateTeamMemberPermissions') }}</p>
            </div>
          </div>

          <form @submit.prevent="saveRoleChange" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">{{ t('common.user') }}</label>
              <div class="p-4 bg-stone-50 dark:bg-ink-2 rounded-xl">
                <div class="flex items-center gap-3">
                  <div :class="getAvatarClass(editingUser.role)">
                    <span class="text-white font-display font-semibold text-sm">{{ getUserInitials(editingUser.expand?.user?.name) }}</span>
                  </div>
                  <div>
                    <p class="font-medium text-ink dark:text-cream">{{ editingUser.expand?.user?.name }}</p>
                    <p class="text-sm text-stone-500 dark:text-stone-400">{{ editingUser.expand?.user?.email }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">{{ t('users.newRole') }}</label>
              <div class="grid grid-cols-1 gap-3">
                <label v-for="role in availableRoles" :key="role.value" class="relative">
                  <input 
                    v-model="roleForm.role" 
                    type="radio" 
                    :value="role.value" 
                    class="sr-only" 
                    required
                  />
                  <div :class="[
                    'flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200',
                    roleForm.role === role.value
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                      : 'border-stone-200 dark:border-ink-4 hover:border-stone-300 dark:hover:border-ink-4'
                  ]">
                    <div :class="role.iconClass">
                      <component :is="role.icon" class="h-5 w-5" />
                    </div>
                    <div class="flex-1">
                      <p class="font-medium text-ink dark:text-cream">{{ t(`users.roles.${role.value}`) }}</p>
                      <p class="text-sm text-stone-600 dark:text-stone-400">{{ role.description }}</p>
                    </div>
                    <div v-if="roleForm.role === role.value" class="text-amber-700 dark:text-amber-400">
                      <CheckCircle class="h-5 w-5" />
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            <div class="flex gap-3 pt-4">
              <button
                type="submit"
                :disabled="roleLoading"
                class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-400 dark:disabled:bg-ink-4 text-ink font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
              >
                <Loader2 v-if="roleLoading" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                {{ roleLoading ? t('users.updating') : t('users.updateRole') }}
              </button>
              <button
                type="button"
                @click="editingUser = null"
                class="flex-1 px-6 py-3 border border-stone-300 dark:border-ink-4 text-stone-700 dark:text-stone-300 font-medium rounded-md hover:bg-stone-50 dark:hover:bg-ink-2 transition-colors"
              >
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
import { ref, reactive, computed, watch } from 'vue';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  UserX, 
  UserCheck, 
  Loader2,
  Crown,
  Shield,
  Calculator,
  Mail,
  Clock,
  X,
  CheckCircle,
  Send,
  Save,
  BarChart3,
  Zap
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSite } from '../composables/useSite';
import { useInvitations } from '../composables/useInvitations';
import { 
  siteUserService,
  authService,
  type SiteUser
} from '../services/pocketbase';
import { usePermissions } from '../composables/usePermissions';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const { success: showSuccess, error: showError } = useToast();
const { currentSite, canManageUsers, changeUserRole, removeUserFromSite } = useSite();
const { canDelete } = usePermissions();
const { 
  pendingInvitations, 
  sendInvitation, 
  loadSiteInvitations, 
  cancelInvitation 
} = useInvitations();

const siteUsers = ref<SiteUser[]>([]);
const showInviteModal = ref(false);
const showPendingInvites = ref(false);
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

const availableRoles = [
  {
    value: 'owner',
    icon: Crown,
    iconClass: 'p-2 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-lg',
    get description() { return t('users.roleDescriptions.ownerDesc') }
  },
  {
    value: 'supervisor',
    icon: Shield,
    iconClass: 'p-2 bg-forest-100 dark:bg-forest-900/30 text-forest-700 dark:text-forest-400 rounded-lg',
    get description() { return t('users.roleDescriptions.supervisorDesc') }
  },
  {
    value: 'accountant',
    icon: Calculator,
    iconClass: 'p-2 bg-stone-100 dark:bg-ink-2 text-stone-700 dark:text-stone-300 rounded-lg',
    get description() { return t('users.roleDescriptions.accountantDesc') }
  }
];

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

const filteredSiteUsers = computed(() => {
  const currentUser = authService.currentUser;
  if (!currentUser) return siteUsers.value;
  
  return siteUsers.value.filter(siteUser => !isCurrentUser(siteUser));
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
    owner: 'sw-badge sw-badge--accent',
    supervisor: 'sw-badge sw-badge--success',
    accountant: 'sw-badge sw-badge--neutral'
  };
  return classes[role as keyof typeof classes] || 'sw-badge sw-badge--neutral';
};

const getAvatarClass = (role: string) => {
  const classes = {
    owner: 'h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center',
    supervisor: 'h-10 w-10 rounded-full bg-forest-500 flex items-center justify-center',
    accountant: 'h-10 w-10 rounded-full bg-stone-500 flex items-center justify-center'
  };
  return classes[role as keyof typeof classes] || 'h-10 w-10 rounded-full bg-stone-500 flex items-center justify-center';
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
  
  if (diffInSeconds <= 0) return 'soon';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

const isExpired = (dateString: string) => {
  return new Date(dateString) <= new Date();
};

const isCurrentUser = (siteUser: SiteUser) => {
  const currentUser = authService.currentUser;
  return Boolean(currentUser && siteUser.user === currentUser.id);
};

const loadSiteUsers = async () => {
  if (!currentSite.value) return;
  
  try {
    const users = await siteUserService.getBySite(currentSite.value.id!);
    siteUsers.value = users;
    // Also load pending invitations
    await loadSiteInvitations(currentSite.value.id!);
  } catch (error) {
    console.error('Error loading site users:', error);
  }
};

const inviteUser = async () => {
  if (!currentSite.value || !inviteForm.role) return;
  
  inviteLoading.value = true;
  try {
    await sendInvitation(
      currentSite.value.id!,
      inviteForm.email,
      inviteForm.role as 'owner' | 'supervisor' | 'accountant'
    );
    
    // Show success message with expiry info
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    showSuccess(t('users.invitationCreated', { email: inviteForm.email, date: expiryDate.toLocaleDateString() }));
    closeInviteModal();

    // Reload invitations
    await loadSiteInvitations(currentSite.value.id!);
  } catch (err) {
    console.error('Error sending invitation:', err);
    const errorMessage = err instanceof Error ? err.message : t('users.failedToCreateInvitation');
    showError(errorMessage);
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
  } catch (err) {
    console.error('Error changing user role:', err);
    showError(err instanceof Error ? err.message : t('messages.error'));
  } finally {
    roleLoading.value = false;
  }
};

const toggleUserStatus = async (siteUser: SiteUser) => {
  try {
    await siteUserService.updateRole(siteUser.id!, { is_active: !siteUser.is_active });
    await loadSiteUsers();
  } catch (err) {
    console.error('Error toggling user status:', err);
    showError(t('messages.error'));
  }
};

const removeUser = async (siteUser: SiteUser) => {
  // Prevent users from removing themselves
  if (isCurrentUser(siteUser)) {
    showError(t('users.cannotRemoveSelf'));
    return;
  }

  if (!confirm(t('users.confirmRemoveUser', { name: siteUser.expand?.user?.name || 'this user' }))) {
    return;
  }

  try {
    if (!currentSite.value) return;
    await removeUserFromSite(siteUser.user, currentSite.value.id!);
    await loadSiteUsers();
  } catch (err) {
    console.error('Error removing user:', err);
    showError(err instanceof Error ? err.message : t('messages.error'));
  }
};


const closeInviteModal = () => {
  showInviteModal.value = false;
  Object.assign(inviteForm, {
    email: '',
    role: ''
  });
};

// Watch for currentSite changes and load users.
// `immediate: true` already triggers the initial load on mount, so a separate
// onMounted(loadSiteUsers) would just duplicate the first fetch.
watch(currentSite, (newSite) => {
  if (newSite) {
    loadSiteUsers();
  }
}, { immediate: true });
</script>