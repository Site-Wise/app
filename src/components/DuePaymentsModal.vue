<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black/60 overflow-y-auto h-full w-full z-50"
    @click="handleBackdropClick" @keydown.esc="handleClose" tabindex="-1">
    <div
      class="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-modal rounded-xl bg-white dark:bg-ink-3 border-stone-200 dark:border-ink-4 m-4"
      @click.stop>
      <div class="mt-3">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <AlertCircle class="h-6 w-6 mr-3 text-clay" />
            <h3 class="font-display text-lg font-semibold text-ink dark:text-cream">{{ t('payments.duePayments') }}</h3>
          </div>
          <button type="button" @click="handleClose"
            class="p-2 text-stone-400 hover:text-ink dark:hover:text-cream rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors"
            :title="t('common.close')">
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Total Outstanding Summary -->
        <div v-if="totalOutstanding > 0" class="mb-4 p-4 bg-clay/10 dark:bg-clay/10 rounded-lg border border-clay/30 dark:border-clay/40">
          <div class="flex items-center justify-between">
            <span class="sw-eyebrow text-clay">{{ t('payments.totalOutstanding') }}</span>
            <span class="sw-stat font-mono tabular-nums text-clay">₹{{ totalOutstanding.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Vendors List -->
        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div
            v-for="vendor in vendorsWithOutstanding"
            :key="vendor.id"
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-stone-50 dark:bg-ink-2 rounded-lg hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors cursor-pointer"
            @click="handleVendorClick(vendor)"
          >
            <div class="mb-3 sm:mb-0">
              <h3 class="font-medium text-ink dark:text-cream">{{ vendor.contact_person }}</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">{{ vendor.pendingItems }} {{ t('payments.pendingDeliveries') }}</p>
            </div>
            <div class="flex items-center justify-between sm:block sm:text-right">
              <p class="text-lg font-semibold font-mono tabular-nums text-ink dark:text-cream">₹{{ vendor.outstandingAmount.toFixed(2) }}</p>
              <span
                class="text-sm font-medium text-amber-700 dark:text-amber hover:text-amber-800 dark:hover:text-amber-600 ml-3 sm:ml-0"
              >
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

        <!-- Close Button -->
        <div class="mt-6">
          <button @click="handleClose" class="w-full btn-outline">
            {{ t('common.close') }}
          </button>
        </div>
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
