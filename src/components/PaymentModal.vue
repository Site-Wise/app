<template>
  <div v-if="isVisible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="handleBackdropClick" @keydown.esc="handleEscape" tabindex="-1">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
      <div class="mt-3">
        <!-- Dynamic Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <component :is="modalIcon" class="h-6 w-6 mr-3" :class="modalIconColor" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ modalTitle }}</h3>
          </div>
          <button 
            type="button"
            @click="handleEscape"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="t('common.close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Payment Info Section -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
            <!-- Vendor Selection (CREATE/PAY_NOW) or Display (EDIT) -->
            <div v-if="mode !== 'EDIT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}</label>
              <VendorSearchBox
                ref="vendorInputRef"
                v-model="form.vendor"
                :vendors="vendors"
                :deliveries="deliveries"
                :serviceBookings="serviceBookings"
                :payments="payments"
                :placeholder="t('forms.selectVendor')"
                :autofocus="mode === 'CREATE'"
                :required="true"
                :outstanding-amount="vendorOutstanding"
                :pending-items-count="vendorPendingItems"
                :disabled="loading"
                name="vendor"
                @vendor-selected="handleVendorSelected"
                @focus="handleVendorFocus"
                class="mt-1"
              />
            </div>
            <div v-else class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}:</span>
              <span class="text-sm text-gray-900 dark:text-white">{{ payment?.expand?.vendor?.contact_person }}</span>
            </div>

            <!-- Account Selection (CREATE/PAY_NOW) or Display (EDIT) -->
            <div v-if="mode !== 'EDIT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentAccount') }}</label>
              <select v-model="form.account" required class="input mt-1" name="account" :disabled="loading">
                <option value="">{{ t('forms.selectAccount') }}</option>
                <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                  {{ account.name }} ({{ account.type.replace('_', ' ') }}) - ₹{{ account.current_balance.toFixed(2) }}
                </option>
              </select>
            </div>
            <div v-else class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentAccount') }}:</span>
              <div class="flex items-center">
                <component :is="getAccountIcon(payment?.expand?.account?.type)" class="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span class="text-sm text-gray-900 dark:text-white">{{ payment?.expand?.account?.name }}</span>
              </div>
            </div>

            <!-- Credit Notes Section (CREATE/PAY_NOW only) -->
            <div v-if="mode !== 'EDIT' && form.vendor && availableCreditNotes.length > 0">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.availableCreditNotes') }}</label>
              <div class="mt-2 space-y-2 max-h-32 overflow-y-auto">
                <div 
                  v-for="(creditNote, index) in availableCreditNotes" 
                  :key="creditNote.id"
                  class="flex items-center space-x-3 p-2 border border-gray-200 dark:border-gray-600 rounded-md"
                >
                  <input
                    :id="`credit-note-${creditNote.id}`"
                    v-model="form.credit_notes[index]"
                    :value="creditNote.id"
                    type="checkbox"
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    :disabled="loading"
                    @change="handleCreditNoteChange()"
                  />
                  <label :for="`credit-note-${creditNote.id}`" class="flex-1 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-900 dark:text-white">{{ creditNote.reference || `CN-${creditNote.id?.slice(-6)}` }}</span>
                      <div class="text-right">
                        <span class="text-green-600 dark:text-green-400 font-medium">₹{{ creditNote.balance.toFixed(2) }}</span>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          of ₹{{ creditNote.credit_amount.toFixed(2) }}
                        </div>
                      </div>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {{ creditNote.reason }} • {{ formatDate(creditNote.issue_date) }}
                    </div>
                  </label>
                </div>
              </div>
              <div v-if="selectedCreditNoteAmount > 0" class="mt-2 text-sm text-green-600 dark:text-green-400">
                Selected credit notes: ₹{{ selectedCreditNoteAmount.toFixed(2) }}
              </div>
            </div>

            <!-- Validation Error Display -->
            <div v-if="validationError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span class="text-sm font-medium text-red-800 dark:text-red-300">Validation Error</span>
              </div>
              <p class="text-sm text-red-700 dark:text-red-400 mt-1">{{ validationError }}</p>
            </div>

            <!-- Payment Date (CREATE/PAY_NOW) or Display (EDIT) -->
            <div v-if="mode !== 'EDIT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentDate') }}</label>
              <input v-model="form.transaction_date" type="date" required class="input mt-1" :disabled="loading" />
            </div>
            <div v-else class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentDate') }}:</span>
              <span class="text-sm text-gray-900 dark:text-white">{{ formatDate(payment?.payment_date || '') }}</span>
            </div>

            <!-- Amount (CREATE/PAY_NOW) or Display (EDIT) -->
            <div v-if="mode !== 'EDIT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.amount') }}</label>
              <div class="flex items-center space-x-2">
                <input 
                  v-model.number="form.amount" 
                  type="number" 
                  step="0.01" 
                  required 
                  class="input mt-1 flex-1" 
                  placeholder="0.00" 
                  :disabled="loading"
                  @input="handleAmountChange" 
                />
                <button 
                  v-if="form.vendor && actualVendorOutstanding > 0 && form.amount !== actualVendorOutstanding"
                  type="button"
                  @click="payAllOutstanding"
                  :disabled="loading"
                  class="mt-1 px-3 py-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 border border-primary-300 dark:border-primary-600 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pay All (₹{{ actualVendorOutstanding.toFixed(2) }})
                </button>
              </div>
              <!-- Payment breakdown when credit notes are involved -->
              <div v-if="selectedCreditNoteAmount > 0" class="mt-2 text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div class="flex justify-between">
                  <span class="text-gray-700 dark:text-gray-300">Account payment:</span>
                  <span :class="accountPaymentAmount >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'">
                    ₹{{ accountPaymentAmount.toFixed(2) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-700 dark:text-gray-300">Credit notes:</span>
                  <span class="text-green-600 dark:text-green-400">₹{{ selectedCreditNoteAmount.toFixed(2) }}</span>
                </div>
                <hr class="my-1 border-gray-300 dark:border-gray-600">
                <div class="flex justify-between font-medium">
                  <span class="text-gray-900 dark:text-white">Total payment:</span>
                  <span class="text-gray-900 dark:text-white">₹{{ form.amount.toFixed(2) }}</span>
                </div>
                <!-- Warning if credit notes exceed payment amount -->
                <div v-if="selectedCreditNoteAmount > form.amount" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Credit notes exceed payment amount. Only ₹{{ form.amount.toFixed(2) }} will be used.
                </div>
              </div>
            </div>
            <div v-else class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.amount') }}:</span>
              <span class="text-sm font-semibold text-gray-900 dark:text-white">₹{{ payment?.amount.toFixed(2) }}</span>
            </div>
          </div>


          <!-- Allocation Progress Section (All Modes) -->
          <div v-if="showAllocationProgress" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">{{ t('payments.allocationStatus') }}</h4>
            
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-700 dark:text-gray-300">{{ t('payments.allocated') }}:</span>
                <span class="text-green-600 dark:text-green-400 font-medium">₹{{ allocatedAmount.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-700 dark:text-gray-300">{{ t('payments.unallocated') }}:</span>
                <span class="text-orange-600 dark:text-orange-400 font-medium">₹{{ unallocatedAmount.toFixed(2) }}</span>
              </div>
              
              <!-- Progress bar -->
              <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mt-2 overflow-hidden">
                <div 
                  class="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
                  :style="{ width: `${Math.min(100, allocationPercentage)}%` }"
                ></div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
                {{ allocationPercentage }}% allocated
              </div>
            </div>
          </div>

          <!-- Current Allocations (EDIT mode only) -->
          <div v-if="mode === 'EDIT' && currentAllocations.length > 0" class="space-y-2">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white">{{ t('payments.currentAllocations') }}</h4>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead class="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('common.type') }}</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('common.date') }}</th>
                    <th class="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('common.amount') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
                  <tr v-for="allocation in currentAllocations" :key="allocation.id" class="hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td class="px-4 py-3 text-sm">
                      <div v-if="allocation.delivery" class="text-gray-900 dark:text-white">
                        <div class="font-medium">{{ t('common.delivery') }}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(allocation.expand?.delivery?.delivery_date || '') }}</div>
                      </div>
                      <div v-else-if="allocation.service_booking" class="text-gray-900 dark:text-white">
                        <div class="font-medium">{{ t('common.serviceBooking') }}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          {{ allocation.expand?.service_booking?.expand?.service?.name || 'Service' }}
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {{ allocation.delivery ? formatDate(allocation.expand?.delivery?.delivery_date || '') : formatDate(allocation.expand?.service_booking?.start_date || '') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                      ₹{{ allocation.allocated_amount.toFixed(2) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Allocation Complete Message (EDIT mode when fully allocated) -->
          <div v-if="mode === 'EDIT' && unallocatedAmount <= 0" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <span class="text-sm font-medium text-green-800 dark:text-green-300">{{ t('payments.fullyAllocated') }}</span>
            </div>
            <p class="text-sm text-green-700 dark:text-green-400 mt-1">This payment has been fully allocated to deliveries and service bookings.</p>
          </div>

          <!-- Delivery/Booking Selection -->
          <div v-if="showDeliverySelection" class="space-y-3">
            <div class="flex justify-between items-center">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.selectItemsToPay') }}</label>
              <span v-if="mode === 'EDIT'" class="text-xs text-orange-600 dark:text-orange-400 font-medium">
                Max: ₹{{ unallocatedAmount.toFixed(2) }}
              </span>
            </div>
            
            <!-- Warning when account is required but not selected -->
            <div v-if="isAccountRequiredForSelection" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span class="text-sm font-medium text-yellow-800 dark:text-yellow-300">Account Required</span>
              </div>
              <p class="text-sm text-yellow-700 dark:text-yellow-400 mt-1">Available credit notes are insufficient. Please select an account to proceed with delivery selection.</p>
            </div>
            
            <!-- Deliveries -->
            <div v-if="selectableDeliveries.length > 0">
              <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{{ t('common.deliveries') }}</h4>
              <div class="space-y-2 max-h-40 overflow-y-auto">
                <div 
                  v-for="delivery in selectableDeliveries" 
                  :key="delivery.id" 
                  :class="[
                    'p-2 rounded transition-colors cursor-pointer',
                    isAccountRequiredForSelection 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700',
                    (loading || isAccountRequiredForSelection || isDeliveryDisabled(delivery.id))
                      ? 'cursor-not-allowed'
                      : 'cursor-pointer'
                  ]"
                  @click="handleDeliveryRowClick(delivery.id)"
                >
                  <TriStateCheckbox
                    :id="`delivery-${delivery.id}`"
                    :label="formatDate(delivery.delivery_date)"
                    :secondary-text="`Total: ₹${delivery.total_amount.toFixed(2)} | Paid: ₹${delivery.paid_amount.toFixed(2)} | Outstanding: ₹${delivery.outstanding.toFixed(2)}`"
                    :due-amount="delivery.outstanding"
                    :allocated-amount="form.delivery_allocations[delivery.id]?.amount || 0"
                    :disabled="loading || isAccountRequiredForSelection || isDeliveryDisabled(delivery.id)"
                    :allow-partial-clicks="isAmountManuallySet"
                    :aria-label="`Select delivery from ${formatDate(delivery.delivery_date)}`"
                    :clickable-row="true"
                    @change="handleDeliveryTriStateChange(delivery.id, $event)"
                  />
                </div>
              </div>
            </div>
            
            <!-- Service Bookings -->
            <div v-if="selectableBookings.length > 0">
              <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{{ t('common.serviceBookings') }}</h4>
              <div class="space-y-2 max-h-40 overflow-y-auto">
                <div 
                  v-for="booking in selectableBookings" 
                  :key="booking.id" 
                  :class="[
                    'p-2 rounded transition-colors cursor-pointer',
                    isAccountRequiredForSelection 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700',
                    (loading || isAccountRequiredForSelection || isBookingDisabled(booking.id))
                      ? 'cursor-not-allowed'
                      : 'cursor-pointer'
                  ]"
                  @click="handleBookingRowClick(booking.id)"
                >
                  <TriStateCheckbox
                    :id="`booking-${booking.id}`"
                    :label="booking.expand?.service?.name || 'Service'"
                    :secondary-text="`${formatDate(booking.start_date)} | Total: ₹${booking.total_amount.toFixed(2)} | Paid: ₹${booking.paid_amount.toFixed(2)} | Outstanding: ₹${booking.outstanding.toFixed(2)}`"
                    :due-amount="booking.outstanding"
                    :allocated-amount="form.service_booking_allocations[booking.id]?.amount || 0"
                    :allow-partial-clicks="isAmountManuallySet"
                    :clickable-row="true"
                    :disabled="loading || isAccountRequiredForSelection || isBookingDisabled(booking.id)"
                    :aria-label="`Select service booking for ${booking.expand?.service?.name || 'Service'}`"
                    @change="handleServiceBookingTriStateChange(booking.id, $event)"
                  />
                </div>
              </div>
            </div>

            <!-- No items available message -->
            <div v-if="selectableDeliveries.length === 0 && selectableBookings.length === 0 && form.vendor" class="text-center py-4 text-gray-500 dark:text-gray-400">
              <svg class="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p class="text-sm">{{ mode === 'EDIT' ? 'No additional items available for allocation' : 'No pending deliveries or bookings for this vendor' }}</p>
            </div>
          </div>

          <!-- Additional Fields -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
              <input v-model="form.reference" type="text" class="input mt-1" placeholder="Check number, transfer ID, etc." :disabled="loading" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" placeholder="Payment notes" :disabled="loading"></textarea>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex space-x-3 pt-4">
            <button 
              type="submit" 
              :disabled="loading || !isFormValid" 
              :class="[
                isFormValid ? 'btn-primary' : 'btn-disabled',
                'flex-1'
              ]"
            >
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ submitButtonText }}
            </button>
            <button type="button" @click="handleCancel" class="flex-1 btn-outline" :disabled="loading">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Loader2,
  Banknote,
  Wallet,
  Smartphone,
  Building2,
  X
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useToast } from '../composables/useToast';
import VendorSearchBox from './VendorSearchBox.vue';
import TriStateCheckbox from './TriStateCheckbox.vue';
import type { 
  Payment, 
  PaymentAllocation, 
  Vendor, 
  Account,
  Delivery,
  ServiceBooking,
  VendorCreditNote
} from '../services/pocketbase';
import { vendorCreditNoteService } from '../services/pocketbase';

