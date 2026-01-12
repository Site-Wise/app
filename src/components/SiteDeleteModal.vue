<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" @click="$emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md" @click.stop>
      <div class="p-6">
        <!-- Header with Warning Icon and Close Button -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <AlertTriangle class="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('sites.delete.title') }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('sites.delete.subtitle') }}</p>
            </div>
          </div>
          <button 
            @click="$emit('close')"
            :disabled="deleting"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="t('common.close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Warning Message -->
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 mb-6">
          <p class="text-sm text-red-800 dark:text-red-300 font-medium mb-2">
            {{ t('sites.delete.warning') }}
          </p>
          <ul class="list-disc list-inside text-xs text-red-700 dark:text-red-400 space-y-1">
            <li>{{ t('sites.delete.consequences.users') }}</li>
            <li>{{ t('sites.delete.consequences.data') }}</li>
            <li>{{ t('sites.delete.consequences.permanent') }}</li>
          </ul>
        </div>

        <!-- Site Information -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">{{ t('sites.delete.deletingSite') }}</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">{{ site?.name }}</p>
          <div class="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{{ site?.total_units }} {{ t('sites.units') }}</span>
            <span>•</span>
            <span>{{ site?.total_planned_area?.toLocaleString() || 0 }} {{ t('sites.sqft') }}</span>
          </div>
        </div>

        <!-- Confirmation Input -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ t('sites.delete.confirmPrompt', { siteName: site?.name }) }}
          </label>
          <input 
            v-model="confirmationText"
            type="text"
            :placeholder="site?.name"
            class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
            ref="confirmInput"
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            @click="handleDelete"
            :disabled="!canDelete || deleting"
            class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
            <Trash2 v-else class="h-4 w-4" />
            {{ deleting ? t('sites.delete.deleting') : t('sites.delete.confirm') }}
          </button>
          <button
            @click="$emit('close')"
            :disabled="deleting"
            class="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <LoadingOverlay
      :show="showOverlay"
      :state="overlayState"
      :message="overlayMessage"
      @close="handleOverlayClose"
      @timeout="handleOverlayTimeout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-vue-next'
import { useI18n } from '../composables/useI18n'
import { useModalEscape } from '../composables/useModalEscape'
import { siteService, type Site } from '../services/pocketbase'
import { useSiteStore } from '../stores/site'
import { useRouter } from 'vue-router'
import LoadingOverlay from './LoadingOverlay.vue'

const props = defineProps<{
  visible: boolean
  site: Site | null
}>()

const emit = defineEmits<{
  close: []
  deleted: []
}>()

const { t } = useI18n()
const siteStore = useSiteStore()
const router = useRouter()

const confirmationText = ref('')
const deleting = ref(false)
const confirmInput = ref<HTMLInputElement>()

// Loading overlay state
const showOverlay = ref(false)
const overlayState = ref<'loading' | 'success' | 'error' | 'timeout'>('loading')
const overlayMessage = ref('')

const handleOverlayClose = () => {
  showOverlay.value = false
  overlayState.value = 'loading'
  overlayMessage.value = ''
}

const handleOverlayTimeout = () => {
  overlayState.value = 'timeout'
  overlayMessage.value = t('loading.timeout')
}

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
  showOverlay.value = true
  overlayState.value = 'loading'
  overlayMessage.value = ''

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

    // Show success overlay
    overlayState.value = 'success'
    overlayMessage.value = t('sites.delete.success', { siteName: props.site.name })

    // Wait for success animation then emit
    setTimeout(() => {
      showOverlay.value = false
      emit('deleted')
      emit('close')
    }, 1500)
  } catch (error) {
    console.error('Failed to delete site:', error)
    overlayState.value = 'error'
    overlayMessage.value = t('sites.delete.error')
  } finally {
    deleting.value = false
  }
}
</script>