import { ref, computed } from 'vue';

/**
 * Plaster Material Calculator
 *
 * Calculates the quantity of cement and sand required for plastering
 * based on wall area, plaster thickness, and mix ratio.
 *
 * Common mix ratios (Cement:Sand):
 * - 1:3 - Rich mix, waterproofing
 * - 1:4 - External walls
 * - 1:5 - External walls (economical)
 * - 1:6 - Internal walls
 *
 * Standard plaster thickness:
 * - External: 15-20mm (two coats)
 * - Internal: 12-15mm (single coat)
 * - Ceiling: 6-8mm
 *
 * Constants:
 * - 1 bag cement = 50 kg
 * - Volume of 1 bag cement = 0.0347 m³
 * - Dry volume factor = 1.35 for mortar
 */

// Plaster ratio configurations
export const PLASTER_RATIOS = {
  '1:3': { cement: 1, sand: 3, description: 'Rich mix, waterproofing' },
  '1:4': { cement: 1, sand: 4, description: 'External walls' },
  '1:5': { cement: 1, sand: 5, description: 'External walls (economical)' },
  '1:6': { cement: 1, sand: 6, description: 'Internal walls' },
} as const;

export type PlasterRatio = keyof typeof PLASTER_RATIOS;

// Plaster types with typical thickness
export const PLASTER_TYPES = {
  external: { name: 'External', thickness: 15, ratio: '1:4' as PlasterRatio },
  internal: { name: 'Internal', thickness: 12, ratio: '1:6' as PlasterRatio },
  ceiling: { name: 'Ceiling', thickness: 8, ratio: '1:6' as PlasterRatio },
  waterproof: { name: 'Waterproofing', thickness: 15, ratio: '1:3' as PlasterRatio },
} as const;

export type PlasterType = keyof typeof PLASTER_TYPES;

// Constants
export const CEMENT_BAG_WEIGHT = 50; // kg
export const CEMENT_BAG_VOLUME = 0.0347; // m³
export const DRY_VOLUME_FACTOR = 1.35; // For mortar
export const SAND_BULK_DENSITY = 1450; // kg/m³

export interface PlasterInput {
  area: number; // square meters
  thickness: number; // mm
  ratio: PlasterRatio;
}

export interface PlasterCalculationResult {
  area: number; // m²
  thickness: number; // mm
  wetVolume: number; // m³
  dryVolume: number; // m³
  cementBags: number;
  cementKg: number;
  sandM3: number;
  sandKg: number;
  ratio: string;
}

/**
 * Calculate plaster material requirements
 */
export function calculatePlaster(input: PlasterInput): PlasterCalculationResult {
  const { area, thickness, ratio } = input;
  const mixRatio = PLASTER_RATIOS[ratio];

  // Convert thickness from mm to meters
  const thicknessM = thickness / 1000;

  // Calculate wet volume
  const wetVolume = area * thicknessM;

  // Calculate dry volume (add 35% for voids)
  const dryVolume = wetVolume * DRY_VOLUME_FACTOR;

  // Calculate sum of ratio parts
  const totalRatio = mixRatio.cement + mixRatio.sand;

  // Calculate cement volume and bags
  const cementVolume = (dryVolume * mixRatio.cement) / totalRatio;
  const cementBags = cementVolume / CEMENT_BAG_VOLUME;
  const cementKg = cementBags * CEMENT_BAG_WEIGHT;

  // Calculate sand volume and weight
  const sandM3 = (dryVolume * mixRatio.sand) / totalRatio;
  const sandKg = sandM3 * SAND_BULK_DENSITY;

  return {
    area,
    thickness,
    wetVolume,
    dryVolume,
    cementBags: Math.ceil(cementBags),
    cementKg,
    sandM3,
    sandKg,
    ratio
  };
}

/**
 * Calculate plaster requirements per square meter
 * Useful for quick reference
 */
export function calculatePlasterPerSqm(thickness: number, ratio: PlasterRatio): {
  cementKg: number;
  sandKg: number;
} {
  const result = calculatePlaster({ area: 1, thickness, ratio });
  return {
    cementKg: result.cementKg,
    sandKg: result.sandKg
  };
}

/**
 * Main composable for plaster calculations
 */
export function usePlasterCalculator() {
  // Input state
  const area = ref(10); // 10 sqm default
  const thickness = ref(12); // 12mm default (internal)
  const ratio = ref<PlasterRatio>('1:6');
  const plasterType = ref<PlasterType>('internal');

  // Computed calculation
  const result = computed<PlasterCalculationResult>(() => {
    return calculatePlaster({
      area: area.value,
      thickness: thickness.value,
      ratio: ratio.value
    });
  });

  // Per sqm reference
  const perSqm = computed(() => {
    return calculatePlasterPerSqm(thickness.value, ratio.value);
  });

  // Available ratios for UI
  const ratios = Object.entries(PLASTER_RATIOS).map(([key, value]) => ({
    value: key as PlasterRatio,
    label: key,
    description: value.description
  }));

  // Available types for UI
  const types = Object.entries(PLASTER_TYPES).map(([key, value]) => ({
    value: key as PlasterType,
    label: value.name,
    thickness: value.thickness,
    ratio: value.ratio
  }));

  // Apply preset type
  function applyType(type: PlasterType) {
    const preset = PLASTER_TYPES[type];
    plasterType.value = type;
    thickness.value = preset.thickness;
    ratio.value = preset.ratio;
  }

  // Reset to defaults
  function reset() {
    area.value = 10;
    thickness.value = 12;
    ratio.value = '1:6';
    plasterType.value = 'internal';
  }

  return {
    // Input state
    area,
    thickness,
    ratio,
    plasterType,

    // Computed results
    result,
    perSqm,

    // Reference data
    ratios,
    types,

    // Methods
    applyType,
    reset,

    // Utility functions for external use
    calculatePlaster,
    calculatePlasterPerSqm
  };
}
