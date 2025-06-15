<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
    <!-- Header Section -->
    <div class="max-w-7xl mx-auto mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-gradient-to-r from-orange-500 to-pink-600 rounded-xl">
              <CreditCard class="h-6 w-6 text-white" />
            </div>
            <h1 class="text-3xl font-bold bg-gray-900 dark:bg-gray-300 bg-clip-text text-transparent">
              {{ t('subscription.title') }}
            </h1>
          </div>
          <p class="text-gray-600 dark:text-gray-400 max-w-2xl">
            {{ t('subscription.subtitle') }}
          </p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Current Subscription Card -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div class="bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Package class="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('subscription.currentPlan') }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('subscription.activePlan') }}</p>
              </div>
            </div>
            <div v-if="currentSubscription" class="text-right">
              <span :class="getStatusBadgeClass(currentSubscription.status)">
                {{ t(`subscription.status.${currentSubscription.status}`) }}
              </span>
            </div>
          </div>
        </div>
        
        <div v-if="isLoading" class="p-8 text-center">
          <Loader2 class="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p class="mt-2 text-gray-600 dark:text-gray-400">{{ t('subscription.loading') }}</p>
        </div>

        <div v-else-if="error" class="p-8 text-center">
          <AlertCircle class="h-12 w-12 text-red-500 mx-auto mb-2" />
          <p class="text-red-600 dark:text-red-400">{{ error }}</p>
        </div>

        <div v-else-if="currentSubscription && currentPlan" class="p-6">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Plan Details -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-xl font-bold text-gray-900 dark:text-white">{{ currentPlan.name }}</h4>
                <div class="text-right">
                  <span class="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {{ formatCurrency(currentPlan.price, currentPlan.currency) }}
                  </span>
                  <span class="text-sm text-gray-500 dark:text-gray-400">/{{ t('subscription.month') }}</span>
                </div>
              </div>
              
              <div class="space-y-3">
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('subscription.nextBilling') }}</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    {{ formatDate(currentSubscription.current_period_end) }}
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('subscription.billingCycle') }}</span>
                  <span class="font-medium text-gray-900 dark:text-white">{{ t('subscription.monthly') }}</span>
                </div>
                <div v-if="currentSubscription.cancel_at_period_end" class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span class="text-sm text-red-600 dark:text-red-400">{{ t('subscription.cancelledOn') }}</span>
                  <span class="font-medium text-red-700 dark:text-red-300">
                    {{ formatDate(currentSubscription.cancelled_at!) }}
                  </span>
                </div>
              </div>

              <!-- Plan Actions -->
              <div class="mt-6 flex gap-3">
                <button 
                  v-if="!currentSubscription.cancel_at_period_end && !currentPlan.is_default"
                  @click="showCancelModal = true"
                  class="flex-1 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  {{ t('subscription.cancelPlan') }}
                </button>
                <button 
                  @click="showUpgradeModal = true"
                  class="btn-primary flex-1"
                >
                  {{ currentPlan.is_default ? t('subscription.upgrade') : t('subscription.changePlan') }}
                </button>
              </div>
            </div>

            <!-- Usage Overview -->
            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('subscription.currentUsage') }}</h4>
              <div class="space-y-4">
                <div v-for="(limit, key) in usageLimits" :key="key" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {{ t(`subscription.limits.${key}`) }}
                    </span>
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                      {{ limit.current }} / {{ limit.max === -1 ? '∞' : limit.max }}
                    </span>
                  </div>
                  <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      :class="[
                        'h-2 rounded-full transition-all duration-300',
                        limit.exceeded ? 'bg-red-500' : 'bg-orange-500'
                      ]"
                      :style="{ width: getUsagePercentage(limit) + '%' }"
                    ></div>
                  </div>
                  <div v-if="limit.exceeded" class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle class="h-3 w-3" />
                    {{ t('subscription.limitExceeded') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="p-8 text-center">
          <Package class="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p class="text-gray-600 dark:text-gray-400">{{ t('subscription.noSubscription') }}</p>
          <button 
            @click="showUpgradeModal = true"
            class="btn-primary"
          >
            {{ t('subscription.getStarted') }}
          </button>
        </div>
      </div>

      <!-- Available Plans (shown when upgrading) -->
      <div v-if="showUpgradeModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('subscription.choosePlan') }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('subscription.selectPlanDescription') }}</p>
              </div>
              <button @click="showUpgradeModal = false" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X class="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div class="p-6">
            <div v-if="plansLoading" class="text-center py-8">
              <Loader2 class="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p class="mt-2 text-gray-600 dark:text-gray-400">{{ t('subscription.loadingPlans') }}</p>
            </div>
            
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="plan in availablePlans" :key="plan.id" class="relative">
                <div :class="[
                  'p-6 border-2 rounded-xl transition-all duration-200 cursor-pointer',
                  plan.id === currentPlan?.id 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500'
                ]" @click="selectPlan(plan)">
                  <div v-if="plan.id === currentPlan?.id" class="absolute top-4 right-4">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                      {{ t('subscription.current') }}
                    </span>
                  </div>
                  
                  <div class="text-center">
                    <h4 class="text-lg font-bold text-gray-900 dark:text-white">{{ plan.name }}</h4>
                    <div class="mt-2">
                      <span class="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {{ formatCurrency(plan.price, plan.currency) }}
                      </span>
                      <span class="text-gray-500 dark:text-gray-400">/{{ t('subscription.month') }}</span>
                    </div>
                  </div>
                  
                  <div class="mt-6 space-y-3">
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600 dark:text-gray-400">{{ t('subscription.limits.items') }}</span>
                      <span class="font-medium text-gray-900 dark:text-white">
                        {{ plan.features.max_items === -1 ? t('subscription.unlimited') : plan.features.max_items }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600 dark:text-gray-400">{{ t('subscription.limits.vendors') }}</span>
                      <span class="font-medium text-gray-900 dark:text-white">
                        {{ plan.features.max_vendors === -1 ? t('subscription.unlimited') : plan.features.max_vendors }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600 dark:text-gray-400">{{ t('subscription.limits.incoming_deliveries') }}</span>
                      <span class="font-medium text-gray-900 dark:text-white">
                        {{ plan.features.max_incoming_deliveries === -1 ? t('subscription.unlimited') : plan.features.max_incoming_deliveries }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600 dark:text-gray-400">{{ t('subscription.limits.service_bookings') }}</span>
                      <span class="font-medium text-gray-900 dark:text-white">
                        {{ plan.features.max_service_bookings === -1 ? t('subscription.unlimited') : plan.features.max_service_bookings }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600 dark:text-gray-400">{{ t('subscription.limits.payments') }}</span>
                      <span class="font-medium text-gray-900 dark:text-white">
                        {{ plan.features.max_payments === -1 ? t('subscription.unlimited') : plan.features.max_payments }}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    v-if="plan.id !== currentPlan?.id"
                    @click.stop="upgradeToPlan(plan)"
                    :disabled="upgrading"
                    class="w-full mt-6 btn-primary"
                  >
                    {{ upgrading ? t('subscription.upgrading') : (plan.price > (currentPlan?.price || 0) ? t('subscription.upgrade') : t('subscription.downgrade')) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cancel Subscription Modal -->
      <div v-if="showCancelModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
          <div class="p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertTriangle class="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('subscription.cancelSubscription') }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('subscription.confirmCancel') }}</p>
              </div>
            </div>
            
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p class="text-sm text-amber-800 dark:text-amber-200">
                {{ t('subscription.cancelNote', { date: formatDate(currentSubscription?.current_period_end || '') }) }}
              </p>
            </div>
            
            <div class="flex gap-3">
              <button 
                @click="confirmCancel"
                :disabled="cancelling"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 rounded-lg transition-colors"
              >
                <Loader2 v-if="cancelling" class="h-4 w-4 animate-spin" />
                {{ cancelling ? t('subscription.cancelling') : t('subscription.confirmCancelButton') }}
              </button>
              <button 
                @click="showCancelModal = false"
                class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
import { useSubscription, type SubscriptionPlan } from '../composables/useSubscription';

const { t } = useI18n();
const {
  currentSubscription,
  currentPlan,
  usageLimits,
  isLoading,
  error,
  getAllPlans,
  upgradeSubscription,
  cancelSubscription
} = useSubscription();

const showUpgradeModal = ref(false);
const showCancelModal = ref(false);
const availablePlans = ref<SubscriptionPlan[]>([]);
const plansLoading = ref(false);
const upgrading = ref(false);
const cancelling = ref(false);

const getStatusBadgeClass = (status: string) => {
  const classes = {
    active: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    cancelled: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    expired: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300',
    past_due: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
  };
  return classes[status as keyof typeof classes] || 'status-badge';
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

const getUsagePercentage = (limit: { current: number; max: number }) => {
  if (limit.max === -1) return Math.min((limit.current / 100) * 100, 100);
  return Math.min((limit.current / limit.max) * 100, 100);
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

const selectPlan = (plan: SubscriptionPlan) => {
  console.log('Selected plan:', plan);
};

const upgradeToPlan = async (plan: SubscriptionPlan) => {
  if (!plan.id) return;
  
  upgrading.value = true;
  try {
    await upgradeSubscription(plan.id);
    showUpgradeModal.value = false;
  } catch (err) {
    console.error('Error upgrading subscription:', err);
    alert(err instanceof Error ? err.message : t('subscription.upgradeError'));
  } finally {
    upgrading.value = false;
  }
};

const confirmCancel = async () => {
  cancelling.value = true;
  try {
    await cancelSubscription();
    showCancelModal.value = false;
  } catch (err) {
    console.error('Error cancelling subscription:', err);
    alert(err instanceof Error ? err.message : t('subscription.cancelError'));
  } finally {
    cancelling.value = false;
  }
};

onMounted(() => {
  loadPlans();
});
</script>