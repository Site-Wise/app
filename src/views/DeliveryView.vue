<template>
  <div>
    <!-- Desktop Header with Add Button -->
    <div class="hidden md:flex items-center justify-between mb-8">
      <div>
        <h1 class="font-display text-2xl font-bold text-ink dark:text-cream">{{ t('delivery.title') }}</h1>
        <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {{ t('delivery.subtitle') }}
        </p>
      </div>
      <div class="flex items-center space-x-3">
        <button 
          @click="viewAllImages"
          :disabled="allImages.length === 0"
          :class="[
            allImages.length > 0 ? 'btn-outline' : 'btn-disabled',
            'hidden md:flex items-center'
          ]"
          :title="allImages.length === 0 ? t('delivery.noImages') : t('delivery.viewAllImages')"
        >
          <Images class="mr-2 h-4 w-4" />
          {{ t('delivery.viewAllImages') }} ({{ allImages.length }})
        </button>
        <button 
          @click="handleAddDelivery" 
          :disabled="!canCreateDelivery"
          :class="[
            canCreateDelivery ? 'btn-primary' : 'btn-disabled',
            'hidden md:flex items-center'
          ]"
          :title="!canCreateDelivery ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
          data-keyboard-shortcut="n"
          data-tour="record-delivery-btn"
        >
          <Plus class="mr-2 h-4 w-4" />
          {{ t('delivery.recordDelivery') }}
        </button>
      </div>
    </div>

    <!-- Mobile Header with Search -->
    <div class="md:hidden mb-6">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold text-ink dark:text-cream">{{ t('delivery.title') }}</h1>
          <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {{ t('delivery.subtitle') }}
          </p>
        </div>

        <!-- Mobile Action Menu -->
        <div class="relative mobile-action-menu">
          <button
            @click="showMobileActionMenu = !showMobileActionMenu"
            class="p-2 rounded-md hover:bg-stone-100 dark:hover:bg-ink-2 transition-colors"
          >
            <MoreVertical class="h-5 w-5 text-stone-500 dark:text-stone-400" />
          </button>

          <!-- Mobile Dropdown Menu -->
          <div
            v-if="showMobileActionMenu"
            class="absolute right-0 mt-2 w-56 bg-white dark:bg-ink-3 rounded-md shadow-modal z-10 border border-stone-200 dark:border-ink-4"
          >
            <div class="py-1">
              <button 
                @click="handleMobileAction('viewAllImages')"
                :disabled="allImages.length === 0"
                :class="[
                  'flex items-center w-full px-4 py-3 text-sm transition-colors',
                  allImages.length > 0
                    ? 'text-ink dark:text-cream hover:bg-stone-100 dark:hover:bg-ink-2'
                    : 'text-stone-400 dark:text-stone-600 cursor-not-allowed'
                ]"
              >
                <Images class="mr-3 h-5 w-5" />
                {{ t('delivery.viewAllImages') }} ({{ allImages.length }})
              </button>

              <div class="border-t border-stone-200 dark:border-ink-4 my-1"></div>

              <button
                @click="handleMobileAction('addDelivery')"
                :disabled="!canCreateDelivery"
                :class="[
                  'flex items-center w-full px-4 py-3 text-sm transition-colors',
                  canCreateDelivery
                    ? 'text-ink bg-amber-500 hover:bg-amber-600'
                    : 'text-stone-400 dark:text-stone-600 cursor-not-allowed'
                ]"
              >
                <Plus class="mr-3 h-5 w-5" />
                {{ t('delivery.recordDelivery') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Mobile Search Box -->
      <SearchBox
        v-model="searchQuery"
        :placeholder="t('search.delivery')"
        :search-loading="searchLoading"
      />
      
      <!-- Mobile Search Results Summary -->
      <div v-if="searchQuery.trim() && !searchLoading" class="mt-3 flex items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
        <div class="flex items-center gap-1">
          <span class="font-mono sw-tabular font-medium text-ink dark:text-cream">{{ searchResultsCount }}</span>
          <span>{{ searchResultsCount === 1 ? t('delivery.result') : t('delivery.results') }}</span>
        </div>
        <div class="h-4 border-l border-stone-300 dark:border-ink-4"></div>
        <div class="flex items-center gap-1">
          <span class="text-xs">{{ t('common.total') }}:</span>
          <span class="font-mono sw-tabular font-semibold text-ink dark:text-cream">₹{{ searchResultsTotal.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- Desktop Search with Results Summary -->
    <div class="hidden md:block mb-6" data-tour="search-bar">
      <div class="flex items-center gap-6">
        <div class="w-96">
          <SearchBox
            v-model="searchQuery"
            :placeholder="t('search.delivery')"
            :search-loading="searchLoading"
          />
        </div>
        
        <!-- Search Results Summary -->
        <div v-if="searchQuery.trim() && !searchLoading" class="flex items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
          <div class="flex items-center gap-1">
            <span class="font-mono sw-tabular font-medium text-ink dark:text-cream">{{ searchResultsCount }}</span>
            <span>{{ searchResultsCount === 1 ? t('delivery.result') : t('delivery.results') }}</span>
          </div>
          <div class="h-4 border-l border-stone-300 dark:border-ink-4"></div>
          <div class="flex items-center gap-1">
            <span class="text-xs">{{ t('common.total') }}:</span>
            <span class="font-mono sw-tabular font-semibold text-ink dark:text-cream">₹{{ searchResultsTotal.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- xl+ Table View -->
    <div class="hidden xl:block overflow-x-auto rounded-lg border border-stone-200 dark:border-ink-4 shadow-card dark:shadow-inset-hi">
      <table class="min-w-full divide-y divide-stone-200 dark:divide-ink-4">
          <thead class="bg-cream-2 dark:bg-ink-2">
            <tr>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-ink-4">{{ t('common.vendor') }}</th>
              <th class="px-4 py-3 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-ink-4">{{ t('delivery.deliveryDate') }}</th>
              <th class="px-4 py-3 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-ink-4">{{ t('delivery.itemCount') }}</th>
              <th class="px-4 py-3 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-ink-4">{{ t('common.total') }}</th>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-ink-4">{{ t('delivery.paymentStatus') }}</th>
              <th class="relative px-4 py-3 border-b border-stone-200 dark:border-ink-4"><span class="sr-only">{{ t('common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-ink-3 divide-y divide-stone-200 dark:divide-ink-4">
            <template v-if="loading">
              <tr v-for="i in 6" :key="'skel-xl-' + i" class="border-b border-stone-200 dark:border-ink-4">
                <td class="px-4 py-3.5"><Skeleton height="1rem" width="70%" /></td>
                <td class="px-4 py-3.5 text-right"><Skeleton height="1rem" width="5rem" /></td>
                <td class="px-4 py-3.5 text-right"><Skeleton height="1rem" width="3rem" /></td>
                <td class="px-4 py-3.5 text-right"><Skeleton height="1rem" width="5rem" /></td>
                <td class="px-4 py-3.5"><Skeleton height="1.25rem" width="4rem" rounded="rounded-full" /></td>
                <td class="px-4 py-3.5"><Skeleton height="1rem" width="3.5rem" /></td>
              </tr>
            </template>
            <tr v-else-if="deliveries.length === 0">
              <td colspan="6" class="px-4 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-12 h-12 rounded-lg bg-cream-2 dark:bg-ink-2 flex items-center justify-center">
                    <Loader2 class="w-6 h-6 text-stone-300 dark:text-stone-600" />
                  </div>
                  <p class="font-display text-sm font-semibold text-ink dark:text-cream">
                    {{ searchQuery.trim() ? t('delivery.noSearchResults') : t('delivery.noDeliveries') }}
                  </p>
                  <p v-if="!searchQuery.trim()" class="text-xs text-stone-500 dark:text-stone-400">
                    {{ t('delivery.startTracking') }}
                  </p>
                </div>
              </td>
            </tr>
            <tr v-else v-for="delivery in deliveries" :key="delivery.id"
                class="cursor-pointer hover:bg-cream-2 dark:hover:bg-ink-2 transition-colors duration-150 ease-snap">
              <td class="px-4 py-3.5 whitespace-nowrap">
                <div class="font-medium text-sm text-ink dark:text-cream">
                  {{ delivery.expand?.vendor?.contact_person || 'Unknown Vendor' }}
                </div>
                <div v-if="delivery.expand?.vendor?.name" class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {{ delivery.expand.vendor.name }}
                </div>
                <div v-if="delivery.delivery_reference" class="text-xs font-mono sw-tabular text-stone-400 dark:text-stone-500 mt-0.5">
                  {{ delivery.delivery_reference }}
                </div>
              </td>
              <td class="px-4 py-3.5 whitespace-nowrap text-right">
                <div class="text-sm font-mono sw-tabular text-stone-500 dark:text-stone-400">
                  {{ formatDate(delivery.delivery_date) }}
                </div>
              </td>
              <td class="px-4 py-3.5 whitespace-nowrap text-right">
                <div class="text-sm font-mono sw-tabular text-stone-500 dark:text-stone-400">
                  {{ delivery.expand?.delivery_items?.length || 0 }}
                </div>
              </td>
              <td class="px-4 py-3.5 whitespace-nowrap text-right">
                <div class="text-sm font-mono sw-tabular font-medium text-ink dark:text-cream">
                  ₹{{ delivery.total_amount.toFixed(2) }}
                </div>
                <div v-if="delivery.payment_status === 'partial'" class="text-xs font-mono sw-tabular text-amber-700 dark:text-amber-400">
                  ₹{{ delivery.outstanding.toFixed(2) }}
                </div>
              </td>
              <td class="px-4 py-3.5 whitespace-nowrap">
                <span :class="`status-${delivery.payment_status}`">
                  {{ t(`common.${delivery.payment_status}`) }}
                </span>
              </td>
              <td class="px-4 py-3.5 whitespace-nowrap text-right">
                <!-- Desktop Action Buttons -->
                <div class="flex items-center justify-end space-x-1" @click.stop>
                  <button
                    @click="viewDelivery(delivery)"
                    class="h-8 w-8 flex items-center justify-center text-stone-400 dark:text-stone-500 hover:text-ink dark:hover:text-cream rounded-md hover:bg-stone-100 dark:hover:bg-ink-2 transition-colors duration-150"
                    :title="t('common.view')"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    v-if="canEditDelete && delivery.payment_status === 'pending'"
                    @click="editDelivery(delivery)"
                    class="h-8 w-8 flex items-center justify-center text-stone-400 dark:text-stone-500 hover:text-ink dark:hover:text-cream rounded-md hover:bg-stone-100 dark:hover:bg-ink-2 transition-colors duration-150"
                    :title="t('common.edit')"
                  >
                    <Edit2 class="h-4 w-4" />
                  </button>
                  <button
                    v-if="canEditDelete && delivery.payment_status === 'pending'"
                    @click="deleteDelivery(delivery)"
                    class="h-8 w-8 flex items-center justify-center text-clay-500 dark:text-clay-400 hover:text-clay-600 dark:hover:text-clay-300 rounded-md hover:bg-stone-100 dark:hover:bg-ink-2 transition-colors duration-150"
                    :title="t('common.deleteAction')"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
    </div>

    <!-- Mobile/Tablet Card View (< xl) -->
    <div class="xl:hidden">
      <div class="space-y-3">
        <!-- Loading state -->
        <template v-if="loading">
          <div v-for="i in 6" :key="'skel-mob-' + i"
               class="bg-white dark:bg-ink-3 rounded-lg shadow-card dark:shadow-inset-hi border border-stone-200 dark:border-ink-4 overflow-hidden">
            <div class="flex items-start justify-between px-4 pt-4 pb-3">
              <div class="flex-1 min-w-0 space-y-2">
                <Skeleton height="1rem" width="60%" />
                <Skeleton height="0.75rem" width="40%" />
              </div>
              <Skeleton height="1.25rem" width="3.5rem" rounded="rounded-full" />
            </div>
            <div class="grid grid-cols-3 gap-0 border-t border-stone-200 dark:border-ink-4 bg-cream-2 dark:bg-ink-2">
              <div class="px-4 py-2.5 border-r border-stone-200 dark:border-ink-4 space-y-1">
                <Skeleton height="0.625rem" width="80%" />
                <Skeleton height="0.75rem" width="60%" />
              </div>
              <div class="px-4 py-2.5 border-r border-stone-200 dark:border-ink-4 space-y-1">
                <Skeleton height="0.625rem" width="70%" />
                <Skeleton height="0.75rem" width="40%" />
              </div>
              <div class="px-4 py-2.5 space-y-1">
                <Skeleton height="0.625rem" width="60%" />
                <Skeleton height="0.75rem" width="70%" />
              </div>
            </div>
          </div>
        </template>

        <!-- Empty state -->
        <div v-else-if="deliveries.length === 0" class="flex flex-col items-center gap-3 py-16 text-center">
          <div class="w-12 h-12 rounded-lg bg-stone-100 dark:bg-ink-2 flex items-center justify-center">
            <Loader2 class="w-6 h-6 text-stone-300 dark:text-stone-600" />
          </div>
          <p class="font-display text-sm font-semibold text-ink dark:text-cream">
            {{ searchQuery.trim() ? t('delivery.noSearchResults') : t('delivery.noDeliveries') }}
          </p>
          <p v-if="!searchQuery.trim()" class="text-xs text-stone-500 dark:text-stone-400">
            {{ t('delivery.startTracking') }}
          </p>
        </div>

        <!-- Delivery cards -->
        <div v-else v-for="delivery in deliveries" :key="delivery.id"
             class="bg-white dark:bg-ink-3 rounded-lg shadow-card dark:shadow-inset-hi border border-stone-200 dark:border-ink-4 overflow-hidden">

          <!-- Card Header: vendor + status + actions -->
          <div class="flex items-start justify-between px-4 pt-4 pb-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-display text-sm font-semibold text-ink dark:text-cream truncate">
                  {{ delivery.expand?.vendor?.contact_person || 'Unknown Vendor' }}
                </h3>
                <span :class="`status-${delivery.payment_status}`">
                  {{ t(`common.${delivery.payment_status}`) }}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-1 text-xs text-stone-500 dark:text-stone-400">
                <span v-if="delivery.expand?.vendor?.name" class="truncate">{{ delivery.expand.vendor.name }}</span>
                <span v-if="delivery.expand?.vendor?.name && delivery.delivery_reference" class="text-stone-300 dark:text-stone-600">·</span>
                <span v-if="delivery.delivery_reference" class="font-mono sw-tabular">{{ delivery.delivery_reference }}</span>
              </div>
            </div>

            <!-- Card Actions Dropdown -->
            <div class="relative ml-2 flex-shrink-0">
              <CardDropdownMenu
                :actions="getDeliveryActions(delivery)"
                @action="handleDeliveryAction(delivery, $event)"
              />
            </div>
          </div>

          <!-- Card metric strip -->
          <div class="grid grid-cols-3 gap-0 border-t border-stone-200 dark:border-ink-4 bg-cream-2 dark:bg-ink-2">
            <div class="px-4 py-2.5 border-r border-stone-200 dark:border-ink-4">
              <div class="text-[10px] uppercase tracking-wide font-semibold text-stone-400 dark:text-stone-500 mb-0.5">{{ t('delivery.deliveryDate') }}</div>
              <div class="text-xs font-mono sw-tabular text-ink dark:text-cream">{{ formatDate(delivery.delivery_date) }}</div>
            </div>
            <div class="px-4 py-2.5 border-r border-stone-200 dark:border-ink-4">
              <div class="text-[10px] uppercase tracking-wide font-semibold text-stone-400 dark:text-stone-500 mb-0.5">{{ t('delivery.itemCount') }}</div>
              <div class="text-xs font-mono sw-tabular text-ink dark:text-cream">{{ delivery.expand?.delivery_items?.length || 0 }}</div>
            </div>
            <div class="px-4 py-2.5">
              <div class="text-[10px] uppercase tracking-wide font-semibold text-stone-400 dark:text-stone-500 mb-0.5">{{ t('common.total') }}</div>
              <div class="text-xs font-mono sw-tabular font-semibold text-ink dark:text-cream">₹{{ delivery.total_amount.toFixed(2) }}</div>
              <div v-if="delivery.payment_status === 'partial'" class="text-[10px] font-mono sw-tabular text-amber-700 dark:text-amber-400 mt-0.5">
                ₹{{ delivery.outstanding.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Multi-Item Delivery Modal -->
    <MultiItemDeliveryModal
      v-if="showAddModal"
      :editing-delivery="editingDelivery || undefined"
      @close="closeAddModal"
      @saved="handleDeliverySaved"
      @success="handleDeliveryEditSuccess"
    />

    <!-- View Modal -->
    <div v-if="viewingDelivery" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60" @keydown.esc="closeViewModal" tabindex="-1">
      <div @click.stop class="w-full sm:max-w-2xl bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">

        <!-- Grab handle (mobile) -->
        <div class="flex justify-center pt-3 pb-1 sm:hidden">
          <div class="w-10 h-1 rounded-full bg-stone-300 dark:bg-ink-5"></div>
        </div>

        <!-- Sticky header -->
        <div class="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-200 dark:border-ink-4 flex-shrink-0">
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Eye class="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </span>
            <div>
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('common.view') }}</p>
              <h3 class="font-display text-base font-semibold text-ink dark:text-cream leading-tight">{{ t('delivery.deliveryDetails') }}</h3>
            </div>
          </div>
          <button @click="closeViewModal" class="text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors">
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <!-- Delivery Information -->
            <div class="space-y-4">
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('common.vendor') }}:</span>
                <div class="ml-2 inline-block">
                  <span class="text-ink dark:text-cream">{{ viewingDelivery.expand?.vendor?.contact_person || 'Unknown Vendor' }}</span>
                  <div v-if="viewingDelivery.expand?.vendor?.name" class="text-xs text-stone-500 dark:text-stone-400">
                    {{ viewingDelivery.expand.vendor.name }}
                  </div>
                </div>
              </div>
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('delivery.deliveryDate') }}:</span>
                <span class="ml-2 font-mono sw-tabular text-ink dark:text-cream">{{ formatDate(viewingDelivery.delivery_date) }}</span>
              </div>
              <div v-if="viewingDelivery.delivery_reference">
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('delivery.reference') }}:</span>
                <span class="ml-2 font-mono sw-tabular text-ink dark:text-cream">{{ viewingDelivery.delivery_reference }}</span>
              </div>
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('common.total') }}:</span>
                <span class="ml-2 font-mono sw-tabular text-ink dark:text-cream">₹{{ viewingDelivery.total_amount.toFixed(2) }}</span>
              </div>
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('delivery.paymentStatus') }}:</span>
                <span :class="`ml-2 status-${viewingDeliveryPaymentStatus || 'pending'}`">
                  {{ t(`common.${viewingDeliveryPaymentStatus || 'pending'}`) }}
                </span>
                <!-- Show outstanding amount for partial payments -->
                <div v-if="viewingDeliveryPaymentStatus === 'partial'" class="text-xs font-mono sw-tabular text-amber-700 dark:text-amber-400">
                  ₹{{ (viewingDelivery.total_amount - viewingDeliveryAllocatedAmount).toFixed(2) }} pending
                </div>
              </div>
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('delivery.paidAmount') }}:</span>
                <span class="ml-2 font-mono sw-tabular text-forest-600 dark:text-forest-400">₹{{ viewingDeliveryAllocatedAmount.toFixed(2) }}</span>
              </div>
              <div v-if="viewingDelivery.notes">
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('common.notes') }}:</span>
                <p class="ml-2 text-stone-500 dark:text-stone-400 mt-1">{{ viewingDelivery.notes }}</p>
              </div>
            </div>

            <!-- Photos -->
            <div>
              <h4 class="font-display font-medium text-stone-600 dark:text-stone-300 mb-3">{{ t('delivery.photos') }}</h4>
              <div v-if="viewingDelivery.photos && viewingDelivery.photos.length > 0" class="flex gap-2">
                <div class="flex-shrink-0 relative group">
                  <img
                    :src="getPhotoUrl(viewingDelivery.id!, viewingDelivery.photos[0])"
                    :alt="'Photo 1'"
                    class="w-20 h-20 object-cover rounded-lg cursor-pointer border border-stone-200 dark:border-ink-4 hover:scale-105 transition-transform"
                    @click="openPhotoGallery(viewingDelivery, 0)"
                  />
                  <div v-if="viewingDelivery.photos.length > 1" class="absolute -top-1 -right-1 bg-amber-500 text-ink text-xs font-mono px-1.5 py-0.5 rounded-full shadow-card">
                    +{{ viewingDelivery.photos.length - 1 }}
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 text-stone-500 dark:text-stone-400 bg-cream-2 dark:bg-ink-2 rounded-lg">
                <Eye class="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p class="text-sm">{{ t('delivery.noPhotos') }}</p>
              </div>
            </div>
          </div>

          <!-- Delivery Items -->
          <div class="mt-6">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-display font-medium text-stone-600 dark:text-stone-300">{{ t('delivery.items') }}</h4>

              <!-- Reconnect button for orphaned items -->
              <div v-if="orphanedItemsFound && !reconnectingItems" class="flex items-center gap-2">
                <div class="text-xs text-clay-600 dark:text-clay-400">
                  <AlertCircle class="w-4 h-4 inline mr-1" />
                  {{ t('delivery.orphanedItemsDetected') }}
                </div>
                <button
                  @click="reconnectOrphanedItems"
                  class="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-ink rounded-md transition-colors flex items-center gap-1"
                >
                  <Link2 class="w-3 h-3" />
                  {{ t('delivery.reconnectItems') }}
                </button>
              </div>

              <!-- Reconnecting state -->
              <div v-if="reconnectingItems" class="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <Loader2 class="w-4 h-4 animate-spin" />
                {{ t('delivery.reconnecting') }}
              </div>
            </div>

            <!-- Loading state -->
            <div v-if="loadingDeliveryDetails" class="flex justify-center py-8">
              <Loader2 class="w-6 h-6 animate-spin text-stone-400" />
            </div>

            <!-- Items table -->
            <div v-else class="bg-cream-2 dark:bg-ink-2 rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-stone-200 dark:divide-ink-4">
                <thead class="bg-stone-100 dark:bg-ink-3">
                  <tr>
                    <th class="px-4 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                      {{ t('common.item') }}
                    </th>
                    <th class="px-4 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                      {{ t('common.quantity') }}
                    </th>
                    <th class="px-4 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                      {{ t('delivery.unitPrice') }}
                    </th>
                    <th class="px-4 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                      {{ t('common.total') }}
                    </th>
                    <th class="px-4 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">
                      {{ t('returns.returnStatus') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-stone-200 dark:divide-ink-4">
                  <tr v-if="!viewingDelivery.expand?.delivery_items || viewingDelivery.expand.delivery_items.length === 0">
                    <td colspan="5" class="px-4 py-8 text-center text-stone-500 dark:text-stone-400">
                      <div class="space-y-2">
                        <div>{{ t('delivery.noItemsInDelivery') }}</div>
                        <div class="text-xs">
                          {{ t('delivery.oldDataNotice') }}
                        </div>
                        <div v-if="isDev" class="text-xs mt-4 p-2 bg-stone-100 dark:bg-ink-3 rounded">
                          <div>Debug Info:</div>
                          <div>Delivery ID: {{ viewingDelivery.id }}</div>
                          <div>Has expand: {{ !!viewingDelivery.expand }}</div>
                          <div>Has delivery_items: {{ !!viewingDelivery.expand?.delivery_items }}</div>
                          <div>Items count: {{ viewingDelivery.expand?.delivery_items?.length || 0 }}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr v-else v-for="deliveryItem in viewingDelivery.expand.delivery_items" :key="deliveryItem.id">
                    <td class="px-4 py-3 text-sm text-ink dark:text-cream">
                      <div>{{ deliveryItem.expand?.item?.name || 'Unknown Item' }}</div>
                      <div v-if="deliveryItem.notes" class="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        {{ deliveryItem.notes }}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm font-mono sw-tabular text-ink dark:text-cream">
                      {{ deliveryItem.quantity }} {{ getUnitDisplay(deliveryItem.expand?.item?.unit || 'units') }}
                    </td>
                    <td class="px-4 py-3 text-sm font-mono sw-tabular text-ink dark:text-cream">
                      ₹{{ deliveryItem.unit_price.toFixed(2) }}
                    </td>
                    <td class="px-4 py-3 text-sm font-mono sw-tabular text-ink dark:text-cream">
                      ₹{{ deliveryItem.total_amount.toFixed(2) }}
                    </td>
                    <td class="px-4 py-3 text-sm">
                      <div v-if="returnInfo[deliveryItem.id!]" class="space-y-1">
                        <div v-if="returnInfo[deliveryItem.id!].totalReturned > 0" class="text-clay-600 dark:text-clay-400 text-xs">
                          <span class="font-mono sw-tabular">{{ returnInfo[deliveryItem.id!].totalReturned }}</span> returned
                        </div>
                        <div v-if="returnInfo[deliveryItem.id!].availableForReturn > 0" class="text-forest-600 dark:text-forest-400 text-xs">
                          <span class="font-mono sw-tabular">{{ returnInfo[deliveryItem.id!].availableForReturn }}</span> available
                        </div>
                        <div v-if="returnInfo[deliveryItem.id!].returns.length > 0" class="text-ink dark:text-cream underline decoration-amber-500 text-xs cursor-pointer hover:decoration-amber-600" @click="showReturnDetails(deliveryItem.id!)">
                          {{ returnInfo[deliveryItem.id!].returns.length }} return(s)
                        </div>
                        <div v-if="returnInfo[deliveryItem.id!].totalReturned === 0 && returnInfo[deliveryItem.id!].availableForReturn === deliveryItem.quantity" class="text-stone-500 dark:text-stone-400 text-xs">
                          No returns
                        </div>
                      </div>
                      <div v-else class="text-stone-500 dark:text-stone-400 text-xs">
                        Loading...
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Sticky footer -->
        <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-end flex-shrink-0">
          <button @click="closeViewModal" class="btn-outline">{{ t('common.close') }}</button>
        </div>

      </div>
    </div>

    <!-- Image Slider -->
    <ImageSlider
      v-model:show="showPhotoGallery"
      :images="showAllImagesMode ? allImagesGalleryData.images : (galleryDelivery ? getPhotoUrls(galleryDelivery) : [])"
      :initial-index="galleryIndex"
      :overlay-info="showAllImagesMode ? allImagesGalleryData.overlayInfo : (galleryDelivery ? getOverlayInfo(galleryDelivery) : [])"
      @close="showPhotoGallery = false; showAllImagesMode = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import { Plus, Edit2, Trash2, Loader2, Eye, X, Images, MoreVertical, AlertCircle, Link2 } from 'lucide-vue-next';
import Skeleton from '../components/Skeleton.vue';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useSiteData } from '../composables/useSiteData';
import { useQuickActionModal } from '../composables/useQuickActionModal';
import { useDeliverySearch } from '../composables/useSearch';
import ImageSlider from '../components/ImageSlider.vue';
import MultiItemDeliveryModal from '../components/delivery/MultiItemDeliveryModal.vue';
import SearchBox from '../components/SearchBox.vue';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import { 
  deliveryService,
  vendorReturnService,
  paymentAllocationService,
  type Delivery
} from '../services/pocketbase';
import { usePermissions } from '../composables/usePermissions';
import { DeliveryPaymentCalculator, type DeliveryWithPaymentStatus } from '../services/deliveryUtils';
import { useModalState } from '../composables/useModalState';

const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error, info: showInfoToast } = useToast();
const { canDelete } = usePermissions();
const { openModal, closeModal } = useModalState();

