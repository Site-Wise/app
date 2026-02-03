import { ref, computed } from 'vue';

/**
 * Rebar Weight Calculator
 *
 * Formula: Weight (kg) = d² × L × 0.00617 × quantity
 * Where:
 *   - d = diameter in mm
 *   - L = length in meters
 *   - 0.00617 = (π/4) × (1/1000000) × 7850
 *     - π/4 for circular cross-section area formula
 *     - 1/1000000 to convert mm² to m²
 *     - 7850 kg/m³ = density of steel
 *
 * This composable is designed to be reusable:
 * - In the Tools section for standalone calculations
 * - In the Delivery entry process for verification
 */

// Standard rebar diameters available in India (mm)
export const STANDARD_DIAMETERS = [6, 8, 10, 12, 16, 20, 25, 32] as const;

// Steel density constant (kg/m³)
export const STEEL_DENSITY = 7850;

// Weight factor: (π/4) × (1/1000000) × 7850 ≈ 0.00617
export const WEIGHT_FACTOR = (Math.PI / 4) * (1 / 1000000) * STEEL_DENSITY;

export interface RebarEntry {
  id: string;
  diameter: number; // mm
  length: number; // meters
  quantity: number; // number of bars
}

export interface RebarCalculationResult {
  entry: RebarEntry;
  weightPerMeter: number; // kg/m
  weightPerBar: number; // kg
  totalWeight: number; // kg
}

/**
 * Calculate weight per meter for a given diameter
 */
export function calculateWeightPerMeter(diameterMm: number): number {
  // Weight per meter = d² × 0.00617 × 1m
  return diameterMm * diameterMm * WEIGHT_FACTOR;
}

/**
 * Calculate weight for a single rebar entry
 */
export function calculateRebarWeight(entry: RebarEntry): RebarCalculationResult {
  const weightPerMeter = calculateWeightPerMeter(entry.diameter);
  const weightPerBar = weightPerMeter * entry.length;
  const totalWeight = weightPerBar * entry.quantity;

  return {
    entry,
    weightPerMeter,
    weightPerBar,
    totalWeight
  };
}

/**
 * Calculate total weight for multiple rebar entries
 */
export function calculateTotalWeight(entries: RebarEntry[]): number {
  return entries.reduce((total, entry) => {
    const result = calculateRebarWeight(entry);
    return total + result.totalWeight;
  }, 0);
}

/**
 * Generate a unique ID for rebar entries
 */
function generateId(): string {
  return `rebar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new empty rebar entry
 */
export function createEmptyEntry(): RebarEntry {
  return {
    id: generateId(),
    diameter: 12, // Default to common 12mm rebar
    length: 12, // Standard 12m length
    quantity: 1
  };
}

/**
 * Main composable for rebar calculations
 * Provides reactive state and methods for managing rebar entries
 */
export function useRebarCalculator() {
  // Reactive list of rebar entries
  const entries = ref<RebarEntry[]>([createEmptyEntry()]);

  // Computed calculations for each entry
  const calculations = computed<RebarCalculationResult[]>(() => {
    return entries.value.map(entry => calculateRebarWeight(entry));
  });

  // Computed total weight
  const totalWeight = computed(() => {
    return calculations.value.reduce((sum, calc) => sum + calc.totalWeight, 0);
  });

  // Computed total number of bars
  const totalBars = computed(() => {
    return entries.value.reduce((sum, entry) => sum + entry.quantity, 0);
  });

  // Add a new entry
  function addEntry() {
    entries.value.push(createEmptyEntry());
  }

  // Remove an entry by id
  function removeEntry(id: string) {
    if (entries.value.length > 1) {
      entries.value = entries.value.filter(e => e.id !== id);
    }
  }

  // Update an entry
  function updateEntry(id: string, updates: Partial<Omit<RebarEntry, 'id'>>) {
    const index = entries.value.findIndex(e => e.id === id);
    if (index !== -1) {
      entries.value[index] = { ...entries.value[index], ...updates };
    }
  }

  // Clear all entries and start fresh
  function clearAll() {
    entries.value = [createEmptyEntry()];
  }

  // Set entries from external source (for delivery integration)
  function setEntries(newEntries: Omit<RebarEntry, 'id'>[]) {
    entries.value = newEntries.map(entry => ({
      ...entry,
      id: generateId()
    }));
  }

  // Get calculation for a specific entry
  function getCalculation(id: string): RebarCalculationResult | undefined {
    return calculations.value.find(calc => calc.entry.id === id);
  }

  return {
    // State
    entries,
    calculations,
    totalWeight,
    totalBars,

    // Methods
    addEntry,
    removeEntry,
    updateEntry,
    clearAll,
    setEntries,
    getCalculation,

    // Constants (for UI display)
    standardDiameters: STANDARD_DIAMETERS,

    // Utility functions (for standalone use)
    calculateWeightPerMeter,
    calculateRebarWeight
  };
}
