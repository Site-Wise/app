/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */

import { pb } from '../client';
import { setCurrentSiteId, setCurrentUserRole } from '../context';
import type { User, UserWithRoles } from '../types';

export class AuthService {
  async login(email: string, password: string, turnstileToken?: string) {
    const authData = await pb.collection('users').authWithPassword(email, password, {
      turnstileToken
    });
    return authData;
  }

  async register(
    email: string,
    password: string,
    name: string,
    turnstileToken?: string,
    phone?: string,
    countryCode?: string,
    couponCode?: string,
    legalAccepted?: boolean
  ) {
    const data = {
      email,
      password,
      passwordConfirm: password,
      name,
      phone: phone ? `${countryCode}${phone}` : undefined,
      couponCode,
      sites: [], // Initialize with empty sites array
      turnstileToken,
      legal_accepted: legalAccepted || false,
      legal_accepted_at: legalAccepted ? new Date().toISOString() : null
    };
    return await pb.collection('users').create(data);
  }

  logout() {
    pb.authStore.clear();
    setCurrentSiteId(null); // Clear current site on logout
    setCurrentUserRole(null); // Clear current role on logout
  }

  get isAuthenticated() {
    return pb.authStore.isValid;
  }

  get currentUser(): User | null {
    const model = pb.authStore.record;
    if (!model || !this.isAuthenticated) return null;

    return {
      id: model.id,
      email: model.email || '',
      name: model.name || '',
      phone: model.phone,
      avatar: model.avatar,
      sites: model.sites || [],
      created: model.created || '',
      updated: model.updated || ''
    };
  }

  async getCurrentUserWithRoles(): Promise<UserWithRoles | null> {
    const user = this.currentUser;
    if (!user) return null;

    try {
      // Get user's site roles
      const siteUsers = await pb.collection('site_users').getFullList({
        filter: `user="${user.id}" && is_active=true`,
        expand: 'site'
      });

      const siteRoles = siteUsers.map(siteUser => ({
        site: siteUser.site,
        siteName: siteUser.expand?.site?.name || 'Unknown Site',
        role: siteUser.role as 'owner' | 'supervisor' | 'accountant',
        isActive: siteUser.is_active
      }));

      return {
        ...user,
        siteRoles
      };
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return {
        ...user,
        siteRoles: []
      };
    }
  }
}

export const authService = new AuthService();
