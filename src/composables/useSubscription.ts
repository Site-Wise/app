import { ref, computed, watch } from 'vue';
import { pb, getCurrentSiteId, type Site } from '../services/pocketbase';

export interface SubscriptionPlan {
  id?: string;
  name: string;
  price: number;
  currency: string;
  features: {
    max_items: number;
    max_vendors: number;
    max_incoming_deliveries: number;
    max_service_bookings: number;
    max_payments: number;
    max_sites: number;
  };
  is_active: boolean;
  is_default: boolean;
  created?: string;
  updated?: string;
}

export interface SiteSubscription {
  id?: string;
  site: string;
  subscription_plan: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  razorpay_subscription_id?: string;
  razorpay_customer_id?: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  trial_end?: string;
  created?: string;
  updated?: string;
  expand?: {
    subscription_plan?: SubscriptionPlan;
    site?: Site;
  };
}

export interface SubscriptionUsage {
  id?: string;
  site: string;
  period_start: string;
  period_end: string;
  items_count: number;
  vendors_count: number;
  incoming_deliveries_count: number;
  service_bookings_count: number;
  payments_count: number;
  created?: string;
  updated?: string;
}

export interface PaymentTransaction {
  id?: string;
  site_subscription: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  payment_method?: string;
  failure_reason?: string;
  created?: string;
  updated?: string;
}

export interface UsageLimits {
  items: { current: number; max: number; exceeded: boolean };
  vendors: { current: number; max: number; exceeded: boolean };
  incoming_deliveries: { current: number; max: number; exceeded: boolean };
  service_bookings: { current: number; max: number; exceeded: boolean };
  payments: { current: number; max: number; exceeded: boolean };
}

const currentSubscription = ref<SiteSubscription | null>(null);
const currentUsage = ref<SubscriptionUsage | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