// Props
interface Props {
  isVisible: boolean;
  mode: 'CREATE' | 'PAY_NOW' | 'EDIT';
  payment?: Payment | null;
  currentAllocations?: PaymentAllocation[];
  vendors: Vendor[];
  accounts: Account[];
  deliveries: Delivery[];
  serviceBookings: ServiceBooking[];
  payments: Payment[];
  vendorId?: string; // For PAY_NOW mode
  outstandingAmount?: number; // For PAY_NOW mode
}

const props = withDefaults(defineProps<Props>(), {
  payment: null,
  currentAllocations: () => [],
  vendorId: '',
  outstandingAmount: 0
});

// Emits
interface Emits {
  (e: 'close'): void;
  (e: 'submit', data: any): void;
}

const emit = defineEmits<Emits>();

// Composables
const { t } = useI18n();
const { error } = useToast();

// Refs
const vendorInputRef = ref<InstanceType<typeof VendorSearchBox>>();
const loading = ref(false);

// Form state
const form = reactive({
  vendor: '',
  account: '',
  amount: 0,
  transaction_date: new Date().toISOString().split('T')[0],
  reference: '',
  notes: '',
  deliveries: [] as string[],
  service_bookings: [] as string[],
  credit_notes: [] as string[],
  delivery_allocations: {} as Record<string, { state: 'unchecked' | 'partial' | 'checked', amount: number }>,
  service_booking_allocations: {} as Record<string, { state: 'unchecked' | 'partial' | 'checked', amount: number }>
});

