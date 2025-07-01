import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pb, type Site, type SiteUser } from '../services/pocketbase'
import { getCurrentSiteId, setCurrentSiteId, getCurrentUserRole, setCurrentUserRole } from '../services/pocketbase'

export const useSiteStore = defineStore('site', () => {
  const currentSiteId = ref<string | null>(getCurrentSiteId())
  const currentSite = ref<Site | null>(null)
  const userSites = ref<SiteUser[]>([])
  const currentUserRole = ref<string | null>(getCurrentUserRole())
  const isInitialized = ref(false)
  const isLoading = ref(false)

  const isReadyForRouting = computed(() => {
    return isInitialized.value && (currentSite.value !== null || userSites.value.length === 0)
  })

  async function loadUserSites() {
    try {
      isLoading.value = true
      
      // Check if user is authenticated
      if (!pb.authStore.isValid || !pb.authStore.model?.id) {
        userSites.value = []
        currentSite.value = null
        currentSiteId.value = null
        currentUserRole.value = null
        isInitialized.value = true
        return
      }
      
      const userId = pb.authStore.model.id

      const fetchedUserSites = await pb.collection('site_users').getFullList({
        filter: `user="${userId}" && is_active=true`,
        expand: 'site',
        sort: '-created'
      })

      userSites.value = fetchedUserSites as unknown as SiteUser[]

      // Load current site if we have a site ID
      if (currentSiteId.value) {
        const userSite = fetchedUserSites.find(us => us.site === currentSiteId.value)
        if (userSite && userSite.expand?.site) {
          currentSite.value = userSite.expand.site as Site
          currentUserRole.value = userSite.role
          setCurrentUserRole(userSite.role)
        } else {
          // Site no longer accessible, clear it
          await clearCurrentSite()
        }
      }

      // Auto-select if only one site
      if (!currentSiteId.value && fetchedUserSites.length === 1) {
        const userSite = fetchedUserSites[0]
        if (userSite.expand?.site) {
          await selectSite(userSite.expand.site as Site, userSite.role)
        }
      }
    } catch (error) {
      console.error('Error loading user sites:', error)
      userSites.value = []
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  async function selectSite(site: Site, role: string) {
    try {
      // Check if already selected to prevent unnecessary updates
      if (currentSiteId.value === site.id && currentUserRole.value === role) {
        return
      }

      // Update local state immediately for better UX
      currentSite.value = site
      currentSiteId.value = site.id || null
      currentUserRole.value = role

      // Persist to storage
      setCurrentSiteId(site.id || null)
      setCurrentUserRole(role as 'owner' | 'supervisor' | 'accountant' | null)
    } catch (error) {
      console.error('Error selecting site:', error)
      // Revert on error
      currentSite.value = null
      currentSiteId.value = null
      currentUserRole.value = null
    }
  }

  async function clearCurrentSite() {
    currentSite.value = null
    currentSiteId.value = null
    currentUserRole.value = null
    setCurrentSiteId(null)
    setCurrentUserRole(null)
  }

  async function createSite(data: Partial<Site>) {
    try {
      const site = await pb.collection('sites').create(data)
      
      // Note: site_user record creation is handled by PocketBase hooks
      // when a site is created (see external_services/pocketbase/site-creation-hook.js)

      // Reload sites and select the new one
      await loadUserSites()
      await selectSite(site as unknown as Site, 'owner')

      return site
    } catch (error) {
      console.error('Error creating site:', error)
      throw error
    }
  }

  async function updateSite(id: string, data: Partial<Site>) {
    try {
      const site = await pb.collection('sites').update(id, data)
      
      // Update local state if this is the current site
      if (currentSite.value?.id === id) {
        currentSite.value = site as unknown as Site
      }

      // Update in userSites list
      const index = userSites.value.findIndex(us => us.site === id)
      if (index !== -1 && userSites.value[index].expand?.site) {
        userSites.value[index].expand!.site = site as unknown as Site
      }

      return site
    } catch (error) {
      console.error('Error updating site:', error)
      throw error
    }
  }

  function canManageSite(siteId?: string): boolean {
    const targetSiteId = siteId || currentSiteId.value
    if (!targetSiteId) return false

    const userSite = userSites.value.find(us => us.site === targetSiteId)
    return userSite?.role === 'owner' || userSite?.role === 'supervisor'
  }

  function isOwner(siteId?: string): boolean {
    const targetSiteId = siteId || currentSiteId.value
    if (!targetSiteId) return false

    const userSite = userSites.value.find(us => us.site === targetSiteId)
    return userSite?.role === 'owner'
  }

  return {
    // State
    currentSiteId: computed(() => currentSiteId.value),
    currentSite: computed(() => currentSite.value),
    userSites: computed(() => userSites.value),
    currentUserRole: computed(() => currentUserRole.value),
    isInitialized: computed(() => isInitialized.value),
    isLoading: computed(() => isLoading.value),
    isReadyForRouting,

    // Actions
    loadUserSites,
    selectSite,
    clearCurrentSite,
    createSite,
    updateSite,

    // Helpers
    canManageSite,
    isOwner
  }
})