<template>
  <div
    v-if="showBanner"
    class="bg-amber-50 border-b border-amber-200 px-4 py-3"
  >
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-amber-800">
            {{ bannerMessage }}
          </p>
          <p v-if="usageLimits" class="text-xs text-amber-700 mt-1">
            {{ usageDetails }}
          </p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <router-link
          v-if="!isUpgradePending"
          :to="{ name: 'subscription' }"
          class="bg-amber-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-amber-700 transition-colors"
        >
          {{ t('subscription.upgrade') }}
        </router-link>
        <button
          v-if="canDismiss"
          @click="dismissBanner"
          class="text-amber-600 hover:text-amber-800 p-1"
          :aria-label="t('common.dismiss')"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSubscription } from '../composables/useSubscription';
import { useI18n } from '../composables/useI18n';

interface Props {
  canDismiss?: boolean;
  persistent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canDismiss: false,
  persistent: false
});

const { t } = useI18n();
const { isReadOnly, currentPlan, usageLimits, isSubscriptionActive } = useSubscription();

const isDismissed = ref(false);
const isUpgradePending = ref(false);

const showBanner = computed(() => {
  if (isDismissed.value && !props.persistent) return false;
  return isReadOnly.value || !isSubscriptionActive.value;
});

const bannerMessage = computed(() => {
  if (!isSubscriptionActive.value) {
    return t('subscription.banner.subscriptionExpired');
  }
  
  if (isReadOnly.value) {
    if (currentPlan.value?.name === 'Free') {
      return t('subscription.banner.freeTierLimitReached');
    }
    return t('subscription.banner.subscriptionLimitReached');
  }
  
  return '';
});

const usageDetails = computed(() => {
  if (!usageLimits.value) return '';
  
  const exceededLimits: string[] = [];
  
  if (usageLimits.value.items.exceeded) {
    exceededLimits.push(t('subscription.limits.items', { 
      current: usageLimits.value.items.current, 
      max: usageLimits.value.items.max 
    }));
  }
  
  if (usageLimits.value.vendors.exceeded) {
    exceededLimits.push(t('subscription.limits.vendors', { 
      current: usageLimits.value.vendors.current, 
      max: usageLimits.value.vendors.max 
    }));
  }
  
  if (usageLimits.value.deliveries.exceeded) {
    exceededLimits.push(t('subscription.limits.deliveries', { 
      current: usageLimits.value.deliveries.current, 
      max: usageLimits.value.deliveries.max 
    }));
  }
  
  if (usageLimits.value.service_bookings.exceeded) {
    exceededLimits.push(t('subscription.limits.serviceBookings', { 
      current: usageLimits.value.service_bookings.current, 
      max: usageLimits.value.service_bookings.max 
    }));
  }
  
  if (usageLimits.value.payments.exceeded) {
    exceededLimits.push(t('subscription.limits.payments', { 
      current: usageLimits.value.payments.current, 
      max: usageLimits.value.payments.max 
    }));
  }
  
  return exceededLimits.join(', ');
});

const dismissBanner = () => {
  isDismissed.value = true;
};

// Reset dismissed state when banner conditions change
const resetDismissed = () => {
  isDismissed.value = false;
};

// Expose methods for parent components
defineExpose({
  resetDismissed
});
</script>