// Track whether amount changes are manual (user input) or selection-driven (checkbox clicks)
const isAmountManuallySet = ref(false);
const isUpdatingAmountFromSelections = ref(false);

// Row click handlers
const handleDeliveryRowClick = (deliveryId: string) => {
  if (loading.value || isAccountRequiredForSelection.value || isDeliveryDisabled(deliveryId)) {
    return; // Don't handle click if disabled
  }
  
  // Simulate the tri-state checkbox behavior
  const currentAmount = form.delivery_allocations[deliveryId]?.amount || 0;
  const delivery = selectableDeliveries.value.find(d => d.id === deliveryId);
  if (!delivery) return;
  
  let newAllocatedAmount: number;
  
  if (isAmountManuallySet.value) {
    // Amount-driven mode: cycle through states
    if (currentAmount <= 0) {
      newAllocatedAmount = delivery.outstanding; // Full amount
    } else if (currentAmount >= delivery.outstanding) {
      newAllocatedAmount = delivery.outstanding * 0.5; // Half amount (partial)
    } else {
      newAllocatedAmount = 0; // No amount
    }
  } else {
    // Selection-driven mode: simple toggle
    if (currentAmount <= 0) {
      newAllocatedAmount = delivery.outstanding; // Full amount
    } else {
      newAllocatedAmount = 0; // No amount
    }
  }
  
  handleDeliveryTriStateChange(deliveryId, { allocatedAmount: newAllocatedAmount });
};