export function useSubscription() {
  const siteId = getCurrentSiteId();

  // Computed properties
  const isReadOnly = computed(() => {
    if (!currentSubscription.value || !currentUsage.value) return false;
    
    const plan = currentSubscription.value.expand?.subscription_plan;
    if (!plan) return false;

    const usage = currentUsage.value;
    
    // Check if any limit is exceeded
    return (
      (plan.features.max_items !== -1 && usage.items_count >= plan.features.max_items) ||
      (plan.features.max_vendors !== -1 && usage.vendors_count >= plan.features.max_vendors) ||
      (plan.features.max_incoming_deliveries !== -1 && usage.incoming_deliveries_count >= plan.features.max_incoming_deliveries) ||
      (plan.features.max_service_bookings !== -1 && usage.service_bookings_count >= plan.features.max_service_bookings) ||
      (plan.features.max_payments !== -1 && usage.payments_count >= plan.features.max_payments)
    );
  });

  const isSubscriptionActive = computed(() => {
    return currentSubscription.value?.status === 'active';
  });

  const currentPlan = computed(() => {
    return currentSubscription.value?.expand?.subscription_plan;
  });

  const usageLimits = computed((): UsageLimits | null => {
    if (!currentSubscription.value || !currentUsage.value) return null;
    
    const plan = currentSubscription.value.expand?.subscription_plan;
    if (!plan) return null;

    const usage = currentUsage.value;
    
    return {
      items: {
        current: usage.items_count,
        max: plan.features.max_items,
        exceeded: plan.features.max_items !== -1 && usage.items_count >= plan.features.max_items
      },
      vendors: {
        current: usage.vendors_count,
        max: plan.features.max_vendors,
        exceeded: plan.features.max_vendors !== -1 && usage.vendors_count >= plan.features.max_vendors
      },
      incoming_deliveries: {
        current: usage.incoming_deliveries_count,
        max: plan.features.max_incoming_deliveries,
        exceeded: plan.features.max_incoming_deliveries !== -1 && usage.incoming_deliveries_count >= plan.features.max_incoming_deliveries
      },
      service_bookings: {
        current: usage.service_bookings_count,
        max: plan.features.max_service_bookings,
        exceeded: plan.features.max_service_bookings !== -1 && usage.service_bookings_count >= plan.features.max_service_bookings
      },
      payments: {
        current: usage.payments_count,
        max: plan.features.max_payments,
        exceeded: plan.features.max_payments !== -1 && usage.payments_count >= plan.features.max_payments
      }
    };
  });

  // Methods
  const loadSubscription = async (): Promise<void> => {
    if (!siteId) {
      error.value = 'No site selected';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Get current subscription for site
      const subscription = await pb.collection('site_subscriptions').getFirstListItem(
        `site="${siteId}"`,
        { expand: 'subscription_plan,site' }
      );
      currentSubscription.value = subscription as unknown as SiteSubscription;

      // Get current usage period
      const periodStart = new Date(subscription.current_period_start);
      const periodEnd = new Date(subscription.current_period_end);

      // Try to get existing usage record for current period
      try {
        const usage = await pb.collection('subscription_usage').getFirstListItem(
          `site="${siteId}" && period_start="${periodStart.toISOString()}" && period_end="${periodEnd.toISOString()}"`
        );
        currentUsage.value = usage as unknown as SubscriptionUsage;
      } catch {
        // Create new usage record if it doesn't exist
        const usage = await pb.collection('subscription_usage').create({
          site: siteId,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          items_count: 0,
          vendors_count: 0,
          incoming_deliveries_count: 0,
          service_bookings_count: 0,
          payments_count: 0
        });
        currentUsage.value = usage as unknown as SubscriptionUsage;
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load subscription';
      console.error('Error loading subscription:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const createDefaultSubscription = async (siteId: string): Promise<void> => {
    try {
      // Get default plan
      const defaultPlan = await pb.collection('subscription_plans').getFirstListItem(
        'is_default=true && is_active=true'
      );

      // Create subscription for new site
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await pb.collection('site_subscriptions').create({
        site: siteId,
        subscription_plan: defaultPlan.id,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false
      });

    } catch (err) {
      console.error('Error creating default subscription:', err);
      throw err;
    }
  };

  // Legacy method for backward compatibility
  const createFreeTierSubscription = async (siteId: string): Promise<void> => {
    return createDefaultSubscription(siteId);
  };

  const checkCreateLimit = (type: 'items' | 'vendors' | 'incoming_deliveries' | 'service_bookings' | 'payments'): boolean => {
    if (!currentSubscription.value || !currentUsage.value) return false;
    
    const plan = currentSubscription.value.expand?.subscription_plan;
    if (!plan) return false;

    const usage = currentUsage.value;
    
    switch (type) {
      case 'items':
        return plan.features.max_items === -1 || usage.items_count < plan.features.max_items;
      case 'vendors':
        return plan.features.max_vendors === -1 || usage.vendors_count < plan.features.max_vendors;
      case 'incoming_deliveries':
        return plan.features.max_incoming_deliveries === -1 || usage.incoming_deliveries_count < plan.features.max_incoming_deliveries;
      case 'service_bookings':
        return plan.features.max_service_bookings === -1 || usage.service_bookings_count < plan.features.max_service_bookings;
      case 'payments':
        return plan.features.max_payments === -1 || usage.payments_count < plan.features.max_payments;
      default:
        return false;
    }
  };

  const incrementUsage = async (type: 'items' | 'vendors' | 'incoming_deliveries' | 'service_bookings' | 'payments'): Promise<void> => {
    console.log('incrementUsage called for type:', type);
    console.log('currentUsage.value:', currentUsage.value);
    console.log('currentSubscription.value:', currentSubscription.value);
    
    if (!currentUsage.value) {
      console.error('No current usage found when trying to increment');
      return;
    }

    const updates: Partial<SubscriptionUsage> = {};
    
    switch (type) {
      case 'items':
        updates.items_count = currentUsage.value.items_count + 1;
        break;
      case 'vendors':
        updates.vendors_count = currentUsage.value.vendors_count + 1;
        break;
      case 'incoming_deliveries':
        updates.incoming_deliveries_count = currentUsage.value.incoming_deliveries_count + 1;
        break;
      case 'service_bookings':
        updates.service_bookings_count = currentUsage.value.service_bookings_count + 1;
        break;
      case 'payments':
        updates.payments_count = currentUsage.value.payments_count + 1;
        break;
    }

    console.log('Updates to apply:', updates);

    try {
      const updated = await pb.collection('subscription_usage').update(currentUsage.value.id!, updates);
      console.log('Usage updated in database:', updated);
      currentUsage.value = updated as unknown as SubscriptionUsage;
      console.log('Local usage state updated:', currentUsage.value);
    } catch (err) {
      console.error('Error incrementing usage:', err);
      throw err;
    }
  };

  const decrementUsage = async (type: 'items' | 'vendors' | 'incoming_deliveries' | 'service_bookings' | 'payments'): Promise<void> => {
    if (!currentUsage.value) return;

    const updates: Partial<SubscriptionUsage> = {};
    
    switch (type) {
      case 'items':
        updates.items_count = Math.max(0, currentUsage.value.items_count - 1);
        break;
      case 'vendors':
        updates.vendors_count = Math.max(0, currentUsage.value.vendors_count - 1);
        break;
      case 'incoming_deliveries':
        updates.incoming_deliveries_count = Math.max(0, currentUsage.value.incoming_deliveries_count - 1);
        break;
      case 'service_bookings':
        updates.service_bookings_count = Math.max(0, currentUsage.value.service_bookings_count - 1);
        break;
      case 'payments':
        updates.payments_count = Math.max(0, currentUsage.value.payments_count - 1);
        break;
    }

    try {
      const updated = await pb.collection('subscription_usage').update(currentUsage.value.id!, updates);
      currentUsage.value = updated as unknown as SubscriptionUsage;
    } catch (err) {
      console.error('Error decrementing usage:', err);
      throw err;
    }
  };

  const getAllPlans = async (): Promise<SubscriptionPlan[]> => {
    try {
      const records = await pb.collection('subscription_plans').getFullList({
        filter: 'is_active=true',
        sort: 'price'
      });
      return records as unknown as SubscriptionPlan[];
    } catch (err) {
      console.error('Error loading subscription plans:', err);
      throw err;
    }
  };

  const upgradeSubscription = async (planId: string): Promise<void> => {
    if (!currentSubscription.value) {
      throw new Error('No current subscription found');
    }

    try {
      await pb.collection('site_subscriptions').update(currentSubscription.value.id!, {
        subscription_plan: planId,
        status: 'active'
      });
      
      // Reload subscription to get updated data
      await loadSubscription();
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      throw err;
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    if (!currentSubscription.value) {
      throw new Error('No current subscription found');
    }

    try {
      await pb.collection('site_subscriptions').update(currentSubscription.value.id!, {
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString()
      });
      
      await loadSubscription();
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      throw err;
    }
  };

  // Watch for site changes and reload subscription
  watch(() => getCurrentSiteId(), (newSiteId) => {
    if (newSiteId) {
      loadSubscription();
    } else {
      currentSubscription.value = null;
      currentUsage.value = null;
    }
  }, { immediate: true });

  return {
    // State
    currentSubscription: computed(() => currentSubscription.value),
    currentUsage: computed(() => currentUsage.value),
    currentPlan,
    usageLimits,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    
    // Computed
    isReadOnly,
    isSubscriptionActive,
    
    // Methods
    loadSubscription,
    createDefaultSubscription,
    createFreeTierSubscription,
    checkCreateLimit,
    incrementUsage,
    decrementUsage,
    getAllPlans,
    upgradeSubscription,
    cancelSubscription
  };
}