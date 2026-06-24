<template>
  <div>
    <!-- Desktop Header with Add Button -->
    <div class="hidden md:flex items-center justify-between mb-8">
      <div>
        <h1 class="font-display text-2xl font-bold text-ink dark:text-cream">{{ t('serviceBookings.title') }}</h1>
        <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {{ t('serviceBookings.subtitle') }}
        </p>
      </div>
      <button
        @click="handleAddServiceBooking" 
        :disabled="!canCreateServiceBooking"
        :class="[
          canCreateServiceBooking ? 'btn-primary' : 'btn-disabled'
        ]"
        :title="!canCreateServiceBooking ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
        data-keyboard-shortcut="n"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('serviceBookings.bookService') }}
      </button>
    </div>

    <!-- Mobile Header with Search -->
    <div class="md:hidden mb-6">
      <div class="mb-4">
        <h1 class="font-display text-2xl font-bold text-ink dark:text-cream">{{ t('serviceBookings.title') }}</h1>
        <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {{ t('serviceBookings.subtitle') }}
        </p>
      </div>
      
      <!-- Mobile Search Box -->
      <SearchBox
        v-model="searchQuery"
        :placeholder="t('search.serviceBookings')"
        :search-loading="searchLoading"
      />
      
      <!-- Mobile Search Results Summary -->
      <div v-if="searchQuery.trim() && !searchLoading" class="mt-3 flex items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
        <div class="flex items-center gap-1">
          <span class="font-mono sw-tabular font-medium text-ink dark:text-cream">{{ searchResultsCount }}</span>
          <span>{{ searchResultsCount === 1 ? t('serviceBookings.result') : t('serviceBookings.results') }}</span>
        </div>
        <div class="h-4 border-l border-stone-300 dark:border-ink-4"></div>
        <div class="flex items-center gap-1">
          <span class="text-xs">{{ t('common.total') }}:</span>
          <span class="font-mono sw-tabular font-semibold text-ink dark:text-cream">₹{{ searchResultsTotal.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- Desktop Search with Results Summary -->
    <div class="hidden md:block mb-6">
      <div class="flex items-center gap-6">
        <div class="w-96">
          <SearchBox
            v-model="searchQuery"
            :placeholder="t('search.serviceBookings')"
            :search-loading="searchLoading"
          />
        </div>
        
        <!-- Search Results Summary -->
        <div v-if="searchQuery.trim() && !searchLoading" class="flex items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
          <div class="flex items-center gap-1">
            <span class="font-mono sw-tabular font-medium text-ink dark:text-cream">{{ searchResultsCount }}</span>
            <span>{{ searchResultsCount === 1 ? t('serviceBookings.result') : t('serviceBookings.results') }}</span>
          </div>
          <div class="h-4 border-l border-stone-300 dark:border-ink-4"></div>
          <div class="flex items-center gap-1">
            <span class="text-xs">{{ t('common.total') }}:</span>
            <span class="font-mono sw-tabular font-semibold text-ink dark:text-cream">₹{{ searchResultsTotal.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Active relation-filter chip: dismissible so the user is never stuck on a
         filtered view. Shown on both mobile and desktop. -->
    <div v-if="hasActiveFilter" class="mb-4 flex items-center gap-2">
      <span
        class="inline-flex items-center gap-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 pl-3 pr-1 py-1 text-sm font-medium"
      >
        <span class="truncate max-w-[60vw] sm:max-w-xs">
          {{ t('common.filteredBy', { label: filterLabel || t('common.filtered') }) }}
        </span>
        <button
          type="button"
          @click="clearFilter()"
          class="flex items-center justify-center h-11 w-11 sm:h-7 sm:w-7 -my-2 sm:my-0 rounded-full text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
          :title="t('common.clearFilter')"
          :aria-label="t('common.clearFilter')"
        >
          <X class="h-4 w-4" />
        </button>
      </span>
    </div>

    <!-- Service Bookings -->
    <div>
      <!-- Skeleton loading state: md+ table -->
      <div v-if="bookingsLoading" class="hidden md:block card p-0 overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-cream-2 dark:bg-ink-2 border-b border-stone-200 dark:border-ink-4">
            <tr>
              <th class="py-3 px-4 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('services.service') }}</th>
              <th class="py-3 px-4 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400 hidden lg:table-cell">{{ t('services.vendor') }}</th>
              <th class="py-3 px-4 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400 hidden xl:table-cell">{{ t('serviceBookings.startDate') }}</th>
              <th class="py-3 px-4 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('serviceBookings.progress') }}</th>
              <th class="py-3 px-4 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('common.total') }}</th>
              <th class="py-3 px-4 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('serviceBookings.paymentStatus') }}</th>
              <th class="py-3 px-4 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-200 dark:divide-ink-4 bg-white dark:bg-ink-3">
            <tr v-for="i in 6" :key="'skel-md-' + i" class="border-b border-stone-200 dark:border-ink-4">
              <td class="py-3.5 px-4"><Skeleton height="1rem" width="65%" /></td>
              <td class="py-3.5 px-4 hidden lg:table-cell"><Skeleton height="1rem" width="55%" /></td>
              <td class="py-3.5 px-4 hidden xl:table-cell text-right"><Skeleton height="1rem" width="5rem" /></td>
              <td class="py-3.5 px-4" style="min-width:8rem"><Skeleton height="0.375rem" width="100%" /></td>
              <td class="py-3.5 px-4 text-right"><Skeleton height="1rem" width="5rem" /></td>
              <td class="py-3.5 px-4"><Skeleton height="1.25rem" width="4.5rem" rounded="rounded-full" /></td>
              <td class="py-3.5 px-4"><Skeleton height="1rem" width="3.5rem" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Skeleton loading state: mobile cards -->
      <div v-if="bookingsLoading" class="md:hidden space-y-3">
        <div v-for="i in 6" :key="'skel-mob-' + i"
             class="relative overflow-hidden rounded-lg border border-stone-200 dark:border-ink-4 bg-white dark:bg-ink-3 shadow-card dark:shadow-inset-hi">
          <div class="pl-5 pr-3 py-4 space-y-3">
            <div class="space-y-1.5">
              <Skeleton height="1rem" width="60%" />
              <Skeleton height="0.75rem" width="45%" />
            </div>
            <Skeleton height="0.375rem" width="100%" />
            <div class="pt-3 border-t border-stone-200 dark:border-ink-4 flex items-end justify-between gap-3">
              <div class="space-y-1">
                <Skeleton height="0.625rem" width="3rem" />
                <Skeleton height="1.25rem" width="6rem" />
              </div>
              <Skeleton height="1.25rem" width="4.5rem" rounded="rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state (shared) -->
      <div v-else-if="serviceBookings.length === 0" class="card flex flex-col items-center justify-center py-16 text-center">
        <div class="h-14 w-14 rounded-lg bg-stone-100 dark:bg-ink-2 flex items-center justify-center mb-4">
          <Calendar class="h-7 w-7 text-stone-400 dark:text-stone-500" />
        </div>
        <h3 class="font-display text-base font-semibold text-ink dark:text-cream">{{ t('serviceBookings.noBookings') }}</h3>
        <p class="mt-1 text-sm text-stone-500 dark:text-stone-400 max-w-xs">{{ t('serviceBookings.startBooking') }}</p>
      </div>

      <template v-else>
        <!-- md+ : progressive-column table -->
        <div class="hidden md:block card p-0 overflow-hidden">
          <table class="min-w-full">
            <thead class="bg-cream-2 dark:bg-ink-2 border-b border-stone-200 dark:border-ink-4">
              <tr>
                <th class="py-3 px-4 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('services.service') }}</th>
                <th class="py-3 px-4 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400 hidden lg:table-cell">{{ t('services.vendor') }}</th>
                <th class="py-3 px-4 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400 hidden xl:table-cell">{{ t('serviceBookings.startDate') }}</th>
                <th class="py-3 px-4 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('serviceBookings.progress') }}</th>
                <th class="py-3 px-4 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('common.total') }}</th>
                <th class="py-3 px-4 text-left text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('serviceBookings.paymentStatus') }}</th>
                <th class="py-3 px-4 text-right text-[11px] uppercase tracking-wide font-semibold text-stone-500 dark:text-stone-400">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-200 dark:divide-ink-4">
              <tr v-for="booking in serviceBookings" :key="booking.id" @click="viewBooking(booking)"
                  class="hover:bg-cream-2 dark:hover:bg-ink-2 transition-colors duration-150 ease-snap cursor-pointer">
                <td class="py-3.5 px-4 align-middle max-w-xs">
                  <div class="text-sm leading-snug">
                    <span class="font-medium text-ink dark:text-cream">
                      <RecordLink
                        type="service"
                        mode="detail"
                        :id="booking.service"
                        :label="booking.expand?.service?.name || 'Unknown Service'"
                      />
                    </span>
                    <template v-if="booking.expand?.service?.category">
                      <span class="mx-1.5 text-stone-300 dark:text-stone-600">|</span>
                      <span class="text-stone-500 dark:text-stone-400">{{ booking.expand.service.category }}</span>
                    </template>
                  </div>
                  <div class="lg:hidden text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                    <RecordLink
                      type="vendor"
                      mode="detail"
                      :id="booking.vendor"
                      :label="booking.expand?.vendor?.contact_person || 'Unknown Vendor'"
                    />
                  </div>
                  <!-- Notes: what/where this booking is for (same service used across locations) -->
                  <div v-if="booking.notes" class="flex items-start gap-1 mt-1 text-xs text-stone-600 dark:text-stone-300" :title="booking.notes">
                    <StickyNote class="h-3 w-3 flex-none mt-0.5 text-stone-400 dark:text-stone-500" />
                    <span class="line-clamp-2 leading-snug">{{ booking.notes }}</span>
                  </div>
                  <!-- Photo count: opens the gallery, mirrors Delivery's "View images (N)" -->
                  <button
                    v-if="(booking.completion_photos?.length || 0) > 0"
                    type="button"
                    @click.stop="viewBooking(booking)"
                    class="inline-flex items-center gap-1 mt-1 text-xs text-amber-700 dark:text-amber-400 hover:underline"
                    :title="t('delivery.viewAllImages')"
                  >
                    <Images class="h-3 w-3 flex-none" />
                    <span>{{ t('delivery.viewAllImages') }} ({{ booking.completion_photos!.length }})</span>
                  </button>
                </td>
                <td class="py-3.5 px-4 align-middle hidden lg:table-cell">
                  <div class="font-medium text-sm text-ink dark:text-cream leading-snug">
                    <RecordLink
                      type="vendor"
                      mode="detail"
                      :id="booking.vendor"
                      :label="booking.expand?.vendor?.contact_person || 'Unknown Vendor'"
                    />
                  </div>
                  <div v-if="booking.expand?.vendor?.name" class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{{ booking.expand.vendor.name }}</div>
                </td>
                <td class="py-3.5 px-4 align-middle text-right hidden xl:table-cell">
                  <span class="text-sm font-mono sw-tabular text-stone-600 dark:text-stone-300">{{ formatDate(booking.start_date) }}</span>
                </td>
                <td class="py-3.5 px-4 align-middle" style="min-width:8rem">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 bg-stone-200 dark:bg-ink-2 rounded-[2px] h-1.5 overflow-hidden">
                      <div class="bg-amber-500 h-1.5 transition-all duration-300" :style="{ width: `${booking.percent_completed || 0}%` }"></div>
                    </div>
                    <span class="text-xs font-mono sw-tabular text-stone-500 dark:text-stone-400 w-9 text-right flex-none">{{ booking.percent_completed || 0 }}%</span>
                  </div>
                </td>
                <td class="py-3.5 px-4 align-middle text-right">
                  <div class="text-sm font-mono sw-tabular font-medium text-ink dark:text-cream">₹{{ booking.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div v-if="(booking.paid_amount || 0) > 0" class="text-xs font-mono sw-tabular text-forest-600 dark:text-forest-400 mt-0.5">{{ t('serviceBookings.paid') }}: ₹{{ (booking.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                </td>
                <td class="py-3.5 px-4 align-middle">
                  <span :class="`status-${booking.payment_status === 'currently_paid_up' ? 'paid' : booking.payment_status}`">{{ booking.payment_status === 'currently_paid_up' ? t('serviceBookings.currentlyPaidUp') : t(`common.${booking.payment_status}`) }}</span>
                  <div v-if="booking.payment_status === 'partial'" class="text-xs font-mono sw-tabular text-amber-700 dark:text-amber-400 mt-0.5">₹{{ booking.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ t('serviceBookings.pendingLabel') }}</div>
                </td>
                <td class="py-3.5 px-4 align-middle" @click.stop>
                  <div class="flex items-center justify-end gap-1.5 lg:gap-1">
                    <button v-if="canEditBooking(booking)" @click="editBooking(booking)" class="min-h-touch min-w-[44px] lg:h-8 lg:w-8 lg:min-h-0 lg:min-w-0 flex items-center justify-center text-stone-400 dark:text-stone-500 hover:text-ink dark:hover:text-cream rounded-md hover:bg-stone-100 dark:hover:bg-ink-2 transition-colors duration-150" :title="t('common.edit')"><Edit2 class="h-4 w-4" /></button>
                    <button @click="deleteBooking(booking.id!)" :disabled="!canDeleteBooking(booking)" :class="[canDeleteBooking(booking) ? 'text-clay-500 dark:text-clay-400 hover:text-clay-600 dark:hover:text-clay-300 hover:bg-stone-100 dark:hover:bg-ink-2' : 'text-stone-300 dark:text-stone-600 cursor-not-allowed','min-h-touch min-w-[44px] lg:h-8 lg:w-8 lg:min-h-0 lg:min-w-0 flex items-center justify-center rounded-md transition-colors duration-150']" :title="hasPayments(booking) ? t('serviceBookings.cannotDeleteWithPayments') : t('common.deleteAction')"><Trash2 class="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- < md : epic cards -->
        <div class="md:hidden space-y-3">
          <div v-for="booking in serviceBookings" :key="booking.id" @click="viewBooking(booking)"
               class="relative overflow-hidden rounded-lg border border-stone-200 dark:border-ink-4 bg-white dark:bg-ink-3 shadow-card dark:shadow-inset-hi active:scale-[0.99] transition-transform duration-150 ease-snap cursor-pointer">
            <span class="absolute left-0 inset-y-0 w-1" :class="booking.payment_status === 'partial' ? 'bg-amber-500' : (booking.payment_status === 'pending' ? 'bg-clay-500' : 'bg-forest-500')"></span>
            <div class="pl-5 pr-3 py-4">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="font-display font-semibold text-base text-ink dark:text-cream truncate">
                    <RecordLink
                      type="service"
                      mode="detail"
                      :id="booking.service"
                      :label="booking.expand?.service?.name || 'Unknown Service'"
                    />
                  </h3>
                  <p class="text-sm text-stone-500 dark:text-stone-400 truncate mt-0.5">
                    <RecordLink
                      type="vendor"
                      mode="detail"
                      :id="booking.vendor"
                      :label="booking.expand?.vendor?.contact_person || 'Unknown Vendor'"
                    /><span v-if="booking.expand?.vendor?.name"> · {{ booking.expand.vendor.name }}</span>
                  </p>
                  <!-- Notes: what/where this booking is for -->
                  <p v-if="booking.notes" class="flex items-start gap-1 text-xs text-stone-600 dark:text-stone-300 mt-1.5">
                    <StickyNote class="h-3 w-3 flex-none mt-0.5 text-stone-400 dark:text-stone-500" />
                    <span class="line-clamp-2 leading-snug">{{ booking.notes }}</span>
                  </p>
                  <!-- Photo count: opens the gallery, mirrors Delivery's "View images (N)" -->
                  <button
                    v-if="(booking.completion_photos?.length || 0) > 0"
                    type="button"
                    @click.stop="viewBooking(booking)"
                    class="inline-flex items-center gap-1 mt-1.5 text-xs text-amber-700 dark:text-amber-400"
                  >
                    <Images class="h-3 w-3 flex-none" />
                    <span>{{ t('delivery.viewAllImages') }} ({{ booking.completion_photos!.length }})</span>
                  </button>
                </div>
                <div @click.stop class="flex-none -mr-1"><CardDropdownMenu :actions="getBookingActions(booking)" @action="handleBookingAction(booking, $event)" /></div>
              </div>
              <div class="mt-4">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="sw-eyebrow text-stone-400 dark:text-stone-500">{{ t('serviceBookings.progress') }}</span>
                  <span class="text-xs font-mono sw-tabular font-semibold text-ink dark:text-cream">{{ booking.percent_completed || 0 }}%</span>
                </div>
                <div class="bg-stone-200 dark:bg-ink-2 rounded-[2px] h-1.5 overflow-hidden">
                  <div class="bg-amber-500 h-1.5 transition-all duration-500 ease-snap" :style="{ width: `${booking.percent_completed || 0}%` }"></div>
                </div>
              </div>
              <div class="mt-4 pt-3 border-t border-stone-200 dark:border-ink-4 flex items-end justify-between gap-3">
                <div class="min-w-0">
                  <span class="sw-eyebrow text-stone-400 dark:text-stone-500">{{ t('common.total') }}</span>
                  <div class="font-mono sw-tabular text-lg font-semibold text-ink dark:text-cream leading-none mt-0.5">₹{{ booking.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div v-if="(booking.paid_amount || 0) > 0" class="text-xs font-mono sw-tabular text-forest-600 dark:text-forest-400 mt-1">{{ t('serviceBookings.paid') }}: ₹{{ (booking.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div v-else-if="booking.payment_status === 'partial'" class="text-xs font-mono sw-tabular text-amber-700 dark:text-amber-400 mt-1">₹{{ booking.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ t('serviceBookings.pendingLabel') }}</div>
                </div>
                <div class="flex flex-col items-end gap-1.5 flex-none">
                  <span :class="`status-${booking.payment_status === 'currently_paid_up' ? 'paid' : booking.payment_status}`">{{ booking.payment_status === 'currently_paid_up' ? t('serviceBookings.currentlyPaidUp') : t(`common.${booking.payment_status}`) }}</span>
                  <span class="text-xs font-mono sw-tabular text-stone-500 dark:text-stone-400">{{ formatDate(booking.start_date) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingBooking" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60" @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div class="w-full sm:max-w-lg bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden" @click.stop>
        <!-- Grab handle (mobile only) -->
        <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden"></div>

        <!-- Sticky header -->
        <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3">
          <div class="h-9 w-9 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0">
            <Calendar class="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="sw-eyebrow text-stone-500">{{ editingBooking ? t('common.edit') : t('common.create') }}</p>
            <h3 class="font-display text-lg font-semibold text-ink dark:text-cream leading-tight">
              {{ editingBooking ? t('serviceBookings.editBooking') : t('serviceBookings.bookService') }}
            </h3>
          </div>
          <button type="button" @click="closeModal" class="h-9 w-9 rounded-md flex items-center justify-center text-stone-400 hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4 shrink-0" aria-label="Close">
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Scrollable body -->
        <form @submit.prevent="() => saveBooking()" @keydown="handleKeydown" class="flex flex-col flex-1 overflow-hidden">
          <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-stone-600 dark:text-stone-300">{{ t('services.service') }}</label>
              <ServiceSearchBox
                ref="serviceInputRef"
                v-model="form.service"
                :services="activeServices"
                :placeholder="t('forms.selectService')"
                :required="true"
                :autofocus="true"
                :disabled="!!(editingBooking && hasPayments(editingBooking))"
                class="mt-1"
                @service-selected="handleServiceSelected"
              />
              <p v-if="editingBooking && hasPayments(editingBooking)" class="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {{ t('serviceBookings.cannotChangeServiceWithPayments') }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-600 dark:text-stone-300">{{ t('services.vendor') }}</label>
              <VendorSearchBox
                v-model="form.vendor"
                :vendors="vendors"
                :deliveries="deliveries"
                :service-bookings="allServiceBookings"
                :payments="payments"
                :placeholder="t('forms.selectProvider')"
                :required="true"
                :disabled="!!(editingBooking && hasPayments(editingBooking))"
                :class="[
                  'mt-1',
                  editingBooking && hasPayments(editingBooking) ? 'bg-cream-2 dark:bg-ink-2 text-stone-500 dark:text-stone-400 cursor-not-allowed' : ''
                ]"
                @vendor-selected="handleVendorSelected"
              />
              <p v-if="editingBooking && hasPayments(editingBooking)" class="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {{ t('serviceBookings.cannotChangeVendorWithPayments') }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-600 dark:text-stone-300">{{ t('serviceBookings.startDate') }}</label>
              <input
                ref="startDateInputRef"
                v-model="form.start_date"
                type="date"
                required
                :class="[
                  'input mt-1',
                  editingBooking && hasPayments(editingBooking) ? 'bg-cream-2 dark:bg-ink-2 text-stone-500 dark:text-stone-400 cursor-not-allowed' : ''
                ]"
                :disabled="!!(editingBooking && hasPayments(editingBooking))"
                @keydown="handleKeydown"
              />
              <p v-if="editingBooking && hasPayments(editingBooking)" class="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {{ t('serviceBookings.cannotChangeDateWithPayments') }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-stone-600 dark:text-stone-300">{{ t('serviceBookings.duration') }}</label>
                <div class="flex gap-2 mt-1">
                  <input v-model.number="form.duration" type="number" step="0.5" required class="input flex-1" placeholder="0" @input="calculateTotal" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
                  <button
                    v-if="isHourlyService"
                    type="button"
                    @click="openTimeCalculator"
                    class="btn-outline px-3 py-2 flex items-center gap-1 min-w-fit"
                    :title="t('serviceBookings.calculateFromTime')"
                  >
                    <Clock class="h-4 w-4" />
                    <span class="hidden sm:inline">{{ t('serviceBookings.calculate') }}</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-stone-600 dark:text-stone-300">{{ t('serviceBookings.unitRate') }}</label>
                <input
                  v-model.number="form.unit_rate"
                  type="number"
                  step="0.01"
                  required
                  class="input mt-1"
                  placeholder="0.00"
                  @input="handleUnitRateChange"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                />
                <div v-if="showUnitRateWarning && editingBooking && hasPayments(editingBooking)" class="mt-1 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p class="text-xs text-amber-800 dark:text-amber-300">
                    ⚠️ {{ t('serviceBookings.unitRateChangeWarning') }}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-600 dark:text-stone-300">{{ t('common.total') }}</label>
              <input v-model.number="form.total_amount" type="number" step="0.01" required class="input mt-1" readonly />
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-600 dark:text-stone-300">{{ t('serviceBookings.percentCompleted') }}</label>
              <div class="relative">
                <input
                  v-model.number="form.percent_completed"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  class="input mt-1 pr-8"
                  placeholder="0"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                />
                <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-500 dark:text-stone-400 text-sm mt-0.5">%</span>
              </div>
            </div>

            <!-- <div>
              <label class="block text-sm font-medium text-stone-600 dark:text-stone-300">{{ t('serviceBookings.paymentStatus') }}</label>
              <select v-model="form.payment_status" required class="input mt-1">
                <option value="pending">{{ t('common.pending') }}</option>
                <option value="partial">{{ t('common.partial') }}</option>
                <option value="paid">{{ t('common.paid') }}</option>
              </select>
            </div> -->

            <div>
              <label class="block text-sm font-medium text-stone-600 dark:text-stone-300">{{ t('common.notes') }}</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" :placeholder="t('forms.serviceNotes')" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
            </div>

            <!-- Photos: mirrors the Delivery modal upload UX -->
            <div>
              <label class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2">{{ t('serviceBookings.completionPhotos') }}</label>

              <!-- Existing photos (edit mode): preserved unless explicitly removed -->
              <div v-if="existingBookingPhotos.length > 0" class="mb-4">
                <p class="text-sm text-stone-600 dark:text-stone-400 mb-2">{{ t('delivery.existingPhotos') }}</p>
                <div class="flex gap-2 overflow-x-auto pb-2">
                  <div v-for="(photo, index) in existingBookingPhotos" :key="photo" class="relative group flex-shrink-0">
                    <img :src="getBookingPhotoUrl(editingBooking!.id!, photo)" :alt="`Photo ${index + 1}`"
                      class="w-16 h-16 object-cover rounded-lg border border-stone-200 dark:border-ink-4" />
                    <div class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" @click.stop="removeExistingBookingPhoto(index)"
                        class="bg-clay-500 text-white rounded-full min-h-touch min-w-[44px] inline-flex items-center justify-center hover:bg-clay-600 transition-colors shadow-lg"
                        :title="t('common.deleteAction')">
                        <X class="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <FileUploadComponent v-model="selectedBookingPhotos" accept-types="image/*,application/pdf"
                :multiple="true" :allow-camera="true" @files-selected="handleBookingFilesSelected" />
            </div>

            <!-- Keyboard shortcut hint for new bookings (desktop only) -->
            <div v-if="!editingBooking" class="hidden sm:block text-xs text-stone-500 dark:text-stone-400 text-center">
              {{ t('common.tip') }}: {{ t('common.keyboardShortcut', { keys: 'Ctrl+Enter' }) }} {{ t('serviceBookings.addAndContinue') }}
            </div>
          </div>

          <!-- Sticky footer -->
          <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
            <button type="submit" :disabled="loading" class="flex-1 btn-primary">
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ loading ? (editingBooking ? t('common.updating') : t('common.creating')) : (editingBooking ? t('common.update') : t('common.create')) }}
            </button>
            <button type="button" @click="closeModal" class="flex-1 btn-outline">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- View Modal -->
    <div v-if="viewingBooking" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60" @click="viewingBooking = null" @keydown.esc="viewingBooking = null" tabindex="-1">
      <div class="w-full sm:max-w-2xl bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden" @click.stop>
        <!-- Grab handle (mobile only) -->
        <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden"></div>

        <!-- Sticky header -->
        <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3">
          <div class="h-9 w-9 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0">
            <Calendar class="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="sw-eyebrow text-stone-500">{{ t('common.view') }}</p>
            <h3 class="font-display text-lg font-semibold text-ink dark:text-cream leading-tight">{{ t('serviceBookings.bookingDetails') }}</h3>
          </div>
          <button type="button" @click="viewingBooking = null" class="h-9 w-9 rounded-md flex items-center justify-center text-stone-400 hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4 shrink-0" aria-label="Close">
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Booking Information -->
            <div class="space-y-4">
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('services.service') }}:</span>
                <span class="ml-2 text-ink dark:text-cream">{{ viewingBooking.expand?.service?.name || 'Unknown Service' }}</span>
              </div>
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('services.vendor') }}:</span>
                <div class="ml-2 inline-block">
                  <span class="text-ink dark:text-cream">{{ viewingBooking.expand?.vendor?.contact_person || 'Unknown Vendor' }}</span>
                  <div v-if="viewingBooking.expand?.vendor?.name" class="text-xs text-stone-500 dark:text-stone-400">
                    {{ viewingBooking.expand.vendor.name }}
                  </div>
                </div>
              </div>
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('serviceBookings.startDate') }}:</span>
                <span class="ml-2 font-mono sw-tabular text-ink dark:text-cream">{{ formatDateTime(viewingBooking.start_date) }}</span>
              </div>
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('serviceBookings.duration') }}:</span>
                <span class="ml-2 text-ink dark:text-cream"><span class="font-mono sw-tabular">{{ viewingBooking.duration }}</span> {{ viewingBooking.expand?.service?.unit || 'units' }}</span>
              </div>
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('common.total') }}:</span>
                <span class="ml-2 font-mono sw-tabular text-ink dark:text-cream">₹{{ viewingBooking.total_amount.toFixed(2) }}</span>
              </div>
              <div>
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('serviceBookings.progress') }}:</span>
                <div class="mt-2 flex items-center space-x-3">
                  <div class="flex-1 bg-stone-200 dark:bg-ink-2 rounded-full h-3">
                    <div
                      class="bg-amber-500 h-3 rounded-full transition-all duration-300"
                      :style="{ width: `${viewingBooking.percent_completed || 0}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-mono sw-tabular text-stone-500 dark:text-stone-400 font-medium">
                    {{ viewingBooking.percent_completed || 0 }}%
                  </span>
                </div>
              </div>
              <div v-if="viewingBooking.notes">
                <span class="font-medium text-stone-600 dark:text-stone-300">{{ t('common.notes') }}:</span>
                <p class="ml-2 text-stone-500 dark:text-stone-400 mt-1">{{ viewingBooking.notes }}</p>
              </div>
            </div>

            <!-- Completion Photos -->
            <div>
              <h4 class="font-display font-medium text-stone-600 dark:text-stone-300 mb-3">{{ t('serviceBookings.completionPhotos') }}</h4>
              <PhotoGallery
                v-if="viewingBooking.completion_photos && viewingBooking.completion_photos.length > 0"
                :photos="viewingBooking.completion_photos"
                :item-id="viewingBooking.id"
                collection="service_bookings"
              />
              <div v-else class="text-center py-8 text-stone-500 dark:text-stone-400">
                {{ t('serviceBookings.noCompletionPhotos') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky footer -->
        <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
          <button type="button" @click="viewingBooking = null" class="flex-1 btn-outline">
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Time Calculator Modal -->
    <TimeCalculatorModal
      v-if="showTimeCalculator"
      :current-date="form.start_date"
      :current-duration="form.duration"
      @close="closeTimeCalculator"
      @apply="handleTimeCalculatorApply"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
  Clock,
  StickyNote,
  Images
} from 'lucide-vue-next';
import Skeleton from '../components/Skeleton.vue';
import FileUploadComponent from '../components/FileUploadComponent.vue';
import RecordLink from '../components/RecordLink.vue';
import { useI18n } from '../composables/useI18n';
import { useUrlFilters } from '../composables/useUrlFilters';
import { useModalEscape } from '../composables/useModalEscape';
import { usePermissions } from '../composables/usePermissions';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useModalState } from '../composables/useModalState';
import { useSiteData } from '../composables/useSiteData';
import { useQuickActionModal } from '../composables/useQuickActionModal';
import { useServiceBookingSearch } from '../composables/useSearch';
import PhotoGallery from '../components/PhotoGallery.vue';
import SearchBox from '../components/SearchBox.vue';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import VendorSearchBox from '../components/VendorSearchBox.vue';
import ServiceSearchBox from '../components/ServiceSearchBox.vue';
import TimeCalculatorModal from '../components/TimeCalculatorModal.vue';
import {
  serviceBookingService,
  serviceService,
  vendorService,
  paymentAllocationService,
  deliveryService,
  paymentService,
  ServiceBookingService,
  type ServiceBooking
} from '../services/pocketbase';

// Extended ServiceBooking with computed payment properties
interface ServiceBookingWithPaymentStatus extends ServiceBooking {
  payment_status: 'pending' | 'partial' | 'paid' | 'currently_paid_up';
  outstanding: number;
}

const { t } = useI18n();
const { canCreate, canUpdate, canDelete } = usePermissions();
const { success: showSuccessToast, error: showErrorToast } = useToast();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { openModal, closeModal: closeModalState } = useModalState();

// URL-driven relation filters (?vendor=<id> / ?service=<id>) for cross-linking
// from VendorDetailView / ServiceDetailView. Filter and search are mutually
// exclusive via the existing search switch.
const { filters, hasActiveFilter, clearFilter } = useUrlFilters(['vendor', 'service']);

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults, loadAll } = useServiceBookingSearch();

// Client-side payment status calculation
const paymentAllocations = computed(() => paymentAllocationsData.value || []);

// Helper function to calculate payment status based on allocations
const calculatePaymentStatus = (serviceBooking: ServiceBooking): 'pending' | 'partial' | 'paid' | 'currently_paid_up' => {
  if (!paymentAllocations.value.length) return 'pending';
  
  const allocatedAmount = paymentAllocations.value
    .filter(allocation => allocation.service_booking === serviceBooking.id)
    .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  
  return ServiceBookingService.calculatePaymentStatusFromData(serviceBooking, allocatedAmount);
};

// Helper function to calculate outstanding amount based on progress
const calculateOutstandingAmount = (serviceBooking: ServiceBooking): number => {
  if (!paymentAllocations.value.length) {
    return ServiceBookingService.calculateProgressBasedAmount(serviceBooking);
  }
  
  const allocatedAmount = paymentAllocations.value
    .filter(allocation => allocation.service_booking === serviceBooking.id)
    .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  
  return ServiceBookingService.calculateOutstandingAmountFromData(serviceBooking, allocatedAmount);
};

// Display items: use search results if searching, otherwise all items with calculated payment status
const serviceBookings = computed((): ServiceBookingWithPaymentStatus[] => {
  const baseBookings = searchQuery.value.trim() ? searchResults.value : (allServiceBookingsData.value || []);
  
  // Add computed payment status and outstanding amount to each booking
  return baseBookings.map(booking => ({
    ...booking,
    payment_status: calculatePaymentStatus(booking),
    outstanding: calculateOutstandingAmount(booking)
  }));
});

// Use site data management - Load service bookings.
// The loader branches on the active relation filter: getByVendor when filtering
// by vendor, getByService when filtering by service, getAll otherwise.
const { data: allServiceBookingsData, loading: bookingsLoading, reload: reloadBookings } = useSiteData(
  async () => {
    if (filters.vendor) return await serviceBookingService.getByVendor(filters.vendor);
    if (filters.service) return await serviceBookingService.getByService(filters.service);
    return await serviceBookingService.getAll();
  }
);

// When the vendor/service filter changes, reload the bookings list. useSiteData's
// reload resets and re-runs the loader; no onMounted loader is needed.
watch(() => [filters.vendor, filters.service], () => reloadBookings());

// Active filter entity name for the dismissible chip, derived reactively from the
// first loaded booking. Falls back to a generic label until results arrive.
const filterLabel = computed(() => {
  const list = allServiceBookingsData.value || [];
  if (filters.vendor) return list[0]?.expand?.vendor?.contact_person || '';
  if (filters.service) return list[0]?.expand?.service?.name || '';
  return '';
});

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

const { data: servicesData } = useSiteData(
  async () => await serviceService.getAll()
);

const { data: vendorsData } = useSiteData(
  async () => await vendorService.getAll()
);

// Load deliveries and payments so the vendor picker can show outstanding balances
const { data: deliveriesData } = useSiteData(
  async () => await deliveryService.getAll()
);

const { data: paymentsData } = useSiteData(
  async () => await paymentService.getAll()
);

// Computed properties from useSiteData
const services = computed(() => servicesData.value || []);
const vendors = computed(() => vendorsData.value || []);
const deliveries = computed(() => deliveriesData.value || []);
const payments = computed(() => paymentsData.value || []);
const allServiceBookings = computed(() => allServiceBookingsData.value || []);
const showAddModal = ref(false);
const editingBooking = ref<ServiceBooking | null>(null);
const viewingBooking = ref<ServiceBooking | null>(null);
const showTimeCalculator = ref(false);
const loading = ref(false);
const showUnitRateWarning = ref(false);
const originalUnitRate = ref(0);

// Photo upload state (mirrors the Delivery modal): files chosen for upload and,
// in edit mode, the existing completion_photos we want to preserve.
const selectedBookingPhotos = ref<File[]>([]);
const existingBookingPhotos = ref<string[]>([]);

const serviceInputRef = ref<InstanceType<typeof ServiceSearchBox>>();
const startDateInputRef = ref<HTMLInputElement>();

const form = reactive({
  service: '',
  vendor: '',
  start_date: '',
  duration: 0,
  unit_rate: 0,
  total_amount: 0,
  percent_completed: 0,
  notes: ''
});

const activeServices = computed(() => {
  return services.value?.filter(service => service.is_active) || [];
});

const canCreateServiceBooking = computed(() => {
  return canCreate.value && checkCreateLimit('service_bookings') && !isReadOnly.value;
});

// Search results summary computed properties
const searchResultsCount = computed(() => {
  return searchQuery.value.trim() ? serviceBookings.value.length : 0;
});

const searchResultsTotal = computed(() => {
  if (!searchQuery.value.trim() || serviceBookings.value.length === 0) return 0;

  return serviceBookings.value.reduce((total, booking) => {
    return total + (booking.total_amount || 0);
  }, 0);
});

// Check if selected service uses hourly calculation
const selectedService = computed(() => {
  return services.value.find(service => service.id === form.service);
});

const isHourlyService = computed(() => {
  return selectedService.value?.unit === 'hour';
});

const reloadAllData = async () => {
  await reloadBookings();
  // Other data will be reloaded automatically by useSiteData
  
  // Load all items for search functionality
  loadAll();
};

const calculateTotal = () => {
  form.total_amount = form.duration * form.unit_rate;
};

const handleUnitRateChange = () => {
  calculateTotal();

  // Show warning if editing a booking with payments and unit rate has changed
  if (editingBooking.value && hasPayments(editingBooking.value)) {
    showUnitRateWarning.value = form.unit_rate !== originalUnitRate.value;
  }
};

const handleVendorSelected = (vendor: any) => {
  if (vendor) {
    form.vendor = vendor.id;
  }
};

const handleServiceSelected = (service: any) => {
  if (service) {
    form.service = service.id;
    if (service.standard_rate) {
      form.unit_rate = service.standard_rate;
      calculateTotal();
    }
  }
};

// Photo helpers (mirror the Delivery modal)
const handleBookingFilesSelected = (files: File[]) => {
  selectedBookingPhotos.value = files;
};

const getBookingPhotoUrl = (bookingId: string, filename: string) => {
  return `${import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'}/api/files/service_bookings/${bookingId}/${filename}`;
};

const removeExistingBookingPhoto = (index: number) => {
  existingBookingPhotos.value.splice(index, 1);
};

// Upload any newly-selected photos after the booking has been created/updated.
// Mirrors the Delivery modal's upload-on-save loop; uploadCompletionPhoto appends
// each file to the record's completion_photos.
const uploadSelectedBookingPhotos = async (bookingId: string) => {
  if (selectedBookingPhotos.value.length === 0) return;
  try {
    for (const file of selectedBookingPhotos.value) {
      await serviceBookingService.uploadCompletionPhoto(bookingId, file);
    }
  } catch (uploadError) {
    console.error('Error uploading completion photos:', uploadError);
    showErrorToast(t('delivery.photoUploadError'));
  }
};

const handleKeydown = async (event: KeyboardEvent) => {
  // CTRL + ENTER to save and keep modal open (for multiple bookings)
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    if (!editingBooking.value && !loading.value) {
      await saveBooking(true); // Keep modal open
    }
  }
};


const saveBooking = async (keepModalOpen = false) => {
  loading.value = true;
  try {
    const data: Record<string, any> = { ...form };

    // Ensure dates are in proper format (keep as date strings)
    if (data.start_date) {
      data.start_date = data.start_date; // Keep YYYY-MM-DD format
    }

    // On edit, persist the (possibly trimmed) set of existing photos so removals
    // stick and kept photos are preserved before any new files are appended.
    // Mirrors the Delivery modal's `deliveryData.photos = existingPhotos.value`.
    if (editingBooking.value) {
      data.completion_photos = [...existingBookingPhotos.value];
    }

    if (editingBooking.value) {
      const updated = await serviceBookingService.update(editingBooking.value.id!, data);
      await uploadSelectedBookingPhotos(updated.id!);
      await reloadAllData();
      showSuccessToast(t('messages.updateSuccess', { item: t('common.serviceBooking') }));
      closeModal();
    } else {
      const created = await serviceBookingService.create(data as Omit<ServiceBooking, 'id' | 'site'>);
      await uploadSelectedBookingPhotos(created.id!);
      await reloadAllData();
      showSuccessToast(t('messages.createSuccess', { item: t('common.serviceBooking') }));

      if (keepModalOpen) {
        // Keep modal open for multiple bookings
        // Retain provider and service, clear other fields, focus start date
        const retainedProvider = form.vendor;
        const retainedService = form.service;
        const retainedUnitRate = form.unit_rate;

        Object.assign(form, {
          service: retainedService,
          vendor: retainedProvider,
          start_date: '',
          duration: 0,
          unit_rate: retainedUnitRate,
          total_amount: 0,
          percent_completed: 0,
          notes: ''
        });

        // Clear photo selection so the next booking starts fresh
        selectedBookingPhotos.value = [];
        existingBookingPhotos.value = [];

        // Focus on start date for next booking
        await nextTick();
        startDateInputRef.value?.focus();
      } else {
        closeModal();
      }
    }
  } catch (error) {
    console.error('Error saving service booking:', error);
    showErrorToast(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const formatDateForInput = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD format
};

const editBooking = async (booking: ServiceBooking) => {
  editingBooking.value = booking;
  showAddModal.value = true;
  openModal('service-bookings-edit-modal', closeModal);
  originalUnitRate.value = booking.unit_rate;
  showUnitRateWarning.value = false;
  Object.assign(form, {
    service: booking.service,
    vendor: booking.vendor,
    start_date: formatDateForInput(booking.start_date),
    duration: booking.duration,
    unit_rate: booking.unit_rate,
    total_amount: booking.total_amount,
    percent_completed: booking.percent_completed || 0,
    notes: booking.notes || ''
  });
  // Preserve existing photos on edit; new selections are added on top.
  existingBookingPhotos.value = [...(booking.completion_photos || [])];
  selectedBookingPhotos.value = [];
  await nextTick();
  if (typeof serviceInputRef.value?.focus === 'function') serviceInputRef.value.focus();
};

const viewBooking = (booking: ServiceBooking) => {
  viewingBooking.value = booking;
};

// Document-level ESC so the view modal closes without first clicking inside it.
useModalEscape(() => { viewingBooking.value = null; }, () => !!viewingBooking.value);

const deleteBooking = async (id: string) => {
  if (confirm(t('messages.confirmDelete', { item: t('serviceBookings.booking') }))) {
    try {
      await serviceBookingService.delete(id);
      await reloadAllData();
    } catch (error) {
      console.error('Error deleting service booking:', error);
      // Show specific error message if it's about payments
      if (error instanceof Error && error.message.includes('payments assigned')) {
        showErrorToast(t('serviceBookings.cannotDeleteWithPayments'));
      } else {
        showErrorToast(t('messages.error'));
      }
    }
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Time calculator functions
const openTimeCalculator = () => {
  showTimeCalculator.value = true;
};

const closeTimeCalculator = () => {
  showTimeCalculator.value = false;
};

const handleTimeCalculatorApply = (duration: number, date: string) => {
  form.duration = duration;
  form.start_date = date;
  calculateTotal();
  closeTimeCalculator();
};

const canEditBooking = (booking: ServiceBooking) => {
  return canUpdate.value && (booking.percent_completed || 0) < 100;
};

const hasPayments = (booking: ServiceBooking) => {
  if (!paymentAllocations.value.length) return false;
  return paymentAllocations.value.some(allocation => allocation.service_booking === booking.id);
};

const canDeleteBooking = (booking: ServiceBooking) => {
  return canDelete.value && !hasPayments(booking);
};

const getBookingActions = (booking: ServiceBooking) => {
  return [
    {
      key: 'edit',
      label: t('common.edit'),
      icon: Edit2,
      variant: 'default' as const,
      disabled: !canEditBooking(booking)
    },
    {
      key: 'delete',
      label: t('common.deleteAction'),
      icon: Trash2,
      variant: 'danger' as const,
      disabled: !canDeleteBooking(booking)
    }
  ];
};

const handleBookingAction = (booking: ServiceBooking, action: string) => {
  switch (action) {
    case 'edit':
      editBooking(booking);
      break;
    case 'delete':
      deleteBooking(booking.id!);
      break;
  }
};

const handleAddServiceBooking = async () => {
  if (canCreateServiceBooking.value) {
    showAddModal.value = true;
    openModal('service-bookings-add-modal', closeModal);
    await nextTick();
    if (typeof serviceInputRef.value?.focus === 'function') serviceInputRef.value.focus();
  }
};

const closeModal = () => {
  showAddModal.value = false;
  closeModalState('service-bookings-add-modal');
  closeModalState('service-bookings-edit-modal');
  editingBooking.value = null;
  showUnitRateWarning.value = false;
  originalUnitRate.value = 0;
  selectedBookingPhotos.value = [];
  existingBookingPhotos.value = [];
  Object.assign(form, {
    service: '',
    vendor: '',
    start_date: '',
    duration: 0,
    unit_rate: 0,
    total_amount: 0,
    percent_completed: 0,
    notes: ''
  });
};

const handleQuickAction = async () => {
  if (canCreate.value) {
    showAddModal.value = true;
    await nextTick();
    serviceInputRef.value?.focus();
  }
};

// Site change is handled automatically by useSiteData

const handleKeyboardShortcut = async (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    if (canCreate.value) {
      showAddModal.value = true;
      await nextTick();
      serviceInputRef.value?.focus();
    }
  }
};

// Event listeners using @vueuse/core
useQuickActionModal(handleQuickAction);
useEventListener(window, 'keydown', handleKeyboardShortcut);
</script>