const handleBookingRowClick = (bookingId: string) => {
  if (loading.value || isAccountRequiredForSelection.value || isBookingDisabled(bookingId)) {
    return; // Don't handle click if disabled
  }
  
  // Simulate the tri-state checkbox behavior
  const currentAmount = form.service_booking_allocations[bookingId]?.amount || 0;
  const booking = selectableBookings.value.find(b => b.id === bookingId);
  if (!booking) return;
  
  let newAllocatedAmount: number;
  
  if (isAmountManuallySet.value) {
    // Amount-driven mode: cycle through states
    if (currentAmount <= 0) {
      newAllocatedAmount = booking.outstanding; // Full amount
    } else if (currentAmount >= booking.outstanding) {
      newAllocatedAmount = booking.outstanding * 0.5; // Half amount (partial)
    } else {
      newAllocatedAmount = 0; // No amount
    }
  } else {
    // Selection-driven mode: simple toggle
    if (currentAmount <= 0) {
      newAllocatedAmount = booking.outstanding; // Full amount
    } else {
      newAllocatedAmount = 0; // No amount
    }
  }
  
  handleServiceBookingTriStateChange(bookingId, { allocatedAmount: newAllocatedAmount });
};

// Vendor data
const vendorOutstanding = ref(0);
const vendorPendingItems = ref(0);

// Credit notes data
const availableCreditNotes = ref<VendorCreditNote[]>([]);
const loadingCreditNotes = ref(false);

// Computed properties
const modalTitle = computed(() => {
  switch (props.mode) {
    case 'CREATE': return t('payments.recordPayment');
    case 'PAY_NOW': return `Pay Outstanding Amount`;
    case 'EDIT': return t('payments.editPayment');
    default: return '';
  }
});

const modalIcon = computed(() => {
  switch (props.mode) {
    case 'CREATE': return Plus;
    case 'PAY_NOW': return CreditCard;
    case 'EDIT': return Edit;
    default: return CreditCard;
  }
});

const modalIconColor = computed(() => {
  switch (props.mode) {
    case 'CREATE': return 'text-green-600';
    case 'PAY_NOW': return 'text-blue-600';
    case 'EDIT': return 'text-orange-600';
    default: return 'text-gray-600';
  }
});

const activeAccounts = computed(() => {
  return props.accounts.filter(account => account.is_active);
});

// Auto-select account based on usage frequency
const autoSelectAccount = () => {
  if (props.mode === 'EDIT' || form.account) {
    return; // Don't auto-select in edit mode or if already selected
  }
  
  const accounts = activeAccounts.value;
  if (accounts.length === 0) return;
  
  if (accounts.length === 1) {
    // Auto-select the only account
    form.account = accounts[0].id!;
    return;
  }
  
  // Find the most frequently used account
  // We'll use multiple heuristics to make a smart selection:
  // 1. Prefer accounts with 'cash' type (most commonly used)
  // 2. Among same types, prefer accounts with higher balances
  // 3. Prefer accounts with shorter names (likely primary accounts)
  
  const sortedAccounts = [...accounts].sort((a, b) => {
    // First priority: cash accounts
    if (a.type === 'cash' && b.type !== 'cash') return -1;
    if (b.type === 'cash' && a.type !== 'cash') return 1;
    
    // Second priority: higher balance (more actively used)
    if (Math.abs(a.current_balance - b.current_balance) > 1000) {
      return b.current_balance - a.current_balance;
    }
    
    // Third priority: shorter names (likely primary accounts)
    return a.name.length - b.name.length;
  });
  
  form.account = sortedAccounts[0].id!;
};

const selectedCreditNoteAmount = computed(() => {
  return form.credit_notes.reduce((total, creditNoteId) => {
    const creditNote = availableCreditNotes.value.find(cn => cn.id === creditNoteId);
    return total + (creditNote?.balance || 0);
  }, 0);
});

const accountPaymentAmount = computed(() => {
  return form.amount - selectedCreditNoteAmount.value;
});

const allocatedAmount = computed((): number => {
  if (props.mode === 'EDIT' && props.payment) {
    const currentlyAllocated = props.currentAllocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
    return currentlyAllocated;
  }
  
  // For CREATE/PAY_NOW, use the tri-state allocated amounts
  return getTotalSelectedDeliveries();
});

const unallocatedAmount = computed((): number => {
  if (props.mode === 'EDIT' && props.payment) {
    return props.payment.amount - allocatedAmount.value;
  }
  
  // For CREATE/PAY_NOW
  return Math.max(0, form.amount - allocatedAmount.value);
});

const allocationPercentage = computed(() => {
  const total = props.mode === 'EDIT' ? props.payment?.amount || 0 : form.amount;
  if (total === 0) return 0;
  return Math.round((allocatedAmount.value / total) * 100);
});

const showAllocationProgress = computed(() => {
  return (form.amount > 0 && allocatedAmount.value > 0) || (props.mode === 'EDIT' && props.payment);
});

const showDeliverySelection = computed(() => {
  return form.vendor; // Show delivery selection whenever a vendor is selected
});

// Helper function to calculate actual paid amount from payment allocations
const calculatePaidAmount = (itemId: string, itemType: 'delivery' | 'service_booking'): number => {
  return props.payments
    .filter(payment => payment.expand?.payment_allocations)
    .flatMap(payment => payment.expand.payment_allocations)
    .filter(allocation => {
      if (itemType === 'delivery') {
        return allocation.delivery === itemId;
      } else {
        return allocation.service_booking === itemId;
      }
    })
    .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
};

