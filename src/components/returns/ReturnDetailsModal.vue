<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ t('vendors.returnDetails') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Return #{{ returnData?.id?.slice(-6) }}
            </p>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Return Information -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Basic Info -->
            <div class="card">
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Return Information</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Vendor</label>
                  <div class="text-sm text-gray-900 dark:text-white">
                    {{ returnData?.expand?.vendor?.contact_person || returnData?.expand?.vendor?.name || 'Unknown Vendor' }}
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Return Date</label>
                  <div class="text-sm text-gray-900 dark:text-white">
                    {{ formatDate(returnData?.return_date || '') }}
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
                  <div class="text-sm text-gray-900 dark:text-white">
                    {{ t(`vendors.returnReasons.${returnData?.reason}`) }}
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <span :class="getStatusClass(returnData?.status || '')">
                    {{ t(`vendors.returnStatuses.${returnData?.status}`) }}
                  </span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Return Amount</label>
                  <div class="text-lg font-semibold text-gray-900 dark:text-white">
                    ₹{{ returnData?.total_return_amount?.toFixed(2) }}
                  </div>
                </div>
                <div v-if="returnData?.actual_refund_amount">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Refunded Amount</label>
                  <div class="text-lg font-semibold text-green-600 dark:text-green-400">
                    ₹{{ returnData.actual_refund_amount.toFixed(2) }}
                  </div>
                </div>
              </div>

              <div v-if="returnData?.notes" class="mt-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <div class="text-sm text-gray-900 dark:text-white mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {{ returnData.notes }}
                </div>
              </div>
            </div>

            <!-- Return Items -->
            <div class="card">
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Return Items</h4>
              <div class="space-y-4">
                <div 
                  v-for="item in returnItems" 
                  :key="item.id"
                  class="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <h5 class="font-medium text-gray-900 dark:text-white">
                        {{ item.expand?.delivery_item?.expand?.item?.name || 'Unknown Item' }}
                      </h5>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        Original delivery: {{ formatDate(item.expand?.delivery_item?.expand?.delivery?.delivery_date || '') }}
                      </div>
                    </div>
                    <span :class="getConditionClass(item.condition)">
                      {{ t(`vendors.itemConditions.${item.condition}`) }}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span class="text-gray-500 dark:text-gray-400">Quantity Returned:</span>
                      <div class="font-medium text-gray-900 dark:text-white">
                        {{ item.quantity_returned }} {{ item.expand?.delivery_item?.expand?.item?.unit || 'units' }}
                      </div>
                    </div>
                    <div>
                      <span class="text-gray-500 dark:text-gray-400">Return Rate:</span>
                      <div class="font-medium text-gray-900 dark:text-white">
                        ₹{{ item.return_rate.toFixed(2) }}
                      </div>
                    </div>
                    <div>
                      <span class="text-gray-500 dark:text-gray-400">Return Amount:</span>
                      <div class="font-medium text-gray-900 dark:text-white">
                        ₹{{ item.return_amount.toFixed(2) }}
                      </div>
                    </div>
                    <div>
                      <span class="text-gray-500 dark:text-gray-400">Original Price:</span>
                      <div class="font-medium text-gray-500 dark:text-gray-400">
                        ₹{{ item.expand?.delivery_item?.unit_price?.toFixed(2) }}
                      </div>
                    </div>
                  </div>

                  <div v-if="item.item_notes" class="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                    <span class="text-gray-500 dark:text-gray-400">Notes:</span>
                    {{ item.item_notes }}
                  </div>
                </div>

                <div v-if="returnItems.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Package class="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  No return items found.
                </div>
              </div>
            </div>

            <!-- Photos -->
            <div v-if="returnData?.photos && returnData.photos.length > 0" class="card">
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Photos</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div 
                  v-for="(photo, index) in returnData.photos" 
                  :key="index"
                  class="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
                >
                  <img 
                    :src="getPhotoUrl(photo)" 
                    :alt="`Return photo ${index + 1}`"
                    class="w-full h-full object-cover cursor-pointer hover:opacity-75"
                    @click="openPhotoModal(photo)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Actions & Status -->
          <div class="space-y-6">
            <!-- Quick Actions -->
            <div class="card">
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h4>
              <div class="space-y-3">
                <button 
                  v-if="returnData?.status === 'initiated'" 
                  @click="showApprovalModal = true"
                  class="w-full btn-primary bg-green-600 hover:bg-green-700"
                >
                  <Check class="mr-2 h-4 w-4" />
                  {{ t('vendors.approveReturn') }}
                </button>

                <button 
                  v-if="returnData?.status === 'initiated'" 
                  @click="showRejectionModal = true"
                  class="w-full btn-outline border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <X class="mr-2 h-4 w-4" />
                  {{ t('vendors.rejectReturn') }}
                </button>

                <button 
                  v-if="returnData?.status === 'approved'" 
                  @click="handleComplete"
                  class="w-full btn-primary bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle class="mr-2 h-4 w-4" />
                  {{ t('vendors.completeReturn') }}
                </button>

                <button 
                  v-if="returnData?.status === 'approved' || returnData?.status === 'completed'" 
                  @click="$emit('refund')"
                  class="w-full btn-primary bg-purple-600 hover:bg-purple-700"
                >
                  <DollarSign class="mr-2 h-4 w-4" />
                  {{ t('vendors.processRefund') }}
                </button>
              </div>
            </div>

            <!-- Status History -->
            <div class="card">
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status History</h4>
              <div class="space-y-3">
                <div class="flex items-center">
                  <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div class="text-sm">
                    <div class="font-medium text-gray-900 dark:text-white">Return Initiated</div>
                    <div class="text-gray-500 dark:text-gray-400">
                      {{ formatDate(returnData?.created || '') }}
                    </div>
                  </div>
                </div>

                <div v-if="returnData?.approved_at" class="flex items-center">
                  <div class="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div class="text-sm">
                    <div class="font-medium text-gray-900 dark:text-white">
                      {{ returnData.status === 'rejected' ? 'Rejected' : 'Approved' }}
                    </div>
                    <div class="text-gray-500 dark:text-gray-400">
                      {{ formatDate(returnData.approved_at) }}
                    </div>
                    <div v-if="returnData.expand?.approved_by" class="text-xs text-gray-400">
                      by {{ returnData.expand.approved_by.name }}
                    </div>
                  </div>
                </div>

                <div v-if="returnData?.completion_date" class="flex items-center">
                  <div class="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <div class="text-sm">
                    <div class="font-medium text-gray-900 dark:text-white">Completed</div>
                    <div class="text-gray-500 dark:text-gray-400">
                      {{ formatDate(returnData.completion_date) }}
                    </div>
                  </div>
                </div>

                <div v-if="returnData?.status === 'refunded'" class="flex items-center">
                  <div class="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div class="text-sm">
                    <div class="font-medium text-gray-900 dark:text-white">Refunded</div>
                    <div class="text-gray-500 dark:text-gray-400">
                      ₹{{ returnData.actual_refund_amount?.toFixed(2) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Credit Note Usage (only if processing_option is credit_note) -->
            <div v-if="returnData?.processing_option === 'credit_note'" class="card">
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Credit Note Usage</h4>
              
              <!-- Credit Note Details -->
              <div v-if="creditNotes.length > 0" class="space-y-4">
                <div v-for="creditNote in creditNotes" :key="creditNote.id" class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <div class="font-medium text-gray-900 dark:text-white">
                        {{ creditNote.reference || `CN-${creditNote.id?.slice(-6)}` }}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        Created: {{ formatDate(creditNote.issue_date) }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium text-blue-600 dark:text-blue-400">
                        ₹{{ creditNote.credit_amount.toFixed(2) }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        Balance: ₹{{ creditNote.balance.toFixed(2) }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- Usage History -->
                  <div v-if="creditNoteUsage.length > 0" class="mt-3">
                    <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Used In Payments:</h5>
                    <div class="space-y-2">
                      <div 
                        v-for="usage in creditNoteUsage.filter(u => u.payment.credit_notes?.includes(creditNote.id!))" 
                        :key="usage.payment.id"
                        class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
                      >
                        <div>
                          <div class="font-medium text-gray-900 dark:text-white">
                            Payment to {{ usage.payment.expand?.vendor?.contact_person }}
                          </div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">
                            {{ formatDate(usage.payment.payment_date) }} • {{ usage.payment.reference || 'No reference' }}
                          </div>
                        </div>
                        <div class="text-green-600 dark:text-green-400 font-medium">
                          -₹{{ usage.usedAmount.toFixed(2) }}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- No usage message -->
                  <div v-else class="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-500 dark:text-gray-400 text-center">
                    Credit note not yet used in any payments
                  </div>
                </div>
              </div>
              
              <!-- No credit notes message -->
              <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
                <div class="text-sm">No credit notes found for this return</div>
              </div>
            </div>

            <!-- Approval Notes -->
            <div v-if="returnData?.approval_notes" class="card">
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {{ returnData.status === 'rejected' ? 'Rejection Notes' : 'Approval Notes' }}
              </h4>
              <div class="text-sm text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {{ returnData.approval_notes }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Approval Modal -->
    <div v-if="showApprovalModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Approve Return</h3>
          <form @submit.prevent="handleApprove">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('vendors.approvalNotes') }} (Optional)
              </label>
              <textarea 
                v-model="approvalNotes" 
                class="input mt-1" 
                rows="3" 
                placeholder="Add approval notes..."
              ></textarea>
            </div>
            <div class="flex space-x-3">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary bg-green-600 hover:bg-green-700">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                Approve
              </button>
              <button type="button" @click="showApprovalModal = false" class="flex-1 btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Rejection Modal -->
    <div v-if="showRejectionModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Reject Return</h3>
          <form @submit.prevent="handleReject">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('vendors.rejectionNotes') }} *
              </label>
              <textarea 
                v-model="rejectionNotes" 
                class="input mt-1" 
                rows="3" 
                placeholder="Please provide reason for rejection..."
                required
              ></textarea>
            </div>
            <div class="flex space-x-3">
              <button type="submit" :disabled="loading || !rejectionNotes.trim()" class="flex-1 btn-primary bg-red-600 hover:bg-red-700">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                Reject
              </button>
              <button type="button" @click="showRejectionModal = false" class="flex-1 btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Photo Modal -->
    <div v-if="showPhotoModal" class="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-60" @click="showPhotoModal = false">
      <div class="relative top-20 mx-auto max-w-4xl">
        <img 
          :src="getPhotoUrl(selectedPhoto)" 
          :alt="'Return photo'"
          class="w-full h-auto rounded-lg"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  X, 
  Check, 
  CheckCircle, 
  DollarSign, 
  Package,
  Loader2
} from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import { useModalEscape } from '../../composables/useModalEscape';
import {
  vendorReturnService,
  vendorReturnItemService,
  vendorCreditNoteService,
  paymentService,
  type VendorReturn,
  type VendorReturnItem,
  type VendorCreditNote,
  type Payment
} from '../../services/pocketbase';

