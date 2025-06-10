import { ref, computed } from 'vue';
import { siteService, getCurrentSiteId, setCurrentSiteId, type Site } from '../services/pocketbase';

const currentSite = ref<Site | null>(null);
const userSites = ref<Site[]>([]);

export function useSite() {
  const isLoading = ref(false);

  const loadUserSites = async () => {
    isLoading.value = true;
    try {
      const sites = await siteService.getAll();
      userSites.value = sites;
      
      // If no current site is set but user has sites, set the first one
      const savedSiteId = getCurrentSiteId();
      if (!savedSiteId && sites.length > 0) {
        await selectSite(sites[0].id!);
      } else if (savedSiteId) {
        // Verify the saved site is still accessible
        const savedSite = sites.find(site => site.id === savedSiteId);
        if (savedSite) {
          currentSite.value = savedSite;
        } else {
          // Saved site is no longer accessible, clear it
          setCurrentSiteId(null);
          currentSite.value = null;
        }
      }
    } catch (error) {
      console.error('Error loading user sites:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const selectSite = async (siteId: string) => {
    const site = userSites.value.find(s => s.id === siteId);
    if (site) {
      currentSite.value = site;
      setCurrentSiteId(siteId);
    }
  };

  const createSite = async (siteData: Omit<Site, 'id' | 'admin_user' | 'users'>) => {
    try {
      const newSite = await siteService.create(siteData);
      userSites.value.push(newSite);
      await selectSite(newSite.id!);
      return newSite;
    } catch (error) {
      console.error('Error creating site:', error);
      throw error;
    }
  };

  const updateSite = async (siteId: string, siteData: Partial<Site>) => {
    try {
      const updatedSite = await siteService.update(siteId, siteData);
      const index = userSites.value.findIndex(s => s.id === siteId);
      if (index !== -1) {
        userSites.value[index] = updatedSite;
      }
      if (currentSite.value?.id === siteId) {
        currentSite.value = updatedSite;
      }
      return updatedSite;
    } catch (error) {
      console.error('Error updating site:', error);
      throw error;
    }
  };

  const addUserToSite = async (userId: string, siteId: string) => {
    try {
      await siteService.addUserToSite(userId, siteId);
      // Reload sites to get updated user list
      await loadUserSites();
    } catch (error) {
      console.error('Error adding user to site:', error);
      throw error;
    }
  };

  const removeUserFromSite = async (userId: string, siteId: string) => {
    try {
      await siteService.removeUserFromSite(userId, siteId);
      // Reload sites to get updated user list
      await loadUserSites();
    } catch (error) {
      console.error('Error removing user from site:', error);
      throw error;
    }
  };

  const hasSiteAccess = computed(() => {
    return currentSite.value !== null;
  });

  const isCurrentUserAdmin = computed(() => {
    if (!currentSite.value) return false;
    // This would need to be checked against the current user ID
    // For now, we'll assume the user has admin access if they can see the site
    return true;
  });

  return {
    currentSite: computed(() => currentSite.value),
    userSites: computed(() => userSites.value),
    isLoading: computed(() => isLoading.value),
    hasSiteAccess,
    isCurrentUserAdmin,
    loadUserSites,
    selectSite,
    createSite,
    updateSite,
    addUserToSite,
    removeUserFromSite
  };
}