// Use site data management
// Load deliveries data
const { data: allDeliveriesData, loading: deliveriesLoading, reload: reloadDeliveries } = useSiteData(
  async () => {
    const deliveryData = await deliveryService.getAll();
    // Sort deliveries by delivery date descending (newest first)
    return deliveryData.sort((a, b) => 
      new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()
    );
  }
);

// Load payment allocations separately
const { data: paymentAllocationsData } = useSiteData(
  async () => {
    try {
      return await paymentAllocationService.getAll();
    } catch (error) {
      console.error('Error loading payment allocations:', error);
      return [];
    }
  }
);

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults, loadAll } = useDeliverySearch();

// Client-side payment status calculation
const paymentAllocations = computed(() => paymentAllocationsData.value || []);

// Calculate payment status for currently viewed delivery
const viewingDeliveryPaymentStatus = computed(() => {
  if (!viewingDelivery.value) return null;
  return DeliveryPaymentCalculator.calculatePaymentStatus(viewingDelivery.value, paymentAllocations.value);
});

// Calculate allocated amount for currently viewed delivery
const viewingDeliveryAllocatedAmount = computed(() => {
  if (!viewingDelivery.value) return 0;
  return paymentAllocations.value
    .filter(allocation => allocation.delivery === viewingDelivery.value!.id)
    .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
});

