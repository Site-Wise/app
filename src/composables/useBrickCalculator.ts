import { ref, computed } from 'vue';

/**
 * Brick Calculator
 *
 * Calculates the number of bricks required for wall construction
 * based on wall dimensions, brick type, and wall thickness.
 *
 * Standard brick sizes in India:
 * - Standard (modular): 190 x 90 x 90 mm
 * - Traditional: 230 x 115 x 75 mm
 * - AAC Block: 600 x 200 x various thickness
 *
 * Wall thickness options:
 * - Half brick (4.5"): 115mm - partition walls
 * - Full brick (9"): 230mm - load bearing walls
 * - One and half brick: 345mm - thick walls
 *
 * Mortar joint: typically 10mm
 * Wastage factor: typically 5-10%
 */

// Brick type configurations (dimensions in mm)
export const BRICK_TYPES = {
  standard: {
    name: 'Standard (Modular)',
    length: 190,
    width: 90,
    height: 90,
    description: 'Common modular brick'
  },
  traditional: {
    name: 'Traditional',
    length: 230,
    width: 115,
    height: 75,
    description: 'Traditional Indian brick'
  },
  aac_100: {
    name: 'AAC Block (100mm)',
    length: 600,
    width: 100,
    height: 200,
    description: 'Lightweight AAC block'
  },
  aac_150: {
    name: 'AAC Block (150mm)',
    length: 600,
    width: 150,
    height: 200,
    description: 'AAC block for partitions'
  },
  aac_200: {
    name: 'AAC Block (200mm)',
    length: 600,
    width: 200,
    height: 200,
    description: 'AAC block for external walls'
  },
  fly_ash: {
    name: 'Fly Ash Brick',
    length: 230,
    width: 110,
    height: 75,
    description: 'Eco-friendly fly ash brick'
  }
} as const;

export type BrickType = keyof typeof BRICK_TYPES;

// Wall thickness types
export const WALL_THICKNESS = {
  half: { name: 'Half Brick (4.5")', thickness: 115, description: 'Partition walls' },
  full: { name: 'Full Brick (9")', thickness: 230, description: 'Load bearing walls' },
  oneHalf: { name: 'One & Half Brick', thickness: 345, description: 'Thick external walls' }
} as const;

export type WallThicknessType = keyof typeof WALL_THICKNESS;

// Constants
export const MORTAR_JOINT_THICKNESS = 10; // mm
export const DEFAULT_WASTAGE_PERCENT = 5;

export interface BrickInput {
  length: number; // meters (wall length)
  height: number; // meters (wall height)
  brickType: BrickType;
  wallThickness: WallThicknessType;
  openingsArea?: number; // square meters (doors, windows)
  wastagePercent?: number;
}

export interface BrickCalculationResult {
  wallArea: number; // m² (gross)
  openingsArea: number; // m²
  netWallArea: number; // m²
  bricksPerSqm: number;
  bricksRequired: number;
  bricksWithWastage: number;
  mortarVolume: number; // m³
  cementBags: number;
  sandM3: number;
}

/**
 * Calculate number of bricks per square meter
 */
export function calculateBricksPerSqm(brickType: BrickType, includesMortar: boolean = true): number {
  const brick = BRICK_TYPES[brickType];

  // Add mortar joint to brick dimensions if including mortar
  const effectiveLength = brick.length + (includesMortar ? MORTAR_JOINT_THICKNESS : 0);
  const effectiveHeight = brick.height + (includesMortar ? MORTAR_JOINT_THICKNESS : 0);

  // Convert to meters
  const lengthM = effectiveLength / 1000;
  const heightM = effectiveHeight / 1000;

  // Area of one brick (face area)
  const brickArea = lengthM * heightM;

  // Bricks per sqm
  return 1 / brickArea;
}

/**
 * Calculate brick requirements
 */