const selectableDeliveries = computed(() => {
  if (!form.vendor) return [];
  
  const vendorDeliveries = props.deliveries.filter(delivery => 
    delivery.vendor === form.vendor
  );
  
  if (props.mode === 'EDIT') {
    // In edit mode, exclude deliveries that are already allocated to this payment
    const allocatedDeliveryIds = props.currentAllocations
      .filter(allocation => allocation.delivery)
      .map(allocation => allocation.delivery);
    
    return vendorDeliveries
      .filter(delivery => !allocatedDeliveryIds.includes(delivery.id!))
      .map(delivery => {
        const paidAmount = calculatePaidAmount(delivery.id!, 'delivery');
        const outstanding = delivery.total_amount - paidAmount;
        return {
          id: delivery.id!,
          delivery_date: delivery.delivery_date,
          total_amount: delivery.total_amount,
          paid_amount: paidAmount,
          outstanding: outstanding
        };
      })
      .filter(d => d.outstanding > 0)
      .sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());
  }
  
  return vendorDeliveries.map(delivery => {
    const paidAmount = calculatePaidAmount(delivery.id!, 'delivery');
    const outstanding = delivery.total_amount - paidAmount;
    return {
      id: delivery.id!,
      delivery_date: delivery.delivery_date,
      total_amount: delivery.total_amount,
      paid_amount: paidAmount,
      outstanding: outstanding
    };
  }).filter(d => d.outstanding > 0)
    .sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());
});

const selectableBookings = computed(() => {
  if (!form.vendor) return [];
  
  const vendorBookings = props.serviceBookings.filter(booking => 
    booking.vendor === form.vendor
  );
  
  if (props.mode === 'EDIT') {
    // In edit mode, exclude bookings that are already allocated to this payment
    const allocatedBookingIds = props.currentAllocations
      .filter(allocation => allocation.service_booking)
      .map(allocation => allocation.service_booking);
    
    return vendorBookings
      .filter(booking => !allocatedBookingIds.includes(booking.id!))
      .map(booking => {
        const paidAmount = calculatePaidAmount(booking.id!, 'service_booking');
        const outstanding = booking.total_amount - paidAmount;
        return {
          id: booking.id!,
          start_date: booking.start_date,
          total_amount: booking.total_amount,
          paid_amount: paidAmount,
          outstanding: outstanding,
          expand: booking.expand
        };
      })
      .filter(b => b.outstanding > 0)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }
  
  return vendorBookings.map(booking => {
    const paidAmount = calculatePaidAmount(booking.id!, 'service_booking');
    const outstanding = booking.total_amount - paidAmount;
    return {
      id: booking.id!,
      start_date: booking.start_date,
      total_amount: booking.total_amount,
      paid_amount: paidAmount,
      outstanding: outstanding,
      expand: booking.expand
    };
  }).filter(b => b.outstanding > 0)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
});

const submitButtonText = computed(() => {
  switch (props.mode) {
    case 'CREATE': return t('payments.recordPayment');
    case 'PAY_NOW': return `Pay ₹${form.amount.toFixed(2)}`;
    case 'EDIT': return t('payments.updatePayment');
    default: return t('common.submit');
  }
});

const isFormValid = computed(() => {
  if (props.mode === 'EDIT') {
    // In EDIT mode, form is valid if:
    // 1. There are any new selections for allocation, OR
    // 2. The payment is fully allocated, OR  
    // 3. There are existing allocations (partial allocation is acceptable)
    return form.deliveries.length > 0 || 
           form.service_bookings.length > 0 || 
           unallocatedAmount.value <= 0 ||
           (props.currentAllocations && props.currentAllocations.length > 0);
  }
  
  const basicValidation = form.vendor && form.account && form.amount > 0;
  if (!basicValidation) return false;
  
  // Additional validation for credit note logic
  const validationError = validatePaymentConfiguration();
  return !validationError;
});

// Validation methods for credit note logic
const validatePaymentConfiguration = (): string | null => {
  const singleCreditSufficientError = validateSingleCreditNoteSufficient();
  const accountOnlySufficientError = validateAccountOnlySufficient();
  const accountRequiredError = validateAccountRequiredForInsufficientCredit();
  
  return singleCreditSufficientError || accountOnlySufficientError || accountRequiredError;
};

const validateSingleCreditNoteSufficient = (): string | null => {
  // If multiple credit notes are selected but only one would suffice
  if (form.credit_notes.length > 1) {
    const totalSelectedDeliveries = getTotalSelectedDeliveries();
    
    // Check if any single credit note would be sufficient
    for (const creditNoteId of form.credit_notes) {
      const creditNote = availableCreditNotes.value.find(cn => cn.id === creditNoteId);
      if (creditNote && creditNote.balance >= totalSelectedDeliveries) {
        return `A single credit note (${creditNote.reference || `CN-${creditNote.id?.slice(-6)}`}) is sufficient for this payment. Please select only one credit note.`;
      }
    }
  }
  return null;
};

const validateAccountOnlySufficient = (): string | null => {
  // If user selects account amount and credit notes, but account amount alone is sufficient
  if (form.credit_notes.length > 0 && form.account) {
    const totalSelectedDeliveries = getTotalSelectedDeliveries();
    const accountAmount = accountPaymentAmount.value;
    
    if (accountAmount >= totalSelectedDeliveries) {
      return 'The account payment amount is sufficient for selected deliveries. Credit notes are not needed.';
    }
  }
  return null;
};

const validateAccountRequiredForInsufficientCredit = (): string | null => {
  // If no account is selected but credit notes are insufficient
  if (!form.account && form.credit_notes.length > 0) {
    const totalSelectedDeliveries = getTotalSelectedDeliveries();
    const totalCreditAmount = selectedCreditNoteAmount.value;
    
    if (totalCreditAmount < totalSelectedDeliveries) {
      return 'Available credit notes are insufficient. Please select an account to cover the remaining amount.';
    }
  }
  return null;
};

const getTotalSelectedDeliveries = (): number => {
  let total = 0;
  
  // Use allocated amounts from tri-state checkboxes
  form.deliveries.forEach(deliveryId => {
    const allocation = form.delivery_allocations[deliveryId];
    if (allocation) {
      total += allocation.amount;
    } else {
      // Fallback to full outstanding if no allocation data
      const delivery = selectableDeliveries.value.find(d => d.id === deliveryId);
      if (delivery) total += delivery.outstanding;
    }
  });
  
  form.service_bookings.forEach(bookingId => {
    const allocation = form.service_booking_allocations[bookingId];
    if (allocation) {
      total += allocation.amount;
    } else {
      // Fallback to full outstanding if no allocation data
      const booking = selectableBookings.value.find(b => b.id === bookingId);
      if (booking) total += booking.outstanding;
    }
  });
  
  return total;
};

