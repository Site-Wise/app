import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSiteStore } from '../stores/site';
import { siteService, siteUserService, type Site } from '../services/pocketbase';

export function useSite() {
  const store = useSiteStore();
  const { 
    currentSite, 
    userSites, 
    currentUserRole, 
    isLoading, 
    isInitialized,
    isReadyForRouting 
  } = storeToRefs(store);

  const loadUserSites = async () => {
    await store.loadUserSites();
  };

  const selectSite = async (siteId: string) => {
    const userSite = userSites.value.find(us => us.site === siteId);
    if (userSite && userSite.expand?.site) {
      await store.selectSite(userSite.expand.site as Site, userSite.role);
      // Note: Removed custom event emission as watchers handle site changes
    }
  };

  const createSite = async (siteData: Pick<Site, 'name' | 'description' | 'total_units' | 'total_planned_area'>) => {
    return await store.createSite(siteData);
  };

  const updateSite = async (siteId: string, siteData: Partial<Site>) => {
    return await store.updateSite(siteId, siteData);
  };

  const addUserToSite = async (userId: string, siteId: string, role: 'owner' | 'supervisor' | 'accountant' = 'supervisor') => {
    try {
      // Check if current user has permission
      if (!isCurrentUserAdmin.value) {
        throw new Error('Permission denied: Only site owners can add users');
      }

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
      // Check if current user has permission
      if (!isCurrentUserAdmin.value) {
        throw new Error('Permission denied: Only site owners can remove users');
      }

      // Prevent removing self if they're the only owner
      const authService = await import('../services/pocketbase').then(m => m.authService);
      const currentUser = authService.currentUser;
      
      if (currentUser && currentUser.id === userId && currentUserRole.value === 'owner') {
        // Check if there are other owners
        const siteUsers = await siteUserService.getBySite(siteId);
        const otherOwners = siteUsers.filter(su => 
          su.role === 'owner' && 
          su.user !== userId && 
          su.is_active
        );
        
        if (otherOwners.length === 0) {
          throw new Error('Cannot remove the last owner from the site');
        }
      }

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
      // Check if current user has permission
      if (!isCurrentUserAdmin.value) {
        throw new Error('Permission denied: Only site owners can change user roles');
      }

      // Prevent changing own role if they're the only owner
      const authService = await import('../services/pocketbase').then(m => m.authService);
      const currentUser = authService.currentUser;
      
      if (currentUser && currentUser.id === userId && currentUserRole.value === 'owner' && newRole !== 'owner') {
        // Check if there are other owners
        const siteUsers = await siteUserService.getBySite(siteId);
        const otherOwners = siteUsers.filter(su => 
          su.role === 'owner' && 
          su.user !== userId && 
          su.is_active
        );
        
        if (otherOwners.length === 0) {
          throw new Error('Cannot change role of the last owner');
        }
      }

      await siteService.changeUserRole(userId, siteId, newRole);
      
      // If changing current user's role, update local state
      if (currentUser && currentUser.id === userId && siteId === currentSite.value?.id) {
        const { setCurrentUserRole } = await import('../services/pocketbase');
        setCurrentUserRole(newRole);
      }
      
      // Reload sites to get updated user list
      await loadUserSites();
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

  const isOwnerOfSite = async (siteId: string): Promise<boolean> => {
    try {
      const authService = await import('../services/pocketbase').then(m => m.authService);
      const user = authService.currentUser;
      if (!user) return false;

      const role = await siteUserService.getUserRoleForSite(user.id, siteId);
      return role === 'owner';
    } catch (error) {
      console.error('Error checking site ownership:', error);
      return false;
    }
  };

  return {
    currentSite,
    userSites,
    currentUserRole,
    isLoading,
    hasSiteAccess,
    isReadyForRouting,
    isCurrentUserAdmin,
    canManageUsers,
    loadUserSites,
    selectSite,
    createSite,
    updateSite,
    addUserToSite,
    removeUserFromSite,
    changeUserRole,
    isOwnerOfSite
  };
}