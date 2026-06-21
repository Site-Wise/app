<template>
  <!-- Overlay: bottom-sheet on mobile, centered dialog on desktop -->
  <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm">
    <!-- Panel (wide for details view) -->
    <div
      class="w-full sm:max-w-4xl bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      @click.stop
    >
      <!-- Grab handle (mobile only) -->
      <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden flex-shrink-0" />

      <!-- Sticky header -->
      <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div class="flex-1 min-w-0">
          <h3 class="font-display text-lg font-semibold text-ink dark:text-cream truncate">
            {{ t('vendors.returnDetails') }}
          </h3>
          <p class="text-xs text-stone-500 dark:text-stone-400 font-mono sw-tabular mt-0.5">
            {{ t('vendors.returnId') }} #{{ returnData?.id?.slice(-6) }}
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors flex-shrink-0 active:scale-[0.98]"
          :aria-label="t('common.close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 scroll-smooth-touch">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <!-- Return Information -->
          <div class="lg:col-span-2 space-y-5">
            <!-- Basic Info -->
            <div class="card">
              <h4 class="font-display text-base font-semibold text-ink dark:text-cream mb-4">
                {{ t('vendors.returnInformation') }}
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{{ t('common.vendor') }}</label>
                  <div class="text-sm text-ink dark:text-cream">
                    {{ returnData?.expand?.vendor?.contact_person || returnData?.expand?.vendor?.name || t('common.unknownVendor') }}
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{{ t('vendors.returnDate') }}</label>
                  <div class="text-sm text-ink dark:text-cream">
                    {{ formatDate(returnData?.return_date || '') }}
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{{ t('vendors.returnReason') }}</label>
                  <div class="text-sm text-ink dark:text-cream">
                    {{ t(`vendors.returnReasons.${returnData?.reason}`) }}
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{{ t('common.status') }}</label>
                  <span :class="getStatusClass(returnData?.status || '')">
                    {{ t(`vendors.returnStatuses.${returnData?.status}`) }}
                  </span>
                </div>
                <div>
                  <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{{ t('vendors.totalReturnAmount') }}</label>
                  <div class="text-lg font-semibold font-display text-ink dark:text-cream font-mono sw-tabular">
                    ₹{{ returnData?.total_return_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </div>
                </div>
                <div v-if="returnData?.actual_refund_amount">
                  <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{{ t('vendors.refundedAmount') }}</label>
                  <div class="text-lg font-semibold font-display text-forest-600 dark:text-forest-400 font-mono sw-tabular">
                    ₹{{ returnData.actual_refund_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </div>
                </div>
              </div>

              <div v-if="returnData?.notes" class="mt-4">
                <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{{ t('common.notes') }}</label>
                <div class="text-sm text-ink dark:text-cream mt-1 p-3 bg-cream-2 dark:bg-ink-2 rounded-lg">
                  {{ returnData.notes }}
                </div>
              </div>
            </div>

            <!-- Return Items -->
            <div class="card">
              <h4 class="font-display text-base font-semibold text-ink dark:text-cream mb-4">
                {{ t('vendors.returnItems') }}
              </h4>
              <div class="space-y-4">
                <div
                  v-for="item in returnItems"
                  :key="item.id"
                  class="border border-stone-200 dark:border-ink-4 rounded-xl p-4"
                >
                  <div class="flex justify-between items-start mb-3 gap-3">
                    <div class="min-w-0">
                      <h5 class="font-medium text-ink dark:text-cream truncate">
                        {{ item.expand?.delivery_item?.expand?.item?.name || t('common.unknown') }}
                      </h5>
                      <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {{ t('vendors.originalDelivery') }} {{ formatDate(item.expand?.delivery_item?.expand?.delivery?.delivery_date || '') }}
                      </div>
                    </div>
                    <span :class="getConditionClass(item.condition)" class="flex-shrink-0">
                      {{ t(`vendors.itemConditions.${item.condition}`) }}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span class="text-xs text-stone-500 dark:text-stone-400 block mb-0.5">{{ t('vendors.quantityReturnedLabel') }}</span>
                      <div class="font-medium text-ink dark:text-cream font-mono sw-tabular">
                        {{ item.quantity_returned }} {{ item.expand?.delivery_item?.expand?.item?.unit || t('vendors.units') }}
                      </div>
                    </div>
                    <div>
                      <span class="text-xs text-stone-500 dark:text-stone-400 block mb-0.5">{{ t('vendors.returnRateLabel') }}</span>
                      <div class="font-medium text-ink dark:text-cream font-mono sw-tabular">
                        ₹{{ item.return_rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </div>
                    </div>
                    <div>
                      <span class="text-xs text-stone-500 dark:text-stone-400 block mb-0.5">{{ t('vendors.returnAmountLabel') }}</span>
                      <div class="font-medium text-ink dark:text-cream font-mono sw-tabular">
                        ₹{{ item.return_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </div>
                    </div>
                    <div>
                      <span class="text-xs text-stone-500 dark:text-stone-400 block mb-0.5">{{ t('vendors.originalPrice') }}</span>
                      <div class="font-medium text-stone-500 dark:text-stone-400 font-mono sw-tabular">
                        ₹{{ item.expand?.delivery_item?.unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </div>
                    </div>
                  </div>

                  <div v-if="item.item_notes" class="mt-3 p-2 bg-cream-2 dark:bg-ink-2 rounded text-sm">
                    <span class="text-stone-500 dark:text-stone-400 text-xs font-medium">{{ t('common.notes') }}:</span>
                    <span class="text-ink dark:text-cream ml-1">{{ item.item_notes }}</span>
                  </div>
                </div>

                <div v-if="returnItems.length === 0" class="text-center py-10 text-stone-500 dark:text-stone-400">
                  <Package class="mx-auto h-10 w-10 text-stone-400 mb-2" />
                  <p class="text-sm">{{ t('vendors.noReturnItemsFound') }}</p>
                </div>
              </div>
            </div>

            <!-- Photos -->
            <div v-if="returnData?.photos && returnData.photos.length > 0" class="card">
              <h4 class="font-display text-base font-semibold text-ink dark:text-cream mb-4">{{ t('vendors.photosOptional') }}</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div
                  v-for="(photo, index) in returnData.photos"
                  :key="index"
                  class="aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-ink-2"
                >
                  <img
                    :src="getPhotoUrl(photo)"
                    :alt="`Return photo ${index + 1}`"
                    class="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity"
                    @click="openPhotoModal(photo)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Actions & Status sidebar -->
          <div class="space-y-5">
            <!-- Quick Actions -->
            <div class="card">
              <h4 class="font-display text-base font-semibold text-ink dark:text-cream mb-4">{{ t('common.actions') }}</h4>
              <div class="space-y-3">
                <button
                  v-if="returnData?.status === 'initiated'"
                  @click="showApprovalModal = true"
                  class="w-full btn-primary bg-forest-600 hover:bg-forest-700 min-h-[44px] active:scale-[0.98]"
                >
                  <Check class="mr-2 h-4 w-4" />
                  {{ t('vendors.approveReturn') }}
                </button>

                <button
                  v-if="returnData?.status === 'initiated'"
                  @click="showRejectionModal = true"
                  class="w-full btn-outline border-clay-200 text-clay-600 hover:bg-clay-50 dark:border-clay-700 dark:text-clay-400 dark:hover:bg-clay-900/20 min-h-[44px] active:scale-[0.98]"
                >
                  <X class="mr-2 h-4 w-4" />
                  {{ t('vendors.rejectReturn') }}
                </button>

                <button
                  v-if="returnData?.status === 'approved'"
                  @click="handleComplete"
                  class="w-full btn-primary min-h-[44px] active:scale-[0.98]"
                >
                  <CheckCircle class="mr-2 h-4 w-4" />
                  {{ t('vendors.completeReturn') }}
                </button>

                <button
                  v-if="returnData?.status === 'approved' || returnData?.status === 'completed'"
                  @click="$emit('refund')"
                  class="w-full btn-primary min-h-[44px] active:scale-[0.98]"
                >
                  <DollarSign class="mr-2 h-4 w-4" />
                  {{ t('vendors.processRefund') }}
                </button>
              </div>
            </div>

            <!-- Status History -->
            <div class="card">
              <h4 class="font-display text-base font-semibold text-ink dark:text-cream mb-4">{{ t('vendors.statusHistory') }}</h4>
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                  <div class="text-sm min-w-0">
                    <div class="font-medium text-ink dark:text-cream">{{ t('vendors.returnInitiated') }}</div>
                    <div class="text-stone-500 dark:text-stone-400 text-xs">
                      {{ formatDate(returnData?.created || '') }}
                    </div>
                  </div>
                </div>

                <div v-if="returnData?.approved_at" class="flex items-center gap-3">
                  <div class="w-2 h-2 rounded-full flex-shrink-0" :class="returnData.status === 'rejected' ? 'bg-clay-500' : 'bg-forest-500'"></div>
                  <div class="text-sm min-w-0">
                    <div class="font-medium text-ink dark:text-cream">
                      {{ returnData.status === 'rejected' ? t('common.rejected') : t('common.approved') }}
                    </div>
                    <div class="text-stone-500 dark:text-stone-400 text-xs">
                      {{ formatDate(returnData.approved_at) }}
                    </div>
                    <div v-if="returnData.expand?.approved_by" class="text-xs text-stone-500 dark:text-stone-400">
                      by {{ returnData.expand.approved_by.name }}
                    </div>
                  </div>
                </div>

                <div v-if="returnData?.completion_date" class="flex items-center gap-3">
                  <div class="w-2 h-2 bg-forest-500 rounded-full flex-shrink-0"></div>
                  <div class="text-sm min-w-0">
                    <div class="font-medium text-ink dark:text-cream">{{ t('common.completed') }}</div>
                    <div class="text-stone-500 dark:text-stone-400 text-xs">
                      {{ formatDate(returnData.completion_date) }}
                    </div>
                  </div>
                </div>

                <div v-if="returnData?.status === 'refunded'" class="flex items-center gap-3">
                  <div class="w-2 h-2 bg-forest-500 rounded-full flex-shrink-0"></div>
                  <div class="text-sm min-w-0">
                    <div class="font-medium text-ink dark:text-cream">{{ t('vendors.returnStatuses.refunded') }}</div>
                    <div class="text-stone-500 dark:text-stone-400 font-mono sw-tabular text-xs">
                      ₹{{ returnData.actual_refund_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Credit Note Usage (only if processing_option is credit_note) -->
            <div v-if="returnData?.processing_option === 'credit_note'" class="card">
              <h4 class="font-display text-base font-semibold text-ink dark:text-cream mb-4">{{ t('vendors.creditNoteUsage') }}</h4>

              <!-- Credit Note Details -->
              <div v-if="creditNotes.length > 0" class="space-y-4">
                <div v-for="creditNote in creditNotes" :key="creditNote.id" class="border border-stone-200 dark:border-ink-4 rounded-xl p-4">
                  <div class="flex justify-between items-start mb-3 gap-3">
                    <div class="min-w-0">
                      <div class="font-medium text-ink dark:text-cream font-mono sw-tabular text-sm truncate">
                        {{ creditNote.reference || `CN-${creditNote.id?.slice(-6)}` }}
                      </div>
                      <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {{ formatDate(creditNote.issue_date) }}
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <div class="text-sm font-medium text-ink dark:text-cream font-mono sw-tabular">
                        ₹{{ creditNote.credit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </div>
                      <div class="text-xs text-stone-500 dark:text-stone-400 font-mono sw-tabular mt-0.5">
                        {{ t('common.balance') }}: ₹{{ creditNote.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </div>
                    </div>
                  </div>

                  <!-- Usage History -->
                  <div v-if="creditNoteUsage.length > 0" class="mt-3">
                    <h5 class="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">{{ t('vendors.usedInPayments') }}</h5>
                    <div class="space-y-2">
                      <div
                        v-for="usage in creditNoteUsage.filter(u => u.payment.credit_notes?.includes(creditNote.id!))"
                        :key="usage.payment.id"
                        class="flex justify-between items-center p-2 bg-cream-2 dark:bg-ink-2 rounded text-sm gap-3"
                      >
                        <div class="min-w-0">
                          <div class="font-medium text-ink dark:text-cream text-sm truncate">
                            {{ t('vendors.paymentTo') }} {{ usage.payment.expand?.vendor?.contact_person }}
                          </div>
                          <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            {{ formatDate(usage.payment.payment_date) }} • {{ usage.payment.reference || t('vendors.noReference') }}
                          </div>
                        </div>
                        <div class="text-forest-600 dark:text-forest-400 font-medium font-mono sw-tabular flex-shrink-0">
                          -₹{{ usage.usedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- No usage message -->
                  <div v-else class="mt-3 p-2 bg-cream-2 dark:bg-ink-2 rounded text-sm text-stone-500 dark:text-stone-400 text-center">
                    {{ t('vendors.creditNoteNotUsed') }}
                  </div>
                </div>
              </div>

              <!-- No credit notes message -->
              <div v-else class="text-center py-6 text-stone-500 dark:text-stone-400">
                <p class="text-sm">{{ t('vendors.noCreditNotes') }}</p>
              </div>
            </div>

            <!-- Approval / Rejection Notes -->
            <div v-if="returnData?.approval_notes" class="card">
              <h4 class="font-display text-base font-semibold text-ink dark:text-cream mb-4">
                {{ returnData.status === 'rejected' ? t('vendors.rejectionNotes') : t('vendors.approvalNotes') }}
              </h4>
              <div class="text-sm text-ink dark:text-cream p-3 bg-cream-2 dark:bg-ink-2 rounded-lg">
                {{ returnData.approval_notes }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sticky footer (close only for detail view) -->
      <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex-shrink-0">
        <button
          @click="$emit('close')"
          class="w-full sm:w-auto btn-outline min-h-[44px] active:scale-[0.98]"
        >
          {{ t('common.close') }}
        </button>
      </div>
    </div>

    <!-- Approval Modal (nested) -->
    <div
      v-if="showApprovalModal"
      class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-ink/60"
    >
      <div
        class="w-full sm:max-w-md bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[85vh] sm:max-h-[75vh] flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- Grab handle (mobile only) -->
        <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden flex-shrink-0" />

        <!-- Header -->
        <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <h3 class="flex-1 font-display text-lg font-semibold text-ink dark:text-cream">{{ t('vendors.approveReturn') }}</h3>
          <button
            @click="showApprovalModal = false"
            class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors flex-shrink-0 active:scale-[0.98]"
            :aria-label="t('common.close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleApprove" class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ t('vendors.approvalNotes') }} ({{ t('common.optional') }})
            </label>
            <textarea
              v-model="approvalNotes"
              class="input mt-1"
              rows="4"
              :placeholder="t('vendors.addApprovalNotes')"
              autofocus
            ></textarea>
          </div>
        </form>

        <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex-shrink-0">
          <button
            type="button"
            @click="showApprovalModal = false"
            class="btn-outline min-h-[44px] active:scale-[0.98]"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="loading"
            class="flex-1 btn-primary bg-forest-600 hover:bg-forest-700 min-h-[44px] active:scale-[0.98]"
            @click="handleApprove"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            {{ t('vendors.approveReturn') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Rejection Modal (nested) -->
    <div
      v-if="showRejectionModal"
      class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-ink/60"
    >
      <div
        class="w-full sm:max-w-md bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[85vh] sm:max-h-[75vh] flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- Grab handle (mobile only) -->
        <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden flex-shrink-0" />

        <!-- Header -->
        <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <h3 class="flex-1 font-display text-lg font-semibold text-ink dark:text-cream">{{ t('vendors.rejectReturn') }}</h3>
          <button
            @click="showRejectionModal = false"
            class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors flex-shrink-0 active:scale-[0.98]"
            :aria-label="t('common.close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleReject" class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ t('vendors.rejectionNotes') }} *
            </label>
            <textarea
              v-model="rejectionNotes"
              class="input mt-1"
              rows="4"
              :placeholder="t('vendors.provideRejectionReason')"
              required
              autofocus
            ></textarea>
          </div>
        </form>

        <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex-shrink-0">
          <button
            type="button"
            @click="showRejectionModal = false"
            class="btn-outline min-h-[44px] active:scale-[0.98]"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="loading || !rejectionNotes.trim()"
            class="flex-1 btn-primary bg-clay-600 hover:bg-clay-700 min-h-[44px] active:scale-[0.98]"
            @click="handleReject"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            {{ t('vendors.rejectReturn') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Photo lightbox -->
    <div
      v-if="showPhotoModal"
      class="fixed inset-0 z-[70] bg-ink/90 flex items-center justify-center p-4"
      @click="showPhotoModal = false"
    >
      <img
        :src="getPhotoUrl(selectedPhoto)"
        :alt="t('common.image')"
        class="max-w-full max-h-full rounded-lg object-contain"
      />
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
