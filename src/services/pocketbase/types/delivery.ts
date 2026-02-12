import type { Vendor } from './vendor';
import type { Item } from './item';

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