interface Props {
  returnData?: VendorReturn | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  approve: [];
  reject: [];
  complete: [];
  refund: [];
}>();

const { t } = useI18n();

// ESC key handling for modal
useModalEscape(() => emit('close'))

// Data
const returnItems = ref<VendorReturnItem[]>([]);
const creditNotes = ref<VendorCreditNote[]>([]);
const creditNoteUsage = ref<{ payment: Payment; usedAmount: number }[]>([]);
const loading = ref(false);

// Modals
const showApprovalModal = ref(false);
const showRejectionModal = ref(false);
const showPhotoModal = ref(false);
const selectedPhoto = ref('');

// Form data
const approvalNotes = ref('');
const rejectionNotes = ref('');

// Load return items and credit notes
const loadReturnData = async () => {
  if (!props.returnData?.id) return;
  
  try {
    // Load return items
    returnItems.value = await vendorReturnItemService.getByReturn(props.returnData.id);
    
    // Load credit notes for this return (if processing_option is credit_note)
    if (props.returnData.processing_option === 'credit_note') {
      await loadCreditNoteUsage();
    }
  } catch (error) {
    console.error('Error loading return data:', error);
  }
};

// Load credit note usage information
const loadCreditNoteUsage = async () => {
  if (!props.returnData?.id) return;
  
  try {
    // Get credit notes created for this return
    creditNotes.value = await vendorCreditNoteService.getByReturn(props.returnData.id);
    
    // For each credit note, find payments where it was used
    const usageData: { payment: Payment; usedAmount: number }[] = [];
    
    for (const creditNote of creditNotes.value) {
      if (creditNote.id) {
        // Get all payments to check which ones used this credit note
        const payments = await paymentService.getAll();
        
        for (const payment of payments) {
          if (payment.credit_notes && payment.credit_notes.includes(creditNote.id)) {
            // For payments that used this credit note, we need to determine the used amount
            // This would ideally come from payment allocation records or credit note usage records
            // For now, we'll show that the credit note was used in the payment
            // The actual used amount would need to be tracked separately
            const totalUsed = creditNote.credit_amount - creditNote.balance;
            if (totalUsed > 0) {
              usageData.push({
                payment,
                usedAmount: totalUsed // This is the total used, not per-payment
              });
            }
          }
        }
      }
    }
    
    creditNoteUsage.value = usageData;
  } catch (error) {
    console.error('Error loading credit note usage:', error);
  }
};