// Display items: use search results if searching, otherwise all items with calculated payment status
const deliveries = computed((): DeliveryWithPaymentStatus[] => {
  const baseDeliveries = searchQuery.value.trim() ? searchResults.value : (allDeliveriesData.value || []);
  const allocations = paymentAllocations.value || [];
  
  return DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(baseDeliveries, allocations);
});

// Removed unused allDeliveries computed property
const showAddModal = ref(false);
const editingDelivery = ref<Delivery | null>(null);
const viewingDelivery = ref<Delivery | null>(null);
const loadingDeliveryDetails = ref(false);
const showMobileActionMenu = ref(false);

// Return information storage
const returnInfo = ref<Record<string, {
  totalReturned: number;
  availableForReturn: number;
  returns: Array<{
    id: string;
    returnDate: string;
    quantityReturned: number;
    status: string;
    reason: string;
  }>;
}>>({});

// Development mode check for debugging
const isDev = computed(() => import.meta.env.DEV);
const showPhotoGallery = ref(false);
const galleryDelivery = ref<Delivery | null>(null);
const galleryIndex = ref(0);
const showAllImagesMode = ref(false);
const allImagesGalleryData = ref<{
  images: string[];
  overlayInfo: Array<{
    vendorName?: string;
    items?: string[];
    deliveryDate?: string;
  }>;
}>({ images: [], overlayInfo: [] });
const loading = computed(() => deliveriesLoading.value);

