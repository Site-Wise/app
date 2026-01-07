export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  sites: string[]; // Array of site IDs the user has access to
  created: string;
  updated: string;
}

export interface UserWithRoles extends User {
  siteRoles: Array<{
    site: string;
    siteName: string;
    role: 'owner' | 'supervisor' | 'accountant';
    isActive: boolean;
  }>;
}