// Methods
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const getStatusClass = (status: string) => {
  const classes = {
    initiated: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
    completed: 'status-completed',
    refunded: 'status-paid'
  };
  return classes[status as keyof typeof classes] || 'status-pending';
};

const getConditionClass = (condition: string) => {
  const classes = {
    unopened: 'status-approved',
    opened: 'status-partial',
    damaged: 'status-rejected',
    used: 'status-pending'
  };
  return classes[condition as keyof typeof classes] || 'status-pending';
};

const getPhotoUrl = (filename: string) => {
  if (!props.returnData?.id) return '';
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
  return `${baseUrl}/api/files/vendor_returns/${props.returnData.id}/${filename}`;
};

const openPhotoModal = (photo: string) => {
  selectedPhoto.value = photo;
  showPhotoModal.value = true;
};

const handleApprove = async () => {
  if (!props.returnData?.id) return;
  
  loading.value = true;
  try {
    await vendorReturnService.approve(props.returnData.id, approvalNotes.value);
    showApprovalModal.value = false;
    emit('approve');
  } catch (error) {
    console.error('Error approving return:', error);
  } finally {
    loading.value = false;
  }
};

const handleReject = async () => {
  if (!props.returnData?.id) return;
  
  loading.value = true;
  try {
    await vendorReturnService.reject(props.returnData.id, rejectionNotes.value);
    showRejectionModal.value = false;
    emit('reject');
  } catch (error) {
    console.error('Error rejecting return:', error);
  } finally {
    loading.value = false;
  }
};

const handleComplete = async () => {
  if (!props.returnData?.id) return;
  
  loading.value = true;
  try {
    await vendorReturnService.complete(props.returnData.id);
    emit('complete');
  } catch (error) {
    console.error('Error completing return:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadReturnData();
});
</script>