const canCreateDelivery = computed(() => {
  return !isReadOnly.value && checkCreateLimit('deliveries');
});

const canEditDelete = computed(() => {
  return !isReadOnly.value && canDelete.value;
});

const allImages = computed(() => {
  if (!deliveries.value) return [];
  
  const images: Array<{ delivery: Delivery; photo: string; index: number }> = [];
  
  deliveries.value.forEach(delivery => {
    if (delivery.photos && delivery.photos.length > 0) {
      delivery.photos.forEach((photo, index) => {
        images.push({ delivery, photo, index });
      });
    }
  });
  
  return images;
});

// Search results summary computed properties
const searchResultsCount = computed(() => {
  return searchQuery.value.trim() ? deliveries.value.length : 0;
});

const searchResultsTotal = computed(() => {
  if (!searchQuery.value.trim() || deliveries.value.length === 0) return 0;
  
  return deliveries.value.reduce((total, delivery) => {
    return total + (delivery.total_amount || 0);
  }, 0);
});

const getDeliveryActions = (delivery: Delivery) => {
  return [
    {
      key: 'view',
      label: t('common.view'),
      icon: Eye,
      variant: 'default' as const
    },
    {
      key: 'edit',
      label: t('common.edit'),
      icon: Edit2,
      variant: 'default' as const,
      disabled: !canEditDelete.value || delivery.payment_status !== 'pending'
    },
    {
      key: 'delete',
      label: t('common.deleteAction'),
      icon: Trash2,
      variant: 'danger' as const,
      disabled: !canEditDelete.value || delivery.payment_status !== 'pending'
    }
  ];
};

