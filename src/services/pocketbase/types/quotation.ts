import type { Vendor } from './vendor';
import type { Item } from './item';
import type { Service } from './service';

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
