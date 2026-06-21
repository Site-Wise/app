<template>
  <div class="min-h-screen bg-cream dark:bg-ink p-6">
    <!-- Header Section -->
    <div class="max-w-6xl mx-auto mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-3 bg-amber-500 rounded-xl">
              <Mail class="h-6 w-6 text-ink" />
            </div>
            <h1 class="sw-h1 font-display text-ink dark:text-cream">
              {{ t('users.invitations') }}
            </h1>
          </div>
          <p class="text-stone-600 dark:text-stone-400 max-w-2xl">
            {{ t('users.manageInvitations') }}
          </p>
        </div>

        <!-- Quick Stats -->
        <div class="flex items-center gap-4">
          <div class="bg-white dark:bg-ink-3 rounded-xl p-4 border border-stone-200 dark:border-ink-4 shadow-card">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-lg">
                <Clock class="h-5 w-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <p class="text-sm text-stone-600 dark:text-stone-400">{{ t('common.pending') }}</p>
                <p class="sw-stat font-mono sw-tabular text-ink dark:text-cream">{{ receivedInvitations.length }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-stone-600 dark:text-stone-400">
          <Loader2 class="h-6 w-6 animate-spin" />
          <span>{{ t('users.loadingInvitations') }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="receivedInvitations.length === 0" class="text-center py-16">
        <div class="mx-auto w-32 h-32 bg-stone-100 dark:bg-ink-3 rounded-2xl flex items-center justify-center mb-6">
          <Mail class="h-16 w-16 text-stone-400" />
        </div>
        <h3 class="sw-h3 font-display text-ink dark:text-cream mb-2">{{ t('users.noInvitations') }}</h3>
        <p class="text-stone-600 dark:text-stone-400 mb-6 max-w-md mx-auto">
          {{ t('users.noInvitationsMessage') }}
        </p>
        <button
          @click="$router.push('/dashboard')"
          class="inline-flex items-center px-6 py-3 bg-amber-500 text-ink font-medium rounded-md hover:bg-amber-600 transition-colors duration-200"
        >
          <ArrowLeft class="mr-2 h-4 w-4" />
          {{ t('nav.dashboard') }}
        </button>
      </div>

      <!-- Invitations Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div 
          v-for="invitation in receivedInvitations" 
          :key="invitation.id"
          class="bg-white dark:bg-ink-3 rounded-xl border border-stone-200 dark:border-ink-4 shadow-card hover:shadow-modal transition-all duration-300 overflow-hidden group"
        >
          <!-- Invitation Header -->
          <div class="p-6 bg-amber-50 dark:bg-amber-500/10 border-b border-stone-200 dark:border-ink-4">
            <div class="flex items-start justify-between">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-white dark:bg-ink-2 rounded-xl shadow-card">
                  <Building class="h-6 w-6 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <h3 class="text-lg font-display font-semibold text-ink dark:text-cream">
                    {{ invitation.expand?.site?.name || t('users.constructionSite') }}
                  </h3>
                  <p class="text-sm text-stone-600 dark:text-stone-400 mt-1">
                    {{ invitation.expand?.site?.description || t('users.noDescriptionAvailable') }}
                  </p>
                  <div class="flex items-center gap-4 mt-3">
                    <div class="flex items-center gap-2">
                      <div class="h-6 w-6 rounded-full bg-forest-500 flex items-center justify-center">
                        <span class="text-white text-xs font-medium">{{ getInviterInitials(invitation.expand?.invited_by?.name) }}</span>
                      </div>
                      <span class="text-sm text-stone-700 dark:text-stone-300">{{ invitation.expand?.invited_by?.name || t('common.unknown') }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Urgency Indicator -->
              <div class="flex flex-col items-end gap-2">
                <span :class="getRoleBadgeClass(invitation.role)">{{ t(`users.roles.${invitation.role}`) }}</span>
                <div class="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
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
                <div class="bg-stone-50 dark:bg-ink-2/50 rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-1">
                    <Home class="h-4 w-4 text-stone-500 dark:text-stone-400" />
                    <span class="text-xs font-medium text-stone-700 dark:text-stone-300">{{ t('site.totalUnits') }}</span>
                  </div>
                  <p class="text-sm font-mono sw-tabular font-semibold text-ink dark:text-cream">{{ invitation.expand?.site?.total_units || 0 }}</p>
                </div>
                <div class="bg-stone-50 dark:bg-ink-2/50 rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-1">
                    <Square class="h-4 w-4 text-stone-500 dark:text-stone-400" />
                    <span class="text-xs font-medium text-stone-700 dark:text-stone-300">{{ t('users.areaSqft') }}</span>
                  </div>
                  <p class="text-sm font-mono sw-tabular font-semibold text-ink dark:text-cream">{{ formatNumber(invitation.expand?.site?.total_planned_area || 0) }}</p>
                </div>
              </div>

              <!-- Role Description -->
              <div class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
                <h4 class="font-display font-medium text-ink dark:text-cream mb-2">{{ t('users.yourRole') }}: {{ t(`users.roles.${invitation.role}`) }}</h4>
                <p class="text-sm text-stone-700 dark:text-stone-300">{{ getRoleDescription(invitation.role) }}</p>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3 pt-2">
                <button 
                  @click="acceptInvitationFixed(invitation.id!)"
                  :disabled="acceptingInvite === invitation.id"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 dark:disabled:bg-ink-4 text-ink font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  <Loader2 v-if="acceptingInvite === invitation.id" class="h-4 w-4 animate-spin" />
                  <CheckCircle v-else class="h-4 w-4" />
                  {{ acceptingInvite === invitation.id ? t('users.accepting') : t('users.accept') }}
                </button>
                
                <button 
                  @click="declineInvitation(invitation.id!)"
                  :disabled="decliningInvite === invitation.id || !canDelete"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-stone-300 dark:border-ink-4 text-stone-700 dark:text-stone-300 font-medium rounded-md hover:bg-stone-50 dark:hover:bg-ink-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Loader2 v-if="decliningInvite === invitation.id" class="h-4 w-4 animate-spin" />
                  <X v-else class="h-4 w-4" />
                  {{ decliningInvite === invitation.id ? t('users.declining') : t('users.decline') }}
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
import { usePermissions } from '../composables/usePermissions';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const { success: showSuccess, error: showError } = useToast();
const router = useRouter();
const { 
  receivedInvitations, 
  isLoading, 
  loadReceivedInvitations, 
  acceptInvitation, 
  rejectInvitation 
} = useInvitations();
const { canDelete } = usePermissions();

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
    owner: 'sw-badge sw-badge--accent',
    supervisor: 'sw-badge sw-badge--success',
    accountant: 'sw-badge sw-badge--neutral'
  };
  return classes[role as keyof typeof classes] || 'sw-badge sw-badge--neutral';
};

const getRoleDescription = (role: string) => {
  const descriptions = {
    owner: t('users.roleDescriptions.ownerFull'),
    supervisor: t('users.roleDescriptions.supervisorFull'),
    accountant: t('users.roleDescriptions.accountantFull')
  };
  return descriptions[role as keyof typeof descriptions] || t('users.roleDescriptionNotAvailable');
};

const formatTimeLeft = (expiresAt: string) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) return t('common.expired');
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) return `${diffDays}${t('users.daysLeft')}`;
  if (diffHours > 0) return `${diffHours}${t('users.hoursLeft')}`;
  return t('users.expiresSoon');
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

const acceptInvitationHandler = async (invitationId: string) => {
  acceptingInvite.value = invitationId;
  try {
    await acceptInvitation(invitationId);
    showSuccess(t('users.invitationAccepted'));
    router.push('/dashboard');
  } catch (err) {
    console.error('Error accepting invitation:', err);
    showError(err instanceof Error ? err.message : t('users.failedToAcceptInvitation'));
  } finally {
    acceptingInvite.value = null;
  }
};

const declineInvitation = async (invitationId: string) => {
  if (!confirm(t('users.confirmDeclineInvitation'))) {
    return;
  }

  decliningInvite.value = invitationId;
  try {
    await rejectInvitation(invitationId);
    showSuccess(t('users.invitationDeclined'));
  } catch (err) {
    console.error('Error declining invitation:', err);
    showError(t('users.failedToDeclineInvitation'));
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