const handleDeliveryAction = (delivery: Delivery, action: string) => {
  switch (action) {
    case 'view':
      viewDelivery(delivery);
      break;
    case 'edit':
      editDelivery(delivery);
      break;
    case 'delete':
      deleteDelivery(delivery);
      break;
  }
};

const handleMobileAction = (action: string) => {
  showMobileActionMenu.value = false;
  
  switch (action) {
    case 'viewAllImages':
      viewAllImages();
      break;
    case 'addDelivery':
      handleAddDelivery();
      break;
  }
};

const viewAllImages = () => {
  if (allImages.value.length === 0) return;
  
  // Create a comprehensive view of all images across all deliveries
  const allImageUrls: string[] = [];
  const allImageOverlays: Array<{
    vendorName?: string;
    items?: string[];
    deliveryDate?: string;
  }> = [];
  
  allImages.value.forEach(({ delivery, photo }) => {
    allImageUrls.push(getPhotoUrl(delivery.id!, photo));
    
    const vendorName = delivery.expand?.vendor?.contact_person || 'Unknown Vendor';
    const items = delivery.expand?.delivery_items?.map(item => {
      const itemName = item.expand?.item?.name || 'Unknown Item';
      const quantity = item.quantity || 0;
      const unit = item.expand?.item?.unit || 'units';
      return `${itemName} (${quantity} ${unit})`;
    }) || [];
    
    allImageOverlays.push({
      vendorName,
      items,
      deliveryDate: delivery.delivery_date
    });
  });
  
  // Set up all images mode
  allImagesGalleryData.value = {
    images: allImageUrls,
    overlayInfo: allImageOverlays
  };
  
  showAllImagesMode.value = true;
  galleryDelivery.value = null;
  galleryIndex.value = 0;
  showPhotoGallery.value = true;
};

