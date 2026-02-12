import type { User } from './user';

export interface Site {
  id?: string;
  name: string;
  description?: string;
  total_units: number;
  total_planned_area: number; // in sqft
  admin_user: string; // User ID of the admin
  is_active?: boolean; // Active status (false when deleted)
  deleted_at?: string; // Timestamp when site was deleted (soft delete)
  created?: string;
  updated?: string;
  expand?: {
    admin_user?: User;
  };
}

export interface SiteUser {
  id?: string;
  site: string;        // Site ID
  user: string;        // User ID
  role: 'owner' | 'supervisor' | 'accountant';
  assigned_by: string; // User ID who assigned this role
  assigned_at: string; // Timestamp
  is_active: boolean;  // Can be deactivated without deletion
  disowned_at?: string; // Timestamp when site was disowned (soft delete)
  created?: string;
  updated?: string;
  expand?: {
    site?: Site;
    user?: User;
    assigned_by?: User;
  };
}

export interface SiteInvitation {
  id?: string;
  site: string;        // Site ID
  email: string;       // Email address invited (for identification, not actual email sending)
  role: 'owner' | 'supervisor' | 'accountant';
  invited_by: string;  // User ID who sent the invitation
  invited_at: string;  // Timestamp
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;  // Expiration timestamp
  created?: string;
  updated?: string;
  expand?: {
    site?: Site;
    invited_by?: User;
  };
  // Note: Email functionality is not implemented - invitations are managed in-app only
}
