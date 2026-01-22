/**
 * Site Invitation Service
 * Manages site invitations for users to join sites
 */

import { pb } from '../client';
import type { SiteInvitation } from '../types';
import { mapRecordToSiteInvitation } from './mappers';

export class SiteInvitationService {
  async getAll(): Promise<SiteInvitation[]> {
    const records = await pb.collection('site_invitations').getFullList({
      expand: 'site,invited_by'
    });
    return records.map(record => mapRecordToSiteInvitation(record));
  }

  async getBySite(siteId: string): Promise<SiteInvitation[]> {
    const records = await pb.collection('site_invitations').getFullList({
      filter: `site="${siteId}"`,
      expand: 'invited_by'
    });
    return records.map(record => mapRecordToSiteInvitation(record));
  }

  async create(data: Omit<SiteInvitation, 'id' | 'created' | 'updated'>): Promise<SiteInvitation> {
    // Note: Duplicate invitation validation is handled in useInvitations composable
    // Note: Email sending functionality is commented out - invitations are managed in-app only
    // TODO: Implement email sending here when email service is ready
    // await emailService.sendInvitation(data.email, invitationData);

    const record = await pb.collection('site_invitations').create(data);
    return mapRecordToSiteInvitation(record);
  }

  async updateStatus(id: string, status: 'accepted' | 'expired'): Promise<SiteInvitation> {
    const record = await pb.collection('site_invitations').update(id, { status });
    return mapRecordToSiteInvitation(record);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('site_invitations').delete(id);
    return true;
  }
}

export const siteInvitationService = new SiteInvitationService();
