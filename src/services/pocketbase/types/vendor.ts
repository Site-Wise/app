import type { Tag } from './tag';

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

export interface VendorWithTags extends Omit<Vendor, 'tags'> {
  tags: string[]; // Array of Tag IDs
  expand?: {
    tags?: Tag[]; // Expanded tags via PocketBase relations
  };
}
