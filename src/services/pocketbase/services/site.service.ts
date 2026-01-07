/**
 * Site Service
 * Manages sites and site membership
 */

import { pb } from '../client';
import type { Site } from '../types';
import { mapRecordToSite } from './mappers';
import { authService } from './auth.service';
import { siteUserService } from './site-user.service';

export class SiteService {
  async getAll(): Promise<Site[]> {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get sites where user has any role
    const siteUsers = await pb.collection('site_users').getFullList({
      filter: `user="${user.id}" && is_active=true`,
      expand: 'site'
    });

    const sites = siteUsers
      .map(siteUser => siteUser.expand?.site)
      .filter(site => site && (site.is_active !== false)); // Filter out deleted sites
    return sites.map(site => mapRecordToSite(site));
  }

  async getById(id: string): Promise<Site | null> {
    try {
      const record = await pb.collection('sites').getOne(id, {
        expand: 'admin_user,users'
      });
      return mapRecordToSite(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Pick<Site, 'name' | 'description' | 'total_units' | 'total_planned_area'>): Promise<Site> {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    const siteData = {
      ...data,
      admin_user: user.id,
      users: [user.id] // Admin is automatically added to users
    };

    const record = await pb.collection('sites').create(siteData);

    // Note: site_user record creation and subscription setup are now handled
    // by PocketBase hooks (see external_services/pocketbase/site-creation-hook.js)
    // This ensures atomicity and prevents orphaned sites if client fails

    return mapRecordToSite(record);
  }

  async update(id: string, data: Partial<Site>): Promise<Site> {
    const record = await pb.collection('sites').update(id, data);
    return mapRecordToSite(record);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('sites').delete(id);
    return true;
  }

  async addUserToSite(userId: string, siteId: string, role: 'owner' | 'supervisor' | 'accountant' = 'supervisor'): Promise<void> {
    const currentUser = authService.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    // Check if current user has permission to add users
    const currentUserRole = await siteUserService.getUserRoleForSite(currentUser.id, siteId);
    if (currentUserRole !== 'owner') {
      throw new Error('Permission denied: Only owners can add users');
    }

    // Create site_user record
    await siteUserService.assignRole({
      site: siteId,
      user: userId,
      role,
      assigned_by: currentUser.id
    });

    // Update user's sites array
    const userRecord = await pb.collection('users').getOne(userId);
    const currentSites = userRecord.sites || [];

    if (!currentSites.includes(siteId)) {
      await pb.collection('users').update(userId, {
        sites: [...currentSites, siteId]
      });
    }

    // Update site's users array
    const siteRecord = await pb.collection('sites').getOne(siteId);
    const currentUsers = siteRecord.users || [];

    if (!currentUsers.includes(userId)) {
      await pb.collection('sites').update(siteId, {
        users: [...currentUsers, userId]
      });
    }
  }

  async removeUserFromSite(userId: string, siteId: string): Promise<void> {
    const currentUser = authService.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    // Check if current user has permission to remove users
    const currentUserRole = await siteUserService.getUserRoleForSite(currentUser.id, siteId);
    if (currentUserRole !== 'owner') {
      throw new Error('Permission denied: Only owners can remove users');
    }

    // Deactivate site_user record
    const siteUsers = await pb.collection('site_users').getFullList({
      filter: `user="${userId}" && site="${siteId}"`
    });

    for (const siteUser of siteUsers) {
      await siteUserService.deactivateRole(siteUser.id);
    }

    // Update user's sites array
    const userRecord = await pb.collection('users').getOne(userId);
    const currentSites = userRecord.sites || [];

    await pb.collection('users').update(userId, {
      sites: currentSites.filter((id: string) => id !== siteId)
    });

    // Update site's users array
    const siteRecord = await pb.collection('sites').getOne(siteId);
    const currentUsers = siteRecord.users || [];

    await pb.collection('sites').update(siteId, {
      users: currentUsers.filter((id: string) => id !== userId)
    });
  }

  async changeUserRole(userId: string, siteId: string, newRole: 'owner' | 'supervisor' | 'accountant'): Promise<void> {
    const currentUser = authService.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    // Check if current user has permission to change roles
    const currentUserRole = await siteUserService.getUserRoleForSite(currentUser.id, siteId);
    if (currentUserRole !== 'owner') {
      throw new Error('Permission denied: Only owners can change user roles');
    }

    // Find and update the site_user record
    const siteUsers = await pb.collection('site_users').getFullList({
      filter: `user="${userId}" && site="${siteId}" && is_active=true`
    });

    if (siteUsers.length > 0) {
      await siteUserService.updateRole(siteUsers[0].id, { role: newRole });
    }
  }

  async disownSite(siteId: string): Promise<void> {
    const currentUser = authService.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    // Check if current user is the owner
    const currentUserRole = await siteUserService.getUserRoleForSite(currentUser.id, siteId);
    if (currentUserRole !== 'owner') {
      throw new Error('Permission denied: Only owners can delete a site');
    }

    // Get all site users
    const siteUsers = await pb.collection('site_users').getFullList({
      filter: `site="${siteId}"`
    });

    const disownedAt = new Date().toISOString();

    // Update the site record - mark as inactive and set deleted_at
    await pb.collection('sites').update(siteId, {
      is_active: false,
      deleted_at: disownedAt
    });

    // Update all site_users records - set is_active to false and add disowned_at
    for (const siteUser of siteUsers) {
      await pb.collection('site_users').update(siteUser.id, {
        is_active: false,
        disowned_at: disownedAt
      });
    }

    // Note: The actual deletion of site data will be handled by a cron job
    // that runs one month after deleted_at
  }
}

export const siteService = new SiteService();
