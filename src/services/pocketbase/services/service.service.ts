import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Service } from '../types';
import { mapRecordToService } from './mappers';

export class ServiceService {
  async getAll(): Promise<Service[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('services').getFullList({
      filter: `site="${siteId}"`
    });
    return records.map(record => mapRecordToService(record));
  }

  async getById(id: string): Promise<Service | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('services').getOne(id, {
        filter: `site="${siteId}"`
      });
      return mapRecordToService(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<Service, 'id' | 'site'>): Promise<Service> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create services');
    }

    const record = await pb.collection('services').create({
      ...data,
      site: siteId
    });
    return mapRecordToService(record);
  }

  async update(id: string, data: Partial<Service>): Promise<Service> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update services');
    }

    const record = await pb.collection('services').update(id, data);
    return mapRecordToService(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete services');
    }

    await pb.collection('services').delete(id);
    return true;
  }
}

export const serviceService = new ServiceService();
