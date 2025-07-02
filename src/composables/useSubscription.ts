import { computed, watch } from 'vue';
import { pb, getCurrentSiteId, type Site } from '../services/pocketbase';
import { useSubscriptionStore } from '../stores/subscription';

// Export store types for backwards compatibility
export type { SubscriptionPlan, SiteSubscription, SubscriptionUsage } from '../stores/subscription';

// Legacy interfaces for backwards compatibility
export interface PaymentTransaction {
  id?: string;
  site_subscription: string;
  razorpay_payment_id?: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  payment_method?: string;
  failure_reason?: string;
  created?: string;
  updated?: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => {
      open(): void;
      close(): void;
    };
  }
}

export function useSubscription() {
  const subscriptionStore = useSubscriptionStore();

  // Watch for site changes and load subscription data
  watch(() => getCurrentSiteId(), async (newSiteId) => {
    if (newSiteId) {
      try {
        await subscriptionStore.loadSubscription();
      } catch (err) {
        console.error('Error loading subscription in watcher:', err);
      }
    } else {
      subscriptionStore.clearSubscriptionData();
    }
  }, { immediate: true });

  // Helper functions - delegate to store
  const isLimited = (limit: number): boolean => {
    return subscriptionStore.isLimited(limit);
  };

  const isUnlimited = (limit: number): boolean => {
    return subscriptionStore.isUnlimited(limit);
  };

  const isDisabled = (limit: number): boolean => {
    return subscriptionStore.isDisabled(limit);
  };

  const checkCreateLimit = (type: 'items' | 'vendors' | 'deliveries' | 'service_bookings' | 'payments'): boolean => {
    return subscriptionStore.checkCreateLimit(type);
  };

  const getAllPlans = async () => {
    try {
      return await subscriptionStore.loadAllPlans();
    } catch (err) {
      console.error('Error loading subscription plans:', err);
      throw err;
    }
  };

  const loadSubscription = async () => {
    try {
      await subscriptionStore.loadSubscription();
    } catch (err) {
      console.error('Error loading subscription:', err);
      throw err;
    }
  };

  const createDefaultSubscription = async (siteId: string) => {
    try {
      await subscriptionStore.createDefaultSubscription(siteId);
    } catch (err) {
      console.error('Error creating default subscription:', err);
      throw err;
    }
  };

  const createFreeTierSubscription = async (siteId: string) => {
    try {
      // Get Free plan
      const freePlan = await pb.collection('subscription_plans').getFirstListItem(
        'name="Free" && is_active=true'
      );

      await pb.collection('site_subscriptions').create({
        site: siteId,
        subscription_plan: freePlan.id,
        status: 'active',
        auto_renew: false
      });

      // Reload subscription data
      await subscriptionStore.loadSubscription(siteId);
    } catch (err) {
      console.error('Error creating free tier subscription:', err);
      throw err;
    }
  };

  // Payment and subscription management methods
  const upgradeSubscription = async (planId: string, paymentOptions: any = {}) => {
    try {
      const siteId = getCurrentSiteId();
      if (!siteId) throw new Error('No site selected');

      // Implementation for upgrading subscription
      // This would involve Razorpay integration
      const response = await pb.collection('site_subscriptions').update(
        subscriptionStore.currentSubscription?.id || '',
        {
          subscription_plan: planId,
          status: 'active'
        }
      );

      // Reload subscription to get updated data
      await subscriptionStore.loadSubscription();
      return response;
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      throw err;
    }
  };

  const cancelSubscription = async () => {
    try {
      if (!subscriptionStore.currentSubscription) {
        throw new Error('No subscription to cancel');
      }

      const response = await pb.collection('site_subscriptions').update(
        subscriptionStore.currentSubscription.id,
        {
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        }
      );

      // Reload subscription to get updated data
      await subscriptionStore.loadSubscription();
      return response;
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      throw err;
    }
  };

  const reactivateSubscription = async () => {
    try {
      if (!subscriptionStore.currentSubscription) {
        throw new Error('No subscription to reactivate');
      }

      const response = await pb.collection('site_subscriptions').update(
        subscriptionStore.currentSubscription.id,
        {
          status: 'active',
          cancelled_at: null
        }
      );

      // Reload subscription to get updated data
      await subscriptionStore.loadSubscription();
      return response;
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      throw err;
    }
  };

  return {
    // State from store (already computed, accessed directly)
    currentSubscription: subscriptionStore.currentSubscription,
    currentUsage: subscriptionStore.currentUsage,
    currentPlan: subscriptionStore.currentPlan,
    usageLimits: subscriptionStore.usageLimits,
    isLoading: subscriptionStore.isLoading,
    error: subscriptionStore.error,
    
    // Computed from store (already computed, accessed directly)
    isReadOnly: subscriptionStore.isReadOnly,
    isSubscriptionActive: subscriptionStore.isSubscriptionActive,
    isSubscriptionCancelled: subscriptionStore.isSubscriptionCancelled,
    canReactivateSubscription: subscriptionStore.canReactivateSubscription,
    subscriptionStatus: subscriptionStore.subscriptionStatus,
    
    // Methods
    loadSubscription,
    createDefaultSubscription,
    createFreeTierSubscription,
    checkCreateLimit,
    getAllPlans,
    upgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    
    // Helper functions
    isLimited,
    isUnlimited,
    isDisabled
  };
}