/**
 * Site User Service
 * Manages user roles and permissions within sites
 */

import { pb } from '../client';
import type { SiteUser } from '../types';
import { mapRecordToSiteUser } from './mappers';

export class SiteUserService {
  async getAll(): Promise<SiteUser[]> {
    const records = await pb.collection('site_users').getFullList({
      expand: 'site,user,assigned_by'
    });
    return records.map(record => mapRecordToSiteUser(record));
  }

  async getBySite(siteId: string): Promise<SiteUser[]> {
    const records = await pb.collection('site_users').getFullList({
      filter: `site="${siteId}"`,
      expand: 'user,assigned_by'
    });
    return records.map(record => mapRecordToSiteUser(record));
  }

  async getByUser(userId: string): Promise<SiteUser[]> {
    const records = await pb.collection('site_users').getFullList({
      filter: `user="${userId}"`,
      expand: 'site,assigned_by'
    });
    return records.map(record => mapRecordToSiteUser(record));
  }

  async getUserRoleForSite(userId: string, siteId: string): Promise<'owner' | 'supervisor' | 'accountant' | null> {
    try {
      const record = await pb.collection('site_users').getFirstListItem(
        `user="${userId}" && site="${siteId}" && is_active=true`
      );
      return record.role as 'owner' | 'supervisor' | 'accountant';
    } catch (error) {
      return null;
    }
  }

  async getUserRolesForSites(userId: string, siteIds: string[]): Promise<Record<string, 'owner' | 'supervisor' | 'accountant' | null>> {
    try {
      if (siteIds.length === 0) {
        return {};
      }

      // Create filter for multiple sites
      const siteFilter = siteIds.map(id => `site="${id}"`).join(' || ');
      const filter = `user="${userId}" && (${siteFilter}) && is_active=true`;

      const records = await pb.collection('site_users').getFullList({
        filter
      });

      // Build result map
      const roles: Record<string, 'owner' | 'supervisor' | 'accountant' | null> = {};

      // Initialize all sites to null
      siteIds.forEach(siteId => {
        roles[siteId] = null;
      });

      // Fill in actual roles
      records.forEach(record => {
        roles[record.site] = record.role as 'owner' | 'supervisor' | 'accountant';
      });

      return roles;
    } catch (error) {
      console.error('Error fetching user roles for sites:', error);
      // Return null for all sites on error
      const roles: Record<string, 'owner' | 'supervisor' | 'accountant' | null> = {};
      siteIds.forEach(siteId => {
        roles[siteId] = null;
      });
      return roles;
    }
  }

  async assignRole(data: {
    site: string;
    user: string;
    role: 'owner' | 'supervisor' | 'accountant';
    assigned_by: string;
  }): Promise<SiteUser> {
    const siteUserData = {
      ...data,
      assigned_at: new Date().toISOString(),
      is_active: true
    };

    const record = await pb.collection('site_users').create(siteUserData);
    return mapRecordToSiteUser(record);
  }

  async updateRole(id: string, data: Partial<SiteUser>): Promise<SiteUser> {
    const record = await pb.collection('site_users').update(id, data);
    return mapRecordToSiteUser(record);
  }

  async deactivateRole(id: string): Promise<SiteUser> {
    const record = await pb.collection('site_users').update(id, { is_active: false });
    return mapRecordToSiteUser(record);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('site_users').delete(id);
    return true;
  }
}

export const siteUserService = new SiteUserService();
