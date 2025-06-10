import PocketBase from 'pocketbase';

// Get PocketBase URL from environment variables with fallback
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

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

  get currentUser() {
    return pb.authStore.model as User | null;
  }
}

export class ItemService {
  async getAll(): Promise<Item[]> {
    return await pb.collection('items').getFullList();
  }

  async create(data: Omit<Item, 'id'>): Promise<Item> {
    return await pb.collection('items').create(data);
  }

  async update(id: string, data: Partial<Item>): Promise<Item> {
    return await pb.collection('items').update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('items').delete(id);
    return true;
  }
}

export class VendorService {
  async getAll(): Promise<Vendor[]> {
    return await pb.collection('vendors').getFullList();
  }

  async create(data: Omit<Vendor, 'id'>): Promise<Vendor> {
    return await pb.collection('vendors').create(data);
  }

  async update(id: string, data: Partial<Vendor>): Promise<Vendor> {
    return await pb.collection('vendors').update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('vendors').delete(id);
    return true;
  }
}

export class QuotationService {
  async getAll(): Promise<Quotation[]> {
    return await pb.collection('quotations').getFullList({
      expand: 'vendor,item'
    });
  }

  async create(data: Omit<Quotation, 'id'>): Promise<Quotation> {
    return await pb.collection('quotations').create(data);
  }

  async update(id: string, data: Partial<Quotation>): Promise<Quotation> {
    return await pb.collection('quotations').update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('quotations').delete(id);
    return true;
  }
}

export class IncomingItemService {
  async getAll(): Promise<IncomingItem[]> {
    return await pb.collection('incoming_items').getFullList({
      expand: 'vendor,item'
    });
  }

  async create(data: Omit<IncomingItem, 'id'>): Promise<IncomingItem> {
    return await pb.collection('incoming_items').create(data);
  }

  async update(id: string, data: Partial<IncomingItem>): Promise<IncomingItem> {
    return await pb.collection('incoming_items').update(id, data);
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
}

export class PaymentService {
  async getAll(): Promise<Payment[]> {
    return await pb.collection('payments').getFullList({
      expand: 'vendor,incoming_items'
    });
  }

  async create(data: Omit<Payment, 'id'>): Promise<Payment> {
    // Create the payment
    const payment = await pb.collection('payments').create(data);
    
    // Update payment status of related incoming items
    await this.updateIncomingItemsPaymentStatus(data.vendor, data.amount);
    
    return payment;
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
}

export const authService = new AuthService();
export const itemService = new ItemService();
export const vendorService = new VendorService();
export const quotationService = new QuotationService();
export const incomingItemService = new IncomingItemService();
export const paymentService = new PaymentService();