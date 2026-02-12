import type { Tag } from './tag';
import type { Vendor } from './vendor';

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

export interface ServiceWithTags extends Omit<Service, 'tags' | 'category'> {
  tags: string[]; // Array of Tag IDs
  expand?: {
    tags?: Tag[]; // Expanded tags via PocketBase relations
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