const reloadAllData = async () => {
  try {
    await reloadDeliveries();
    // Load all items for search functionality
    loadAll();
  } catch (err) {
    console.error('Error loading deliveries:', err);
    error(t('delivery.loadError'));
  }
};

const handleAddDelivery = () => {
  editingDelivery.value = null;
  showAddModal.value = true;
  // NOTE: the MultiItemDeliveryModal child registers itself with the modal
  // manager ('multi-item-delivery-modal') on mount, so DeliveryView must NOT
  // also push a 'delivery-add-modal' entry — that would create a duplicate
  // history entry for the same visual sheet. The child's entry drives both
  // back-button close and FAB hiding.
};

const editDelivery = (delivery: Delivery) => {
  editingDelivery.value = delivery;
  showAddModal.value = true;
  // See handleAddDelivery: registration is owned by the child modal component.
};

const orphanedItemsFound = ref(false);
const reconnectingItems = ref(false);

const viewDelivery = async (delivery: Delivery) => {
  try {
    loadingDeliveryDetails.value = true;
    orphanedItemsFound.value = false;
    openModal('delivery-view-modal', closeViewModal);
    // Fetch the full delivery with all expanded relationships
    const fullDelivery = await deliveryService.getById(delivery.id!);
    
    // If no delivery items found, try to fetch them separately as a fallback
    if (!fullDelivery.expand?.delivery_items || fullDelivery.expand.delivery_items.length === 0) {
      try {
        const { deliveryItemService } = await import('../services/pocketbase');
        const separateItems = await deliveryItemService.getByDelivery(delivery.id!);
        
        if (separateItems.length > 0) {
          // We found orphaned items - mark this so we can show the reconnect button
          orphanedItemsFound.value = true;
          // If we found items separately, add them to the delivery object
          if (!fullDelivery.expand) fullDelivery.expand = {};
          fullDelivery.expand.delivery_items = separateItems;
        }
      } catch (separateErr) {
        console.error('Failed to fetch delivery items separately:', separateErr);
      }
    }
    
    viewingDelivery.value = fullDelivery;
    
    // Load return information for each delivery item
    if (fullDelivery.expand?.delivery_items) {
      await loadReturnInfo(fullDelivery.expand.delivery_items);
    }
  } catch (err) {
    console.error('Error loading delivery details:', err);
    error(t('delivery.loadError'));
    // Fallback to the delivery object we have
    viewingDelivery.value = delivery;
  } finally {
    loadingDeliveryDetails.value = false;
  }
};