// Auto-select credit notes based on deliveries (oldest first)
const autoSelectCreditNotes = () => {
  const totalNeeded = getTotalSelectedDeliveries();
  if (totalNeeded <= 0) {
    form.credit_notes = [];
    return;
  }
  
  let remainingAmount = totalNeeded;
  const selectedCreditNotes: string[] = [];
  
  // Sort available credit notes by date (oldest first)
  const sortedCreditNotes = [...availableCreditNotes.value].sort((a, b) => 
    new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime()
  );
  
  // Select credit notes until we have enough to cover the amount
  for (const creditNote of sortedCreditNotes) {
    if (remainingAmount <= 0) break;
    
    if (creditNote.balance > 0) {
      selectedCreditNotes.push(creditNote.id!);
      remainingAmount -= creditNote.balance;
    }
  }
  
  form.credit_notes = selectedCreditNotes;
  
  // If credit notes are insufficient and no account is selected, we need to require account selection
  if (remainingAmount > 0 && !form.account) {
    // This will be caught by validation
    return;
  }
  
  // Update the total amount to match the selected deliveries
  form.amount = totalNeeded;
};

// Helper function to clear all selections
const clearAllSelections = () => {
  form.deliveries = [];
  form.service_bookings = [];
  form.delivery_allocations = {};
  form.service_booking_allocations = {};
};

