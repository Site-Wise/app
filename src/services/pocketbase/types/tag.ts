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
