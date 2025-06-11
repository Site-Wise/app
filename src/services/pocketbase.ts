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
  avatar?: string;
  sites: string[]; // Array of site IDs the user has access to
  created: string;
  updated: string;
}

export interface Site {
  id?: string;
  name: string;
  description?: string;
  total_units: number;
  total_planned_area: number; // in sqft
  admin_user: string; // User ID of the admin
  users: string[]; // Array of user IDs with access to this site
  created?: string;
  updated?: string;
  expand?: {
    admin_user?: User;
    users?: User[];
  };
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
  quantity: number;
  category?: string;
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
  tags: string[];
  site: string; // Site ID
  created?: string;
  updated?: string;
}

export interface Quotation {
  id?: string;
  vendor: string;
  item: string;
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

export interface Payment {
  id?: string;
  vendor: string;
  account: string; // Account ID for payment mode
  amount: number;
  payment_date: string;
  reference?: string;
  notes?: string;
  incoming_items: string[];
  site: string; // Site ID
  created?: string;
  updated?: string;
  running_balance?: number; // Calculated field for account statements
  expand?: {
    vendor?: Vendor;
    account?: Account;
    incoming_items?: IncomingItem[];
  };
}

// Site context management
let currentSiteId: string | null = null;

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

export class AuthService {
  async login(email: string, password: string) {
    const authData = await pb.collection('users').authWithPassword(email, password);
    return authData;
  }

  async register(email: string, password: string, name: string) {
    const data = {
      email,
      password,
      passwordConfirm: password,
      name,
      sites: [], // Initialize with empty sites array
    };
    return await pb.collection('users').create(data);
  }

  logout() {
    pb.authStore.clear();
    setCurrentSiteId(null); // Clear current site on logout
  }

  get isAuthenticated() {
    return pb.authStore.isValid;
  }

  get currentUser(): User | null {
    const model = pb.authStore.model;
    if (!model || !this.isAuthenticated) return null;
    
    return {
      id: model.id,
      email: model.email || '',
      name: model.name || '',
      avatar: model.avatar,
      sites: model.sites || [],
      created: model.created || '',
      updated: model.updated || ''
    };
  }
}

export class SiteService {
  async getAll(): Promise<Site[]> {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get sites where user is admin or has access
    const records = await pb.collection('sites').getFullList({
      filter: `admin_user="${user.id}" || users~"${user.id}"`,
      expand: 'admin_user,users'
    });
    return records.map(record => this.mapRecordToSite(record));
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
    
    // Update user's sites array
    await this.addUserToSite(user.id, record.id);
    
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

  async addUserToSite(userId: string, siteId: string): Promise<void> {
    // Get current user record
    const userRecord = await pb.collection('users').getOne(userId);
    const currentSites = userRecord.sites || [];
    
    if (!currentSites.includes(siteId)) {
      await pb.collection('users').update(userId, {
        sites: [...currentSites, siteId]
      });
    }

    // Get current site record
    const siteRecord = await pb.collection('sites').getOne(siteId);
    const currentUsers = siteRecord.users || [];
    
    if (!currentUsers.includes(userId)) {
      await pb.collection('sites').update(siteId, {
        users: [...currentUsers, userId]
      });
    }
  }

  async removeUserFromSite(userId: string, siteId: string): Promise<void> {
    // Get current user record
    const userRecord = await pb.collection('users').getOne(userId);
    const currentSites = userRecord.sites || [];
    
    await pb.collection('users').update(userId, {
      sites: currentSites.filter((id: string) => id !== siteId)
    });

    // Get current site record
    const siteRecord = await pb.collection('sites').getOne(siteId);
    const currentUsers = siteRecord.users || [];
    
    await pb.collection('sites').update(siteId, {
      users: currentUsers.filter((id: string) => id !== userId)
    });
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

    const record = await pb.collection('accounts').create({
      ...data,
      current_balance: data.opening_balance, // Initialize current balance with opening balance
      site: siteId
    });
    return this.mapRecordToAccount(record);
  }

  async update(id: string, data: Partial<Account>): Promise<Account> {
    const record = await pb.collection('accounts').update(id, data);
    return this.mapRecordToAccount(record);
  }

  async delete(id: string): Promise<boolean> {
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

    const record = await pb.collection('items').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToItem(record);
  }

  async update(id: string, data: Partial<Item>): Promise<Item> {
    const record = await pb.collection('items').update(id, data);
    return this.mapRecordToItem(record);
  }

  async delete(id: string): Promise<boolean> {
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

    const record = await pb.collection('vendors').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToVendor(record);
  }

  async update(id: string, data: Partial<Vendor>): Promise<Vendor> {
    const record = await pb.collection('vendors').update(id, data);
    return this.mapRecordToVendor(record);
  }

  async delete(id: string): Promise<boolean> {
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
      expand: 'vendor,item'
    });
    return records.map(record => this.mapRecordToQuotation(record));
  }

  async create(data: Omit<Quotation, 'id' | 'site'>): Promise<Quotation> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const record = await pb.collection('quotations').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToQuotation(record);
  }

  async update(id: string, data: Partial<Quotation>): Promise<Quotation> {
    const record = await pb.collection('quotations').update(id, data);
    return this.mapRecordToQuotation(record);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('quotations').delete(id);
    return true;
  }

  private mapRecordToQuotation(record: RecordModel): Quotation {
    return {
      id: record.id,
      vendor: record.vendor,
      item: record.item,
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

    const record = await pb.collection('incoming_items').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToIncomingItem(record);
  }

  async update(id: string, data: Partial<IncomingItem>): Promise<IncomingItem> {
    const record = await pb.collection('incoming_items').update(id, data);
    return this.mapRecordToIncomingItem(record);
  }

  async delete(id: string): Promise<boolean> {
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

export class PaymentService {
  async getAll(): Promise<Payment[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('payments').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,account,incoming_items'
    });
    return records.map(record => this.mapRecordToPayment(record));
  }

  async create(data: Omit<Payment, 'id' | 'site'>): Promise<Payment> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Create the payment
    const record = await pb.collection('payments').create({
      ...data,
      site: siteId
    });
    
    // Update account balance (subtract payment amount)
    await accountService.updateBalance(data.account, data.amount, 'subtract');
    
    // Update payment status of related incoming items
    await this.updateIncomingItemsPaymentStatus(data.vendor, data.amount);
    
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
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        account: record.expand.account ? this.mapRecordToAccount(record.expand.account) : undefined,
        incoming_items: record.expand.incoming_items ? 
          record.expand.incoming_items.map((item: RecordModel) => this.mapRecordToIncomingItem(item)) : undefined
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

export const authService = new AuthService();
export const siteService = new SiteService();
export const accountService = new AccountService();
export const itemService = new ItemService();
export const vendorService = new VendorService();
export const quotationService = new QuotationService();
export const incomingItemService = new IncomingItemService();
export const paymentService = new PaymentService();