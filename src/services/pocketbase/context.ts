/**
 * Site context management
 * Manages the current site ID and user role for the session
 */

import type { UserRole } from './types/permissions';

// Site context management
let currentSiteId: string | null = null;
let currentUserRole: UserRole | null = null;

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

export const getCurrentUserRole = (): UserRole | null => {
  if (!currentUserRole) {
    currentUserRole = localStorage.getItem('currentUserRole') as UserRole | null;
  }
  return currentUserRole;
};

export const setCurrentUserRole = (role: UserRole | null) => {
  currentUserRole = role;
  if (role) {
    localStorage.setItem('currentUserRole', role);
  } else {
    localStorage.removeItem('currentUserRole');
  }
};
