<template>
  <div v-if="visible" class="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" @click="$emit('close')">
    <div class="bg-white dark:bg-ink-3 rounded-xl shadow-modal border border-stone-200 dark:border-ink-4 w-full max-w-md" @click.stop>
      <div class="p-6">
        <!-- Header with Warning Icon and Close Button -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-clay-100 dark:bg-clay-500/15 rounded-lg">
              <AlertTriangle class="h-6 w-6 text-clay-600 dark:text-clay-400" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-ink dark:text-cream">{{ t('sites.delete.title') }}</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">{{ t('sites.delete.subtitle') }}</p>
            </div>
          </div>
          <button
            @click="$emit('close')"
            :disabled="deleting"
            class="p-2 text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors"
            :title="t('common.close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Warning Message -->
        <div class="bg-clay-50 dark:bg-clay-900/20 border border-clay-200 dark:border-clay-800/50 rounded-lg p-4 mb-6">
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
        <div class="bg-stone-50 dark:bg-ink-2/50 rounded-lg p-4 mb-6">
          <p class="text-sm text-stone-600 dark:text-stone-400 mb-1">{{ t('sites.delete.deletingSite') }}</p>
          <p class="text-lg font-semibold text-ink dark:text-cream">{{ site?.name }}</p>
          <div class="mt-2 flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
            <span class="font-mono sw-tabular">{{ site?.total_units }} {{ t('sites.units') }}</span>
            <span>•</span>
            <span class="font-mono sw-tabular">{{ site?.total_planned_area?.toLocaleString() || 0 }} {{ t('sites.sqft') }}</span>
          </div>
        </div>

        <!-- Confirmation Input -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            {{ t('sites.delete.confirmPrompt', { siteName: site?.name }) }}
          </label>
          <input
            v-model="confirmationText"
            type="text"
            :placeholder="site?.name"
            class="w-full px-4 py-3 border border-stone-200 dark:border-ink-4 rounded-md bg-white dark:bg-ink-2 text-ink dark:text-cream placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-clay-500 dark:focus:border-clay-500 transition-all duration-200"
            ref="confirmInput"
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button 
            @click="handleDelete"
            :disabled="!canDelete || deleting"
            class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-clay-600 hover:bg-clay-700 disabled:bg-stone-400 text-white font-medium rounded-md transition-all duration-200 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
            <Trash2 v-else class="h-4 w-4" />
            {{ deleting ? t('sites.delete.deleting') : t('sites.delete.confirm') }}
          </button>
          <button 
            @click="$emit('close')"
            :disabled="deleting"
            class="flex-1 px-6 py-3 border border-stone-300 dark:border-ink-4 text-stone-700 dark:text-stone-300 font-medium rounded-md hover:bg-stone-50 dark:hover:bg-ink-4 transition-colors"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
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