const reconnectOrphanedItems = async () => {
  if (!viewingDelivery.value?.id) return;
  
  try {
    reconnectingItems.value = true;
    const updatedDelivery = await deliveryService.reconnectDeliveryItems(viewingDelivery.value.id);
    
    // Update the viewing delivery with the reconnected data
    viewingDelivery.value = updatedDelivery;
    orphanedItemsFound.value = false;
    
    // Also reload the main deliveries list to reflect the change
    await reloadDeliveries();
    
    success(t('delivery.itemsReconnected'));
  } catch (err) {
    console.error('Error reconnecting delivery items:', err);
    error(t('delivery.reconnectError'));
  } finally {
    reconnectingItems.value = false;
  }
};

const loadReturnInfo = async (deliveryItems: any[]) => {
  try {
    // Extract all delivery item IDs
    const deliveryItemIds = deliveryItems
      .filter(item => item.id)
      .map(item => item.id);
    
    if (deliveryItemIds.length > 0) {
      // Fetch all return info in one batch request
      const batchReturnInfo = await vendorReturnService.getReturnInfoForDeliveryItems(deliveryItemIds);
      
      // Update the returnInfo reactive object with the batch results
      Object.assign(returnInfo.value, batchReturnInfo);
    }
  } catch (err) {
    console.error('Error loading return information:', err);
  }
};

