import PocketBase, { type RecordModel } from 'pocketbase';

// Get PocketBase URL from environment variables with fallback
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090' || 'http://127.0.0.1:8090';

export const pb = new PocketBase(POCKETBASE_URL);

// Enable auto cancellation for duplicate requests
pb.autoCancellation(true);

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
  tags?: string[]; // Array of Tag IDs for categorization
  site: string; // Site ID
  created?: string;
  updated?: string;
}

export interface Service {
  id?: string;
  name: string;
  description?: string;
  category: 'labor' | 'equipment' | 'professional' | 'transport' | 'other';
  /** @deprecated Use unified Tag system instead - will be replaced with proper tag relationships */
  service_type: string; // e.g., 'Plumber', 'Electrician', 'Tractor', 'Digger'
  unit: string; // e.g., 'hour', 'day', 'job', 'sqft'
  standard_rate?: number; // Standard hourly/daily rate
  is_active: boolean;
  tags?: string[]; // Array of Tag IDs for categorization (replaces tags and category)
  site: string; // Site ID
  created?: string;
  updated?: string;
}

export interface Vendor {
  id?: string;
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_details?: string;
  tags?: string[]; // Array of Tag IDs for categorization (replaces tags)
  site: string; // Site ID
  created?: string;
  updated?: string;
}

// ========================================
// UNIFIED TAG SYSTEM
// ========================================

// Tailwind-based color palette for tags (20 colors that work well in both light and dark modes)
export const TAG_COLOR_PALETTE = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
  '#71717a', // zinc-500
  '#78716c', // stone-500
  '#737373', // neutral-500
];

export interface Tag {
  id?: string;
  name: string;
  color: string; // Hex color code (required for UI categorization)
  type: 'service_category' | 'specialty' | 'item_category' | 'custom';
  site: string; // Site-specific tags
  usage_count: number; // For popularity-based autocomplete
  created?: string;
  updated?: string;
}

// Future: Enhanced entity interfaces with tag relationships
export interface ServiceWithTags extends Omit<Service, 'tags' | 'category'> {
  tags: string[]; // Array of Tag IDs
  expand?: {
    tags?: Tag[]; // Expanded tags via PocketBase relations
  };
}

export interface VendorWithTags extends Omit<Vendor, 'tags'> {
  tags: string[]; // Array of Tag IDs
  expand?: {
    tags?: Tag[]; // Expanded tags via PocketBase relations
  };
}

export interface ItemWithTags extends Omit<Item, 'category'> {
  tags: string[]; // Array of Tag IDs
  expand?: {
    tags?: Tag[]; // Expanded tags via PocketBase relations
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

// New multi-item delivery interfaces
export interface Delivery {
  id?: string;
  vendor: string;
  delivery_date: string;
  delivery_reference?: string; // Invoice/delivery note number
  photos?: string[];
  notes?: string;
  total_amount: number; // Sum of all items
  payment_status: 'pending' | 'partial' | 'paid';
  paid_amount: number;
  delivery_items?: string[]; // Array of delivery_item IDs
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor?: Vendor;
    delivery_items?: DeliveryItem[];
  };
}

export interface DeliveryItem {
  id?: string;
  delivery: string; // Delivery ID
  item: string; // Item ID
  quantity: number;
  unit_price: number;
  total_amount: number; // quantity * unit_price
  notes?: string; // Item-specific notes
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    delivery?: Delivery;
    item?: Item;
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
  deliveries: string[]; // Multi-item deliveries
  service_bookings: string[]; // New field for service payments
  credit_notes?: string[]; // Credit notes used in this payment
  site: string; // Site ID
  created?: string;
  updated?: string;
  running_balance?: number; // Calculated field for account statements
  expand?: {
    vendor?: Vendor;
    account?: Account;
    deliveries?: Delivery[];
    service_bookings?: ServiceBooking[];
    payment_allocations?: PaymentAllocation[];
    credit_notes?: VendorCreditNote[];
  };
}

export interface PaymentAllocation {
  id?: string;
  payment: string; // Payment ID
  delivery?: string; // Delivery ID (optional)
  service_booking?: string; // ServiceBooking ID (optional)
  allocated_amount: number; // Amount allocated to this delivery/booking
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    payment?: Payment;
    delivery?: Delivery;
    service_booking?: ServiceBooking;
  };
}

export interface AccountTransaction {
  id?: string;
  account: string; // Account ID
  type: 'credit' | 'debit';
  amount: number;
  transaction_date: string;
  description: string;
  reference?: string;
  notes?: string;
  vendor?: string; // Vendor ID (optional, for payment-related transactions)
  transaction_category?: 'payment' | 'refund' | 'credit_adjustment' | 'manual'; // Category of transaction
  related_return?: string; // VendorReturn ID for refund transactions
  credit_note?: string; // VendorCreditNote ID for credit-related transactions
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    account?: Account;
    vendor?: Vendor;
    related_return?: VendorReturn;
    credit_note?: VendorCreditNote;
  };
}

export interface VendorReturn {
  id?: string;
  vendor: string; // Vendor ID
  return_date: string;
  reason: 'damaged' | 'wrong_item' | 'excess_delivery' | 'quality_issue' | 'specification_mismatch' | 'other';
  status: 'initiated' | 'approved' | 'rejected' | 'completed' | 'refunded';
  processing_option?: 'credit_note' | 'refund'; // Choice between credit note or direct refund
  notes?: string;
  photos?: string[]; // Array of photo filenames
  approval_notes?: string;
  approved_by?: string; // User ID who approved/rejected
  approved_at?: string;
  total_return_amount: number; // Total amount to be refunded
  actual_refund_amount?: number; // Actual refunded amount (might be different due to deductions)
  completion_date?: string;
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor?: Vendor;
    approved_by?: User;
  };
}

export interface VendorReturnItem {
  id?: string;
  vendor_return: string; // VendorReturn ID
  delivery_item: string; // DeliveryItem ID being returned
  quantity_returned: number;
  return_rate: number; // Rate per unit for return calculation
  return_amount: number; // quantity_returned * return_rate
  condition: 'unopened' | 'opened' | 'damaged' | 'used';
  item_notes?: string;
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor_return?: VendorReturn;
    delivery_item?: DeliveryItem;
  };
}

export interface VendorRefund {
  id?: string;
  vendor_return: string; // VendorReturn ID
  vendor: string; // Vendor ID
  account: string; // Account ID for refund processing
  refund_amount: number;
  refund_date: string;
  refund_method: 'cash' | 'bank_transfer' | 'cheque' | 'adjustment' | 'other';
  reference?: string; // Transaction reference
  notes?: string;
  processed_by?: string; // User ID who processed the refund
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor_return?: VendorReturn;
    vendor?: Vendor;
    account?: Account;
    processed_by?: User;
  };
}

