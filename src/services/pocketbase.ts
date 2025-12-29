import PocketBase, { type RecordModel } from 'pocketbase';
import { batchCreate, batchUpdate, batchDelete } from './pocketbaseBatch';

// Get PocketBase URL from environment variables with fallback
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090' || 'http://127.0.0.1:8090';

export const pb = new PocketBase(POCKETBASE_URL);

// Enable auto cancellation for duplicate requests
pb.autoCancellation(true);

// ========================================
// TOKEN REFRESH MANAGEMENT
// ========================================

// Token refresh configuration
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh if token expires within 5 minutes
const TOKEN_CHECK_INTERVAL = 60 * 1000; // Check token status every minute

let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;
let authChangeUnsubscribe: (() => void) | null = null;

/**
 * Parse JWT token to get expiration time
 */
function getTokenExpiration(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

/**
 * Check if token needs refresh (expires within threshold)
 */
function tokenNeedsRefresh(): boolean {
  const token = pb.authStore.token;
  if (!token) return false;

  const expiration = getTokenExpiration(token);
  if (!expiration) return false;

  const now = Date.now();
  const timeUntilExpiry = expiration - now;

  return timeUntilExpiry > 0 && timeUntilExpiry < TOKEN_REFRESH_THRESHOLD;
}

/**
 * Check if token is expired
 */
function isTokenExpired(): boolean {
  const token = pb.authStore.token;
  if (!token) return true;

  const expiration = getTokenExpiration(token);
  if (!expiration) return true;

  return Date.now() >= expiration;
}

/**
 * Refresh the authentication token
 * Returns true if refresh was successful, false otherwise
 */
async function refreshAuthToken(): Promise<boolean> {
  if (!pb.authStore.isValid) {
    return false;
  }

  try {
    await pb.collection('users').authRefresh();
    console.debug('[TokenRefresh] Token refreshed successfully');
    return true;
  } catch (error) {
    console.warn('[TokenRefresh] Failed to refresh token:', error);
    return false;
  }
}

/**
 * Periodic token check and refresh
 */
async function checkAndRefreshToken(): Promise<void> {
  if (!pb.authStore.isValid) {
    return;
  }

  // If token is expired, clear auth (user needs to re-login)
  if (isTokenExpired()) {
    console.warn('[TokenRefresh] Token expired, clearing auth');
    pb.authStore.clear();
    return;
  }

  // If token is about to expire, refresh it
  if (tokenNeedsRefresh()) {
    await refreshAuthToken();
  }
}

/**
 * Initialize token refresh mechanism
 * Should be called once when the app starts
 */
export async function initializeTokenRefresh(): Promise<boolean> {
  // Clean up any existing interval
  stopTokenRefresh();

  // If not authenticated, nothing to do
  if (!pb.authStore.isValid) {
    return false;
  }

  // Check if token is expired
  if (isTokenExpired()) {
    console.warn('[TokenRefresh] Token expired on init, clearing auth');
    pb.authStore.clear();
    return false;
  }

  // Try to refresh token on init to validate it with the server
  const refreshSuccess = await refreshAuthToken();

  if (!refreshSuccess) {
    // Token is invalid on server, clear it
    console.warn('[TokenRefresh] Token invalid on server, clearing auth');
    pb.authStore.clear();
    return false;
  }

  // Start periodic token check
  tokenRefreshInterval = setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);

  // Listen for auth state changes
  authChangeUnsubscribe = pb.authStore.onChange(() => {
    if (!pb.authStore.isValid && tokenRefreshInterval) {
      // User logged out, stop refresh interval
      stopTokenRefresh();
    }
  });

  return true;
}

/**
 * Stop the token refresh mechanism
 * Should be called on logout
 */
export function stopTokenRefresh(): void {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }

  if (authChangeUnsubscribe) {
    authChangeUnsubscribe();
    authChangeUnsubscribe = null;
  }
}

/**
 * Get token status information (useful for debugging)
 */
