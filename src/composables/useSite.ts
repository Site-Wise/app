import { ref, computed } from 'vue';
import { 
  siteService, 
  siteUserService,
  getCurrentSiteId, 
  setCurrentSiteId,
  // getCurrentUserRole,
  setCurrentUserRole,
  type Site 
} from '../services/pocketbase';

const currentSite = ref<Site | null>(null);
const userSites = ref<Site[]>([]);
const currentUserRole = ref<'owner' | 'supervisor' | 'accountant' | null>(null);

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
          // Load user role for this site
          await loadUserRoleForCurrentSite();
        } else {
          // Saved site is no longer accessible, clear it
          setCurrentSiteId(null);
          setCurrentUserRole(null);
          currentSite.value = null;
          currentUserRole.value = null;
        }
      }
    } catch (error) {
      console.error('Error loading user sites:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const loadUserRoleForCurrentSite = async () => {
    if (!currentSite.value) return;
    
    try {
      const authService = await import('../services/pocketbase').then(m => m.authService);
      const user = authService.currentUser;
      if (!user) return;

      const role = await siteUserService.getUserRoleForSite(user.id, currentSite.value.id!);
      currentUserRole.value = role;
      setCurrentUserRole(role);
    } catch (error) {
      console.error('Error loading user role:', error);
      currentUserRole.value = null;
      setCurrentUserRole(null);
    }
  };

  const selectSite = async (siteId: string) => {
    const site = userSites.value.find(s => s.id === siteId);
    if (site) {
      currentSite.value = site;
      setCurrentSiteId(siteId);
      
      // Load user role for the selected site
      await loadUserRoleForCurrentSite();
    }
  };

  const createSite = async (siteData: Pick<Site, 'name' | 'description' | 'total_units' | 'total_planned_area'>) => {
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

  const addUserToSite = async (userId: string, siteId: string, role: 'owner' | 'supervisor' | 'accountant' = 'supervisor') => {
    try {
      await siteService.addUserToSite(userId, siteId, role);
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

  const changeUserRole = async (userId: string, siteId: string, newRole: 'owner' | 'supervisor' | 'accountant') => {
    try {
      await siteService.changeUserRole(userId, siteId, newRole);
      // If changing current user's role, update local state
      const authService = await import('../services/pocketbase').then(m => m.authService);
      const currentUser = authService.currentUser;
      if (currentUser && currentUser.id === userId && siteId === currentSite.value?.id) {
        currentUserRole.value = newRole;
        setCurrentUserRole(newRole);
      }
    } catch (error) {
      console.error('Error changing user role:', error);
      throw error;
    }
  };

  const hasSiteAccess = computed(() => {
    return currentSite.value !== null;
  });

  const isCurrentUserAdmin = computed(() => {
    return currentUserRole.value === 'owner';
  });

  const canManageUsers = computed(() => {
    return currentUserRole.value === 'owner';
  });

  return {
    currentSite: computed(() => currentSite.value),
    userSites: computed(() => userSites.value),
    currentUserRole: computed(() => currentUserRole.value),
    isLoading: computed(() => isLoading.value),
    hasSiteAccess,
    isCurrentUserAdmin,
    canManageUsers,
    loadUserSites,
    selectSite,
    createSite,
    updateSite,
    addUserToSite,
    removeUserFromSite,
    changeUserRole
  };
}