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
const isInitialized = ref(false);
let loadingSitesPromise: Promise<void> | null = null;
let siteSelectionTimer: ReturnType<typeof setTimeout> | null = null;

export function useSite() {
  const isLoading = ref(false);

  const loadUserSites = async () => {
    // Prevent concurrent calls - return existing promise if already loading
    if (loadingSitesPromise) {
      return loadingSitesPromise;
    }

    loadingSitesPromise = performLoadUserSites();
    try {
      await loadingSitesPromise;
    } finally {
      loadingSitesPromise = null;
    }
  };

  const performLoadUserSites = async () => {
    isLoading.value = true;
    isInitialized.value = false;
    try {
      const sites = await siteService.getAll();
      
      // Load ownership info for each site - optimized to reduce N+1 queries
      const authService = await import('../services/pocketbase').then(m => m.authService);
      const user = authService.currentUser;
      if (user) {
        // Batch load all user roles for sites to avoid N+1 queries
        const siteIds = sites.map(site => site.id!).filter(Boolean);
        const userRoles = await siteUserService.getUserRolesForSites(user.id, siteIds);
        
        const sitesWithOwnership = sites.map((site) => {
          const role = userRoles[site.id!] || null;
          return {
            ...site,
            userRole: role,
            isOwner: role === 'owner'
          };
        });
        userSites.value = sitesWithOwnership;
      } else {
        userSites.value = sites;
      }
      
      // If no current site is set but user has sites, set the first one
      const savedSiteId = getCurrentSiteId();

      if (!savedSiteId && userSites.value.length > 0) {
        await selectSite(userSites.value[0].id!);
      } else if (savedSiteId) {
        // Verify the saved site is still accessible
        const savedSite = userSites.value.find(site => site.id === savedSiteId);
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
      isInitialized.value = true;
    }
  };

  const loadUserRoleForCurrentSite = async () => {
    if (!currentSite.value) return;
    
    try {
      const authService = await import('../services/pocketbase').then(m => m.authService);
      const user = authService.currentUser;
      if (!user) {
        currentUserRole.value = null;
        setCurrentUserRole(null);
        return;
      }

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
    // Clear any pending site selection
    if (siteSelectionTimer) {
      clearTimeout(siteSelectionTimer);
    }

    // Debounce site selection to prevent rapid successive calls
    return new Promise<void>((resolve) => {
      siteSelectionTimer = setTimeout(async () => {
        try {
          const site = userSites.value.find(s => s.id === siteId);
          if (site) {
            currentSite.value = site;
            setCurrentSiteId(siteId);
            
            // Load user role for the selected site
            await loadUserRoleForCurrentSite();
          }
          resolve();
        } catch (error) {
          console.error('Error selecting site:', error);
          resolve();
        }
      }, 100); // 100ms debounce
    });
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
        currentUserRole.value = newRole;
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

  const isReadyForRouting = computed(() => {
    return isInitialized.value;
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
    currentSite: computed(() => currentSite.value),
    userSites: computed(() => userSites.value),
    currentUserRole: computed(() => currentUserRole.value),
    isLoading: computed(() => isLoading.value),
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