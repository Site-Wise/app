<template>
  <!-- Overlay -->
  <div
    v-if="isVisible"
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm"
    @click="handleBackdropClick"
    @keydown.esc="handleClose"
    tabindex="-1"
  >
    <!-- Panel -->
    <div
      class="w-full sm:max-w-lg bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      @click.stop
    >
      <!-- Grab handle (mobile only) -->
      <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
        <div class="mx-auto h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4" />
      </div>

      <!-- Sticky header -->
      <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <AlertCircle class="h-5 w-5 text-clay flex-shrink-0" />
        <h3 class="font-display text-lg font-semibold text-ink dark:text-cream flex-1">{{ t('payments.duePayments') }}</h3>
        <button
          type="button"
          @click="handleClose"
          class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors active:scale-[0.98]"
          :aria-label="t('common.close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4 scroll-smooth-touch">
        <!-- Total Outstanding Summary -->
        <div v-if="totalOutstanding > 0" class="p-4 bg-clay/10 dark:bg-clay/10 rounded-lg border border-clay/30 dark:border-clay/40">
          <div class="flex items-center justify-between">
            <span class="sw-eyebrow text-clay">{{ t('payments.totalOutstanding') }}</span>
            <span class="sw-stat font-mono tabular-nums text-clay">₹{{ totalOutstanding.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Vendors List -->
        <div class="space-y-3">
          <div
            v-for="vendor in vendorsWithOutstanding"
            :key="vendor.id"
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-stone-50 dark:bg-ink-2 rounded-lg hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors cursor-pointer active:scale-[0.99]"
            @click="handleVendorClick(vendor)"
          >
            <div class="mb-3 sm:mb-0">
              <h3 class="font-medium text-ink dark:text-cream">{{ vendor.contact_person }}</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">{{ vendor.pendingItems }} {{ t('payments.pendingDeliveries') }}</p>
            </div>
            <div class="flex items-center justify-between sm:block sm:text-right">
              <p class="text-lg font-semibold font-mono tabular-nums text-ink dark:text-cream">₹{{ vendor.outstandingAmount.toFixed(2) }}</p>
              <span class="text-sm font-medium text-amber-700 dark:text-amber hover:text-amber-800 dark:hover:text-amber-600 ml-3 sm:ml-0">
                {{ t('payments.payNow') }}
              </span>
            </div>
          </div>

          <div v-if="vendorsWithOutstanding.length === 0" class="text-center py-8 text-stone-500 dark:text-stone-400">
            <CheckCircle class="mx-auto h-12 w-12 text-forest mb-2" />
            <p class="font-medium">{{ t('payments.noOutstandingAmounts') }}</p>
            <p class="text-sm">{{ t('payments.allPaymentsCurrent') }}</p>
          </div>
        </div>
      </div>

      <!-- Sticky footer -->
      <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex gap-3 flex-shrink-0 pb-safe">
        <button @click="handleClose" class="flex-1 btn-outline active:scale-[0.98]">
          {{ t('common.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AlertCircle, X, CheckCircle } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import {
  VendorService,
  type Vendor,
  type Delivery,
  type ServiceBooking,
  type Payment
} from '../services/pocketbase';

// Props
interface Props {
  isVisible: boolean;
  vendors: Vendor[];
  deliveries: Delivery[];
  serviceBookings: ServiceBooking[];
  payments: Payment[];
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'close'): void;
  (e: 'pay-vendor', vendor: VendorWithOutstanding): void;
}

const emit = defineEmits<Emits>();

// Composables
const { t } = useI18n();

// Types
interface VendorWithOutstanding extends Vendor {
  outstandingAmount: number;
  pendingItems: number;
}

// Computed
const vendorsWithOutstanding = computed<VendorWithOutstanding[]>(() => {
  if (!props.vendors) return [];
  return props.vendors.map(vendor => {
    const outstandingAmount = VendorService.calculateOutstandingFromData(
      vendor.id!,
      props.deliveries,
      props.serviceBookings,
      props.payments
    );

    // Calculate pending items based on outstanding amounts
    const vendorDeliveries = props.deliveries.filter(delivery => delivery.vendor === vendor.id);
    const vendorBookings = props.serviceBookings.filter(booking => booking.vendor === vendor.id);

    // Count items with outstanding amounts (items that have work done but not fully paid)
    const pendingDeliveries = vendorDeliveries.filter(d => d.total_amount > 0).length;
    const pendingBookings = vendorBookings.filter(b => (b.percent_completed || 0) > 0).length;
    const pendingItems = pendingDeliveries + pendingBookings;

    return {
      ...vendor,
      outstandingAmount,
      pendingItems
    } as VendorWithOutstanding;
  }).filter(vendor => vendor.outstandingAmount > 0);
});

const totalOutstanding = computed(() => {
  return vendorsWithOutstanding.value.reduce((sum, vendor) => sum + vendor.outstandingAmount, 0);
});

// Methods
const handleVendorClick = (vendor: VendorWithOutstanding) => {
  emit('pay-vendor', vendor);
};

const handleClose = () => {
  emit('close');
};

const handleBackdropClick = () => {
  emit('close');
};
</script>
