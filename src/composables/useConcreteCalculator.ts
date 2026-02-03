import { ref, computed } from 'vue';

/**
 * Concrete Mix Calculator
 *
 * Calculates the quantity of cement, sand, and aggregate required
 * for a given volume of concrete based on mix grade.
 *
 * Standard mix ratios (Cement:Sand:Aggregate):
 * - M10: 1:3:6 (lean concrete)
 * - M15: 1:2:4 (standard)
 * - M20: 1:1.5:3 (common structural)
 * - M25: 1:1:2 (structural)
 * - M30: 1:0.75:1.5 (high strength)
 *
 * Constants:
 * - 1 bag cement = 50 kg
 * - Volume of 1 bag cement = 0.0347 m³
 * - Dry volume factor = 1.54 (accounts for compaction)
 */

// Mix ratio configurations
export const CONCRETE_GRADES = {
  M10: { name: 'M10', cement: 1, sand: 3, aggregate: 6, description: 'Lean concrete, PCC' },
  M15: { name: 'M15', cement: 1, sand: 2, aggregate: 4, description: 'Plain cement concrete' },
  M20: { name: 'M20', cement: 1, sand: 1.5, aggregate: 3, description: 'RCC slabs, beams' },
  M25: { name: 'M25', cement: 1, sand: 1, aggregate: 2, description: 'RCC columns, footings' },
  M30: { name: 'M30', cement: 1, sand: 0.75, aggregate: 1.5, description: 'High strength RCC' },
} as const;

export type ConcreteGrade = keyof typeof CONCRETE_GRADES;

// Constants
export const CEMENT_BAG_WEIGHT = 50; // kg
export const CEMENT_BAG_VOLUME = 0.0347; // m³
export const DRY_VOLUME_FACTOR = 1.54; // Accounts for voids and compaction
export const SAND_BULK_DENSITY = 1450; // kg/m³
export const AGGREGATE_BULK_DENSITY = 1500; // kg/m³

export interface ConcreteInput {
  length: number; // meters
  width: number; // meters
  depth: number; // meters
  grade: ConcreteGrade;
}

export interface ConcreteCalculationResult {
  wetVolume: number; // m³
  dryVolume: number; // m³
  cementBags: number;
  cementKg: number;
  sandM3: number;
  sandKg: number;
  aggregateM3: number;
  aggregateKg: number;
  ratio: string;
}

/**
 * Calculate concrete material requirements
 */
export function calculateConcrete(input: ConcreteInput): ConcreteCalculationResult {
  const { length, width, depth, grade } = input;
  const mixRatio = CONCRETE_GRADES[grade];

  // Calculate wet volume
  const wetVolume = length * width * depth;

  // Calculate dry volume (add 54% for voids and compaction)
  const dryVolume = wetVolume * DRY_VOLUME_FACTOR;

  // Calculate sum of ratio parts
  const totalRatio = mixRatio.cement + mixRatio.sand + mixRatio.aggregate;

  // Calculate cement volume
  const cementVolume = (dryVolume * mixRatio.cement) / totalRatio;
  const cementBags = cementVolume / CEMENT_BAG_VOLUME;
  const cementKg = cementBags * CEMENT_BAG_WEIGHT;

  // Calculate sand volume and weight
  const sandM3 = (dryVolume * mixRatio.sand) / totalRatio;
  const sandKg = sandM3 * SAND_BULK_DENSITY;

  // Calculate aggregate volume and weight
  const aggregateM3 = (dryVolume * mixRatio.aggregate) / totalRatio;
  const aggregateKg = aggregateM3 * AGGREGATE_BULK_DENSITY;

  return {
    wetVolume,
    dryVolume,
    cementBags: Math.ceil(cementBags),
    cementKg,
    sandM3,
    sandKg,
    aggregateM3,
    aggregateKg,
    ratio: `1:${mixRatio.sand}:${mixRatio.aggregate}`
  };
}

/**
 * Main composable for concrete calculations
 */
export function useConcreteCalculator() {
  // Input state
  const length = ref(1);
  const width = ref(1);
  const depth = ref(0.15); // 15cm default (typical slab thickness)
  const grade = ref<ConcreteGrade>('M20');

  // Computed calculation
  const result = computed<ConcreteCalculationResult>(() => {
    return calculateConcrete({
      length: length.value,
      width: width.value,
      depth: depth.value,
      grade: grade.value
    });
  });

  // Available grades for UI
  const grades = Object.entries(CONCRETE_GRADES).map(([key, value]) => ({
    value: key as ConcreteGrade,
    label: value.name,
    description: value.description
  }));

  // Reset to defaults
  function reset() {
    length.value = 1;
    width.value = 1;
    depth.value = 0.15;
    grade.value = 'M20';
  }

  return {
    // Input state
    length,
    width,
    depth,
    grade,

    // Computed result
    result,

    // Reference data
    grades,

    // Methods
    reset,

    // Utility function for external use
    calculateConcrete
  };
}
