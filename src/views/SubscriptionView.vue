<template>
  <div class="min-h-screen bg-cream dark:bg-ink p-6">
    <!-- Header Section -->
    <div class="max-w-7xl mx-auto mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-xl">
              <CreditCard class="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <h1 class="sw-h1 font-display text-ink dark:text-cream">
              {{ t('subscription.title') }}
            </h1>
          </div>
          <p class="text-stone-600 dark:text-stone-400 max-w-2xl">
            {{ t('subscription.subtitle') }}
          </p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Current Subscription Card -->
      <div class="bg-white dark:bg-ink-3 rounded-xl border border-stone-200 dark:border-ink-4 shadow-card overflow-hidden">
        <div class="bg-amber-50 dark:bg-amber-500/10 p-6 border-b border-stone-200 dark:border-ink-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-md">
                <Package class="h-5 w-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 class="text-lg font-semibold font-display text-ink dark:text-cream">{{ t('subscription.currentPlan') }}</h3>
                <p class="text-sm text-stone-600 dark:text-stone-400">{{ t('subscription.activePlan') }}</p>
              </div>
            </div>
            <div v-if="currentSubscription" class="text-right">
              <span :class="getStatusBadgeClass(currentSubscription?.status)">
                {{ t(`subscription.status.${currentSubscription?.status}`) }}
              </span>
            </div>
          </div>
        </div>
        
        <div v-if="isLoading" class="p-8 text-center">
          <Loader2 class="h-8 w-8 animate-spin mx-auto text-stone-400" />
          <p class="mt-2 text-stone-600 dark:text-stone-400">{{ t('subscription.loading') }}</p>
        </div>

        <div v-else-if="error" class="p-8 text-center">
          <AlertCircle class="h-12 w-12 text-clay-500 mx-auto mb-2" />
          <p class="text-clay-600 dark:text-clay-400">{{ error }}</p>
        </div>

        <div v-else-if="currentSubscription && currentPlan" class="p-6">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Plan Details -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-xl font-bold font-display text-ink dark:text-cream">{{ currentPlan.name }}</h4>
                <div v-if="!isCurrentPlanFree()" class="text-right">
                  <span class="sw-stat font-mono sw-tabular text-amber-700 dark:text-amber-400">
                    {{ formatCurrency(currentPlan.price, currentPlan.currency) }}
                  </span>
                  <span class="text-sm text-stone-500 dark:text-stone-400">/{{ t('subscription.month') }}</span>
                </div>
                <div v-else class="text-right">
                  <span class="sw-stat font-display text-forest-600 dark:text-forest-400">
                    {{ t('subscription.free') }}
                  </span>
                </div>
              </div>
              
              <div class="space-y-3">
                <!-- Show billing info only for paid plans -->
                <div v-if="!isCurrentPlanFree()" class="flex items-center justify-between p-3 bg-stone-50 dark:bg-ink-2 rounded-md">
                  <span class="text-sm text-stone-600 dark:text-stone-400">{{ t('subscription.nextBilling') }}</span>
                  <span class="font-medium text-ink dark:text-cream">
                    {{ formatDate(currentSubscription?.current_period_end || '') }}
                  </span>
                </div>
                <div v-if="!isCurrentPlanFree()" class="flex items-center justify-between p-3 bg-stone-50 dark:bg-ink-2 rounded-md">
                  <span class="text-sm text-stone-600 dark:text-stone-400">{{ t('subscription.billingCycle') }}</span>
                  <span class="font-medium text-ink dark:text-cream">{{ t('subscription.monthly') }}</span>
                </div>

                <!-- Free plan info -->
                <div v-if="isCurrentPlanFree()" class="flex items-center justify-between p-3 bg-forest-500/10 dark:bg-forest-500/15 rounded-md">
                  <span class="text-sm text-forest-700 dark:text-forest-400">{{ t('subscription.planType') }}</span>
                  <span class="font-medium text-forest-700 dark:text-forest-400">{{ t('subscription.freeForever') }}</span>
                </div>

                <div v-if="currentSubscription?.cancel_at_period_end" class="flex items-center justify-between p-3 bg-clay-500/10 dark:bg-clay-500/15 rounded-md">
                  <span class="text-sm text-clay-700 dark:text-clay-400">{{ t('subscription.cancelledOn') }}</span>
                  <span class="font-medium text-clay-700 dark:text-clay-400">
                    {{ formatDate(currentSubscription?.cancelled_at || '') }}
                  </span>
                </div>
              </div>

              <!-- Subscription Status Messages -->
              <div v-if="subscriptionStatus === 'cancelled'" class="mt-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-md">
                <div class="flex items-center gap-2">
                  <AlertTriangle class="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  <span class="text-sm font-medium text-amber-800 dark:text-amber-400">
                    {{ t('subscription.cancellationScheduled', { date: formatDate(currentSubscription?.current_period_end || '') }) }}
                  </span>
                </div>
                <p class="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  {{ t('subscription.cancellationNote') }}
                </p>
              </div>

              <!-- Plan Actions -->
              <div class="mt-6 flex gap-3">
                <button
                  v-if="canReactivateSubscription"
                  @click="confirmReactivate"
                  class="flex-1 px-4 py-2 bg-forest-500 text-white hover:bg-forest-500/90 rounded-md transition-colors"
                >
                  {{ t('subscription.reactivate') }}
                </button>
                <button
                  v-else-if="!isSubscriptionCancelled && !isCurrentPlanFree()"
                  @click="showCancelModal = true"
                  class="flex-1 px-4 py-2 border border-clay-500/50 text-clay-700 hover:bg-clay-500/10 dark:border-clay-500/50 dark:text-clay-400 dark:hover:bg-clay-500/15 rounded-md transition-colors"
                >
                  {{ t('subscription.cancelPlan') }}
                </button>
                <button 
                  @click="showUpgradeModal = true"
                  class="btn-primary flex-1"
                >
                  {{ getActionButtonText() }}
                </button>
              </div>
            </div>

            <!-- Usage Overview -->
            <div>
              <h4 class="text-lg font-semibold font-display text-ink dark:text-cream mb-4">{{ t('subscription.currentUsage') }}</h4>
              <div class="space-y-4">
                <div v-for="(limit, key) in usageLimits" :key="key" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-stone-700 dark:text-stone-300">
                      {{ t(`subscription.limits.${key}`) }}
                    </span>
                    <span class="text-sm font-mono sw-tabular text-stone-600 dark:text-stone-400">
                      <template v-if="limit.disabled">
                        {{ t('subscription.featureDisabled') }}
                      </template>
                      <template v-else-if="limit.unlimited">
                        {{ limit.current }} / {{ t('subscription.unlimited') }}
                      </template>
                      <template v-else>
                        {{ limit.current }} / {{ limit.max }}
                      </template>
                    </span>
                  </div>
                  <div v-if="!limit.disabled" class="w-full bg-stone-200 dark:bg-ink-2 rounded-full h-2">
                    <div
                      :class="[
                        'h-2 rounded-full transition-all duration-300',
                        limit.exceeded ? 'bg-clay-500' : limit.unlimited ? 'bg-forest-500' : 'bg-amber-500'
                      ]"
                      :style="{ width: getUsagePercentage(limit) + '%' }"
                    ></div>
                  </div>
                  <div v-if="limit.disabled" class="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                    <X class="h-3 w-3" />
                    {{ t('subscription.featureNotAvailable') }}
                  </div>
                  <div v-else-if="limit.exceeded" class="flex items-center gap-1 text-xs text-clay-600 dark:text-clay-400">
                    <AlertTriangle class="h-3 w-3" />
                    {{ t('subscription.limitExceeded') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="p-8 text-center">
          <Package class="h-12 w-12 text-stone-400 mx-auto mb-2" />
          <p class="text-stone-600 dark:text-stone-400">{{ t('subscription.noSubscription') }}</p>
          <button 
            @click="showUpgradeModal = true"
            class="btn-primary"
          >
            {{ t('subscription.getStarted') }}
          </button>
        </div>
      </div>

      <!-- Available Plans (shown when upgrading) -->
      <div v-if="showUpgradeModal" class="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
        <div class="bg-white dark:bg-ink-3 rounded-xl shadow-modal border border-stone-200 dark:border-ink-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-stone-200 dark:border-ink-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-bold font-display text-ink dark:text-cream">{{ t('subscription.choosePlan') }}</h3>
                <p class="text-sm text-stone-600 dark:text-stone-400">{{ t('subscription.selectPlanDescription') }}</p>
              </div>
              <button @click="showUpgradeModal = false" class="p-2 hover:bg-stone-100 dark:hover:bg-ink-2 rounded-md">
                <X class="h-5 w-5 text-stone-500" />
              </button>
            </div>
          </div>

          <div class="p-6">
            <div v-if="plansLoading" class="text-center py-8">
              <Loader2 class="h-8 w-8 animate-spin mx-auto text-stone-400" />
              <p class="mt-2 text-stone-600 dark:text-stone-400">{{ t('subscription.loadingPlans') }}</p>
            </div>
            
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="plan in availablePlans" :key="plan.id" class="relative">
                <div :class="[
                  'p-6 border-2 rounded-xl transition-all duration-200 cursor-pointer',
                  plan.id === currentPlan?.id
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                    : 'border-stone-200 dark:border-ink-4 hover:border-amber-300 dark:hover:border-amber-500'
                ]" @click="selectPlan(plan)">
                  <div v-if="plan.id === currentPlan?.id" class="absolute top-4 right-4">
                    <span class="sw-eyebrow inline-flex items-center px-2 py-1 rounded-md bg-amber-500 text-ink">
                      {{ t('subscription.current') }}
                    </span>
                  </div>

                  <div class="text-center">
                    <h4 class="text-lg font-bold font-display text-ink dark:text-cream">{{ plan.name }}</h4>
                    <div class="mt-2">
                      <span v-if="plan.price === 0 || plan.is_default" class="sw-stat font-display text-forest-600 dark:text-forest-400">
                        {{ t('subscription.free') }}
                      </span>
                      <div v-else>
                        <span class="sw-stat font-mono sw-tabular text-amber-700 dark:text-amber-400">
                          {{ formatCurrency(plan.price, plan.currency) }}
                        </span>
                        <span class="text-stone-500 dark:text-stone-400">/{{ t('subscription.month') }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mt-6 space-y-3">
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-stone-700 dark:text-stone-300">{{ t('subscription.limits.items') }}</span>
                      <span class="font-medium font-mono sw-tabular text-ink dark:text-cream">
                        {{ formatPlanLimit(plan.features.max_items) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-stone-700 dark:text-stone-300">{{ t('subscription.limits.vendors') }}</span>
                      <span class="font-medium font-mono sw-tabular text-ink dark:text-cream">
                        {{ formatPlanLimit(plan.features.max_vendors) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-stone-700 dark:text-stone-300">{{ t('subscription.limits.deliveries') }}</span>
                      <span class="font-medium font-mono sw-tabular text-ink dark:text-cream">
                        {{ formatPlanLimit(plan.features.max_deliveries) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-stone-700 dark:text-stone-300">{{ t('subscription.limits.services') }}</span>
                      <span class="font-medium font-mono sw-tabular text-ink dark:text-cream">
                        {{ formatPlanLimit(plan.features.max_services) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-stone-700 dark:text-stone-300">{{ t('subscription.limits.service_bookings') }}</span>
                      <span class="font-medium font-mono sw-tabular text-ink dark:text-cream">
                        {{ formatPlanLimit(plan.features.max_service_bookings) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-stone-700 dark:text-stone-300">{{ t('subscription.limits.payments') }}</span>
                      <span class="font-medium font-mono sw-tabular text-ink dark:text-cream">
                        {{ formatPlanLimit(plan.features.max_payments) }}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    v-if="plan.id !== currentPlan?.id"
                    @click.stop="upgradeToPlan(plan)"
                    :disabled="upgrading"
                    class="w-full mt-6 btn-primary"
                  >
                    {{ upgrading ? t('subscription.upgrading') : getUpgradeButtonText(plan) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cancel Subscription Modal -->
      <div v-if="showCancelModal" class="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
        <div class="bg-white dark:bg-ink-3 rounded-xl shadow-modal border border-stone-200 dark:border-ink-4 w-full max-w-md">
          <div class="p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-3 bg-clay-500/10 dark:bg-clay-500/15 rounded-xl">
                <AlertTriangle class="h-6 w-6 text-clay-500" />
              </div>
              <div>
                <h3 class="text-lg font-bold font-display text-ink dark:text-cream">{{ t('subscription.cancelSubscription') }}</h3>
                <p class="text-sm text-stone-600 dark:text-stone-400">{{ t('subscription.confirmCancel') }}</p>
              </div>
            </div>

            <div class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-md p-4 mb-6">
              <p class="text-sm text-amber-800 dark:text-amber-400">
                {{ t('subscription.cancelNote', { date: formatDate(currentSubscription?.current_period_end || '') }) }}
              </p>
            </div>

            <div class="flex gap-3">
              <button
                @click="confirmCancel"
                :disabled="cancelling"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-clay-500 text-white hover:bg-clay-500/90 disabled:bg-stone-400 rounded-md transition-colors"
              >
                <Loader2 v-if="cancelling" class="h-4 w-4 animate-spin" />
                {{ cancelling ? t('subscription.cancelling') : t('subscription.confirmCancelButton') }}
              </button>
              <button
                @click="showCancelModal = false"
                class="flex-1 px-4 py-2 border border-stone-300 dark:border-ink-4 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-ink-2 rounded-md transition-colors"
              >
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  CreditCard, 
  Package, 
  Loader2, 
  AlertCircle, 
  AlertTriangle,
  X
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useModalEscape } from '../composables/useModalEscape';
import { useSubscription, type SubscriptionPlan } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const { success: showSuccess, error: showError } = useToast();
const {
  currentSubscription,
  currentPlan,
  usageLimits,
  isLoading,
  error,
  subscriptionStatus,
  isSubscriptionCancelled,
  canReactivateSubscription,
  getAllPlans,
  upgradeSubscription,
  cancelSubscription,
  reactivateSubscription,
  initializeRazorpayCheckout
} = useSubscription();

const showUpgradeModal = ref(false);
const showCancelModal = ref(false);

// ESC key handling for modals
useModalEscape(() => { showUpgradeModal.value = false; }, () => showUpgradeModal.value);
useModalEscape(() => { showCancelModal.value = false; }, () => showCancelModal.value);

const availablePlans = ref<SubscriptionPlan[]>([]);
const plansLoading = ref(false);
const upgrading = ref(false);
const cancelling = ref(false);

const getStatusBadgeClass = (status: string | undefined) => {
  if (!status) return 'sw-badge sw-badge--neutral';

  const classes = {
    active: 'sw-badge sw-badge--success',
    cancelled: 'sw-badge sw-badge--danger',
    expired: 'sw-badge sw-badge--neutral',
    past_due: 'sw-badge sw-badge--neutral'
  };
  return classes[status as keyof typeof classes] || 'sw-badge sw-badge--neutral';
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getUsagePercentage = (limit: { current: number; max: number; disabled: boolean; unlimited: boolean }) => {
  if (limit.disabled) return 0; // No progress bar for disabled features
  if (limit.unlimited) return Math.min((limit.current / 100) * 100, 100); // Show some progress for unlimited
  return Math.min((limit.current / limit.max) * 100, 100);
};

const formatPlanLimit = (limit: number): string => {
  if (limit === -1) return t('subscription.unlimited');
  if (limit === 0) return t('subscription.disabled');
  return limit.toString();
};

const loadPlans = async () => {
  plansLoading.value = true;
  try {
    availablePlans.value = await getAllPlans();
  } catch (err) {
    console.error('Error loading plans:', err);
  } finally {
    plansLoading.value = false;
  }
};

const selectPlan = (_plan: SubscriptionPlan) => {
  // Plan selection logic can be implemented here
};

const upgradeToPlan = async (plan: SubscriptionPlan) => {
  if (!plan.id) return;
  
  upgrading.value = true;
  try {
    // For free plans, upgrade immediately
    if (plan.price === 0) {
      await upgradeSubscription(plan.id);
      showUpgradeModal.value = false;
    } else {
      // For paid plans, use Razorpay checkout
      showUpgradeModal.value = false;
      await initializeRazorpayCheckout(plan.id);
    }
  } catch (err) {
    console.error('Error upgrading subscription:', err);
    showError(err instanceof Error ? err.message : t('subscription.upgradeError'));
  } finally {
    upgrading.value = false;
  }
};

const confirmReactivate = async () => {
  try {
    await reactivateSubscription();
    showSuccess(t('subscription.reactivateSuccess'));
  } catch (err) {
    console.error('Error reactivating subscription:', err);
    showError(err instanceof Error ? err.message : t('subscription.reactivateError'));
  }
};

const isCurrentPlanFree = () => {
  return currentPlan?.price === 0 || currentPlan?.is_default;
};

const getActionButtonText = () => {
  if (isSubscriptionCancelled) {
    return t('subscription.resubscribe');
  }
  
  return isCurrentPlanFree() ? t('subscription.upgrade') : t('subscription.changePlan');
};

const getUpgradeButtonText = (plan: SubscriptionPlan) => {
  const isPlanFree = plan.price === 0 || plan.is_default;
  const currentPlanIsFree = isCurrentPlanFree();
  
  if (isSubscriptionCancelled) {
    return isPlanFree ? t('subscription.reactivate') : t('subscription.subscribe');
  }
  
  // If switching to a free plan, show "Switch to Free"
  if (isPlanFree && !currentPlanIsFree) {
    return t('subscription.switchToFree');
  }
  
  // If switching from free plan to paid plan
  if (!isPlanFree && currentPlanIsFree) {
    return t('subscription.subscribe');
  }
  
  const currentPrice = currentPlan?.price || 0;
  if (plan.price > currentPrice) {
    return t('subscription.upgrade');
  } else if (plan.price < currentPrice) {
    return t('subscription.downgrade');
  } else {
    return t('subscription.switchPlan');
  }
};

const confirmCancel = async () => {
  cancelling.value = true;
  try {
    await cancelSubscription();
    showCancelModal.value = false;
  } catch (err) {
    console.error('Error cancelling subscription:', err);
    showError(err instanceof Error ? err.message : t('subscription.cancelError'));
  } finally {
    cancelling.value = false;
  }
};

onMounted(() => {
  loadPlans();
});
</script>