export interface VendorCreditNote {
  id?: string;
  vendor: string; // Vendor ID
  credit_amount: number; // Original credit amount
  balance: number; // Remaining balance
  issue_date: string;
  expiry_date?: string; // Optional expiry date
  reference?: string; // Reference number for the credit note
  reason: string; // Reason for credit note issuance
  return_id?: string; // Related VendorReturn ID if applicable
  status: 'active' | 'fully_used' | 'expired' | 'cancelled';
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    vendor?: Vendor;
    return?: VendorReturn;
  };
}

export interface CreditNoteUsage {
  id?: string;
  credit_note: string; // VendorCreditNote ID
  used_amount: number;
  used_date: string;
  payment: string; // Required - Payment ID (credit notes now go through payments)
  vendor: string; // Vendor ID for quick filtering
  description?: string; // Description of usage
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    credit_note?: VendorCreditNote;
    payment?: Payment;
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

    const sites = siteUsers
      .map(siteUser => siteUser.expand?.site)
      .filter(site => site && (site.is_active !== false)); // Filter out deleted sites
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

  private mapRecordToSite(record: RecordModel): Site {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      total_units: record.total_units,
      total_planned_area: record.total_planned_area,
      admin_user: record.admin_user,
      is_active: record.is_active,
      deleted_at: record.deleted_at,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        admin_user: record.expand.admin_user ? this.mapRecordToUser(record.expand.admin_user) : undefined,
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
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('accounts').getOne(id, {
        filter: `site="${siteId}"`
      });
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

  async updateBalance(id: string, _amount: number, _operation: 'add' | 'subtract'): Promise<Account> {
    // Deprecated: Use AccountTransactionService instead
    // This method is kept for backward compatibility but calculates balance from transactions
    const newBalance = await accountTransactionService.calculateAccountBalance(id);
    return this.update(id, { current_balance: newBalance });
  }

  async recalculateBalance(id: string): Promise<Account> {
    const account = await this.getById(id);
    if (!account) throw new Error('Account not found');

    // Calculate balance from account transactions instead of payments
    const newBalance = await accountTransactionService.calculateAccountBalance(id);
    
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

  async getById(id: string): Promise<Item | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('items').getOne(id, {
        filter: `site="${siteId}"`
      });
      return this.mapRecordToItem(record);
    } catch (error) {
      return null;
    }
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
      tags: record.tags || [],
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
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('services').getOne(id, {
        filter: `site="${siteId}"`
      });
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

  async getById(id: string): Promise<Vendor | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('vendors').getOne(id, {
        filter: `site="${siteId}"`
      });
      return this.mapRecordToVendor(record);
    } catch (error) {
      return null;
    }
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

