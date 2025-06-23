import PocketBase, { type RecordModel } from 'pocketbase';

// Get PocketBase URL from environment variables with fallback
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090' || 'http://127.0.0.1:8090';

export const pb = new PocketBase(POCKETBASE_URL);

// Enable auto cancellation for duplicate requests
pb.autoCancellation(false);

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

export interface Site {
  id?: string;
  name: string;
  description?: string;
  total_units: number;
  total_planned_area: number; // in sqft
  /** @deprecated Use SiteUser table with role='owner' instead */
  admin_user: string; // User ID of the admin
  /** @deprecated Use SiteUser table for user associations instead */
  users: string[]; // Array of user IDs with access to this site
  created?: string;
  updated?: string;
  expand?: {
    /** @deprecated Use SiteUser table with role='owner' instead */
    admin_user?: User;
    /** @deprecated Use SiteUser table for user associations instead */
    users?: User[];
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

export interface Permissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canExport: boolean;
  canViewFinancials: boolean;
}

export interface Account {
  id?: string;
  name: string;
  type: 'bank' | 'credit_card' | 'cash' | 'digital_wallet' | 'other';
  account_number?: string;
  bank_name?: string;
  description?: string;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  site: string; // Site ID
  created?: string;
  updated?: string;
}

export interface Item {
  id?: string;
  name: string;
  description?: string;
  unit: string;
  /** @deprecated Stock quantity field - use delivery history for actual inventory tracking */
  quantity: number;
  /** @deprecated Inconsistent with Services tags implementation - use proper tagging system if categorization needed */
  category?: string;
  site: string; // Site ID
  created?: string;
  updated?: string;
}

export interface Service {
  id?: string;
  name: string;
  description?: string;
  /** @deprecated Use unified Tag system instead - will be replaced with proper tag relationships */
  category: 'labor' | 'equipment' | 'professional' | 'transport' | 'other';
  service_type: string; // e.g., 'Plumber', 'Electrician', 'Tractor', 'Digger'
  unit: string; // e.g., 'hour', 'day', 'job', 'sqft'
  standard_rate?: number; // Standard hourly/daily rate
  is_active: boolean;
  /** @deprecated JSON array prevents proper filtering/autocomplete - use unified Tag system instead */
  tags: string[]; // e.g., ['electrical', 'maintenance', 'emergency']
  site: string; // Site ID
  created?: string;
  updated?: string;
}

export interface Vendor {
  id?: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  /** @deprecated JSON array prevents proper filtering/autocomplete - use unified Tag system instead */
  tags: string[];
  site: string; // Site ID
  created?: string;
  updated?: string;
}

// ========================================
// FUTURE: Unified Tag System Interfaces
// ========================================

export interface Tag {
  id?: string;
  name: string;
  description?: string;
  color?: string; // For UI categorization
  type: 'service_category' | 'specialty' | 'item_category' | 'custom';
  site: string; // Site-specific tags
  usage_count: number; // For popularity-based autocomplete
  created?: string;
  updated?: string;
}

// Future: Enhanced entity interfaces with tag relationships
export interface ServiceWithTags extends Omit<Service, 'tags' | 'category'> {
  tag_ids: string[]; // Array of Tag IDs
  expand?: {
    tag_ids?: Tag[]; // Expanded tags via PocketBase relations
  };
}

export interface VendorWithTags extends Omit<Vendor, 'tags'> {
  tag_ids: string[]; // Array of Tag IDs
  expand?: {
    tag_ids?: Tag[]; // Expanded tags via PocketBase relations
  };
}

export interface ItemWithTags extends Omit<Item, 'category'> {
  tag_ids: string[]; // Array of Tag IDs
  expand?: {
    tag_ids?: Tag[]; // Expanded tags via PocketBase relations
  };
}

export interface Quotation {
  id?: string;
  vendor: string;
  item?: string;
  service?: string; // New field for service quotations
  quotation_type: 'item' | 'service'; // New field to distinguish type
  unit_price: number;
  minimum_quantity?: number;
  valid_until?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor?: Vendor;
    item?: Item;
    service?: Service;
  };
}