// Auto-select deliveries with tri-state logic when amount changes
const autoSelectDeliveriesWithTriState = (availableAmount?: number) => {
  const amountToAllocate = availableAmount ?? form.amount;
  
  if (amountToAllocate <= 0) {
    clearAllSelections();
    return;
  }
  
  let remainingAmount = amountToAllocate;
  
  // Clear current selections
  clearAllSelections();
  
  // Combine deliveries and bookings, sort by date (ascending)
  const allItems = [
    ...selectableDeliveries.value.map(d => ({ ...d, type: 'delivery' as const, date: d.delivery_date })),
    ...selectableBookings.value.map(b => ({ ...b, type: 'booking' as const, date: b.start_date }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Allocate amount to items in chronological order
  for (const item of allItems) {
    if (remainingAmount <= 0) break;
    
    const allocatedAmount = Math.min(remainingAmount, item.outstanding);
    
    if (item.type === 'delivery') {
      form.deliveries.push(item.id);
      form.delivery_allocations[item.id] = {
        state: allocatedAmount >= item.outstanding ? 'checked' : 'partial',
        amount: allocatedAmount
      };
    } else {
      form.service_bookings.push(item.id);
      form.service_booking_allocations[item.id] = {
        state: allocatedAmount >= item.outstanding ? 'checked' : 'partial',
        amount: allocatedAmount
      };
    }
    
    remainingAmount -= allocatedAmount;
  }
};

// Computed property for validation errors
const validationError = computed(() => {
  if (props.mode === 'EDIT') return null;
  return validatePaymentConfiguration();
});

// Check if account is required for delivery selection
const isAccountRequiredForSelection = computed(() => {
  if (props.mode === 'EDIT' || !form.vendor) return false;
  
  // Calculate total available credit
  const totalAvailableCredit = availableCreditNotes.value.reduce((sum, cn) => sum + cn.balance, 0);
  
  // If there are no credit notes or total credit is 0, account is always required
  if (totalAvailableCredit === 0) return !form.account;
  
  // If account is not selected and there are outstanding deliveries that exceed available credit
  if (!form.account) {
    const totalOutstanding = vendorOutstanding.value;
    return totalOutstanding > totalAvailableCredit;
  }
  
  return false;
});

// Check if a delivery should be disabled (only when amount is manually set and allocation limit reached)
const isDeliveryDisabled = (deliveryId: string) => {
  // Only disable if amount was manually set (not selection-driven)
  if (!isAmountManuallySet.value) {
    return false;
  }
  
  if (props.mode === 'EDIT') {
    // In edit mode, disable if unallocated amount is 0 and delivery is not currently selected
    return unallocatedAmount.value <= 0 && !form.deliveries.includes(deliveryId);
  }
  
  // In create mode, disable if unallocated amount is 0 and delivery is not selected
  return unallocatedAmount.value <= 0 && !form.deliveries.includes(deliveryId);
};

// Check if a booking should be disabled (only when amount is manually set and allocation limit reached)
const isBookingDisabled = (bookingId: string) => {
  // Only disable if amount was manually set (not selection-driven)
  if (!isAmountManuallySet.value) {
    return false;
  }
  
  if (props.mode === 'EDIT') {
    // In edit mode, disable if unallocated amount is 0 and booking is not currently selected
    return unallocatedAmount.value <= 0 && !form.service_bookings.includes(bookingId);
  }
  
  // In create mode, disable if unallocated amount is 0 and booking is not selected
  return unallocatedAmount.value <= 0 && !form.service_bookings.includes(bookingId);
};

// Methods
const getAccountIcon = (type?: Account['type']) => {
  if (!type) return Wallet;
  const icons = {
    bank: Building2,
    credit_card: CreditCard,
    cash: Banknote,
    digital_wallet: Smartphone,
    other: Wallet
  };
  return icons[type] || Wallet;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

// Computed property for actual vendor outstanding amount based on current selectable items
const actualVendorOutstanding = computed(() => {
  if (!form.vendor) return 0;
  
  // Calculate outstanding from selectable deliveries (already filtered and calculated correctly)
  const deliveryOutstanding = selectableDeliveries.value.reduce((sum, delivery) => {
    return sum + delivery.outstanding;
  }, 0);
  
  // Calculate outstanding from selectable bookings (already filtered and calculated correctly)
  const serviceOutstanding = selectableBookings.value.reduce((sum, booking) => {
    return sum + booking.outstanding;
  }, 0);
  
  return deliveryOutstanding + serviceOutstanding;
});

const calculateVendorOutstanding = () => {
  if (!form.vendor) {
    vendorOutstanding.value = 0;
    vendorPendingItems.value = 0;
    return;
  }
  
  // Use the computed actual outstanding amount
  vendorOutstanding.value = actualVendorOutstanding.value;
  vendorPendingItems.value = selectableDeliveries.value.length + selectableBookings.value.length;
};

const handleVendorChange = () => {
  calculateVendorOutstanding();
  loadVendorCreditNotes();
  
  // Reset manual tracking flags when vendor changes
  isAmountManuallySet.value = false;
  isUpdatingAmountFromSelections.value = false;
  
  // Clear selections when vendor changes
  clearAllSelections();
  form.credit_notes = [];
  
  // For PAY_NOW mode or when suggested, auto-fill the amount
  if (props.mode === 'PAY_NOW' || (props.mode === 'CREATE' && form.amount === 0)) {
    form.amount = actualVendorOutstanding.value;
    
    // Auto-select deliveries/bookings when amount is set programmatically
    if (form.amount > 0) {
      // Mark as NOT manually set since this is programmatic
      isAmountManuallySet.value = false;
      isUpdatingAmountFromSelections.value = false;
      
      // Trigger auto-selection
      updateDeliverySelectionFromAmount();
    }
  }
};

const handleVendorSelected = (vendor: Vendor) => {
  form.vendor = vendor.id!;
  handleVendorChange();
};

const handleVendorFocus = () => {
  // Focus event from VendorSearchBox - can be used for additional logic if needed
};

const handleAmountChange = () => {
  // Only auto-select deliveries/bookings when amount is manually set and not in edit mode
  if (props.mode !== 'EDIT' && form.amount > 0 && !isUpdatingAmountFromSelections.value) {
    // Mark as manually set when user changes amount directly
    isAmountManuallySet.value = true;
    updateDeliverySelectionFromAmount();
  }
};

const updateDeliverySelectionFromAmount = () => {
  if (form.amount <= 0) {
    // Clear all selections if amount is 0 or negative
    clearAllSelections();
    return;
  }
  
  // Calculate available amount for allocation (considering credit notes)
  const availableForAllocation = Math.max(0, form.amount - selectedCreditNoteAmount.value);
  
  if (availableForAllocation <= 0) {
    // Only credit notes are being used, clear delivery selections
    clearAllSelections();
    return;
  }
  
  // Use the tri-state logic with available amount
  autoSelectDeliveriesWithTriState(availableForAllocation);
};

const handlePayableSelectionChange = () => {
  if (props.mode === 'CREATE' || props.mode === 'PAY_NOW') {
    // Auto-select credit notes based on selected deliveries
    autoSelectCreditNotes();
    
    // Update amount based on selections only if amount was not manually set
    if (!isAmountManuallySet.value) {
      updateAmountFromSelections();
    }
  }
  // Note: Edit mode validation is now handled in the individual change handlers
};

// Update amount based on current selections (when driven by checkbox clicks)
const updateAmountFromSelections = () => {
  const totalSelected = getTotalSelectedDeliveries();
  const totalCreditNotes = selectedCreditNoteAmount.value;
  
  // Prevent recursive updates
  isUpdatingAmountFromSelections.value = true;
  
  // Set amount to total selected deliveries/bookings + credit notes
  form.amount = totalSelected + totalCreditNotes;
  
  // Reset flag after update
  nextTick(() => {
    isUpdatingAmountFromSelections.value = false;
  });
};

// TriStateCheckbox handlers
const handleDeliveryTriStateChange = (deliveryId: string, data: { allocatedAmount: number }) => {
  // In edit mode, check if the change would exceed unallocated amount
  // BUT only if amount was manually set (not selection-driven)
  if (props.mode === 'EDIT' && isAmountManuallySet.value) {
    const currentAllocation = form.delivery_allocations[deliveryId]?.amount || 0;
    const newAllocation = data.allocatedAmount;
    const allocationChange = newAllocation - currentAllocation;
    
    if (allocationChange > unallocatedAmount.value) {
      // Clamp to available amount
      const maxAllocation = currentAllocation + unallocatedAmount.value;
      data.allocatedAmount = maxAllocation;
    }
  }
  
  // Determine state based on allocated amount vs due amount
  const delivery = selectableDeliveries.value.find(d => d.id === deliveryId);
  let state: 'unchecked' | 'partial' | 'checked' = 'unchecked';
  if (delivery) {
    if (data.allocatedAmount <= 0) {
      state = 'unchecked';
    } else if (data.allocatedAmount >= delivery.outstanding) {
      state = 'checked';
    } else {
      state = 'partial';
    }
  }
  
  // Update the allocation state
  form.delivery_allocations[deliveryId] = {
    state: state,
    amount: data.allocatedAmount
  };
  
  // Update the deliveries array based on state
  if (state === 'unchecked') {
    form.deliveries = form.deliveries.filter(id => id !== deliveryId);
  } else if (!form.deliveries.includes(deliveryId)) {
    form.deliveries.push(deliveryId);
  }
  
  // Trigger the existing delivery selection logic
  handlePayableSelectionChange();
};

const handleServiceBookingTriStateChange = (bookingId: string, data: { allocatedAmount: number }) => {
  // In edit mode, check if the change would exceed unallocated amount
  // BUT only if amount was manually set (not selection-driven)
  if (props.mode === 'EDIT' && isAmountManuallySet.value) {
    const currentAllocation = form.service_booking_allocations[bookingId]?.amount || 0;
    const newAllocation = data.allocatedAmount;
    const allocationChange = newAllocation - currentAllocation;
    
    if (allocationChange > unallocatedAmount.value) {
      // Clamp to available amount
      const maxAllocation = currentAllocation + unallocatedAmount.value;
      data.allocatedAmount = maxAllocation;
    }
  }
  
  // Determine state based on allocated amount vs due amount
  const booking = selectableBookings.value.find(b => b.id === bookingId);
  let state: 'unchecked' | 'partial' | 'checked' = 'unchecked';
  if (booking) {
    if (data.allocatedAmount <= 0) {
      state = 'unchecked';
    } else if (data.allocatedAmount >= booking.outstanding) {
      state = 'checked';
    } else {
      state = 'partial';
    }
  }
  
  // Update the allocation state
  form.service_booking_allocations[bookingId] = {
    state: state,
    amount: data.allocatedAmount
  };
  
  // Update the service_bookings array based on state
  if (state === 'unchecked') {
    form.service_bookings = form.service_bookings.filter(id => id !== bookingId);
  } else if (!form.service_bookings.includes(bookingId)) {
    form.service_bookings.push(bookingId);
  }
  
  // Trigger the existing delivery selection logic
  handlePayableSelectionChange();
};

const loadVendorCreditNotes = async () => {
  if (!form.vendor) {
    availableCreditNotes.value = [];
    calculateVendorOutstanding(); // Recalculate without credit notes
    return;
  }
  
  try {
    loadingCreditNotes.value = true;
    const creditNotes = await vendorCreditNoteService.getByVendor(form.vendor);
    // Only show active credit notes with balance > 0, sorted by date (oldest first)
    availableCreditNotes.value = creditNotes
      .filter(cn => cn.status === 'active' && cn.balance > 0)
      .sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime());
    // Recalculate outstanding after loading credit notes
    calculateVendorOutstanding();
  } catch (err) {
    console.error('Error loading credit notes:', err);
    availableCreditNotes.value = [];
    calculateVendorOutstanding(); // Recalculate without credit notes
  } finally {
    loadingCreditNotes.value = false;
  }
};

// TODO - The display for remaining payment is incorrectly tied
const handleCreditNoteChange = () => {
  // When credit notes are selected/deselected, recalculate if needed
  calculateVendorOutstanding();
  
  // In CREATE mode, if the current amount was auto-set to outstanding,
  // keep it synchronized with the vendor outstanding
  if (props.mode === 'CREATE' && form.amount === vendorOutstanding.value) {
    // Keep amount in sync with outstanding if it was auto-set
    form.amount = vendorOutstanding.value;
  }
};

// TODO - This needs to account for the credit notes better, esp. partial usage
const payAllOutstanding = () => {
  // Calculate total payment needed using actual outstanding amount
  const totalPaymentNeeded = actualVendorOutstanding.value;
  
  // Reset manual amount state - this switches to selection-driven mode
  isAmountManuallySet.value = false;
  isUpdatingAmountFromSelections.value = false;
  
  // The form amount should be the total needed payment
  form.amount = totalPaymentNeeded;
  
  // Auto-select deliveries/bookings to match the amount (selection-driven behavior)
  updateDeliverySelectionFromAmount();
  
  // Auto-select all available credit notes if not already selected
  if (availableCreditNotes.value.length > 0 && form.credit_notes.length === 0) {
    form.credit_notes = availableCreditNotes.value.map(cn => cn.id!);
  }
  
  updateDeliverySelectionFromAmount();
};

const initializeForm = () => {
  // Reset form
  Object.assign(form, {
    vendor: '',
    account: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    deliveries: [],
    service_bookings: [],
    credit_notes: [],
    delivery_allocations: {},
    service_booking_allocations: {}
  });
  
  // Reset manual tracking flags
  isAmountManuallySet.value = false;
  isUpdatingAmountFromSelections.value = false;
  
  // Initialize based on mode and props
  if (props.mode === 'PAY_NOW' && props.vendorId) {
    form.vendor = props.vendorId;
    nextTick(() => {
      calculateVendorOutstanding();
      loadVendorCreditNotes();
      form.amount = props.outstandingAmount || vendorOutstanding.value;
      // Mark as manually set for PAY_NOW mode with specific amount
      isAmountManuallySet.value = true;
      updateDeliverySelectionFromAmount();
    });
  } else if (props.mode === 'EDIT' && props.payment) {
    form.vendor = props.payment.vendor;
    form.account = props.payment.account;
    form.amount = props.payment.amount;
    form.transaction_date = props.payment.payment_date;
    form.reference = props.payment.reference || '';
    form.notes = props.payment.notes || '';
    // Mark as manually set for edit mode 
    isAmountManuallySet.value = true;
    // Don't pre-fill deliveries/bookings for edit mode
    calculateVendorOutstanding();
    loadVendorCreditNotes();
  } else if (props.mode === 'CREATE') {
    // For create mode, load credit notes when vendor is selected
    // This is handled in handleVendorChange
  }
  
  // Auto-select account after form initialization
  if (props.mode !== 'EDIT') {
    autoSelectAccount();
  }
};

// TODO - ensure that all relevant payment markings are being sent correctly!
const handleSubmit = async () => {
  if (!isFormValid.value) return;
  
  loading.value = true;
  try {
    const data = {
      mode: props.mode,
      form: { ...form },
      payment: props.payment
    };
    
    emit('submit', data);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  emit('close');
};

const handleBackdropClick = () => {
  emit('close');
};

const handleEscape = () => {
  emit('close');
};

// Lifecycle
onMounted(() => {
  if (props.isVisible) {
    initializeForm();
  }
});

// Watchers
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    initializeForm();
    nextTick(() => {
      vendorInputRef.value?.focus();
    });
  }
});

watch(() => props.mode, () => {
  if (props.isVisible) {
    initializeForm();
  }
});

watch(() => props.accounts, () => {
  if (props.isVisible && props.mode !== 'EDIT') {
    autoSelectAccount();
  }
}, { deep: true });
</script>