  async getById(id: string): Promise<Quotation | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('quotations').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor,item,service'
      });
      return this.mapRecordToQuotation(record);
    } catch (error) {
      return null;
    }
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
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('service_bookings').getOne(id, {
        filter: `site="${siteId}"`,
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
      expand: 'vendor,account,deliveries,service_bookings,payment_allocations,payment_allocations.delivery,payment_allocations.service_booking,payment_allocations.service_booking.service,credit_notes'
    });
    return records.map(record => this.mapRecordToPayment(record));
  }

  async getById(id: string): Promise<Payment | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('payments').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor,account,deliveries,service_bookings,payment_allocations,payment_allocations.delivery,payment_allocations.service_booking,payment_allocations.service_booking.service,credit_notes'
      });
      return this.mapRecordToPayment(record);
    } catch (error) {
      return null;
    }
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

    // Calculate credit note amount and validate credit note balances
    let creditNoteAmount = 0;
    if (data.credit_notes && data.credit_notes.length > 0) {
      const totalAvailableCredit = await this.validateAndCalculateCreditNoteAmount(data.credit_notes);
      // Use the minimum of: total payment amount OR total available credit
      creditNoteAmount = Math.min(data.amount, totalAvailableCredit);
    }

    // Calculate actual account payment amount
    const accountPaymentAmount = data.amount - creditNoteAmount;
    
    if (accountPaymentAmount < 0) {
      throw new Error('Credit note amount cannot exceed total payment amount');
    }

    // Create the payment
    const record = await pb.collection('payments').create({
      ...data,
      site: siteId
    });

    // Process credit notes first
    if (data.credit_notes && data.credit_notes.length > 0) {
      await this.processCreditNotes(record.id, data.credit_notes, data.vendor, creditNoteAmount);
    }

    // Create corresponding debit transaction only for actual account payment amount
    if (accountPaymentAmount > 0) {
      const vendorName = await this.getVendorName(data.vendor);
      await accountTransactionService.create({
        account: data.account,
        type: 'debit',
        amount: accountPaymentAmount,
        transaction_date: data.payment_date,
        description: `Payment to ${vendorName}`,
        reference: data.reference,
        notes: data.notes,
        vendor: data.vendor
      });
    }

    // Handle payment allocations with total amount (including credit notes)
    await this.handlePaymentAllocations(record.id, data.deliveries || [], data.service_bookings || [], data.amount);

    return this.mapRecordToPayment(record);
  }

  private async handlePaymentAllocations(paymentId: string, deliveryIds: string[], serviceBookingIds: string[], totalAmount: number) {
    const siteId = getCurrentSiteId();
    if (!siteId) return;

    let remainingAmount = totalAmount;
    
    // Handle delivery allocations
    for (const deliveryId of deliveryIds) {
      if (remainingAmount <= 0) break;
      
      const delivery = await pb.collection('deliveries').getOne(deliveryId);
      const outstandingAmount = delivery.total_amount - delivery.paid_amount;
      const allocatedAmount = Math.min(remainingAmount, outstandingAmount);
      
      // Create payment allocation record
      await paymentAllocationService.create({
        payment: paymentId,
        delivery: deliveryId,
        allocated_amount: allocatedAmount,
        site: siteId
      });
      
      // Update delivery payment status
      const newPaidAmount = delivery.paid_amount + allocatedAmount;
      const newStatus = newPaidAmount >= delivery.total_amount ? 'paid' : 'partial';
      
      await pb.collection('deliveries').update(deliveryId, {
        paid_amount: newPaidAmount,
        payment_status: newStatus
      });
      
      remainingAmount -= allocatedAmount;
    }
    
    // Handle service booking allocations
    for (const bookingId of serviceBookingIds) {
      if (remainingAmount <= 0) break;
      
      const booking = await pb.collection('service_bookings').getOne(bookingId);
      const outstandingAmount = booking.total_amount - booking.paid_amount;
      const allocatedAmount = Math.min(remainingAmount, outstandingAmount);
      
      // Create payment allocation record
      await paymentAllocationService.create({
        payment: paymentId,
        service_booking: bookingId,
        allocated_amount: allocatedAmount,
        site: siteId
      });
      
      // Update service booking payment status
      const newPaidAmount = booking.paid_amount + allocatedAmount;
      const newStatus = newPaidAmount >= booking.total_amount ? 'paid' : 'partial';
      
      await pb.collection('service_bookings').update(bookingId, {
        paid_amount: newPaidAmount,
        payment_status: newStatus
      });
      
      remainingAmount -= allocatedAmount;
    }
  }


  private async getVendorName(vendorId: string): Promise<string> {
    try {
      const vendor = await pb.collection('vendors').getOne(vendorId);
      return vendor.name || 'Unknown Vendor';
    } catch (error) {
      return 'Unknown Vendor';
    }
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete payments');
    }

    // Get payment allocations to reverse them
    const allocations = await paymentAllocationService.getByPayment(id);
    
    // Reverse payment status updates
    for (const allocation of allocations) {
      if (allocation.delivery) {
        const delivery = await pb.collection('deliveries').getOne(allocation.delivery);
        const newPaidAmount = delivery.paid_amount - allocation.allocated_amount;
        const newStatus = newPaidAmount <= 0 ? 'pending' : (newPaidAmount >= delivery.total_amount ? 'paid' : 'partial');
        
        await pb.collection('deliveries').update(allocation.delivery, {
          paid_amount: Math.max(0, newPaidAmount),
          payment_status: newStatus
        });
      }
      
      if (allocation.service_booking) {
        const booking = await pb.collection('service_bookings').getOne(allocation.service_booking);
        const newPaidAmount = booking.paid_amount - allocation.allocated_amount;
        const newStatus = newPaidAmount <= 0 ? 'pending' : (newPaidAmount >= booking.total_amount ? 'paid' : 'partial');
        
        await pb.collection('service_bookings').update(allocation.service_booking, {
          paid_amount: Math.max(0, newPaidAmount),
          payment_status: newStatus
        });
      }
    }
    
    // Delete payment allocations
    await paymentAllocationService.deleteByPayment(id);
    
    // Delete the payment
    await pb.collection('payments').delete(id);
    
    return true;
  }

  mapRecordToPayment(record: RecordModel): Payment {
    return {
      id: record.id,
      vendor: record.vendor,
      account: record.account,
      amount: record.amount,
      payment_date: record.payment_date,
      reference: record.reference,
      notes: record.notes,
      deliveries: record.deliveries || [],
      service_bookings: record.service_bookings || [],
      credit_notes: record.credit_notes || [],
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        account: record.expand.account ? this.mapRecordToAccount(record.expand.account) : undefined,
        deliveries: record.expand.deliveries ?
          record.expand.deliveries.map((delivery: RecordModel) => deliveryService.mapRecordToDelivery(delivery)) : undefined,
        service_bookings: record.expand.service_bookings ?
          record.expand.service_bookings.map((booking: RecordModel) => this.mapRecordToServiceBooking(booking)) : undefined,
        payment_allocations: record.expand.payment_allocations ?
          record.expand.payment_allocations.map((allocation: RecordModel) => paymentAllocationService.mapRecordToPaymentAllocation(allocation)) : undefined,
        credit_notes: record.expand.credit_notes ?
          record.expand.credit_notes.map((creditNote: RecordModel) => vendorCreditNoteService.mapRecordToCreditNote(creditNote)) : undefined
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

  private async validateAndCalculateCreditNoteAmount(creditNoteIds: string[]): Promise<number> {
    let totalCreditAmount = 0;
    
    for (const creditNoteId of creditNoteIds) {
      const creditNote = await vendorCreditNoteService.getById(creditNoteId);
      if (!creditNote) {
        throw new Error(`Credit note ${creditNoteId} not found`);
      }
      if (creditNote.status !== 'active') {
        throw new Error(`Credit note ${creditNoteId} is not active`);
      }
      if (creditNote.balance <= 0) {
        throw new Error(`Credit note ${creditNoteId} has no remaining balance`);
      }
      totalCreditAmount += creditNote.balance;
    }
    
    return totalCreditAmount;
  }

  private async processCreditNotes(paymentId: string, creditNoteIds: string[], vendorId: string, totalCreditAmount: number): Promise<void> {
    let remainingCreditToUse = totalCreditAmount;
    
    for (const creditNoteId of creditNoteIds) {
      if (remainingCreditToUse <= 0) break;
      
      const creditNote = await vendorCreditNoteService.getById(creditNoteId);
      if (!creditNote) continue;
      
      // Use the minimum of: remaining credit needed OR credit note balance
      const usageAmount = Math.min(remainingCreditToUse, creditNote.balance);
      
      if (usageAmount > 0) {
        // Create credit note usage record (this serves as the audit trail)
        await creditNoteUsageService.create({
          credit_note: creditNoteId,
          payment: paymentId,
          vendor: vendorId,
          used_amount: usageAmount,
          used_date: new Date().toISOString().split('T')[0],
          description: `Applied to payment ${paymentId}`
        });
        
        // Update credit note balance
        await vendorCreditNoteService.updateBalance(creditNoteId, -usageAmount);
        
        // Reduce remaining credit to use
        remainingCreditToUse -= usageAmount;
      }
    }
  }
}

export class PaymentAllocationService {
  async create(data: Omit<PaymentAllocation, 'id' | 'created' | 'updated'>): Promise<PaymentAllocation> {
    const record = await pb.collection('payment_allocations').create(data);
    return this.mapRecordToPaymentAllocation(record);
  }

  async getByPayment(paymentId: string): Promise<PaymentAllocation[]> {
    const records = await pb.collection('payment_allocations')
      .getFullList({
        filter: `payment="${paymentId}"`,
        expand: 'delivery,service_booking,service_booking.service'
      });
    return records.map(record => this.mapRecordToPaymentAllocation(record));
  }

  async getByDelivery(deliveryId: string): Promise<PaymentAllocation[]> {
    const records = await pb.collection('payment_allocations')
      .getFullList({
        filter: `delivery="${deliveryId}"`
      });
    return records.map(record => this.mapRecordToPaymentAllocation(record));
  }

  async getByServiceBooking(serviceBookingId: string): Promise<PaymentAllocation[]> {
    const records = await pb.collection('payment_allocations')
      .getFullList({
        filter: `service_booking="${serviceBookingId}"`
      });
    return records.map(record => this.mapRecordToPaymentAllocation(record));
  }

  async deleteByPayment(paymentId: string): Promise<void> {
    const allocations = await this.getByPayment(paymentId);
    for (const allocation of allocations) {
      if (allocation.id) {
        await pb.collection('payment_allocations').delete(allocation.id);
      }
    }
  }

  mapRecordToPaymentAllocation(record: RecordModel): PaymentAllocation {
    return {
      id: record.id,
      payment: record.payment,
      delivery: record.delivery,
      service_booking: record.service_booking,
      allocated_amount: record.allocated_amount,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand
    };
  }
}

export class TagService {
  async getAll(): Promise<Tag[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('tags').getFullList({
      filter: `site="${siteId}"`,
      sort: '-usage_count,name'
    });
    return records.map(record => this.mapRecordToTag(record));
  }

  async getById(id: string): Promise<Tag | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('tags').getOne(id, {
        filter: `site="${siteId}"`
      });
      return this.mapRecordToTag(record);
    } catch (error) {
      return null;
    }
  }

  async getBySite(siteId: string): Promise<Tag[]> {
    const records = await pb.collection('tags').getFullList({
      filter: `site="${siteId}"`,
      sort: '-usage_count,name'
    });
    return records.map(record => this.mapRecordToTag(record));
  }

  async getByName(name: string, siteId?: string): Promise<Tag | null> {
    const currentSiteId = siteId || getCurrentSiteId();
    if (!currentSiteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('tags').getFirstListItem(
        `name="${name}" && site="${currentSiteId}"`
      );
      return this.mapRecordToTag(record);
    } catch (error) {
      return null;
    }
  }

  async create(name: string, type: Tag['type'] = 'custom'): Promise<Tag> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create tags');
    }

    // Get existing tags to choose a unique color
    const existingTags = await this.getBySite(siteId);
    const color = this.getRandomColor(existingTags);

    const record = await pb.collection('tags').create({
      name: name.trim(),
      color,
      type,
      site: siteId,
      usage_count: 0
    });

    return this.mapRecordToTag(record);
  }

  async findOrCreate(name: string, type: Tag['type'] = 'custom'): Promise<Tag> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Try to find existing tag first
    const existingTag = await this.getByName(name, siteId);
    if (existingTag) {
      // Increment usage count
      await this.incrementUsage(existingTag.id!);
      return { ...existingTag, usage_count: existingTag.usage_count + 1 };
    }

    // Create new tag if not found
    return await this.create(name, type);
  }

  async update(id: string, data: Partial<Tag>): Promise<Tag> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update tags');
    }

    const record = await pb.collection('tags').update(id, data);
    return this.mapRecordToTag(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete tags');
    }

    await pb.collection('tags').delete(id);
    return true;
  }

  async incrementUsage(id: string): Promise<void> {
    const tag = await pb.collection('tags').getOne(id);
    await pb.collection('tags').update(id, {
      usage_count: (tag.usage_count || 0) + 1
    });
  }

  private getRandomColor(existingTags: Tag[]): string {
    const usedColors = existingTags.map(tag => tag.color);
    const availableColors = TAG_COLOR_PALETTE.filter(color => !usedColors.includes(color));
    
    if (availableColors.length > 0) {
      // Use an unused color
      return availableColors[Math.floor(Math.random() * availableColors.length)];
    } else {
      // All colors are used, pick a random one from the palette
      return TAG_COLOR_PALETTE[Math.floor(Math.random() * TAG_COLOR_PALETTE.length)];
    }
  }

  private mapRecordToTag(record: RecordModel): Tag {
    return {
      id: record.id,
      name: record.name,
      color: record.color,
      type: record.type,
      site: record.site,
      usage_count: record.usage_count || 0,
      created: record.created,
      updated: record.updated
    };
  }
}