export interface IncomingItem {
  id?: string;
  item: string;
  vendor: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  delivery_date: string;
  photos?: string[];
  notes?: string;
  payment_status: 'pending' | 'partial' | 'paid';
  paid_amount: number;
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor?: Vendor;
    item?: Item;
  };
}

export interface ServiceBooking {
  id?: string;
  service: string;
  vendor: string;
  start_date: string;
  end_date?: string;
  duration: number; // in hours or days based on service unit
  unit_rate: number;
  total_amount: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  completion_photos?: string[];
  notes?: string;
  payment_status: 'pending' | 'partial' | 'paid';
  paid_amount: number;
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor?: Vendor;
    service?: Service;
  };
}

export interface Payment {
  id?: string;
  vendor: string;
  account: string; // Account ID for payment mode
  amount: number;
  payment_date: string;
  reference?: string;
  notes?: string;
  incoming_items: string[];
  service_bookings: string[]; // New field for service payments
  site: string; // Site ID
  created?: string;
  updated?: string;
  running_balance?: number; // Calculated field for account statements
  expand?: {
    vendor?: Vendor;
    account?: Account;
    incoming_items?: IncomingItem[];
    service_bookings?: ServiceBooking[];
  };
}

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
    currentUserRole = localStorage.getItem('currentUserRole') as 'owner' | 'supervisor' | 'accountant' | null;
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

export const calculatePermissions = (role: 'owner' | 'supervisor' | 'accountant' | null): Permissions => {
  if (!role) {
    return {
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
      canManageUsers: false,
      canManageRoles: false,
      canExport: false,
      canViewFinancials: false
    };
  }

  switch (role) {
    case 'owner':
      return {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        canManageUsers: true,
        canManageRoles: true,
        canExport: true,
        canViewFinancials: true
      };
    
    case 'supervisor':
      return {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false, // Cannot delete
        canManageUsers: false,
        canManageRoles: false,
        canExport: true,
        canViewFinancials: true
      };
    
    case 'accountant':
      return {
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        canManageUsers: false,
        canManageRoles: false,
        canExport: true, // Can export financial reports
        canViewFinancials: true
      };
    
    default:
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canManageUsers: false,
        canManageRoles: false,
        canExport: false,
        canViewFinancials: false
      };
  }
};

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
    couponCode?: string
  ) {
    const data = {
      email,
      password,
      passwordConfirm: password,
      name,
      phone: phone ? `${countryCode}${phone}` : undefined,
      couponCode,
      sites: [], // Initialize with empty sites array
      turnstileToken
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

export class SiteUserService {
  async getAll(): Promise<SiteUser[]> {
    const records = await pb.collection('site_users').getFullList({
      expand: 'site,user,assigned_by'
    });
    return records.map(record => this.mapRecordToSiteUser(record));
  }

  async getBySite(siteId: string): Promise<SiteUser[]> {
    const records = await pb.collection('site_users').getFullList({
      filter: `site="${siteId}"`,
      expand: 'user,assigned_by'
    });
    return records.map(record => this.mapRecordToSiteUser(record));
  }

  async getByUser(userId: string): Promise<SiteUser[]> {
    const records = await pb.collection('site_users').getFullList({
      filter: `user="${userId}"`,
      expand: 'site,assigned_by'
    });
    return records.map(record => this.mapRecordToSiteUser(record));
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
    return this.mapRecordToSiteUser(record);
  }

  async updateRole(id: string, data: Partial<SiteUser>): Promise<SiteUser> {
    const record = await pb.collection('site_users').update(id, data);
    return this.mapRecordToSiteUser(record);
  }

  async deactivateRole(id: string): Promise<SiteUser> {
    const record = await pb.collection('site_users').update(id, { is_active: false });
    return this.mapRecordToSiteUser(record);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('site_users').delete(id);
    return true;
  }

  private mapRecordToSiteUser(record: RecordModel): SiteUser {
    return {
      id: record.id,
      site: record.site,
      user: record.user,
      role: record.role,
      assigned_by: record.assigned_by,
      assigned_at: record.assigned_at,
      is_active: record.is_active,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        site: record.expand.site ? this.mapRecordToSite(record.expand.site) : undefined,
        user: record.expand.user ? this.mapRecordToUser(record.expand.user) : undefined,
        assigned_by: record.expand.assigned_by ? this.mapRecordToUser(record.expand.assigned_by) : undefined
      } : undefined
    };
  }

  private mapRecordToSite(record: RecordModel): Site {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      total_units: record.total_units,
      total_planned_area: record.total_planned_area,
      admin_user: record.admin_user,
      users: record.users || [],
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToUser(record: RecordModel): User {
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      phone: record.phone,
      avatar: record.avatar,
      sites: record.sites || [],
      created: record.created,
      updated: record.updated
    };
  }
}

export class SiteService {
  async getAll(): Promise<Site[]> {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get sites where user has any role
    const siteUsers = await pb.collection('site_users').getFullList({
      filter: `user="${user.id}" && is_active=true`,
      expand: 'site'
    });

    const sites = siteUsers.map(siteUser => siteUser.expand?.site).filter(Boolean);
    return sites.map(site => this.mapRecordToSite(site));
  }

  async getById(id: string): Promise<Site | null> {
    try {
      const record = await pb.collection('sites').getOne(id, {
        expand: 'admin_user,users'
      });
      return this.mapRecordToSite(record);
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
    
    return this.mapRecordToSite(record);
  }

  async update(id: string, data: Partial<Site>): Promise<Site> {
    const record = await pb.collection('sites').update(id, data);
    return this.mapRecordToSite(record);
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

  private mapRecordToSite(record: RecordModel): Site {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      total_units: record.total_units,
      total_planned_area: record.total_planned_area,
      admin_user: record.admin_user,
      users: record.users || [],
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        admin_user: record.expand.admin_user ? this.mapRecordToUser(record.expand.admin_user) : undefined,
        users: record.expand.users ? record.expand.users.map((user: RecordModel) => this.mapRecordToUser(user)) : undefined
      } : undefined
    };
  }

  private mapRecordToUser(record: RecordModel): User {
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      phone: record.phone,
      avatar: record.avatar,
      sites: record.sites || [],
      created: record.created,
      updated: record.updated
    };
  }
}

