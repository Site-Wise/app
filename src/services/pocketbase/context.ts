/**
 * Site Context Management
 * Manages current site and user role context
 */

// Site context management
let currentSiteId: string | null = null;
let currentUserRole: 'owner' | 'supervisor' | 'accountant' | null = null;

export const getCurrentSiteId = (): string | null => {
  if (!currentSiteId) {
    currentSiteId = localStorage.getItem('currentSiteId');
  }
  return currentSiteId;
};

export const setCurrentSiteId = (siteId: string | null) => {
  currentSiteId = siteId;
  if (siteId) {
    localStorage.setItem('currentSiteId', siteId);
  } else {
    localStorage.removeItem('currentSiteId');
  }
};

export const getCurrentUserRole = (): 'owner' | 'supervisor' | 'accountant' | null => {
  if (!currentUserRole) {
    const storedRole = localStorage.getItem('currentUserRole');
    if (storedRole === 'owner' || storedRole === 'supervisor' || storedRole === 'accountant') {
      currentUserRole = storedRole;
    }
  }
  return currentUserRole;
};

export const setCurrentUserRole = (role: 'owner' | 'supervisor' | 'accountant' | null) => {
  currentUserRole = role;
  if (role) {
    localStorage.setItem('currentUserRole', role);
  } else {
    localStorage.removeItem('currentUserRole');
  }
};