export function calculateBricks(input: BrickInput): BrickCalculationResult {
  const {
    length,
    height,
    brickType,
    wallThickness,
    openingsArea = 0,
    wastagePercent = DEFAULT_WASTAGE_PERCENT
  } = input;

  const brick = BRICK_TYPES[brickType];
  const wall = WALL_THICKNESS[wallThickness];

  // Calculate wall areas
  const wallArea = length * height;
  const netWallArea = Math.max(0, wallArea - openingsArea);

  // Bricks per sqm (for face area)
  const bricksPerSqm = calculateBricksPerSqm(brickType, true);

  // Calculate layers multiplier based on wall thickness
  // Half brick = 1 layer, Full brick = 2 layers, 1.5 brick = 3 layers
  let layersMultiplier = 1;
  if (wall.thickness > brick.width * 1.5) {
    layersMultiplier = 3;
  } else if (wall.thickness > brick.width) {
    layersMultiplier = 2;
  }

  // Total bricks required
  const bricksRequired = Math.ceil(netWallArea * bricksPerSqm * layersMultiplier);

  // Add wastage
  const bricksWithWastage = Math.ceil(bricksRequired * (1 + wastagePercent / 100));

  // Calculate mortar requirements
  // Volume of bricks
  const brickVolume = (brick.length / 1000) * (brick.width / 1000) * (brick.height / 1000) * bricksRequired;
  // Wall volume (using net area and wall thickness)
  const wallVolume = netWallArea * (wall.thickness / 1000);
  // Mortar volume = Wall volume - Brick volume
  const mortarVolume = Math.max(0, wallVolume - brickVolume);

  // Cement and sand for mortar (1:6 ratio typical for brickwork)
  const dryMortarVolume = mortarVolume * 1.33; // Add 33% for dry volume
  const cementVolume = dryMortarVolume / 7; // 1 part cement
  const sandVolume = (dryMortarVolume * 6) / 7; // 6 parts sand

  const cementBags = Math.ceil(cementVolume / 0.0347); // 1 bag = 0.0347 m³

  return {
    wallArea,
    openingsArea,
    netWallArea,
    bricksPerSqm: Math.round(bricksPerSqm),
    bricksRequired,
    bricksWithWastage,
    mortarVolume,
    cementBags,
    sandM3: sandVolume
  };
}

/**
 * Main composable for brick calculations
 */
export function useBrickCalculator() {
  // Input state
  const length = ref(5); // 5m default
  const height = ref(3); // 3m default (typical floor height)
  const brickType = ref<BrickType>('traditional');
  const wallThickness = ref<WallThicknessType>('half');
  const openingsArea = ref(0);
  const wastagePercent = ref(DEFAULT_WASTAGE_PERCENT);

  // Computed calculation
  const result = computed<BrickCalculationResult>(() => {
    return calculateBricks({
      length: length.value,
      height: height.value,
      brickType: brickType.value,
      wallThickness: wallThickness.value,
      openingsArea: openingsArea.value,
      wastagePercent: wastagePercent.value
    });
  });

  // Available brick types for UI
  const brickTypes = Object.entries(BRICK_TYPES).map(([key, value]) => ({
    value: key as BrickType,
    label: value.name,
    description: value.description,
    dimensions: `${value.length} x ${value.width} x ${value.height} mm`
  }));

  // Available wall thicknesses for UI
  const wallThicknesses = Object.entries(WALL_THICKNESS).map(([key, value]) => ({
    value: key as WallThicknessType,
    label: value.name,
    description: value.description,
    thickness: value.thickness
  }));

  // Reset to defaults
  function reset() {
    length.value = 5;
    height.value = 3;
    brickType.value = 'traditional';
    wallThickness.value = 'half';
    openingsArea.value = 0;
    wastagePercent.value = DEFAULT_WASTAGE_PERCENT;
  }

  return {
    // Input state
    length,
    height,
    brickType,
    wallThickness,
    openingsArea,
    wastagePercent,

    // Computed result
    result,

    // Reference data
    brickTypes,
    wallThicknesses,

    // Methods
    reset,

    // Utility functions for external use
    calculateBricks,
    calculateBricksPerSqm
  };
}