export function getTokenStatus(): {
  isValid: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  expiresAt: Date | null;
  timeUntilExpiry: number | null;
} {
  const token = pb.authStore.token;
  const expiration = token ? getTokenExpiration(token) : null;
  const now = Date.now();

  return {
    isValid: pb.authStore.isValid,
    isExpired: isTokenExpired(),
    needsRefresh: tokenNeedsRefresh(),
    expiresAt: expiration ? new Date(expiration) : null,
    timeUntilExpiry: expiration ? expiration - now : null
  };
}

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
  percent_completed: number; // Progress percentage 0-100
  payment_status?: 'pending' | 'partial' | 'paid' | 'currently_paid_up'; // Deprecated - calculated from allocations
  paid_amount?: number; // Deprecated - calculated from allocations
  completion_photos?: string[];
  notes?: string;
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
  total_amount: number; // Sum of all items + rounded_off_with
  rounded_off_with?: number; // Round-off amount (can be positive or negative)
  payment_status?: 'pending' | 'partial' | 'paid'; // Deprecated - calculated from allocations
  paid_amount?: number; // Deprecated - calculated from allocations
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
  payment_allocations?: string[]; // Payment allocation IDs for expand functionality
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
  payment?: string; // Payment ID (optional, for debit transactions linked to payments)
  vendor_refund?: string; // VendorRefund ID (optional, for credit transactions linked to vendor refunds)
  transaction_category?: 'payment' | 'refund' | 'credit_adjustment' | 'manual'; // Category of transaction
  site: string; // Site ID
  created?: string;
  updated?: string;
  expand?: {
    account?: Account;
    vendor?: Vendor;
    payment?: Payment;
    vendor_refund?: VendorRefund;
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
  id: string;
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

  async calculateOutstandingAmount(vendorId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) return 0;

    // Get all deliveries for this vendor
    const deliveries = await deliveryService.getAll();
    const deliveriesTotal = deliveries
      .filter(delivery => delivery.vendor === vendorId)
      .reduce((sum, delivery) => sum + delivery.total_amount, 0);

    // Get all service bookings for this vendor
    const serviceBookings = await serviceBookingService.getAll();
    const serviceBookingsTotal = serviceBookings
      .filter(booking => booking.vendor === vendorId)
      .reduce((sum, booking) => sum + ServiceBookingService.calculateProgressBasedAmount(booking), 0);

    // Get all payments for this vendor
    const payments = await paymentService.getAll();
    const totalPaid = payments
      .filter(payment => payment.vendor === vendorId)
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Outstanding = Total Due - Total Paid
    const totalDue = deliveriesTotal + serviceBookingsTotal;
    const outstanding = totalDue - totalPaid;

    return outstanding > 0 ? outstanding : 0;
  }

  async calculateTotalPaid(vendorId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) return 0;

    const payments = await paymentService.getAll();
    return payments
      .filter(payment => payment.vendor === vendorId)
      .reduce((sum, payment) => sum + payment.amount, 0);
  }

  // Synchronous calculation methods for use with existing data
  static calculateOutstandingFromData(
    vendorId: string,
    deliveries: Delivery[],
    serviceBookings: ServiceBooking[],
    payments: Payment[]
  ): number {
    // Calculate total amount due from deliveries
    const deliveriesTotal = deliveries
      .filter(delivery => delivery.vendor === vendorId)
      .reduce((sum, delivery) => sum + delivery.total_amount, 0);

    // Calculate total amount due from service bookings based on progress percentage
    const serviceBookingsTotal = serviceBookings
      .filter(booking => booking.vendor === vendorId)
      .reduce((sum, booking) => sum + ServiceBookingService.calculateProgressBasedAmount(booking), 0);

    // Calculate total payments made to this vendor
    const totalPaid = payments
      .filter(payment => payment.vendor === vendorId)
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Outstanding = Total Due - Total Paid
    const totalDue = deliveriesTotal + serviceBookingsTotal;
    const outstanding = totalDue - totalPaid;

    return outstanding > 0 ? outstanding : 0;
  }

  static calculateTotalPaidFromData(vendorId: string, payments: Payment[]): number {
    return payments
      .filter(payment => payment.vendor === vendorId)
      .reduce((sum, payment) => sum + payment.amount, 0);
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

    // Check if service booking has any payment allocations
    const allocations = await paymentAllocationService.getByServiceBooking(id);
    if (allocations.length > 0) {
      throw new Error('Cannot delete service booking: It has payments assigned to it. Please remove all payments before deleting.');
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

  async calculatePaidAmount(bookingId: string): Promise<number> {
    const allocations = await paymentAllocationService.getByServiceBooking(bookingId);
    return allocations.reduce((total, allocation) => total + allocation.allocated_amount, 0);
  }

  async calculatePaymentStatus(bookingId: string, totalAmount: number, percentCompleted: number): Promise<'pending' | 'partial' | 'paid' | 'currently_paid_up'> {
    const paidAmount = await this.calculatePaidAmount(bookingId);
    
    // Calculate the amount due based on percent completion
    const amountDueBasedOnProgress = (totalAmount * percentCompleted) / 100;
    
    if (paidAmount === 0) return 'pending';
    if (paidAmount >= totalAmount) return 'paid';
    
    // If paid amount covers the progress-based due amount, it's "currently paid up"
    if (paidAmount >= amountDueBasedOnProgress && percentCompleted < 100) {
      return 'currently_paid_up';
    }
    
    return 'partial';
  }

  // Centralized calculation methods
  static calculateProgressBasedAmount(serviceBooking: ServiceBooking): number {
    return (serviceBooking.total_amount * (serviceBooking.percent_completed || 0)) / 100;
  }

  static async calculateOutstandingAmount(serviceBooking: ServiceBooking): Promise<number> {
    const progressAmount = this.calculateProgressBasedAmount(serviceBooking);
    const paidAmount = await serviceBookingService.calculatePaidAmount(serviceBooking.id!);
    const outstanding = progressAmount - paidAmount;
    return outstanding > 0 ? outstanding : 0;
  }

  static calculateOutstandingAmountFromData(serviceBooking: ServiceBooking, paidAmount: number): number {
    const progressAmount = this.calculateProgressBasedAmount(serviceBooking);
    const outstanding = progressAmount - paidAmount;
    return outstanding > 0 ? outstanding : 0;
  }

  static calculatePaymentStatusFromData(serviceBooking: ServiceBooking, paidAmount: number): 'pending' | 'partial' | 'paid' | 'currently_paid_up' {
    const progressAmount = this.calculateProgressBasedAmount(serviceBooking);
    
    if (paidAmount === 0) return 'pending';
    if (paidAmount >= serviceBooking.total_amount) return 'paid';
    
    // If paid amount covers the progress-based due amount, it's "currently paid up"
    if (paidAmount >= progressAmount && (serviceBooking.percent_completed || 0) < 100) {
      return 'currently_paid_up';
    }
    
    return 'partial';
  }

  mapRecordToServiceBooking(record: RecordModel): ServiceBooking {
    return {
      id: record.id,
      service: record.service,
      vendor: record.vendor,
      start_date: record.start_date,
      end_date: record.end_date,
      duration: record.duration,
      unit_rate: record.unit_rate,
      total_amount: record.total_amount,
      percent_completed: record.percent_completed || 0,
      payment_status: 'pending' as const, // Will be calculated when needed
      paid_amount: 0, // Will be calculated when needed
      completion_photos: record.completion_photos,
      notes: record.notes,
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

  async create(data: any): Promise<Payment> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create payments');
    }

    // Calculate credit note amount from detailed allocations and validate BEFORE creating payment
    let creditNoteAmount = 0;
    let adjustedCreditNoteAllocations = data.credit_note_allocations;
    
    if (data.credit_note_allocations) {
      // Check for balance changes BEFORE any creation starts
      const balanceCheckResult = await this.checkCreditNoteBalancesBeforePayment(data.credit_note_allocations);
      
      if (balanceCheckResult.hasChanges && !data.allowBalanceAdjustment) {
        // Throw error with balance change details for user confirmation
        const balanceChangeError = new Error('CREDIT_NOTE_BALANCE_CHANGED');
        (balanceChangeError as any).details = balanceCheckResult.details;
        throw balanceChangeError;
      } else if (balanceCheckResult.hasChanges && data.allowBalanceAdjustment) {
        // User has confirmed - use adjusted allocations
        adjustedCreditNoteAllocations = balanceCheckResult.adjustedAllocations;
      }
      
      creditNoteAmount = Object.values(adjustedCreditNoteAllocations).reduce((sum: number, allocation: any) => {
        return sum + (allocation.amount || 0);
      }, 0);
      
      // Validate adjusted credit note allocations
      await this.validateCreditNoteAllocations(adjustedCreditNoteAllocations);
      
      // Validate credit note priority rule
      await this.validateCreditNotePriority(adjustedCreditNoteAllocations, data.vendor);
    }

    // Calculate actual account payment amount
    const accountPaymentAmount = data.amount - creditNoteAmount;
    
    if (accountPaymentAmount < 0) {
      throw new Error('Credit note amount exceeds total payment amount. This should not happen with proper validation.');
    }
    
    // Validate account is provided when account payment is needed
    if (accountPaymentAmount > 0 && !data.account) {
      throw new Error('Account selection is required when credit notes do not cover the full payment amount.');
    }
    
    // Additional validation: ensure credit notes are fully utilized before using account
    if (accountPaymentAmount > 0 && data.credit_note_allocations) {
      await this.validateCreditNotesFullyUtilizedBeforeAccount(data.credit_note_allocations, data.vendor);
    }

    // Create the payment first
    const record = await pb.collection('payments').create({
      ...data,
      site: siteId
    });

    try {
      // Process credit notes with validated allocations (no race conditions now)
      if (adjustedCreditNoteAllocations && Object.keys(adjustedCreditNoteAllocations).length > 0) {
        await this.processCreditNoteAllocationsAfterValidation(
          record.id, 
          adjustedCreditNoteAllocations, 
          data.vendor
        );
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
          vendor: data.vendor,
          payment: record.id,
          transaction_category: 'payment'
        });
      }

      // Handle payment allocations with detailed allocation amounts
      await this.handleDetailedPaymentAllocations(
        record.id, 
        data.delivery_allocations || {}, 
        data.service_booking_allocations || {}
      );

      return this.mapRecordToPayment(record);
    } catch (error) {
      // If any step fails, clean up the payment record and any partial data
      console.error('Payment creation failed, cleaning up:', error);
      
      try {
        // Delete any credit note usage records that were created
        await creditNoteUsageService.deleteByPayment(record.id);
        
        // Delete any payment allocation records that were created
        await paymentAllocationService.deleteByPayment(record.id);
        
        // Delete any account transaction records that were created
        await accountTransactionService.deleteByPayment(record.id);
        
        // Delete the payment record
        await pb.collection('payments').delete(record.id);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      
      throw error; // Re-throw the original error
    }
  }

  private async checkCreditNoteBalancesBeforePayment(creditNoteAllocations: Record<string, any>): Promise<{
    hasChanges: boolean;
    adjustedAllocations: Record<string, any>;
    details?: any;
  }> {
    const adjustedAllocations: Record<string, any> = {};
    let hasChanges = false;
    let changeDetails = null;

    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) {
        adjustedAllocations[creditNoteId] = allocation;
        continue;
      }
      
      // Check current balance
      const freshCreditNote = await vendorCreditNoteService.getById(creditNoteId);
      if (!freshCreditNote) {
        throw new Error(`Credit note ${creditNoteId} not found`);
      }
      
      if (allocation.amount > freshCreditNote.balance) {
        // Balance has changed
        hasChanges = true;
        changeDetails = {
          creditNoteId,
          reference: freshCreditNote.reference || creditNoteId.slice(-6),
          requestedAmount: allocation.amount,
          availableAmount: freshCreditNote.balance,
          originalAllocations: creditNoteAllocations
        };
        
        // Adjust to available balance
        adjustedAllocations[creditNoteId] = {
          ...allocation,
          amount: freshCreditNote.balance
        };
      } else {
        // No change needed
        adjustedAllocations[creditNoteId] = allocation;
      }
    }

    return {
      hasChanges,
      adjustedAllocations,
      details: changeDetails
    };
  }

  private async processCreditNoteAllocationsAfterValidation(
    paymentId: string, 
    creditNoteAllocations: Record<string, any>, 
    vendorId: string
  ): Promise<void> {
    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) continue;
      
      // Create credit note usage record (no more validation needed)
      await creditNoteUsageService.create({
        credit_note: creditNoteId,
        payment: paymentId,
        vendor: vendorId,
        used_amount: allocation.amount,
        used_date: new Date().toISOString().split('T')[0],
        description: `Applied to payment ${paymentId} (${allocation.state} usage)`
      });
      
      // Check if credit note is now fully used and update status
      const updatedCreditNote = await vendorCreditNoteService.getById(creditNoteId);
      if (updatedCreditNote && updatedCreditNote.balance <= 0) {
        await vendorCreditNoteService.update(creditNoteId, { status: 'fully_used' });
      }
    }
  }

  private async validateCreditNotesFullyUtilizedBeforeAccount(creditNoteAllocations: Record<string, any>, vendorId: string): Promise<void> {
    // Get all available credit notes for this vendor
    const availableCreditNotes = await vendorCreditNoteService.getByVendor(vendorId);
    
    // Check if any credit note being used is not fully utilized
    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) continue;
      
      const creditNote = availableCreditNotes.find(cn => cn.id === creditNoteId);
      if (!creditNote) continue;
      
      if (allocation.amount < creditNote.balance) {
        throw new Error(
          `Credit note priority violation: Credit note ${creditNote.reference || creditNoteId.slice(-6)} ` +
          `must be fully utilized (₹${creditNote.balance.toFixed(2)}) before using account payment. ` +
          `Currently allocated: ₹${allocation.amount.toFixed(2)}`
        );
      }
    }
    
    // Check if there are any unused credit notes while account payment is being made
    const unusedCreditNotes = availableCreditNotes.filter(cn => {
      const allocation = creditNoteAllocations[cn.id];
      return !allocation || allocation.amount <= 0;
    });
    
    if (unusedCreditNotes.length > 0) {
      const unusedRefs = unusedCreditNotes.map(cn => cn.reference || cn.id?.slice(-6)).join(', ');
      throw new Error(
        `Credit note priority violation: All available credit notes must be used before account payment. ` +
        `Unused credit notes: ${unusedRefs}`
      );
    }
  }

  private async validateCreditNotePriority(creditNoteAllocations: Record<string, any>, vendorId: string): Promise<void> {
    // Get all available credit notes for this vendor
    const availableCreditNotes = await vendorCreditNoteService.getByVendor(vendorId);
    
    // Check if any credit note is being used partially while others remain unused
    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) continue;
      
      const creditNote = availableCreditNotes.find(cn => cn.id === creditNoteId);
      if (!creditNote) continue;
      
      // If this credit note is being used partially
      if (allocation.amount < creditNote.balance) {
        // Check if there are older unused credit notes
        const olderUnusedCreditNotes = availableCreditNotes.filter(cn => {
          const cnDate = new Date(cn.issue_date);
          const currentDate = new Date(creditNote.issue_date);
          const isOlder = cnDate < currentDate;
          const isUnused = !creditNoteAllocations[cn.id] || creditNoteAllocations[cn.id].amount <= 0;
          return isOlder && isUnused && cn.balance > 0;
        });
        
        if (olderUnusedCreditNotes.length > 0) {
          throw new Error(
            `Credit note priority violation: Cannot partially use credit note ${creditNote.reference || creditNoteId.slice(-6)} ` +
            `while older credit notes remain unused. Please use credit notes in chronological order (oldest first).`
          );
        }
      }
    }
  }

  private async validateCreditNoteAllocations(creditNoteAllocations: Record<string, any>): Promise<void> {
    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) continue;
      
      const creditNote = await vendorCreditNoteService.getById(creditNoteId);
      if (!creditNote) {
        throw new Error(`Credit note ${creditNoteId} not found`);
      }
      
      if (allocation.amount > creditNote.balance) {
        // Get usage details for better error context
        const usageRecords = await creditNoteUsageService.getByCreditNote(creditNoteId);
        const totalUsed = usageRecords.reduce((sum, usage) => sum + usage.used_amount, 0);
        
        throw new Error(
          `Credit note ${creditNote.reference || creditNoteId.slice(-6)} is not available for this amount.\n` +
          `Requested: ₹${allocation.amount.toFixed(2)}\n` +
          `Available: ₹${creditNote.balance.toFixed(2)}\n` +
          `Original amount: ₹${creditNote.credit_amount.toFixed(2)}\n` +
          `Already used: ₹${totalUsed.toFixed(2)}\n` +
          `The credit note may have been used in another payment. Please refresh and try again.`
        );
      }
    }
  }


  private async handleDetailedPaymentAllocations(
    paymentId: string,
    deliveryAllocations: Record<string, any>,
    serviceBookingAllocations: Record<string, any>
  ): Promise<string[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) return [];

    console.log('handleDetailedPaymentAllocations called with:', {
      paymentId,
      deliveryAllocations,
      serviceBookingAllocations
    });

    const createdAllocationIds: string[] = [];

    // Handle delivery allocations with exact amounts
    for (const [deliveryId, allocation] of Object.entries(deliveryAllocations)) {
      if (allocation.amount <= 0) continue;
      
      // Create payment allocation record with exact amount
      const allocationRecord = await paymentAllocationService.create({
        payment: paymentId,
        delivery: deliveryId,
        allocated_amount: allocation.amount,
        site: siteId
      });
      
      if (allocationRecord.id) {
        createdAllocationIds.push(allocationRecord.id);
      }
    }
    
    // Handle service booking allocations with exact amounts
    for (const [bookingId, allocation] of Object.entries(serviceBookingAllocations)) {
      if (allocation.amount <= 0) continue;
      
      // Create payment allocation record with exact amount
      const allocationRecord = await paymentAllocationService.create({
        payment: paymentId,
        service_booking: bookingId,
        allocated_amount: allocation.amount,
        site: siteId
      });
      
      if (allocationRecord.id) {
        createdAllocationIds.push(allocationRecord.id);
      }
    }

    // Update payment record with allocation IDs so expand works properly
    if (createdAllocationIds.length > 0) {
      await pb.collection('payments').update(paymentId, {
        payment_allocations: createdAllocationIds
      });
    }

    return createdAllocationIds;
  }

  private async handlePaymentAllocations(paymentId: string, deliveryIds: string[], serviceBookingIds: string[], totalAmount: number) {
    const siteId = getCurrentSiteId();
    if (!siteId) return;

    let remainingAmount = totalAmount;
    const createdAllocationIds: string[] = [];
    
    // Handle delivery allocations
    for (const deliveryId of deliveryIds) {
      if (remainingAmount <= 0) break;
      
      const delivery = await pb.collection('deliveries').getOne(deliveryId);
      const currentPaidAmount = await deliveryService.calculatePaidAmount(deliveryId);
      const outstandingAmount = delivery.total_amount - currentPaidAmount;
      const allocatedAmount = Math.min(remainingAmount, outstandingAmount);
      
      // Create payment allocation record
      const allocationRecord = await paymentAllocationService.create({
        payment: paymentId,
        delivery: deliveryId,
        allocated_amount: allocatedAmount,
        site: siteId
      });
      
      createdAllocationIds.push(allocationRecord.id!);
      remainingAmount -= allocatedAmount;
    }
    
    // Handle service booking allocations
    for (const bookingId of serviceBookingIds) {
      if (remainingAmount <= 0) break;
      
      const bookingRecord = await pb.collection('service_bookings').getOne(bookingId);
      const booking = serviceBookingService.mapRecordToServiceBooking(bookingRecord);
      const currentPaidAmount = await serviceBookingService.calculatePaidAmount(bookingId);
      const progressAmount = ServiceBookingService.calculateProgressBasedAmount(booking);
      const outstandingAmount = progressAmount - currentPaidAmount;
      const allocatedAmount = Math.min(remainingAmount, outstandingAmount);
      
      // Create payment allocation record
      const allocationRecord = await paymentAllocationService.create({
        payment: paymentId,
        service_booking: bookingId,
        allocated_amount: allocatedAmount,
        site: siteId
      });
      
      createdAllocationIds.push(allocationRecord.id!);
      remainingAmount -= allocatedAmount;
    }
    
    // Update payment record with allocation IDs so expand works properly
    if (createdAllocationIds.length > 0) {
      await pb.collection('payments').update(paymentId, {
        payment_allocations: createdAllocationIds
      });
    }
  }


  private async getVendorName(vendorId: string): Promise<string> {
    try {
      const vendor = await pb.collection('vendors').getOne(vendorId);
      return vendor.contact_person || 'Unknown Vendor';
    } catch (error) {
      return 'Unknown Vendor';
    }
  }

  async updateAllocations(paymentId: string, deliveryIds: string[], serviceBookingIds: string[]): Promise<void> {
    // Get the payment to determine total amount
    const payment = await this.getById(paymentId);
    if (!payment) throw new Error('Payment not found');

    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get existing allocations - we'll preserve these and only add new ones
    const existingAllocations = await paymentAllocationService.getByPayment(paymentId);

    // Create sets of already allocated item IDs
    const existingDeliveryIds = new Set(
      existingAllocations.filter(a => a.delivery).map(a => a.delivery!)
    );
    const existingServiceBookingIds = new Set(
      existingAllocations.filter(a => a.service_booking).map(a => a.service_booking!)
    );

    // Calculate already allocated amount from existing allocations
    const existingAllocatedAmount = existingAllocations.reduce((sum, a) => sum + a.allocated_amount, 0);

    // Filter to only new items (not already allocated)
    const newDeliveryIds = deliveryIds.filter(id => !existingDeliveryIds.has(id));
    const newServiceBookingIds = serviceBookingIds.filter(id => !existingServiceBookingIds.has(id));

    // If no new items to allocate, return early
    if (newDeliveryIds.length === 0 && newServiceBookingIds.length === 0) {
      return;
    }

    // Calculate remaining amount available for new allocations
    let remainingAmount = payment.amount - existingAllocatedAmount;

    if (remainingAmount <= 0) {
      console.warn('Payment is already fully allocated, cannot add new allocations');
      return;
    }

    // Prepare batch requests for new allocations only
    const batchRequests: any[] = [];
    const allocationData: Array<{delivery?: string, service_booking?: string, allocated_amount: number}> = [];

    // Handle new delivery allocations
    for (const deliveryId of newDeliveryIds) {
      if (remainingAmount <= 0) break;

      const delivery = await pb.collection('deliveries').getOne(deliveryId);
      const currentPaidAmount = await deliveryService.calculatePaidAmount(deliveryId);
      const outstandingAmount = delivery.total_amount - currentPaidAmount;
      const allocatedAmount = Math.min(remainingAmount, outstandingAmount);

      if (allocatedAmount > 0) {
        allocationData.push({
          delivery: deliveryId,
          allocated_amount: allocatedAmount
        });
        remainingAmount -= allocatedAmount;
      }
    }

    // Handle new service booking allocations
    for (const bookingId of newServiceBookingIds) {
      if (remainingAmount <= 0) break;

      const bookingRecord = await pb.collection('service_bookings').getOne(bookingId);
      const booking = serviceBookingService.mapRecordToServiceBooking(bookingRecord);
      const currentPaidAmount = await serviceBookingService.calculatePaidAmount(bookingId);
      const progressAmount = ServiceBookingService.calculateProgressBasedAmount(booking);
      const outstandingAmount = progressAmount - currentPaidAmount;
      const allocatedAmount = Math.min(remainingAmount, outstandingAmount);

      if (allocatedAmount > 0) {
        allocationData.push({
          service_booking: bookingId,
          allocated_amount: allocatedAmount
        });
        remainingAmount -= allocatedAmount;
      }
    }

    // Create new allocation records and collect their IDs
    const newAllocationIds: string[] = [];
    for (const data of allocationData) {
      const allocationRecord = await paymentAllocationService.create({
        payment: paymentId,
        delivery: data.delivery,
        service_booking: data.service_booking,
        allocated_amount: data.allocated_amount,
        site: siteId
      });
      if (allocationRecord.id) {
        newAllocationIds.push(allocationRecord.id);
      }
    }

    // Update the payment record with all allocation IDs (existing + new)
    if (newAllocationIds.length > 0) {
      const existingAllocationIds = existingAllocations.map(a => a.id!).filter(id => id);
      const allAllocationIds = [...existingAllocationIds, ...newAllocationIds];

      await pb.collection('payments').update(paymentId, {
        payment_allocations: allAllocationIds
      });
    }
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete payments');
    }

    // Get payment allocations - payment can only be deleted if no allocations exist
    const allocations = await paymentAllocationService.getByPayment(id);
    if (allocations.length > 0) {
      throw new Error('Cannot delete payment with existing allocations. Please remove all allocations first.');
    }
    
    // Get the payment to find related account transaction
    const payment = await this.getById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // Get credit note usage records to restore balances before deletion
    try {
      const creditNoteUsages = await creditNoteUsageService.getByPayment(id);
      
      // Restore credit note balances
      for (const usage of creditNoteUsages) {
        if (usage.credit_note) {
          await vendorCreditNoteService.updateBalance(usage.credit_note, usage.used_amount);
        }
      }
      
      // Delete credit note usage records
      await creditNoteUsageService.deleteByPayment(id);
    } catch (error) {
      console.error('Error deleting credit note usage records:', error);
      // Continue with payment deletion even if credit note usage deletion fails
    }
    
    // Find and delete the related account transaction
    try {
      const accountTransactions = await accountTransactionService.getByAccount(payment.account);
      const relatedTransaction = accountTransactions.find(
        transaction => transaction.payment === id && transaction.type === 'debit'
      );
      
      if (relatedTransaction && relatedTransaction.id) {
        await pb.collection('account_transactions').delete(relatedTransaction.id);
      }
    } catch (error) {
      console.error('Error deleting related account transaction:', error);
      // Continue with payment deletion even if account transaction deletion fails
    }
    
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
        deliveries: record.expand.deliveries && Array.isArray(record.expand.deliveries) ?
          record.expand.deliveries.map((delivery: RecordModel) => deliveryService.mapRecordToDelivery(delivery)) : undefined,
        service_bookings: record.expand.service_bookings && Array.isArray(record.expand.service_bookings) ?
          record.expand.service_bookings.map((booking: RecordModel) => serviceBookingService.mapRecordToServiceBooking(booking)) : undefined,
        payment_allocations: record.expand.payment_allocations && Array.isArray(record.expand.payment_allocations) ?
          record.expand.payment_allocations.map((allocation: RecordModel) => paymentAllocationService.mapRecordToPaymentAllocation(allocation)) : undefined,
        credit_notes: record.expand.credit_notes && Array.isArray(record.expand.credit_notes) ?
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



}