export class AccountTransactionService {
  async getAll(): Promise<AccountTransaction[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('account_transactions').getFullList({
      filter: `site="${siteId}"`,
      expand: 'account,vendor,related_return,credit_note',
      sort: '-transaction_date'
    });
    return records.map(record => this.mapRecordToAccountTransaction(record));
  }

  async getById(id: string): Promise<AccountTransaction | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('account_transactions').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'account,vendor,related_return,credit_note'
      });
      return this.mapRecordToAccountTransaction(record);
    } catch (error) {
      return null;
    }
  }

  async getByAccount(accountId: string): Promise<AccountTransaction[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('account_transactions').getFullList({
      filter: `site="${siteId}" && account="${accountId}"`,
      expand: 'account,vendor,related_return,credit_note',
      sort: '-transaction_date'
    });
    return records.map(record => this.mapRecordToAccountTransaction(record));
  }

  async create(data: Omit<AccountTransaction, 'id' | 'site' | 'created' | 'updated'>): Promise<AccountTransaction> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create transactions');
    }

    const record = await pb.collection('account_transactions').create({
      ...data,
      site: siteId
    });

    // Update account balance after creating transaction
    await this.updateAccountBalance(data.account);

    return this.mapRecordToAccountTransaction(record);
  }

  async update(id: string, data: Partial<AccountTransaction>): Promise<AccountTransaction> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update transactions');
    }

    const record = await pb.collection('account_transactions').update(id, data);
    
    // Update account balance after updating transaction
    if (record.account) {
      await this.updateAccountBalance(record.account);
    }

    return this.mapRecordToAccountTransaction(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete transactions');
    }

    // Get the transaction to know which account to update
    const transaction = await pb.collection('account_transactions').getOne(id);
    
    await pb.collection('account_transactions').delete(id);
    
    // Update account balance after deleting transaction
    if (transaction.account) {
      await this.updateAccountBalance(transaction.account);
    }

    return true;
  }

  async calculateAccountBalance(accountId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get the account to get opening balance
    const account = await pb.collection('accounts').getOne(accountId);
    
    // Get all transactions for this account
    const transactions = await pb.collection('account_transactions').getFullList({
      filter: `account="${accountId}" && site="${siteId}"`
    });

    // Calculate balance: opening balance + credits - debits
    let balance = account.opening_balance || 0;
    
    for (const transaction of transactions) {
      if (transaction.type === 'credit') {
        balance += transaction.amount;
      } else {
        balance -= transaction.amount;
      }
    }

    return balance;
  }

  private async updateAccountBalance(accountId: string): Promise<void> {
    const newBalance = await this.calculateAccountBalance(accountId);
    
    await pb.collection('accounts').update(accountId, {
      current_balance: newBalance
    });
  }

  async createRefundTransaction(data: {
    account: string;
    amount: number;
    vendor: string;
    refund_date: string;
    reference?: string;
    notes?: string;
    return_id?: string;
  }): Promise<AccountTransaction> {
    return this.create({
      account: data.account,
      type: 'credit',
      amount: data.amount,
      transaction_date: data.refund_date,
      description: `Refund from vendor`,
      reference: data.reference,
      notes: data.notes,
      vendor: data.vendor,
      transaction_category: 'refund',
      related_return: data.return_id
    });
  }

  async createCreditAdjustmentTransaction(data: {
    account: string;
    amount: number;
    vendor: string;
    transaction_date: string;
    reference?: string;
    notes?: string;
    credit_note_id?: string;
  }): Promise<AccountTransaction> {
    return this.create({
      account: data.account,
      type: 'debit',
      amount: data.amount,
      transaction_date: data.transaction_date,
      description: `Credit note applied`,
      reference: data.reference,
      notes: data.notes,
      vendor: data.vendor,
      transaction_category: 'credit_adjustment',
      credit_note: data.credit_note_id
    });
  }

  private mapRecordToAccountTransaction(record: RecordModel): AccountTransaction {
    return {
      id: record.id,
      account: record.account,
      type: record.type,
      amount: record.amount,
      transaction_date: record.transaction_date,
      description: record.description,
      reference: record.reference,
      notes: record.notes,
      vendor: record.vendor,
      transaction_category: record.transaction_category,
      related_return: record.related_return,
      credit_note: record.credit_note,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        account: record.expand.account ? this.mapRecordToAccount(record.expand.account) : undefined,
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        related_return: record.expand.related_return ? this.mapRecordToVendorReturn(record.expand.related_return) : undefined,
        credit_note: record.expand.credit_note ? this.mapRecordToCreditNote(record.expand.credit_note) : undefined
      } : undefined
    };
  }

  private mapRecordToVendorReturn(record: RecordModel): VendorReturn {
    return {
      id: record.id,
      vendor: record.vendor,
      return_date: record.return_date,
      reason: record.reason,
      status: record.status,
      notes: record.notes,
      photos: record.photos,
      approval_notes: record.approval_notes,
      approved_by: record.approved_by,
      approved_at: record.approved_at,
      total_return_amount: record.total_return_amount,
      actual_refund_amount: record.actual_refund_amount,
      completion_date: record.completion_date,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  mapRecordToCreditNote(record: RecordModel): VendorCreditNote {
    return {
      id: record.id,
      vendor: record.vendor,
      credit_amount: record.credit_amount,
      balance: record.balance,
      issue_date: record.issue_date,
      expiry_date: record.expiry_date,
      reference: record.reference,
      reason: record.reason,
      return_id: record.return_id,
      status: record.status,
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

export class VendorReturnService {
  async getAll(): Promise<VendorReturn[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_returns').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,approved_by',
      sort: '-return_date'
    });
    return records.map(record => this.mapRecordToVendorReturn(record));
  }

  async getById(id: string): Promise<VendorReturn | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('vendor_returns').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor,approved_by'
      });
      return this.mapRecordToVendorReturn(record);
    } catch (error) {
      return null;
    }
  }

  async getByVendor(vendorId: string): Promise<VendorReturn[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_returns').getFullList({
      filter: `site="${siteId}" && vendor="${vendorId}"`,
      expand: 'vendor,approved_by',
      sort: '-return_date'
    });
    return records.map(record => this.mapRecordToVendorReturn(record));
  }

  async create(data: Omit<VendorReturn, 'id' | 'site' | 'created' | 'updated'>): Promise<VendorReturn> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create vendor returns');
    }

    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Auto-approve returns when created (as per user requirement)
    const record = await pb.collection('vendor_returns').create({
      ...data,
      site: siteId,
      status: 'approved', // Auto-approve returns
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: 'Auto-approved on creation'
    });
    return this.mapRecordToVendorReturn(record);
  }

  async update(id: string, data: Partial<VendorReturn>): Promise<VendorReturn> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update vendor returns');
    }

    const record = await pb.collection('vendor_returns').update(id, data);
    return this.mapRecordToVendorReturn(record);
  }

  async approve(id: string, approvalNotes?: string): Promise<VendorReturn> {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    return this.update(id, {
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: approvalNotes
    });
  }

  async reject(id: string, rejectionNotes: string): Promise<VendorReturn> {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    return this.update(id, {
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: rejectionNotes
    });
  }

  async complete(id: string): Promise<VendorReturn> {
    // Get the return and its items to adjust inventory
    const vendorReturn = await this.getById(id);
    if (!vendorReturn) throw new Error('Return not found');

    // For each return item, we could implement inventory adjustments here
    // In a real system, this would update available quantities or create adjustment records
    // For now, we'll just complete the return
    // TODO: Implement inventory adjustments using vendorReturnItemService.getByReturn(id)
    
    return this.update(id, {
      status: 'completed',
      completion_date: new Date().toISOString()
    });
  }

  async getReturnedQuantityForItem(deliveryItemId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get all return items for this delivery item
    const returnItems = await pb.collection('vendor_return_items').getFullList({
      filter: `delivery_item="${deliveryItemId}"`,
      expand: 'vendor_return'
    });

    // Sum up quantities for completed/approved returns
    return returnItems.reduce((total, item) => {
      const returnRecord = item.expand?.vendor_return;
      if (returnRecord && (returnRecord.status === 'completed' || returnRecord.status === 'approved' || returnRecord.status === 'refunded')) {
        return total + item.quantity_returned;
      }
      return total;
    }, 0);
  }

  async canReturnItem(deliveryItemId: string, requestedQuantity: number): Promise<{ canReturn: boolean; availableQuantity: number; message?: string }> {
    try {
      // Get the original delivery item
      const deliveryItem = await pb.collection('delivery_items').getOne(deliveryItemId);
      const originalQuantity = deliveryItem.quantity;

      // Get already returned quantity
      const returnedQuantity = await this.getReturnedQuantityForItem(deliveryItemId);
      const availableQuantity = originalQuantity - returnedQuantity;

      if (availableQuantity <= 0) {
        return {
          canReturn: false,
          availableQuantity: 0,
          message: 'This item has already been fully returned'
        };
      }

      if (requestedQuantity > availableQuantity) {
        return {
          canReturn: false,
          availableQuantity,
          message: `Only ${availableQuantity} units available for return (${returnedQuantity} already returned)`
        };
      }

      return {
        canReturn: true,
        availableQuantity
      };
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      return {
        canReturn: false,
        availableQuantity: 0,
        message: 'Error checking return eligibility'
      };
    }
  }

  async getReturnInfoForDeliveryItem(deliveryItemId: string): Promise<{
    totalReturned: number;
    availableForReturn: number;
    returns: Array<{
      id: string;
      returnDate: string;
      quantityReturned: number;
      status: string;
      reason: string;
    }>;
  }> {
    try {
      // Get the original delivery item
      const deliveryItem = await pb.collection('delivery_items').getOne(deliveryItemId);
      const originalQuantity = deliveryItem.quantity;

      // Get all return items for this delivery item
      const returnItems = await pb.collection('vendor_return_items').getFullList({
        filter: `delivery_item="${deliveryItemId}"`,
        expand: 'vendor_return',
        sort: '-created'
      });

      let totalReturned = 0;
      const returns = [];

      for (const item of returnItems) {
        const returnRecord = item.expand?.vendor_return;
        if (returnRecord) {
          // Count quantities for completed/approved returns towards total returned
          if (returnRecord.status === 'completed' || returnRecord.status === 'approved' || returnRecord.status === 'refunded') {
            totalReturned += item.quantity_returned;
          }

          returns.push({
            id: returnRecord.id,
            returnDate: returnRecord.return_date,
            quantityReturned: item.quantity_returned,
            status: returnRecord.status,
            reason: returnRecord.reason
          });
        }
      }

      return {
        totalReturned,
        availableForReturn: Math.max(0, originalQuantity - totalReturned),
        returns
      };
    } catch (error) {
      console.error('Error getting return info for delivery item:', error);
      return {
        totalReturned: 0,
        availableForReturn: 0,
        returns: []
      };
    }
  }

  async uploadPhoto(returnId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('photos', file);
    const record = await pb.collection('vendor_returns').update(returnId, formData);
    return record.photos[record.photos.length - 1];
  }

  private mapRecordToVendorReturn(record: RecordModel): VendorReturn {
    return {
      id: record.id,
      vendor: record.vendor,
      return_date: record.return_date,
      reason: record.reason,
      status: record.status,
      notes: record.notes,
      photos: record.photos,
      approval_notes: record.approval_notes,
      approved_by: record.approved_by,
      approved_at: record.approved_at,
      total_return_amount: record.total_return_amount,
      actual_refund_amount: record.actual_refund_amount,
      completion_date: record.completion_date,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        approved_by: record.expand.approved_by ? this.mapRecordToUser(record.expand.approved_by) : undefined
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

export class VendorReturnItemService {
  async getByReturn(vendorReturnId: string): Promise<VendorReturnItem[]> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const records = await pb.collection('vendor_return_items').getFullList({
      filter: `vendor_return="${vendorReturnId}" && site="${currentSite}"`,
      expand: 'delivery_item,delivery_item.item,delivery_item.delivery,delivery_item.delivery.vendor'
    });
    return records.map(record => this.mapRecordToVendorReturnItem(record));
  }

  async getById(id: string): Promise<VendorReturnItem> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const record = await pb.collection('vendor_return_items').getOne(id, {
      expand: 'vendor_return,delivery_item'
    });
    
    // Validate site access
    if (record.site !== currentSite) {
      throw new Error('Access denied: VendorReturnItem not found in current site');
    }
    
    return this.mapRecordToVendorReturnItem(record);
  }

  async create(data: Omit<VendorReturnItem, 'id' | 'created' | 'updated'>): Promise<VendorReturnItem> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create return items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // Ensure site is set in the data
    const dataWithSite = { ...data, site: currentSite };

    const record = await pb.collection('vendor_return_items').create(dataWithSite);
    return this.mapRecordToVendorReturnItem(record);
  }

  async update(id: string, data: Partial<VendorReturnItem>): Promise<VendorReturnItem> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update return items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // First, get the existing record to validate site access
    const existingRecord = await pb.collection('vendor_return_items').getOne(id);
    if (existingRecord.site !== currentSite) {
      throw new Error('Access denied: Cannot update return item from different site');
    }

    // Ensure site cannot be changed
    const { site, ...updateData } = data;
    if (site && site !== currentSite) {
      throw new Error('Access denied: Cannot move return item to different site');
    }

    const record = await pb.collection('vendor_return_items').update(id, updateData);
    return this.mapRecordToVendorReturnItem(record);
  }

  async delete(id: string): Promise<boolean> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete return items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // First, get the existing record to validate site access
    const existingRecord = await pb.collection('vendor_return_items').getOne(id);
    if (existingRecord.site !== currentSite) {
      throw new Error('Access denied: Cannot delete return item from different site');
    }

    await pb.collection('vendor_return_items').delete(id);
    return true;
  }

  private mapRecordToVendorReturnItem(record: RecordModel): VendorReturnItem {
    return {
      id: record.id,
      vendor_return: record.vendor_return,
      delivery_item: record.delivery_item,
      quantity_returned: record.quantity_returned,
      return_rate: record.return_rate,
      return_amount: record.return_amount,
      condition: record.condition,
      item_notes: record.item_notes,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor_return: record.expand.vendor_return ? this.mapRecordToVendorReturn(record.expand.vendor_return) : undefined,
        delivery_item: record.expand.delivery_item ? deliveryItemService.mapRecordToDeliveryItem(record.expand.delivery_item) : undefined
      } : undefined
    };
  }

  private mapRecordToVendorReturn(record: RecordModel): VendorReturn {
    return {
      id: record.id,
      vendor: record.vendor,
      return_date: record.return_date,
      reason: record.reason,
      status: record.status,
      notes: record.notes,
      photos: record.photos,
      approval_notes: record.approval_notes,
      approved_by: record.approved_by,
      approved_at: record.approved_at,
      total_return_amount: record.total_return_amount,
      actual_refund_amount: record.actual_refund_amount,
      completion_date: record.completion_date,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

}

export class VendorRefundService {
  async getAll(): Promise<VendorRefund[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_refunds').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor_return,vendor,account,processed_by',
      sort: '-refund_date'
    });
    return records.map(record => this.mapRecordToVendorRefund(record));
  }

  async getById(id: string): Promise<VendorRefund | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('vendor_refunds').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor_return,vendor,account,processed_by'
      });
      return this.mapRecordToVendorRefund(record);
    } catch (error) {
      return null;
    }
  }

  async getByReturn(vendorReturnId: string): Promise<VendorRefund[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_refunds').getFullList({
      filter: `site="${siteId}" && vendor_return="${vendorReturnId}"`,
      expand: 'vendor,account,processed_by'
    });
    return records.map(record => this.mapRecordToVendorRefund(record));
  }

  async create(data: Omit<VendorRefund, 'id' | 'site' | 'created' | 'updated'>): Promise<VendorRefund> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create refunds');
    }

    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Create the refund record
    const record = await pb.collection('vendor_refunds').create({
      ...data,
      processed_by: user.id,
      site: siteId
    });

    // Create corresponding credit transaction
    const vendorName = await this.getVendorName(data.vendor);
    await accountTransactionService.create({
      account: data.account,
      type: 'credit',
      amount: data.refund_amount,
      transaction_date: data.refund_date,
      description: `Refund to ${vendorName}`,
      reference: data.reference,
      notes: data.notes,
      vendor: data.vendor
    });

    // Update the vendor return status
    await vendorReturnService.update(data.vendor_return, {
      status: 'refunded',
      actual_refund_amount: data.refund_amount
    });

    return this.mapRecordToVendorRefund(record);
  }

  private async getVendorName(vendorId: string): Promise<string> {
    try {
      const vendor = await pb.collection('vendors').getOne(vendorId);
      return vendor.name || vendor.contact_person || 'Unknown Vendor';
    } catch (error) {
      return 'Unknown Vendor';
    }
  }

  private mapRecordToVendorRefund(record: RecordModel): VendorRefund {
    return {
      id: record.id,
      vendor_return: record.vendor_return,
      vendor: record.vendor,
      account: record.account,
      refund_amount: record.refund_amount,
      refund_date: record.refund_date,
      refund_method: record.refund_method,
      reference: record.reference,
      notes: record.notes,
      processed_by: record.processed_by,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor_return: record.expand.vendor_return ? this.mapRecordToVendorReturn(record.expand.vendor_return) : undefined,
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        account: record.expand.account ? this.mapRecordToAccount(record.expand.account) : undefined,
        processed_by: record.expand.processed_by ? this.mapRecordToUser(record.expand.processed_by) : undefined
      } : undefined
    };
  }

  private mapRecordToVendorReturn(record: RecordModel): VendorReturn {
    return {
      id: record.id,
      vendor: record.vendor,
      return_date: record.return_date,
      reason: record.reason,
      status: record.status,
      notes: record.notes,
      photos: record.photos,
      approval_notes: record.approval_notes,
      approved_by: record.approved_by,
      approved_at: record.approved_at,
      total_return_amount: record.total_return_amount,
      actual_refund_amount: record.actual_refund_amount,
      completion_date: record.completion_date,
      site: record.site,
      created: record.created,
      updated: record.updated
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

class VendorCreditNoteService {
  async getAll(): Promise<VendorCreditNote[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_credit_notes').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,return',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToCreditNote(record));
  }

  async getByVendor(vendorId: string): Promise<VendorCreditNote[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_credit_notes').getFullList({
      filter: `site="${siteId}" && vendor="${vendorId}" && status="active" && balance > 0`,
      expand: 'vendor,return',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToCreditNote(record));
  }

  async getById(id: string): Promise<VendorCreditNote | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('vendor_credit_notes').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor,return'
      });
      return this.mapRecordToCreditNote(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<VendorCreditNote, 'id' | 'site' | 'created' | 'updated'>): Promise<VendorCreditNote> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create credit notes');
    }

    const record = await pb.collection('vendor_credit_notes').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToCreditNote(record);
  }

  async update(id: string, data: Partial<VendorCreditNote>): Promise<VendorCreditNote> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update credit notes');
    }

    const record = await pb.collection('vendor_credit_notes').update(id, data);
    return this.mapRecordToCreditNote(record);
  }

  async updateBalance(id: string, usedAmount: number): Promise<VendorCreditNote> {
    const creditNote = await this.getById(id);
    if (!creditNote) throw new Error('Credit note not found');

    const newBalance = creditNote.balance - usedAmount;
    if (newBalance < 0) throw new Error('Insufficient credit balance');

    const status = newBalance === 0 ? 'fully_used' : creditNote.status;
    return this.update(id, { balance: newBalance, status });
  }

  mapRecordToCreditNote(record: RecordModel): VendorCreditNote {
    return {
      id: record.id,
      vendor: record.vendor,
      credit_amount: record.credit_amount,
      balance: record.balance,
      issue_date: record.issue_date,
      expiry_date: record.expiry_date,
      reference: record.reference,
      reason: record.reason,
      return_id: record.return_id,
      status: record.status,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        return: record.expand.return ? this.mapRecordToVendorReturn(record.expand.return) : undefined
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
      payment_details: record.payment_details,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToVendorReturn(record: RecordModel): VendorReturn {
    return {
      id: record.id,
      vendor: record.vendor,
      return_date: record.return_date,
      reason: record.reason,
      status: record.status,
      notes: record.notes,
      photos: record.photos,
      approval_notes: record.approval_notes,
      approved_by: record.approved_by,
      approved_at: record.approved_at,
      total_return_amount: record.total_return_amount,
      actual_refund_amount: record.actual_refund_amount,
      completion_date: record.completion_date,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

class CreditNoteUsageService {
  async getAll(): Promise<CreditNoteUsage[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}"`,
      expand: 'credit_note,payment',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToUsage(record));
  }

  async getByCreditNote(creditNoteId: string): Promise<CreditNoteUsage[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && credit_note="${creditNoteId}"`,
      expand: 'credit_note,payment',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToUsage(record));
  }

  async getByPayment(paymentId: string): Promise<CreditNoteUsage[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && payment="${paymentId}"`,
      expand: 'credit_note,payment',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToUsage(record));
  }

  async getByVendor(vendorId: string): Promise<CreditNoteUsage[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && vendor="${vendorId}"`,
      expand: 'credit_note,payment',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToUsage(record));
  }

  async create(data: Omit<CreditNoteUsage, 'id' | 'site' | 'created' | 'updated'>): Promise<CreditNoteUsage> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create credit note usage');
    }

    // Note: Credit note balance is updated by the calling service (PaymentService)
    // to ensure proper transaction handling and avoid double updates

    const record = await pb.collection('credit_note_usage').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToUsage(record);
  }

  private mapRecordToUsage(record: RecordModel): CreditNoteUsage {
    return {
      id: record.id,
      credit_note: record.credit_note,
      used_amount: record.used_amount,
      used_date: record.used_date,
      payment: record.payment,
      vendor: record.vendor,
      description: record.description,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        credit_note: record.expand.credit_note ? vendorCreditNoteService.mapRecordToCreditNote(record.expand.credit_note) : undefined,
        payment: record.expand.payment ? paymentService.mapRecordToPayment(record.expand.payment) : undefined
      } : undefined
    };
  }
}

export class DeliveryService {
  async getAll(): Promise<Delivery[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('deliveries').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,delivery_items,delivery_items.item',
      sort: '-delivery_date'
    });
    return records.map(record => this.mapRecordToDelivery(record));
  }

  async getById(id: string): Promise<Delivery> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const record = await pb.collection('deliveries').getOne(id, {
      filter: `site="${siteId}"`,
      expand: 'vendor,delivery_items,delivery_items.item'
    });
    
    // Fallback for backward compatibility - remove after migration
    if (!record.expand?.delivery_items && !record.delivery_items) {
      try {
        const directItems = await pb.collection('delivery_items').getFullList({
          filter: `delivery="${id}"`,
          expand: 'item'
        });
        // Add the items to the expand if found
        if (directItems.length > 0) {
          record.expand = record.expand || {};
          record.expand.delivery_items = directItems;
        }
      } catch (directErr) {
        console.error('Failed direct query for delivery_items:', directErr);
      }
    }
    
    return this.mapRecordToDelivery(record);
  }

  async create(data: Omit<Delivery, 'id' | 'site' | 'created' | 'updated'>): Promise<Delivery> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create deliveries');
    }

    const record = await pb.collection('deliveries').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToDelivery(record);
  }

  async update(id: string, data: Partial<Delivery>): Promise<Delivery> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update deliveries');
    }

    const record = await pb.collection('deliveries').update(id, data);
    return this.mapRecordToDelivery(record);
  }

  async delete(id: string): Promise<boolean> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete deliveries');
    }

    try {
      // First, delete all associated delivery_items
      const deliveryItems = await pb.collection('delivery_items').getFullList({
        filter: `delivery="${id}"`
      });
      
      // Delete each delivery item
      for (const item of deliveryItems) {
        try {
          await pb.collection('delivery_items').delete(item.id);
        } catch (itemErr) {
          console.error('Error deleting delivery item:', itemErr);
          throw new Error('DELIVERY_ITEMS_DELETE_FAILED');
        }
      }
      
      // Then delete the delivery itself
      try {
        await pb.collection('deliveries').delete(id);
        return true;
      } catch (deliveryErr) {
        console.error('Error deleting delivery:', deliveryErr);
        throw new Error('DELIVERY_DELETE_FAILED');
      }
    } catch (err) {
      console.error('Error deleting delivery:', err);
      
      // Re-throw the error so UI can handle it appropriately
      throw err;
    }
  }

  async uploadPhoto(deliveryId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('photos', file);
    const record = await pb.collection('deliveries').update(deliveryId, formData);
    return record.photos[record.photos.length - 1];
  }

  async uploadPhotos(deliveryId: string, files: File[]): Promise<string[]> {
    if (files.length === 0) return [];
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('photos', file);
    });
    
    const record = await pb.collection('deliveries').update(deliveryId, formData);
    // Return the newly added photos (last N photos where N = files.length)
    return record.photos.slice(-files.length);
  }

  mapRecordToDelivery(record: RecordModel): Delivery {
    return {
      id: record.id,
      vendor: record.vendor,
      delivery_date: record.delivery_date,
      delivery_reference: record.delivery_reference,
      photos: record.photos || [],
      notes: record.notes,
      total_amount: record.total_amount,
      payment_status: record.payment_status,
      paid_amount: record.paid_amount,
      delivery_items: record.delivery_items || [],
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        delivery_items: record.expand.delivery_items ? 
          record.expand.delivery_items.map((item: RecordModel) => this.mapRecordToDeliveryItem(item)) : undefined
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

  mapRecordToDeliveryItem(record: RecordModel): DeliveryItem {
    return {
      id: record.id,
      delivery: record.delivery,
      item: record.item,
      quantity: record.quantity,
      unit_price: record.unit_price,
      total_amount: record.total_amount,
      notes: record.notes,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        delivery: record.expand.delivery ? this.mapRecordToDelivery(record.expand.delivery) : undefined,
        item: record.expand.item ? this.mapRecordToItem(record.expand.item) : undefined
      } : undefined
    };
  }

  private mapRecordToItem(record: RecordModel): Item {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      unit: record.unit,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export class DeliveryItemService {
  async getByDelivery(deliveryId: string): Promise<DeliveryItem[]> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const records = await pb.collection('delivery_items').getFullList({
      filter: `delivery="${deliveryId}" && site="${currentSite}"`,
      expand: 'delivery,item'
    });
    return records.map(record => this.mapRecordToDeliveryItem(record));
  }

  async getById(id: string): Promise<DeliveryItem> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const record = await pb.collection('delivery_items').getOne(id, {
      expand: 'delivery,item'
    });
    
    // Validate site access
    if (record.site !== currentSite) {
      throw new Error('Access denied: DeliveryItem not found in current site');
    }
    
    return this.mapRecordToDeliveryItem(record);
  }

  async create(data: Omit<DeliveryItem, 'id' | 'created' | 'updated'>): Promise<DeliveryItem> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // Ensure site is set in the data
    const dataWithSite = { ...data, site: currentSite };

    const record = await pb.collection('delivery_items').create(dataWithSite);
    
    // Update the parent delivery with the new item ID
    try {
      const delivery = await pb.collection('deliveries').getOne(data.delivery);
      // Validate that the delivery belongs to the current site
      if (delivery.site !== currentSite) {
        throw new Error('Access denied: Cannot create delivery item for delivery in different site');
      }
      const existingItemIds = delivery.delivery_items || [];
      await pb.collection('deliveries').update(data.delivery, {
        delivery_items: [...existingItemIds, record.id]
      });
    } catch (err) {
      console.error('Failed to update delivery with item ID:', err);
    }
    
    return this.mapRecordToDeliveryItem(record);
  }

  async update(id: string, data: Partial<DeliveryItem>): Promise<DeliveryItem> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // First, get the existing record to validate site access
    const existingRecord = await pb.collection('delivery_items').getOne(id);
    if (existingRecord.site !== currentSite) {
      throw new Error('Access denied: Cannot update delivery item from different site');
    }

    // Ensure site cannot be changed
    const { site, ...updateData } = data;
    if (site && site !== currentSite) {
      throw new Error('Access denied: Cannot move delivery item to different site');
    }

    const record = await pb.collection('delivery_items').update(id, updateData);
    return this.mapRecordToDeliveryItem(record);
  }

  async delete(id: string): Promise<boolean> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // Get the item to find its parent delivery and validate site access
    try {
      const item = await pb.collection('delivery_items').getOne(id);
      
      // Validate site access
      if (item.site !== currentSite) {
        throw new Error('Access denied: Cannot delete delivery item from different site');
      }
      
      // Delete the item
      await pb.collection('delivery_items').delete(id);
      
      // Update the parent delivery to remove this item ID
      if (item.delivery) {
        const delivery = await pb.collection('deliveries').getOne(item.delivery);
        // Validate that the delivery belongs to the current site
        if (delivery.site !== currentSite) {
          console.warn('Delivery site mismatch during item deletion');
        }
        const updatedItemIds = (delivery.delivery_items || []).filter((itemId: string) => itemId !== id);
        await pb.collection('deliveries').update(item.delivery, {
          delivery_items: updatedItemIds
        });
      }
    } catch (err) {
      console.error('Error deleting delivery item:', err);
      // If the item was already deleted, just return true
      if (err instanceof Error && err.message.includes('not found')) {
        return true;
      }
      throw err;
    }
    
    return true;
  }

  async createMultiple(deliveryId: string, items: Array<{
    item: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>): Promise<DeliveryItem[]> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // Validate that the delivery belongs to the current site
    const delivery = await pb.collection('deliveries').getOne(deliveryId);
    if (delivery.site !== currentSite) {
      throw new Error('Access denied: Cannot create delivery items for delivery in different site');
    }

    const createdItems: DeliveryItem[] = [];
    const createdItemIds: string[] = [];
    
    for (const itemData of items) {
      const total_amount = itemData.quantity * itemData.unit_price;
      const record = await pb.collection('delivery_items').create({
        delivery: deliveryId,
        item: itemData.item,
        quantity: itemData.quantity,
        unit_price: itemData.unit_price,
        total_amount,
        notes: itemData.notes,
        site: currentSite
      });
      createdItems.push(this.mapRecordToDeliveryItem(record));
      createdItemIds.push(record.id);
    }
    
    // Update the parent delivery with the new item IDs
    try {
      const existingItemIds = delivery.delivery_items || [];
      await pb.collection('deliveries').update(deliveryId, {
        delivery_items: [...existingItemIds, ...createdItemIds]
      });
    } catch (err) {
      console.error('Failed to update delivery with item IDs:', err);
    }
    
    return createdItems;
  }

  mapRecordToDeliveryItem(record: RecordModel): DeliveryItem {
    return {
      id: record.id,
      delivery: record.delivery,
      item: record.item,
      quantity: record.quantity,
      unit_price: record.unit_price,
      total_amount: record.total_amount,
      notes: record.notes,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        delivery: record.expand.delivery ? this.mapRecordToDelivery(record.expand.delivery) : undefined,
        item: record.expand.item ? this.mapRecordToItem(record.expand.item) : undefined
      } : undefined
    };
  }

  mapRecordToDelivery(record: RecordModel): Delivery {
    return {
      id: record.id,
      vendor: record.vendor,
      delivery_date: record.delivery_date,
      delivery_reference: record.delivery_reference,
      photos: record.photos || [],
      notes: record.notes,
      total_amount: record.total_amount,
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
      tags: record.tags || [],
      site: record.site,
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
export const serviceBookingService = new ServiceBookingService();
export const paymentService = new PaymentService();
export const paymentAllocationService = new PaymentAllocationService();
export const tagService = new TagService();
export const accountTransactionService = new AccountTransactionService();
export const vendorReturnService = new VendorReturnService();
export const vendorReturnItemService = new VendorReturnItemService();
export const vendorRefundService = new VendorRefundService();
export const vendorCreditNoteService = new VendorCreditNoteService();
export const creditNoteUsageService = new CreditNoteUsageService();
export const deliveryService = new DeliveryService();
export const deliveryItemService = new DeliveryItemService();