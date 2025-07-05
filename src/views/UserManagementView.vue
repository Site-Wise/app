<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
    <!-- Header Section -->
    <div class="max-w-7xl mx-auto mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Users class="h-6 w-6 text-white" />
            </div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {{ t('users.title') }}
            </h1>
          </div>
          <p class="text-gray-600 dark:text-gray-400 max-w-2xl">
            {{ t('users.subtitle') }}
          </p>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center gap-3" v-if="canManageUsers">
          <button 
            @click="showInviteModal = true" 
            class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
          >
            <UserPlus class="mr-2 h-5 w-5" />
            {{ t('users.inviteUser') }}
          </button>
          <button 
            @click="showPendingInvites = !showPendingInvites" 
            class="inline-flex items-center px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
          >
            <Mail class="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span v-if="pendingInvitations.length > 0" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {{ pendingInvitations.length }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Pending Invitations Panel -->
      <div v-if="showPendingInvites && canManageUsers" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock class="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('users.pendingInvitations') }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ pendingInvitations.length }} {{ t('users.invitationsAwaiting') }}</p>
              </div>
            </div>
            <button @click="showPendingInvites = false" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X class="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div class="p-6 space-y-4">
          <div v-for="invitation in pendingInvitations" :key="invitation.id" class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div class="flex items-center gap-4">
              <div class="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Mail class="h-5 w-5 text-white" />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ invitation.email }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span :class="getRoleBadgeClass(invitation.role)">{{ t(`users.roles.${invitation.role}`) }}</span>
                  <span :class="isExpired(invitation.expires_at) ? 'text-xs text-red-500 dark:text-red-400' : 'text-xs text-gray-500 dark:text-gray-400'">
                    • {{ isExpired(invitation.expires_at) ? t('common.expired') : `${t('users.expires')} ${formatRelativeTime(invitation.expires_at)}` }}
                  </span>
                </div>
              </div>
            </div>
            <button @click="cancelInvitation(invitation.id!)" class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Cancel Invitation">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
          
          <div v-if="pendingInvitations.length === 0" class="text-center py-8">
            <CheckCircle class="mx-auto h-12 w-12 text-green-500" />
            <p class="mt-2 text-gray-600 dark:text-gray-400">{{ t('users.noPendingInvitations') }}</p>
          </div>
        </div>
      </div>

      <!-- Site Users Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Team Members -->
        <div class="lg:col-span-2">
          <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('users.teamMembers') }}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ filteredSiteUsers.length }} {{ t('users.members') }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="p-6 space-y-4">
              <div v-for="siteUser in filteredSiteUsers" :key="siteUser.id" class="group relative">
                <div class="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200">
                  <!-- User Avatar -->
                  <div class="relative">
                    <div :class="getAvatarClass(siteUser.role)">
                      <span class="text-white font-medium text-sm">{{ getUserInitials(siteUser.expand?.user?.name) }}</span>
                    </div>
                    <div class="absolute -bottom-1 -right-1">
                      <div :class="siteUser.is_active ? 'bg-green-500' : 'bg-gray-400'" class="h-3 w-3 rounded-full border-2 border-white dark:border-gray-800"></div>
                    </div>
                  </div>
                  
                  <!-- User Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-medium text-gray-900 dark:text-white truncate">{{ siteUser.expand?.user?.name || t('users.unknownUser') }}</h4>
                      <span :class="getRoleBadgeClass(siteUser.role)">{{ t(`users.roles.${siteUser.role}`) }}</span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 truncate">{{ siteUser.expand?.user?.email || t('users.noEmail') }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">{{ t('users.added') }} {{ formatRelativeTime(siteUser.assigned_at) }}</p>
                  </div>
                  
                  <!-- Actions -->
                  <div v-if="canManageUsers" class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="editUserRole(siteUser)" class="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" :title="t('users.changeRole')">
                      <Edit2 class="h-4 w-4" />
                    </button>
                    <button @click="toggleUserStatus(siteUser)" class="p-2 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors" :title="siteUser.is_active ? t('users.deactivate') : t('users.activate')">
                      <UserX v-if="siteUser.is_active" class="h-4 w-4" />
                      <UserCheck v-else class="h-4 w-4" />
                    </button>
                    <button 
                      @click="removeUser(siteUser)" 
                      :disabled="!canDelete || isCurrentUser(siteUser)"
                      :class="[
                        'p-2 rounded-lg transition-colors',
                        (!canDelete || isCurrentUser(siteUser))
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                          : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      ]"
                      :title="isCurrentUser(siteUser) ? t('users.cannotRemoveSelf') : t('users.removeUser')"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div v-if="filteredSiteUsers.length === 0" class="text-center py-12">
                <div class="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
                  <Users class="h-12 w-12 text-gray-400" />
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">{{ t('users.noUsers') }}</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4">{{ t('users.getStarted') }}</p>
                <button v-if="canManageUsers" @click="showInviteModal = true" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
          <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-6">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BarChart3 class="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('users.roleDistribution') }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('users.teamComposition') }}</p>
              </div>
            </div>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div class="flex items-center gap-3">
                  <div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Crown class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-blue-700 dark:text-blue-300">{{ t('users.roles.owner') }}</p>
                    <p class="text-xs text-blue-600 dark:text-blue-400">{{ t('users.fullAccess') }}</p>
                  </div>
                </div>
                <span class="text-xl font-bold text-blue-900 dark:text-blue-100">{{ roleStats.owners }}</span>
              </div>

              <div class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div class="flex items-center gap-3">
                  <div class="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Shield class="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-green-700 dark:text-green-300">{{ t('users.roles.supervisor') }}</p>
                    <p class="text-xs text-green-600 dark:text-green-400">{{ t('users.noDeleteAccess') }}</p>
                  </div>
                </div>
                <span class="text-xl font-bold text-green-900 dark:text-green-100">{{ roleStats.supervisors }}</span>
              </div>

              <div class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <div class="flex items-center gap-3">
                  <div class="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Calculator class="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-amber-700 dark:text-amber-300">{{ t('users.roles.accountant') }}</p>
                    <p class="text-xs text-amber-600 dark:text-amber-400">{{ t('users.readOnlyAccess') }}</p>
                  </div>
                </div>
                <span class="text-xl font-bold text-amber-900 dark:text-amber-100">{{ roleStats.accountants }}</span>
              </div>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div v-if="canManageUsers" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Zap class="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('users.quickActions') }}</h3>
            </div>
            
            <div class="space-y-3">
              <button @click="showInviteModal = true" class="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors">
                <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <UserPlus class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ t('users.inviteMember') }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('users.createInAppInvitation') }}</p>
                </div>
              </button>
              
              <button @click="showPendingInvites = !showPendingInvites" class="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors">
                <div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg relative">
                  <Clock class="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span v-if="pendingInvitations.length > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                    {{ pendingInvitations.length }}
                  </span>
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ t('users.pendingInvites') }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ pendingInvitations.length }} {{ t('users.awaitingResponse') }}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Invite User Modal -->
    <div v-if="showInviteModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <UserPlus class="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('users.inviteUser') }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('users.createInvitationDescription') }}</p>
            </div>
          </div>
          
          <form @submit.prevent="inviteUser" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('auth.email') }} ({{ t('users.forUserIdentification') }})</label>
              <div class="relative">
                <input 
                  v-model="inviteForm.email" 
                  type="email" 
                  required 
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
:placeholder="t('users.enterUserEmail')" 
                />
                <Mail class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('users.role') }}</label>
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
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  ]">
                    <div :class="role.iconClass">
                      <component :is="role.icon" class="h-5 w-5" />
                    </div>
                    <div class="flex-1">
                      <p class="font-medium text-gray-900 dark:text-white">{{ t(`users.roles.${role.value}`) }}</p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">{{ role.description }}</p>
                    </div>
                    <div v-if="inviteForm.role === role.value" class="text-blue-500">
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
                class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
              >
                <Loader2 v-if="inviteLoading" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
                {{ inviteLoading ? t('users.sending') : t('users.sendInvite') }}
              </button>
              <button 
                type="button" 
                @click="closeInviteModal" 
                class="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Enhanced Edit Role Modal -->
    <div v-if="editingUser" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl">
              <Edit2 class="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('users.changeRole') }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('users.updateTeamMemberPermissions') }}</p>
            </div>
          </div>
          
          <form @submit.prevent="saveRoleChange" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{{ t('common.user') }}</label>
              <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div class="flex items-center gap-3">
                  <div :class="getAvatarClass(editingUser.role)">
                    <span class="text-white font-medium text-sm">{{ getUserInitials(editingUser.expand?.user?.name) }}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ editingUser.expand?.user?.name }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ editingUser.expand?.user?.email }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{{ t('users.newRole') }}</label>
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
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  ]">
                    <div :class="role.iconClass">
                      <component :is="role.icon" class="h-5 w-5" />
                    </div>
                    <div class="flex-1">
                      <p class="font-medium text-gray-900 dark:text-white">{{ t(`users.roles.${role.value}`) }}</p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">{{ role.description }}</p>
                    </div>
                    <div v-if="roleForm.role === role.value" class="text-green-500">
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
                class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
              >
                <Loader2 v-if="roleLoading" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                {{ roleLoading ? t('users.updating') : t('users.updateRole') }}
              </button>
              <button 
                type="button" 
                @click="editingUser = null" 
                class="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
