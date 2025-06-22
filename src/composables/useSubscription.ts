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
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'pending_payment';
  current_period_start: string;
  current_period_end: string;
  razorpay_subscription_id?: string;
  razorpay_customer_id?: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  reactivated_at?: string;
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

export interface UsageLimits {
  items: { current: number; max: number; exceeded: boolean; disabled: boolean; unlimited: boolean };
  vendors: { current: number; max: number; exceeded: boolean; disabled: boolean; unlimited: boolean };
  incoming_deliveries: { current: number; max: number; exceeded: boolean; disabled: boolean; unlimited: boolean };
  service_bookings: { current: number; max: number; exceeded: boolean; disabled: boolean; unlimited: boolean };
  payments: { current: number; max: number; exceeded: boolean; disabled: boolean; unlimited: boolean };
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
    
    // Check if any limit is exceeded or if any feature is disabled
    return (
      (isLimited(plan.features.max_items) && usage.items_count >= plan.features.max_items) ||
      (isLimited(plan.features.max_vendors) && usage.vendors_count >= plan.features.max_vendors) ||
      (isLimited(plan.features.max_incoming_deliveries) && usage.incoming_deliveries_count >= plan.features.max_incoming_deliveries) ||
      (isLimited(plan.features.max_service_bookings) && usage.service_bookings_count >= plan.features.max_service_bookings) ||
      (isLimited(plan.features.max_payments) && usage.payments_count >= plan.features.max_payments)
    );
  });

  const isSubscriptionActive = computed(() => {
    return currentSubscription.value?.status === 'active';
  });

  const isSubscriptionCancelled = computed(() => {
    return currentSubscription.value?.cancel_at_period_end === true;
  });

  const canReactivateSubscription = computed(() => {
    const sub = currentSubscription.value;
    if (!sub) return false;
    
    // Can reactivate if cancelled but period hasn't ended yet
    return sub.cancel_at_period_end && 
           sub.status === 'active' && 
           new Date() < new Date(sub.current_period_end);
  });

  const subscriptionStatus = computed(() => {
    const sub = currentSubscription.value;
    if (!sub) return null;
    
    const now = new Date();
    const periodEnd = new Date(sub.current_period_end);
    
    if (sub.status === 'expired' || (sub.status === 'cancelled' && now > periodEnd)) {
      return 'expired';
    }
    
    if (sub.cancel_at_period_end && sub.status === 'active') {
      return 'cancelled_pending';
    }
    
    return sub.status;
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
        unlimited: isUnlimited(plan.features.max_items),
        disabled: isDisabled(plan.features.max_items),
        exceeded: isLimited(plan.features.max_items) && usage.items_count >= plan.features.max_items
      },
      vendors: {
        current: usage.vendors_count,
        max: plan.features.max_vendors,
        unlimited: isUnlimited(plan.features.max_vendors),
        disabled: isDisabled(plan.features.max_vendors),
        exceeded: isLimited(plan.features.max_vendors) && usage.vendors_count >= plan.features.max_vendors
      },
      incoming_deliveries: {
        current: usage.incoming_deliveries_count,
        max: plan.features.max_incoming_deliveries,
        unlimited: isUnlimited(plan.features.max_incoming_deliveries),
        disabled: isDisabled(plan.features.max_incoming_deliveries),
        exceeded: isLimited(plan.features.max_incoming_deliveries) && usage.incoming_deliveries_count >= plan.features.max_incoming_deliveries
      },
      service_bookings: {
        current: usage.service_bookings_count,
        max: plan.features.max_service_bookings,
        unlimited: isUnlimited(plan.features.max_service_bookings),
        disabled: isDisabled(plan.features.max_service_bookings),
        exceeded: isLimited(plan.features.max_service_bookings) && usage.service_bookings_count >= plan.features.max_service_bookings
      },
      payments: {
        current: usage.payments_count,
        max: plan.features.max_payments,
        unlimited: isUnlimited(plan.features.max_payments),
        disabled: isDisabled(plan.features.max_payments),
        exceeded: isLimited(plan.features.max_payments) && usage.payments_count >= plan.features.max_payments
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
      // Get default plan (fallback to Free plan if no default is set)
      let defaultPlan;
      try {
        defaultPlan = await pb.collection('subscription_plans').getFirstListItem(
          'is_default=true && is_active=true'
        );
      } catch {
        // Fallback to Free plan if no default plan is found
        defaultPlan = await pb.collection('subscription_plans').getFirstListItem(
          'name="Free" && is_active=true'
        );
      }

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
        if (isDisabled(plan.features.max_items)) return false;
        return isUnlimited(plan.features.max_items) || usage.items_count < plan.features.max_items;
      case 'vendors':
        if (isDisabled(plan.features.max_vendors)) return false;
        return isUnlimited(plan.features.max_vendors) || usage.vendors_count < plan.features.max_vendors;
      case 'incoming_deliveries':
        if (isDisabled(plan.features.max_incoming_deliveries)) return false;
        return isUnlimited(plan.features.max_incoming_deliveries) || usage.incoming_deliveries_count < plan.features.max_incoming_deliveries;
      case 'service_bookings':
        if (isDisabled(plan.features.max_service_bookings)) return false;
        return isUnlimited(plan.features.max_service_bookings) || usage.service_bookings_count < plan.features.max_service_bookings;
      case 'payments':
        if (isDisabled(plan.features.max_payments)) return false;
        return isUnlimited(plan.features.max_payments) || usage.payments_count < plan.features.max_payments;
      default:
        return false;
    }
  };

  const isUnlimited = (limit: number): boolean => {
    return limit === -1;
  };

  const isDisabled = (limit: number): boolean => {
    return limit === 0;
  };

  const isLimited = (limit: number): boolean => {
    return limit > 0;
  };

  // Usage is now tracked automatically by PocketBase hooks
  // These methods are kept for backwards compatibility but will be deprecated
  const refreshUsage = async (): Promise<void> => {
    if (!siteId || !currentSubscription.value) return;
    
    try {
      const periodStart = new Date(currentSubscription.value.current_period_start);
      const periodEnd = new Date(currentSubscription.value.current_period_end);
      
      const usage = await pb.collection('subscription_usage').getFirstListItem(
        `site="${siteId}" && period_start="${periodStart.toISOString()}" && period_end="${periodEnd.toISOString()}"`
      );
      currentUsage.value = usage as unknown as SubscriptionUsage;
    } catch (err) {
      console.error('Error refreshing usage:', err);
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
      const updateData: any = {
        subscription_plan: planId,
        status: 'active'
      };
      
      // If subscription was cancelled, reactivate it
      if (currentSubscription.value.cancel_at_period_end) {
        updateData.cancel_at_period_end = false;
        updateData.cancelled_at = null;
        updateData.reactivated_at = new Date().toISOString();
      }
      
      await pb.collection('site_subscriptions').update(currentSubscription.value.id!, updateData);
      
      // Reload subscription to get updated data
      await loadSubscription();
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      throw err;
    }
  };

  const reactivateSubscription = async (): Promise<void> => {
    if (!currentSubscription.value) {
      throw new Error('No current subscription found');
    }

    if (!canReactivateSubscription.value) {
      throw new Error('Subscription cannot be reactivated');
    }

    try {
      await pb.collection('site_subscriptions').update(currentSubscription.value.id!, {
        cancel_at_period_end: false,
        cancelled_at: null,
        reactivated_at: new Date().toISOString()
      });
      
      await loadSubscription();
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      throw err;
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    if (!currentSubscription.value) {
      throw new Error('No current subscription found');
    }

    try {
      // Cancel at period end to allow completion of current billing cycle
      await pb.collection('site_subscriptions').update(currentSubscription.value.id!, {
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString()
      });
      
      // If there's a Razorpay subscription, cancel it too
      if (currentSubscription.value.razorpay_subscription_id) {
        await cancelRazorpaySubscription(currentSubscription.value.razorpay_subscription_id);
      }
      
      await loadSubscription();
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      throw err;
    }
  };

  const cancelRazorpaySubscription = async (subscriptionId: string): Promise<void> => {
    try {
      // Call CF Worker to cancel Razorpay subscription
      const response = await fetch('/api/razorpay/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription_id: subscriptionId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel Razorpay subscription');
      }
    } catch (err) {
      console.error('Error cancelling Razorpay subscription:', err);
      // Don't throw here as we want local cancellation to succeed even if Razorpay fails
    }
  };

  // Razorpay Integration Methods
  const createRazorpayOrder = async (planId: string): Promise<{ order_id: string; amount: number; currency: string }> => {
    try {
      // Get plan details
      const plan = await pb.collection('subscription_plans').getOne(planId);
      
      // Call CF Worker to create Razorpay order
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: plan.price * 100, // Razorpay expects amount in paise
          currency: plan.currency || 'INR',
          receipt: `subscription_${Date.now()}`,
          notes: {
            site_id: siteId,
            plan_id: planId
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create Razorpay order');
      }
      
      const orderData = await response.json();
      return {
        order_id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency
      };
    } catch (err) {
      console.error('Error creating Razorpay order:', err);
      throw err;
    }
  };

  const initializeRazorpayCheckout = async (planId: string): Promise<void> => {
    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        await loadRazorpayScript();
      }
      
      // Create order
      const { order_id, amount, currency } = await createRazorpayOrder(planId);
      
      // Get plan details for display
      const plan = await pb.collection('subscription_plans').getOne(planId);
      
      const options: RazorpayCheckoutOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount,
        currency,
        name: 'SiteWise',
        description: `Subscription to ${plan.name} plan`,
        order_id,
        handler: async (response: any) => {
          await handlePaymentSuccess(response, planId);
        },
        prefill: {
          name: pb.authStore.model?.name || '',
          email: pb.authStore.model?.email || ''
        },
        theme: {
          color: '#f97316' // Orange theme color
        },
        modal: {
          ondismiss: () => {
            console.log('Payment cancelled by user');
          }
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Error initializing Razorpay checkout:', err);
      throw err;
    }
  };

  const loadRazorpayScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.head.appendChild(script);
    });
  };

  const handlePaymentSuccess = async (response: any, planId: string): Promise<void> => {
    try {
      // Verify payment with CF Worker
      const verificationResponse = await fetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        })
      });
      
      if (!verificationResponse.ok) {
        throw new Error('Payment verification failed');
      }
      
      // Update subscription in database
      await upgradeSubscriptionWithPayment(planId, response);
    } catch (err) {
      console.error('Error handling payment success:', err);
      throw err;
    }
  };

  const upgradeSubscriptionWithPayment = async (planId: string, paymentResponse: any): Promise<void> => {
    if (!currentSubscription.value) {
      throw new Error('No current subscription found');
    }

    try {
      // Create payment transaction record
      await pb.collection('payment_transactions').create({
        site_subscription: currentSubscription.value.id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        amount: paymentResponse.amount || 0,
        currency: 'INR',
        status: 'successful'
      });
      
      // Update subscription
      const updateData: any = {
        subscription_plan: planId,
        status: 'active'
      };
      
      // If subscription was cancelled, reactivate it
      if (currentSubscription.value.cancel_at_period_end) {
        updateData.cancel_at_period_end = false;
        updateData.cancelled_at = null;
        updateData.reactivated_at = new Date().toISOString();
      }
      
      // Extend period if upgrading from free or reactivating
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      updateData.current_period_start = now.toISOString();
      updateData.current_period_end = periodEnd.toISOString();
      
      await pb.collection('site_subscriptions').update(currentSubscription.value.id!, updateData);
      
      // Reload subscription to get updated data
      await loadSubscription();
    } catch (err) {
      console.error('Error upgrading subscription with payment:', err);
      throw err;
    }
  };

  // Watch for site changes and reload subscription
  watch(() => getCurrentSiteId(), async (newSiteId) => {
    if (newSiteId) {
      try {
        await loadSubscription();
      } catch (err) {
        // Error is already handled in loadSubscription
        console.error('Error loading subscription in watcher:', err);
      }
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
    isSubscriptionCancelled,
    canReactivateSubscription,
    subscriptionStatus,
    
    // Methods
    loadSubscription,
    createDefaultSubscription,
    createFreeTierSubscription,
    checkCreateLimit,
    refreshUsage,
    getAllPlans,
    upgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    
    // Payment Methods
    initializeRazorpayCheckout,
    createRazorpayOrder,
    handlePaymentSuccess,
    
    // Utility Methods
    isUnlimited,
    isDisabled,
    isLimited
  };
}