const showReturnDetails = (deliveryItemId: string) => {
  const info = returnInfo.value[deliveryItemId];
  if (!info || info.returns.length === 0) return;
  
  const returnsSummary = `${info.returns.length} return(s): ${info.totalReturned} units returned`;

  showInfoToast(returnsSummary, { duration: 6000 });
};

const deleteDelivery = async (delivery: Delivery) => {
  if (!confirm(t('delivery.confirmDelete'))) return;
  
  try {
    await deliveryService.delete(delivery.id!);
    success(t('delivery.deleteSuccess'));
    await reloadAllData();
  } catch (err) {
    console.error('Error deleting delivery:', err);
    
    // Handle specific error types
    if (err instanceof Error) {
      if (err.message === 'DELIVERY_ITEMS_DELETE_FAILED') {
        error(t('delivery.deleteItemsError'));
      } else if (err.message === 'DELIVERY_DELETE_FAILED') {
        error(t('delivery.deleteDeliveryError'));
      } else {
        error(t('delivery.deleteError'));
      }
    } else {
      error(t('delivery.deleteError'));
    }
  }
};

const closeAddModal = () => {
  showAddModal.value = false;
  editingDelivery.value = null;
  closeModal('delivery-add-modal');
  closeModal('delivery-edit-modal');
};

const handleDeliverySaved = () => {
  // For new deliveries, modal stays open but refreshes the list
  reloadAllData();
};

const handleDeliveryEditSuccess = () => {
  // For edits, close the modal and refresh
  closeAddModal();
  reloadAllData();
};



const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-IN');
};

const getUnitDisplay = (unit: string) => {
  const unitMap: Record<string, string> = {
    'pieces': 'pcs',
    'kg': 'kg',
    'liters': 'L',
    'meters': 'm',
    'units': 'units'
  };
  return unitMap[unit] || unit;
};

const getPhotoUrl = (deliveryId: string, filename: string) => {
  return `${import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'}/api/files/deliveries/${deliveryId}/${filename}`;
};

const getPhotoUrls = (delivery: Delivery) => {
  if (!delivery.photos) return [];
  return delivery.photos.map(photo => getPhotoUrl(delivery.id!, photo));
};

const getOverlayInfo = (delivery: Delivery) => {
  if (!delivery.photos || delivery.photos.length === 0) return [];
  
  const vendorName = delivery.expand?.vendor?.contact_person || 'Unknown Vendor';
  const items = delivery.expand?.delivery_items?.map(item => {
    const itemName = item.expand?.item?.name || 'Unknown Item';
    const quantity = item.quantity || 0;
    const unit = item.expand?.item?.unit || 'units';
    return `${itemName} (${quantity} ${unit})`;
  }) || [];
  
  const overlayInfo = {
    vendorName,
    items,
    deliveryDate: delivery.delivery_date
  };
  
  // Return the same overlay info for each photo in the delivery
  return delivery.photos.map(() => overlayInfo);
};

const openPhotoGallery = (delivery: Delivery, index: number) => {
  galleryDelivery.value = delivery;
  galleryIndex.value = index;
  showAllImagesMode.value = false;
  showPhotoGallery.value = true;
};

const closeViewModal = () => {
  viewingDelivery.value = null;
  closeModal('delivery-view-modal');
};


// Handle 'show-add-modal' event from FAB
const handleShowAddModal = () => {
  handleAddDelivery();
};

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    handleAddDelivery();
  }
};

// Event listeners using @vueuse/core
useQuickActionModal(handleShowAddModal);
useEventListener(window, 'keydown', handleKeyboardShortcut);
</script>

<style scoped>
.status-pending {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300;
}

.status-partial {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300;
}

.status-paid {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-forest-100 text-forest-800 dark:bg-forest-900 dark:text-forest-300;
}

.btn-primary {
  @apply bg-amber-500 hover:bg-amber-600 text-ink font-medium py-2 px-4 rounded-md transition-colors duration-150 ease-in-out;
}

.btn-disabled {
  @apply bg-stone-300 dark:bg-ink-2 text-stone-500 dark:text-stone-400 font-medium py-2 px-4 rounded-md cursor-not-allowed;
}
</style>