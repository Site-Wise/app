import type { Tag } from './tag';

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

export interface ItemWithTags extends Omit<Item, 'category'> {
  tags: string[]; // Array of Tag IDs
  expand?: {
    tags?: Tag[]; // Expanded tags via PocketBase relations
  };
}