export class AccountService {
  async getAll(): Promise<Account[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('accounts').getFullList({
      filter: `site="${siteId}"`
    });
    return records.map(record => this.mapRecordToAccount(record));
  }

  async getById(id: string): Promise<Account | null> {
    try {
      const record = await pb.collection('accounts').getOne(id);
      return this.mapRecordToAccount(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<Account, 'id' | 'site' | 'current_balance'>): Promise<Account> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create accounts');
    }

    const record = await pb.collection('accounts').create({
      ...data,
      current_balance: data.opening_balance, // Initialize current balance with opening balance
      site: siteId
    });
    return this.mapRecordToAccount(record);
  }

  async update(id: string, data: Partial<Account>): Promise<Account> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update accounts');
    }

    const record = await pb.collection('accounts').update(id, data);
    return this.mapRecordToAccount(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete accounts');
    }

    await pb.collection('accounts').delete(id);
    return true;
  }

  async updateBalance(id: string, amount: number, operation: 'add' | 'subtract'): Promise<Account> {
    const account = await this.getById(id);
    if (!account) throw new Error('Account not found');

    const newBalance = operation === 'add' 
      ? account.current_balance + amount 
      : account.current_balance - amount;

    return this.update(id, { current_balance: newBalance });
  }

  async recalculateBalance(id: string): Promise<Account> {
    const account = await this.getById(id);
    if (!account) throw new Error('Account not found');

    // Get all payments for this account
    const payments = await paymentService.getAll();
    const accountPayments = payments.filter(payment => payment.account === id);
    
    // Calculate total payments made from this account
    const totalPayments = accountPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Recalculate current balance: opening balance - total payments
    const newBalance = account.opening_balance - totalPayments;
    
    return this.update(id, { current_balance: newBalance });
  }

  private mapRecordToAccount(record: RecordModel): Account {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      account_number: record.account_number,
      bank_name: record.bank_name,
      description: record.description,
      is_active: record.is_active,
      opening_balance: record.opening_balance,
      current_balance: record.current_balance,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export class ItemService {
  async getAll(): Promise<Item[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('items').getFullList({
      filter: `site="${siteId}"`
    });
    return records.map(record => this.mapRecordToItem(record));
  }

  async create(data: Omit<Item, 'id' | 'site'>): Promise<Item> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create items');
    }

    const record = await pb.collection('items').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToItem(record);
  }

  async update(id: string, data: Partial<Item>): Promise<Item> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update items');
    }

    const record = await pb.collection('items').update(id, data);
    return this.mapRecordToItem(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete items');
    }

    await pb.collection('items').delete(id);
    return true;
  }

  private mapRecordToItem(record: RecordModel): Item {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      unit: record.unit,
      quantity: record.quantity,
      category: record.category,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export class ServiceService {
  async getAll(): Promise<Service[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('services').getFullList({
      filter: `site="${siteId}"`
    });
    return records.map(record => this.mapRecordToService(record));
  }

  async getById(id: string): Promise<Service | null> {
    try {
      const record = await pb.collection('services').getOne(id);
      return this.mapRecordToService(record);
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
    return this.mapRecordToService(record);
  }

  async update(id: string, data: Partial<Service>): Promise<Service> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update services');
    }

    const record = await pb.collection('services').update(id, data);
    return this.mapRecordToService(record);
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

  private mapRecordToService(record: RecordModel): Service {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      category: record.category,
      service_type: record.service_type,
      unit: record.unit,
      standard_rate: record.standard_rate,
      is_active: record.is_active,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export class VendorService {
  async getAll(): Promise<Vendor[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendors').getFullList({
      filter: `site="${siteId}"`
    });
    return records.map(record => this.mapRecordToVendor(record));
  }

  async create(data: Omit<Vendor, 'id' | 'site'>): Promise<Vendor> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create vendors');
    }

    const record = await pb.collection('vendors').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToVendor(record);
  }

  async update(id: string, data: Partial<Vendor>): Promise<Vendor> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update vendors');
    }

    const record = await pb.collection('vendors').update(id, data);
    return this.mapRecordToVendor(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete vendors');
    }

    await pb.collection('vendors').delete(id);
    return true;
  }

  private mapRecordToVendor(record: RecordModel): Vendor {
    return {
      id: record.id,
      name: record.name,
      contact_person: record.contact_person,
      email: record.email,
      phone: record.phone,
      address: record.address,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export class QuotationService {
  async getAll(): Promise<Quotation[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('quotations').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,item,service'
    });
    return records.map(record => this.mapRecordToQuotation(record));
  }

  async create(data: Omit<Quotation, 'id' | 'site'>): Promise<Quotation> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create quotations');
    }

    const record = await pb.collection('quotations').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToQuotation(record);
  }

  async update(id: string, data: Partial<Quotation>): Promise<Quotation> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update quotations');
    }

    const record = await pb.collection('quotations').update(id, data);
    return this.mapRecordToQuotation(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete quotations');
    }

    await pb.collection('quotations').delete(id);
    return true;
  }

  private mapRecordToQuotation(record: RecordModel): Quotation {
    return {
      id: record.id,
      vendor: record.vendor,
      item: record.item,
      service: record.service,
      quotation_type: record.quotation_type,
      unit_price: record.unit_price,
      minimum_quantity: record.minimum_quantity,
      valid_until: record.valid_until,
      notes: record.notes,
      status: record.status,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        item: record.expand.item ? this.mapRecordToItem(record.expand.item) : undefined,
        service: record.expand.service ? this.mapRecordToService(record.expand.service) : undefined
      } : undefined
    };
  }

  private mapRecordToVendor(record: RecordModel): Vendor {
    return {
      id: record.id,
      name: record.name,
      contact_person: record.contact_person,
      email: record.email,
      phone: record.phone,
      address: record.address,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToItem(record: RecordModel): Item {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      unit: record.unit,
      quantity: record.quantity,
      category: record.category,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToService(record: RecordModel): Service {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      category: record.category,
      service_type: record.service_type,
      unit: record.unit,
      standard_rate: record.standard_rate,
      is_active: record.is_active,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export class IncomingItemService {
  async getAll(): Promise<IncomingItem[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('incoming_items').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,item'
    });
    return records.map(record => this.mapRecordToIncomingItem(record));
  }

  async create(data: Omit<IncomingItem, 'id' | 'site'>): Promise<IncomingItem> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create incoming items');
    }

    const record = await pb.collection('incoming_items').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToIncomingItem(record);
  }

  async update(id: string, data: Partial<IncomingItem>): Promise<IncomingItem> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update incoming items');
    }

    const record = await pb.collection('incoming_items').update(id, data);
    return this.mapRecordToIncomingItem(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete incoming items');
    }

    await pb.collection('incoming_items').delete(id);
    return true;
  }

  async uploadPhoto(itemId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('photos', file);
    const record = await pb.collection('incoming_items').update(itemId, formData);
    return record.photos[record.photos.length - 1];
  }

  private mapRecordToIncomingItem(record: RecordModel): IncomingItem {
    return {
      id: record.id,
      item: record.item,
      vendor: record.vendor,
      quantity: record.quantity,
      unit_price: record.unit_price,
      total_amount: record.total_amount,
      delivery_date: record.delivery_date,
      photos: record.photos,
      notes: record.notes,
      payment_status: record.payment_status,
      paid_amount: record.paid_amount,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        item: record.expand.item ? this.mapRecordToItem(record.expand.item) : undefined
      } : undefined
    };
  }

  private mapRecordToVendor(record: RecordModel): Vendor {
    return {
      id: record.id,
      name: record.name,
      contact_person: record.contact_person,
      email: record.email,
      phone: record.phone,
      address: record.address,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToItem(record: RecordModel): Item {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      unit: record.unit,
      quantity: record.quantity,
      category: record.category,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export class ServiceBookingService {
  async getAll(): Promise<ServiceBooking[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('service_bookings').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,service'
    });
    return records.map(record => this.mapRecordToServiceBooking(record));
  }

  async getById(id: string): Promise<ServiceBooking | null> {
    try {
      const record = await pb.collection('service_bookings').getOne(id, {
        expand: 'vendor,service'
      });
      return this.mapRecordToServiceBooking(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<ServiceBooking, 'id' | 'site'>): Promise<ServiceBooking> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create service bookings');
    }

    const record = await pb.collection('service_bookings').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToServiceBooking(record);
  }

  async update(id: string, data: Partial<ServiceBooking>): Promise<ServiceBooking> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update service bookings');
    }

    const record = await pb.collection('service_bookings').update(id, data);
    return this.mapRecordToServiceBooking(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete service bookings');
    }

    await pb.collection('service_bookings').delete(id);
    return true;
  }

  async uploadCompletionPhoto(bookingId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('completion_photos', file);
    const record = await pb.collection('service_bookings').update(bookingId, formData);
    return record.completion_photos[record.completion_photos.length - 1];
  }

  private mapRecordToServiceBooking(record: RecordModel): ServiceBooking {
    return {
      id: record.id,
      service: record.service,
      vendor: record.vendor,
      start_date: record.start_date,
      end_date: record.end_date,
      duration: record.duration,
      unit_rate: record.unit_rate,
      total_amount: record.total_amount,
      status: record.status,
      completion_photos: record.completion_photos,
      notes: record.notes,
      payment_status: record.payment_status,
      paid_amount: record.paid_amount,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        service: record.expand.service ? this.mapRecordToService(record.expand.service) : undefined
      } : undefined
    };
  }

  private mapRecordToVendor(record: RecordModel): Vendor {
    return {
      id: record.id,
      name: record.name,
      contact_person: record.contact_person,
      email: record.email,
      phone: record.phone,
      address: record.address,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToService(record: RecordModel): Service {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      category: record.category,
      service_type: record.service_type,
      unit: record.unit,
      standard_rate: record.standard_rate,
      is_active: record.is_active,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export class PaymentService {
  async getAll(): Promise<Payment[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('payments').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,account,incoming_items,service_bookings'
    });
    return records.map(record => this.mapRecordToPayment(record));
  }

  async create(data: Omit<Payment, 'id' | 'site'>): Promise<Payment> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create payments');
    }

    // Create the payment
    const record = await pb.collection('payments').create({
      ...data,
      site: siteId
    });
    
    // Update account balance (subtract payment amount)
    await accountService.updateBalance(data.account, data.amount, 'subtract');
    
    // Update payment status of related incoming items and service bookings
    await this.updateIncomingItemsPaymentStatus(data.vendor, data.amount);
    await this.updateServiceBookingsPaymentStatus(data.vendor, data.amount);
    
    return this.mapRecordToPayment(record);
  }

  private async updateIncomingItemsPaymentStatus(vendorId: string, paymentAmount: number) {
    const siteId = getCurrentSiteId();
    if (!siteId) return;

    const incomingItems = await pb.collection('incoming_items')
      .getFullList({
        filter: `vendor="${vendorId}" && payment_status!="paid" && site="${siteId}"`,
        sort: 'created'
      });

    let remainingAmount = paymentAmount;
    
    for (const item of incomingItems) {
      if (remainingAmount <= 0) break;
      
      const outstandingAmount = item.total_amount - item.paid_amount;
      const paymentForItem = Math.min(remainingAmount, outstandingAmount);
      
      const newPaidAmount = item.paid_amount + paymentForItem;
      const newStatus = newPaidAmount >= item.total_amount ? 'paid' : 'partial';
      
      await pb.collection('incoming_items').update(item.id, {
        paid_amount: newPaidAmount,
        payment_status: newStatus
      });
      
      remainingAmount -= paymentForItem;
    }
  }

  private async updateServiceBookingsPaymentStatus(vendorId: string, paymentAmount: number) {
    const siteId = getCurrentSiteId();
    if (!siteId) return;

    const serviceBookings = await pb.collection('service_bookings')
      .getFullList({
        filter: `vendor="${vendorId}" && payment_status!="paid" && site="${siteId}"`,
        sort: 'created'
      });

    let remainingAmount = paymentAmount;
    
    for (const booking of serviceBookings) {
      if (remainingAmount <= 0) break;
      
      const outstandingAmount = booking.total_amount - booking.paid_amount;
      const paymentForBooking = Math.min(remainingAmount, outstandingAmount);
      
      const newPaidAmount = booking.paid_amount + paymentForBooking;
      const newStatus = newPaidAmount >= booking.total_amount ? 'paid' : 'partial';
      
      await pb.collection('service_bookings').update(booking.id, {
        paid_amount: newPaidAmount,
        payment_status: newStatus
      });
      
      remainingAmount -= paymentForBooking;
    }
  }

  private mapRecordToPayment(record: RecordModel): Payment {
    return {
      id: record.id,
      vendor: record.vendor,
      account: record.account,
      amount: record.amount,
      payment_date: record.payment_date,
      reference: record.reference,
      notes: record.notes,
      incoming_items: record.incoming_items || [],
      service_bookings: record.service_bookings || [],
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        account: record.expand.account ? this.mapRecordToAccount(record.expand.account) : undefined,
        incoming_items: record.expand.incoming_items ? 
          record.expand.incoming_items.map((item: RecordModel) => this.mapRecordToIncomingItem(item)) : undefined,
        service_bookings: record.expand.service_bookings ?
          record.expand.service_bookings.map((booking: RecordModel) => this.mapRecordToServiceBooking(booking)) : undefined
      } : undefined
    };
  }

  private mapRecordToVendor(record: RecordModel): Vendor {
    return {
      id: record.id,
      name: record.name,
      contact_person: record.contact_person,
      email: record.email,
      phone: record.phone,
      address: record.address,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToAccount(record: RecordModel): Account {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      account_number: record.account_number,
      bank_name: record.bank_name,
      description: record.description,
      is_active: record.is_active,
      opening_balance: record.opening_balance,
      current_balance: record.current_balance,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToIncomingItem(record: RecordModel): IncomingItem {
    return {
      id: record.id,
      item: record.item,
      vendor: record.vendor,
      quantity: record.quantity,
      unit_price: record.unit_price,
      total_amount: record.total_amount,
      delivery_date: record.delivery_date,
      photos: record.photos,
      notes: record.notes,
      payment_status: record.payment_status,
      paid_amount: record.paid_amount,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        item: record.expand.item ? this.mapRecordToItem(record.expand.item) : undefined
      } : undefined
    };
  }

  private mapRecordToServiceBooking(record: RecordModel): ServiceBooking {
    return {
      id: record.id,
      service: record.service,
      vendor: record.vendor,
      start_date: record.start_date,
      end_date: record.end_date,
      duration: record.duration,
      unit_rate: record.unit_rate,
      total_amount: record.total_amount,
      status: record.status,
      completion_photos: record.completion_photos,
      notes: record.notes,
      payment_status: record.payment_status,
      paid_amount: record.paid_amount,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToItem(record: RecordModel): Item {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      unit: record.unit,
      quantity: record.quantity,
      category: record.category,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export class SiteInvitationService {
  async getAll(): Promise<SiteInvitation[]> {
    const records = await pb.collection('site_invitations').getFullList({
      expand: 'site,invited_by'
    });
    return records.map(record => this.mapRecordToSiteInvitation(record));
  }

  async getBySite(siteId: string): Promise<SiteInvitation[]> {
    const records = await pb.collection('site_invitations').getFullList({
      filter: `site="${siteId}"`,
      expand: 'invited_by'
    });
    return records.map(record => this.mapRecordToSiteInvitation(record));
  }

  async create(data: Omit<SiteInvitation, 'id' | 'created' | 'updated'>): Promise<SiteInvitation> {
    // Note: Duplicate invitation validation is handled in useInvitations composable
    // Note: Email sending functionality is commented out - invitations are managed in-app only
    // TODO: Implement email sending here when email service is ready
    // await emailService.sendInvitation(data.email, invitationData);

    const record = await pb.collection('site_invitations').create(data);
    return this.mapRecordToSiteInvitation(record);
  }

  async updateStatus(id: string, status: 'accepted' | 'expired'): Promise<SiteInvitation> {
    const record = await pb.collection('site_invitations').update(id, { status });
    return this.mapRecordToSiteInvitation(record);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('site_invitations').delete(id);
    return true;
  }

  private mapRecordToSiteInvitation(record: RecordModel): SiteInvitation {
    return {
      id: record.id,
      site: record.site,
      email: record.email,
      role: record.role,
      invited_by: record.invited_by,
      invited_at: record.invited_at,
      status: record.status,
      expires_at: record.expires_at,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        site: record.expand.site ? this.mapRecordToSite(record.expand.site) : undefined,
        invited_by: record.expand.invited_by ? this.mapRecordToUser(record.expand.invited_by) : undefined
      } : undefined
    };
  }

  private mapRecordToSite(record: RecordModel): Site {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      total_units: record.total_units,
      total_planned_area: record.total_planned_area,
      admin_user: record.admin_user,
      users: record.users || [],
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToUser(record: RecordModel): User {
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      phone: record.phone,
      avatar: record.avatar,
      sites: record.sites || [],
      created: record.created,
      updated: record.updated
    };
  }
}

export const authService = new AuthService();
export const siteService = new SiteService();
export const siteUserService = new SiteUserService();
export const siteInvitationService = new SiteInvitationService();
export const accountService = new AccountService();
export const itemService = new ItemService();
export const serviceService = new ServiceService();
export const vendorService = new VendorService();
export const quotationService = new QuotationService();
export const incomingItemService = new IncomingItemService();
export const serviceBookingService = new ServiceBookingService();
export const paymentService = new PaymentService();