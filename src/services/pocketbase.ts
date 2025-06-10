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
  created: string;
  updated: string;
}

export interface Item {
  id?: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  category?: string;
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
  amount: number;
  payment_date: string;
  reference?: string;
  notes?: string;
  incoming_items: string[];
  created?: string;
  updated?: string;
  expand?: {
    vendor?: Vendor;
    incoming_items?: IncomingItem[];
  };
}

export class AuthService {
  async login(email: string, password: string) {
    return await pb.collection('users').authWithPassword(email, password);
  }

  async register(email: string, password: string, name: string) {
    const data = {
      email,
      password,
      passwordConfirm: password,
      name,
    };
    return await pb.collection('users').create(data);
  }

  logout() {
    pb.authStore.clear();
  }

  get isAuthenticated() {
    return pb.authStore.isValid;
  }

  get currentUser(): User | null {
    const model = pb.authStore.model;
    if (!model) return null;
    
    return {
      id: model.id,
      email: model.email || '',
      name: model.name || '',
      avatar: model.avatar,
      created: model.created || '',
      updated: model.updated || ''
    };
  }
}

export class ItemService {
  async getAll(): Promise<Item[]> {
    const records = await pb.collection('items').getFullList();
    return records.map(record => this.mapRecordToItem(record));
  }

  async create(data: Omit<Item, 'id'>): Promise<Item> {
    const record = await pb.collection('items').create(data);
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
      created: record.created,
      updated: record.updated
    };
  }
}

export class VendorService {
  async getAll(): Promise<Vendor[]> {
    const records = await pb.collection('vendors').getFullList();
    return records.map(record => this.mapRecordToVendor(record));
  }

  async create(data: Omit<Vendor, 'id'>): Promise<Vendor> {
    const record = await pb.collection('vendors').create(data);
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
      created: record.created,
      updated: record.updated
    };
  }
}

export class QuotationService {
  async getAll(): Promise<Quotation[]> {
    const records = await pb.collection('quotations').getFullList({
      expand: 'vendor,item'
    });
    return records.map(record => this.mapRecordToQuotation(record));
  }

  async create(data: Omit<Quotation, 'id'>): Promise<Quotation> {
    const record = await pb.collection('quotations').create(data);
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
      created: record.created,
      updated: record.updated
    };
  }
}

export class IncomingItemService {
  async getAll(): Promise<IncomingItem[]> {
    const records = await pb.collection('incoming_items').getFullList({
      expand: 'vendor,item'
    });
    return records.map(record => this.mapRecordToIncomingItem(record));
  }

  async create(data: Omit<IncomingItem, 'id'>): Promise<IncomingItem> {
    const record = await pb.collection('incoming_items').create(data);
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
      created: record.created,
      updated: record.updated
    };
  }
}

export class PaymentService {
  async getAll(): Promise<Payment[]> {
    const records = await pb.collection('payments').getFullList({
      expand: 'vendor,incoming_items'
    });
    return records.map(record => this.mapRecordToPayment(record));
  }

  async create(data: Omit<Payment, 'id'>): Promise<Payment> {
    // Create the payment
    const record = await pb.collection('payments').create(data);
    
    // Update payment status of related incoming items
    await this.updateIncomingItemsPaymentStatus(data.vendor, data.amount);
    
    return this.mapRecordToPayment(record);
  }

  private async updateIncomingItemsPaymentStatus(vendorId: string, paymentAmount: number) {
    const incomingItems = await pb.collection('incoming_items')
      .getFullList({
        filter: `vendor="${vendorId}" && payment_status!="paid"`,
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
      amount: record.amount,
      payment_date: record.payment_date,
      reference: record.reference,
      notes: record.notes,
      incoming_items: record.incoming_items || [],
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
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
      created: record.created,
      updated: record.updated
    };
  }
}

export const authService = new AuthService();
export const itemService = new ItemService();
export const vendorService = new VendorService();
export const quotationService = new QuotationService();
export const incomingItemService = new IncomingItemService();
export const paymentService = new PaymentService();