import { ref, reactive, onMounted, computed, watch } from 'vue';
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

const { t } = useI18n();
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
    iconClass: 'p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg',
    get description() { return t('users.roleDescriptions.ownerDesc') }
  },
  {
    value: 'supervisor',
    icon: Shield,
    iconClass: 'p-2 bg-green-100 dark:bg-green-900/30 rounded-lg',
    get description() { return t('users.roleDescriptions.supervisorDesc') }
  },
  {
    value: 'accountant',
    icon: Calculator,
    iconClass: 'p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg',
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
    owner: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    supervisor: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    accountant: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
  };
  return classes[role as keyof typeof classes] || 'status-badge';
};

const getAvatarClass = (role: string) => {
  const classes = {
    owner: 'h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center',
    supervisor: 'h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center',
    accountant: 'h-10 w-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center'
  };
  return classes[role as keyof typeof classes] || 'h-10 w-10 rounded-full bg-gray-500 flex items-center justify-center';
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
  return currentUser && siteUser.user === currentUser.id;
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
    alert(t('users.invitationCreated', { email: inviteForm.email, date: expiryDate.toLocaleDateString() }));
    closeInviteModal();
    
    // Reload invitations
    await loadSiteInvitations(currentSite.value.id!);
  } catch (error) {
    console.error('Error sending invitation:', error);
    const errorMessage = error instanceof Error ? error.message : t('users.failedToCreateInvitation');
    alert(errorMessage);
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
    alert(error instanceof Error ? error.message : t('messages.error'));
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
  // Prevent users from removing themselves
  if (isCurrentUser(siteUser)) {
    alert(t('users.cannotRemoveSelf'));
    return;
  }
  
  if (!confirm(t('users.confirmRemoveUser', { name: siteUser.expand?.user?.name || 'this user' }))) {
    return;
  }
  
  try {
    if (!currentSite.value) return;
    await removeUserFromSite(siteUser.user, currentSite.value.id!);
    await loadSiteUsers();
  } catch (error) {
    console.error('Error removing user:', error);
    alert(error instanceof Error ? error.message : t('messages.error'));
  }
};


const closeInviteModal = () => {
  showInviteModal.value = false;
  Object.assign(inviteForm, {
    email: '',
    role: ''
  });
};

// Watch for currentSite changes and load users
watch(currentSite, (newSite) => {
  if (newSite) {
    loadSiteUsers();
  }
}, { immediate: true });

onMounted(() => {
  loadSiteUsers();
});
</script>