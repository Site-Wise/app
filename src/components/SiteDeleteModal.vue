<template>
  <!-- Overlay -->
  <div
    v-if="visible"
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm"
    @click="$emit('close')"
  >
    <!-- Panel -->
    <div
      class="w-full sm:max-w-md bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      @click.stop
    >
      <!-- Grab handle (mobile only) -->
      <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
        <div class="mx-auto h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4" />
      </div>

      <!-- Sticky header -->
      <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div class="p-2 bg-clay-100 dark:bg-clay-500/15 rounded-lg">
          <AlertTriangle class="h-5 w-5 text-clay-600 dark:text-clay-400" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="font-display text-lg font-semibold text-ink dark:text-cream">{{ t('sites.delete.title') }}</h2>
          <p class="text-xs text-stone-500 dark:text-stone-400 truncate">{{ t('sites.delete.subtitle') }}</p>
        </div>
        <button
          @click="$emit('close')"
          :disabled="deleting"
          class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors active:scale-[0.98] disabled:opacity-40"
          :aria-label="t('common.close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4 scroll-smooth-touch">
        <!-- Warning Message -->
        <div class="bg-clay-50 dark:bg-clay-900/20 border border-clay-200 dark:border-clay-800/50 rounded-lg p-4">
          <p class="text-sm text-clay-800 dark:text-clay-300 font-medium mb-2">
            {{ t('sites.delete.warning') }}
          </p>
          <ul class="list-disc list-inside text-xs text-clay-700 dark:text-clay-400 space-y-1">
            <li>{{ t('sites.delete.consequences.users') }}</li>
            <li>{{ t('sites.delete.consequences.data') }}</li>
            <li>{{ t('sites.delete.consequences.permanent') }}</li>
          </ul>
        </div>

        <!-- Site Information -->
        <div class="bg-stone-50 dark:bg-ink-2/50 rounded-lg p-4">
          <p class="text-sm text-stone-600 dark:text-stone-400 mb-1">{{ t('sites.delete.deletingSite') }}</p>
          <p class="text-lg font-semibold text-ink dark:text-cream">{{ site?.name }}</p>
          <div class="mt-2 flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
            <span class="font-mono sw-tabular">{{ site?.total_units }} {{ t('sites.units') }}</span>
            <span>•</span>
            <span class="font-mono sw-tabular">{{ site?.total_planned_area?.toLocaleString('en-IN') || 0 }} {{ t('sites.sqft') }}</span>
          </div>
        </div>

        <!-- Confirmation Input -->
        <div>
          <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            {{ t('sites.delete.confirmPrompt', { siteName: site?.name }) }}
          </label>
          <input
            v-model="confirmationText"
            type="text"
            :placeholder="site?.name"
            class="input w-full focus:border-clay-500 dark:focus:border-clay-500"
            ref="confirmInput"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Sticky footer -->
      <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex gap-3 flex-shrink-0 pb-safe">
        <button
          @click="handleDelete"
          :disabled="!canDelete || deleting"
          class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-clay-600 hover:bg-clay-700 disabled:bg-stone-400 text-white font-medium rounded-md transition-all duration-200 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
          <Trash2 v-else class="h-4 w-4" />
          {{ deleting ? t('sites.delete.deleting') : t('sites.delete.confirm') }}
        </button>
        <button
          @click="$emit('close')"
          :disabled="deleting"
          class="flex-1 btn-outline active:scale-[0.98]"
        >
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-vue-next'
import { useI18n } from '../composables/useI18n'
import { useModalEscape } from '../composables/useModalEscape'
import { siteService, type Site } from '../services/pocketbase'
import { useToast } from '../composables/useToast'
import { useSiteStore } from '../stores/site'
import { useRouter } from 'vue-router'

const props = defineProps<{
  visible: boolean
  site: Site | null
}>()

const emit = defineEmits<{
  close: []
  deleted: []
}>()

const { t } = useI18n()
const { success, error: showError } = useToast()
const siteStore = useSiteStore()
const router = useRouter()

const confirmationText = ref('')
const deleting = ref(false)
const confirmInput = ref<HTMLInputElement>()

// ESC key handling for modal
useModalEscape(() => emit('close'), () => props.visible && !deleting.value)

const canDelete = computed(() => {
  return confirmationText.value === props.site?.name
})

// Focus input when modal opens
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    confirmationText.value = ''
    await nextTick()
    confirmInput.value?.focus()
  }
})

const handleDelete = async () => {
  if (!canDelete.value || !props.site?.id) return

  deleting.value = true
  try {
    await siteService.disownSite(props.site.id)

    // Clear the site from store if it was the current site
    if (siteStore.currentSiteId === props.site.id) {
      await siteStore.clearCurrentSite()
      // Reload sites to get updated list
      await siteStore.loadUserSites()

      // Navigate to site selection if no other sites
      if (siteStore.userSites.length === 0) {
        router.push('/')
      }
    } else {
      // Just reload the sites list
      await siteStore.loadUserSites()
    }

    success(t('sites.delete.success', { siteName: props.site.name }))
    emit('deleted')
    emit('close')
  } catch (error) {
    console.error('Failed to delete site:', error)
    showError(t('sites.delete.error'))
  } finally {
    deleting.value = false
  }
}
</script>
