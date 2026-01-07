export interface AnalyticsSetting {
  id?: string;
  site: string; // Site ID
  name: string; // User-defined name for this saved filter
  tag_ids?: string[]; // Array of tag IDs to filter by
  date_from?: string; // Start date for delivery date range filter
  date_to?: string; // End date for delivery date range filter
  amount_min?: number; // Minimum total amount filter
  amount_max?: number; // Maximum total amount filter
  created?: string;
  updated?: string;
}

// Analytics calculation result interfaces
export interface AnalyticsResult {
  totalCost: number;
  averageCostPerItem: number;
  averageCostPerDelivery: number;
  itemCount: number;
  deliveryCount: number;
  totalQuantity: number;
  quantityByUnit: { unit: string; quantity: number; itemCount: number }[];
  costByTag: { tagId: string; tagName: string; cost: number }[];
  costOverTime: { date: string; cost: number }[];
  costOverTimeByTag: { tagId: string; tagName: string; data: { date: string; cost: number }[] }[];
}