export class PaymentAllocationService {
  async getAll(): Promise<PaymentAllocation[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('payment_allocations')
      .getFullList({
        filter: `site="${siteId}"`,
        expand: 'delivery,service_booking,service_booking.service'
      });
    return records.map(record => this.mapRecordToPaymentAllocation(record));
  }

  async getById(id: string): Promise<PaymentAllocation | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('payment_allocations').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'delivery,service_booking,service_booking.service'
      });
      return this.mapRecordToPaymentAllocation(record);
    } catch (error) {
      return null;
    }
  }

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
      expand: 'account,vendor,payment,vendor_refund',
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
        expand: 'account,vendor,payment,vendor_refund,credit_note'
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
      expand: 'account,vendor,payment,vendor_refund',
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

  async deleteByPayment(paymentId: string): Promise<void> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const transactions = await pb.collection('account_transactions').getFullList({
      filter: `site="${siteId}" && payment="${paymentId}"`
    });

    const accountsToUpdate = new Set<string>();
    
    for (const transaction of transactions) {
      await pb.collection('account_transactions').delete(transaction.id);
      if (transaction.account) {
        accountsToUpdate.add(transaction.account);
      }
    }

    // Update account balances for all affected accounts
    for (const accountId of accountsToUpdate) {
      await this.updateAccountBalance(accountId);
    }
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
      payment: record.payment,
      vendor_refund: record.vendor_refund,
      transaction_category: record.transaction_category,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        account: record.expand.account ? this.mapRecordToAccount(record.expand.account) : undefined,
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        payment: record.expand.payment ? paymentService.mapRecordToPayment(record.expand.payment) : undefined,
        vendor_refund: record.expand.vendor_refund ? vendorRefundService.mapRecordToVendorRefund(record.expand.vendor_refund) : undefined
      } : undefined
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
    // First, fetch the current return to get existing photos
    const currentRecord = await pb.collection('vendor_returns').getOne(returnId);
    const existingPhotos = currentRecord.photos || [];

    const formData = new FormData();

    // Include existing photo filenames to preserve them
    existingPhotos.forEach((photoFilename: string) => {
      formData.append('photos', photoFilename);
    });

    // Append new file
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

  async getReturnInfoForDeliveryItems(deliveryItemIds: string[]): Promise<Record<string, {
    totalReturned: number;
    availableForReturn: number;
    returns: Array<{
      id: string;
      returnDate: string;
      quantityReturned: number;
      status: string;
      reason: string;
    }>;
  }>> {
    if (deliveryItemIds.length === 0) return {};

    try {
      // Build filter for all delivery item IDs
      const deliveryItemFilters = deliveryItemIds.map(id => `delivery_item="${id}"`).join(' || ');
      
      // Get all delivery items in one request
      const deliveryItems = await pb.collection('delivery_items').getFullList({
        filter: deliveryItemIds.map(id => `id="${id}"`).join(' || ')
      });

      // Create a map of delivery item quantities
      const itemQuantities: Record<string, number> = {};
      deliveryItems.forEach(item => {
        itemQuantities[item.id] = item.quantity;
      });

      // Get all return items for these delivery items in one request
      const returnItems = await pb.collection('vendor_return_items').getFullList({
        filter: deliveryItemFilters,
        expand: 'vendor_return',
        sort: '-created'
      });

      // Group return items by delivery item ID
      const returnsByDeliveryItem: Record<string, any[]> = {};
      deliveryItemIds.forEach(id => {
        returnsByDeliveryItem[id] = [];
      });

      returnItems.forEach(item => {
        if (returnsByDeliveryItem[item.delivery_item]) {
          returnsByDeliveryItem[item.delivery_item].push(item);
        }
      });

      // Calculate return info for each delivery item
      const result: Record<string, any> = {};
      
      for (const deliveryItemId of deliveryItemIds) {
        const originalQuantity = itemQuantities[deliveryItemId] || 0;
        const itemReturns = returnsByDeliveryItem[deliveryItemId] || [];
        
        let totalReturned = 0;
        const returns = [];

        for (const item of itemReturns) {
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

        result[deliveryItemId] = {
          totalReturned,
          availableForReturn: Math.max(0, originalQuantity - totalReturned),
          returns
        };
      }

      return result;
    } catch (error) {
      console.error('Error getting batch return info for delivery items:', error);
      // Return empty info for all items on error
      const result: Record<string, any> = {};
      deliveryItemIds.forEach(id => {
        result[id] = {
          totalReturned: 0,
          availableForReturn: 0,
          returns: []
        };
      });
      return result;
    }
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
      description: `Refund from ${vendorName}`,
      reference: data.reference,
      notes: data.notes,
      vendor: data.vendor,
      vendor_refund: record.id,
      transaction_category: 'refund'
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
      return vendor.contact_person || 'Unknown Vendor';
    } catch (error) {
      return 'Unknown Vendor';
    }
  }

  mapRecordToVendorRefund(record: RecordModel): VendorRefund {
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
      filter: `site="${siteId}" && vendor="${vendorId}" && status="active"`,
      expand: 'vendor,return',
      sort: '-created'
    });
    
    // Calculate actual balance for each credit note based on usage
    const creditNotes = [];
    for (const record of records) {
      const creditNote = this.mapRecordToCreditNote(record);
      const actualBalance = await this.calculateActualBalance(creditNote.id);
      if (actualBalance > 0) {
        creditNote.balance = actualBalance;
        creditNotes.push(creditNote);
      }
    }
    
    return creditNotes;
  }

  async getByReturn(returnId: string): Promise<VendorCreditNote[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_credit_notes').getFullList({
      filter: `site="${siteId}" && return_id="${returnId}"`,
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
      const creditNote = this.mapRecordToCreditNote(record);
      
      // Calculate actual balance based on usage records
      creditNote.balance = await this.calculateActualBalanceFromRecord(creditNote);
      
      return creditNote;
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

  async delete(id: string): Promise<boolean> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete credit notes');
    }

    try {
      await pb.collection('vendor_credit_notes').delete(id);
      return true;
    } catch (error) {
      console.error('Error deleting credit note:', error);
      return false;
    }
  }

  async calculateActualBalance(creditNoteId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get the credit note details directly without triggering circular call
    const record = await pb.collection('vendor_credit_notes').getOne(creditNoteId, {
      filter: `site="${siteId}"`
    });
    
    if (!record) return 0;

    // Get all usage records for this credit note directly from PocketBase
    const usageRecords = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && credit_note="${creditNoteId}"`,
      sort: '-created'
    });
    
    const totalUsed = usageRecords.reduce((sum, record) => sum + record.used_amount, 0);
    
    const balance = record.credit_amount - totalUsed;
    if (balance < 0) {
      console.warn(`Credit note ${creditNoteId} has negative balance: ${balance}. This indicates over-usage.`);
      return 0;
    }
    return balance;
  }

  async calculateActualBalanceFromRecord(creditNote: VendorCreditNote): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get all usage records for this credit note directly from PocketBase
    const usageRecords = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && credit_note="${creditNote.id}"`,
      sort: '-created'
    });
    
    const totalUsed = usageRecords.reduce((sum, record) => sum + record.used_amount, 0);
    
    const balance = creditNote.credit_amount - totalUsed;
    if (balance < 0) {
      console.warn(`Credit note ${creditNote.id} has negative balance: ${balance}. This indicates over-usage.`);
      return 0;
    }
    return balance;
  }

  async updateBalance(id: string, usedAmount: number): Promise<VendorCreditNote> {
    // Since we now calculate balance dynamically from usage records,
    // we just need to update the status based on the new calculated balance
    const creditNote = await this.getById(id);
    if (!creditNote) throw new Error('Credit note not found');

    // Calculate what the new balance would be after this usage
    const newBalance = creditNote.balance - usedAmount;
    
    // Update status if balance becomes zero or negative
    const status = newBalance <= 0 ? 'fully_used' : creditNote.status;
    return this.update(id, { status });
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

  async delete(id: string): Promise<boolean> {
    await pb.collection('credit_note_usage').delete(id);
    return true;
  }

  async deleteByPayment(paymentId: string): Promise<void> {
    const usageRecords = await this.getByPayment(paymentId);
    for (const usage of usageRecords) {
      if (usage.id) {
        await pb.collection('credit_note_usage').delete(usage.id);
      }
    }
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

  async reconnectDeliveryItems(deliveryId: string): Promise<Delivery> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update deliveries');
    }

    // Find all delivery_items that point to this delivery
    const deliveryItems = await pb.collection('delivery_items').getFullList({
      filter: `delivery="${deliveryId}" && site="${siteId}"`
    });

    if (deliveryItems.length === 0) {
      throw new Error('No delivery items found to reconnect');
    }

    // Get the item IDs
    const itemIds = deliveryItems.map(item => item.id);

    // Update the delivery's delivery_items array field
    const updatedDelivery = await pb.collection('deliveries').update(deliveryId, {
      delivery_items: itemIds
    }, {
      expand: 'vendor,delivery_items,delivery_items.item'
    });

    return this.mapRecordToDelivery(updatedDelivery);
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
    // First, fetch the current delivery to get existing photos
    const currentRecord = await pb.collection('deliveries').getOne(deliveryId);
    const existingPhotos = currentRecord.photos || [];

    const formData = new FormData();

    // Include existing photo filenames to preserve them
    existingPhotos.forEach((photoFilename: string) => {
      formData.append('photos', photoFilename);
    });

    // Append new file
    formData.append('photos', file);

    const record = await pb.collection('deliveries').update(deliveryId, formData);
    return record.photos[record.photos.length - 1];
  }

  async uploadPhotos(deliveryId: string, files: File[]): Promise<string[]> {
    if (files.length === 0) return [];

    // First, fetch the current delivery to get existing photos
    const currentRecord = await pb.collection('deliveries').getOne(deliveryId);
    const existingPhotos = currentRecord.photos || [];

    const formData = new FormData();

    // Include existing photo filenames to preserve them
    existingPhotos.forEach((photoFilename: string) => {
      formData.append('photos', photoFilename);
    });

    // Append new files
    files.forEach(file => {
      formData.append('photos', file);
    });

    const record = await pb.collection('deliveries').update(deliveryId, formData);
    // Return the newly added photos (last N photos where N = files.length)
    return record.photos.slice(-files.length);
  }

  async calculatePaidAmount(deliveryId: string): Promise<number> {
    const allocations = await paymentAllocationService.getByDelivery(deliveryId);
    return allocations.reduce((total, allocation) => total + allocation.allocated_amount, 0);
  }

  async calculatePaymentStatus(deliveryId: string, totalAmount: number): Promise<'pending' | 'partial' | 'paid'> {
    const paidAmount = await this.calculatePaidAmount(deliveryId);
    if (paidAmount === 0) return 'pending';
    if (paidAmount >= totalAmount) return 'paid';
    return 'partial';
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
      payment_status: 'pending' as const, // Will be calculated when needed
      paid_amount: 0, // Will be calculated when needed
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

  async getAll(vendorFilter?: string): Promise<DeliveryItem[]> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    let filter = `site="${currentSite}"`;
    if (vendorFilter) {
      filter += ` && delivery.vendor="${vendorFilter}"`;
    }

    const records = await pb.collection('delivery_items').getFullList({
      filter,
      expand: 'delivery,delivery.vendor,item',
      sort: '-created'
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

    // Prepare batch data
    const batchData = items.map(itemData => ({
      delivery: deliveryId,
      item: itemData.item,
      quantity: itemData.quantity,
      unit_price: itemData.unit_price,
      total_amount: itemData.quantity * itemData.unit_price,
      notes: itemData.notes,
      site: currentSite
    }));

    // Use batch API to create all items at once
    const createdRecords = await batchCreate<any>('delivery_items', batchData);
    const createdItems = createdRecords.map(record => this.mapRecordToDeliveryItem(record as RecordModel));
    const createdItemIds = createdItems.map(item => item.id!);
    
    // Update the parent delivery with the new item IDs
    try {
      const existingItemIds = delivery.delivery_items || [];
      await pb.collection('deliveries').update(deliveryId, {
        delivery_items: [...existingItemIds, ...createdItemIds]
      });
    } catch (err) {
      console.error('Failed to update delivery with item IDs:', err);
      // Throw the error so the caller knows the operation failed
      throw new Error(`Failed to associate delivery items with delivery: ${err}`);
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
      paid_amount: record.paid_amount || 0,
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

  async updateMultiple(updates: Array<{ id: string; data: Partial<DeliveryItem> }>): Promise<DeliveryItem[]> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // Validate that all items belong to the current site before updating
    for (const update of updates) {
      const record = await pb.collection('delivery_items').getOne(update.id);
      if (record.site !== currentSite) {
        throw new Error(`Access denied: Cannot update delivery item ${update.id} from different site`);
      }
    }

    // Prepare batch update data
    const batchUpdates = updates.map(update => ({
      id: update.id,
      data: {
        ...update.data,
        total_amount: update.data.quantity && update.data.unit_price 
          ? update.data.quantity * update.data.unit_price 
          : undefined
      }
    }));

    // Use batch API to update all items at once
    const updatedRecords = await batchUpdate<any>('delivery_items', batchUpdates);
    return updatedRecords.map(record => this.mapRecordToDeliveryItem(record as RecordModel));
  }

  async deleteMultiple(ids: string[]): Promise<boolean> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // Validate that all items belong to the current site before deleting
    for (const id of ids) {
      const record = await pb.collection('delivery_items').getOne(id);
      if (record.site !== currentSite) {
        throw new Error(`Access denied: Cannot delete delivery item ${id} from different site`);
      }
    }

    // Use batch API to delete all items at once
    await batchDelete('delivery_items', ids);
    return true;
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