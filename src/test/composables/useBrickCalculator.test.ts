import { describe, it, expect, beforeEach } from 'vitest';
import {
  useBrickCalculator,
  calculateBricks,
  calculateBricksPerSqm,
  BRICK_TYPES,
  WALL_THICKNESS,
  MORTAR_JOINT_THICKNESS,
  DEFAULT_WASTAGE_PERCENT,
  type BrickType,
  type WallThicknessType
} from '../../composables/useBrickCalculator';

describe('useBrickCalculator', () => {
  describe('Constants', () => {
    it('should have correct mortar joint thickness', () => {
      expect(MORTAR_JOINT_THICKNESS).toBe(10); // mm
    });

    it('should have correct default wastage', () => {
      expect(DEFAULT_WASTAGE_PERCENT).toBe(5);
    });
  });

  describe('Brick Types', () => {
    it('should have standard modular brick dimensions', () => {
      const brick = BRICK_TYPES.standard;
      expect(brick.length).toBe(190);
      expect(brick.width).toBe(90);
      expect(brick.height).toBe(90);
    });

    it('should have traditional brick dimensions', () => {
      const brick = BRICK_TYPES.traditional;
      expect(brick.length).toBe(230);
      expect(brick.width).toBe(115);
      expect(brick.height).toBe(75);
    });

    it('should have AAC block 100mm dimensions', () => {
      const brick = BRICK_TYPES.aac_100;
      expect(brick.length).toBe(600);
      expect(brick.width).toBe(100);
      expect(brick.height).toBe(200);
    });

    it('should have AAC block 150mm dimensions', () => {
      const brick = BRICK_TYPES.aac_150;
      expect(brick.length).toBe(600);
      expect(brick.width).toBe(150);
      expect(brick.height).toBe(200);
    });

    it('should have AAC block 200mm dimensions', () => {
      const brick = BRICK_TYPES.aac_200;
      expect(brick.length).toBe(600);
      expect(brick.width).toBe(200);
      expect(brick.height).toBe(200);
    });

    it('should have fly ash brick dimensions', () => {
      const brick = BRICK_TYPES.fly_ash;
      expect(brick.length).toBe(230);
      expect(brick.width).toBe(110);
      expect(brick.height).toBe(75);
    });

    it('should have descriptions for all brick types', () => {
      Object.values(BRICK_TYPES).forEach(brick => {
        expect(brick.name).toBeDefined();
        expect(brick.description).toBeDefined();
      });
    });
  });

  describe('Wall Thickness Types', () => {
    it('should have half brick thickness', () => {
      const wall = WALL_THICKNESS.half;
      expect(wall.thickness).toBe(115);
      expect(wall.name).toContain('Half');
    });

    it('should have full brick thickness', () => {
      const wall = WALL_THICKNESS.full;
      expect(wall.thickness).toBe(230);
      expect(wall.name).toContain('Full');
    });

    it('should have one and half brick thickness', () => {
      const wall = WALL_THICKNESS.oneHalf;
      expect(wall.thickness).toBe(345);
    });
  });

  describe('calculateBricksPerSqm', () => {
    it('should calculate bricks per sqm for traditional brick', () => {
      const result = calculateBricksPerSqm('traditional', true);

      // Traditional brick: 230×75mm with 10mm mortar = 240×85mm
      // Area = 0.0204 m²
      // Per sqm ≈ 49 bricks
      expect(result).toBeGreaterThan(45);
      expect(result).toBeLessThan(55);
    });

    it('should calculate bricks per sqm for modular brick', () => {
      const result = calculateBricksPerSqm('standard', true);

      // Standard brick: 190×90mm with 10mm mortar = 200×100mm
      // Area = 0.02 m²
      // Per sqm = 50 bricks
      expect(result).toBeCloseTo(50, 0);
    });

    it('should calculate fewer blocks per sqm for AAC', () => {
      const result = calculateBricksPerSqm('aac_200', true);

      // AAC block: 600×200mm with 10mm mortar = 610×210mm
      // Area = 0.1281 m²
      // Per sqm ≈ 8 blocks
      expect(result).toBeGreaterThan(7);
      expect(result).toBeLessThan(10);
    });

    it('should give more bricks without mortar joints', () => {
      const withMortar = calculateBricksPerSqm('traditional', true);
      const withoutMortar = calculateBricksPerSqm('traditional', false);

      expect(withoutMortar).toBeGreaterThan(withMortar);
    });
  });

  describe('calculateBricks', () => {
    it('should calculate for a simple wall', () => {
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half'
      });

      expect(result.wallArea).toBe(15);
      expect(result.netWallArea).toBe(15);
      expect(result.bricksRequired).toBeGreaterThan(0);
    });

    it('should account for openings', () => {
      const withOpening = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half',
        openingsArea: 2
      });

      const withoutOpening = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half',
        openingsArea: 0
      });

      expect(withOpening.netWallArea).toBe(13);
      expect(withOpening.bricksRequired).toBeLessThan(withoutOpening.bricksRequired);
    });

    it('should add wastage correctly', () => {
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half',
        wastagePercent: 10
      });

      // bricksWithWastage should be ~10% more than bricksRequired
      const expectedWithWastage = Math.ceil(result.bricksRequired * 1.1);
      expect(result.bricksWithWastage).toBeCloseTo(expectedWithWastage, 0);
    });

    it('should use default wastage of 5%', () => {
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half'
      });

      const expectedWithWastage = Math.ceil(result.bricksRequired * 1.05);
      expect(result.bricksWithWastage).toBeCloseTo(expectedWithWastage, 0);
    });

    it('should calculate mortar volume', () => {
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half'
      });

      expect(result.mortarVolume).toBeGreaterThan(0);
    });

    it('should calculate cement bags for mortar', () => {
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half'
      });

      expect(result.cementBags).toBeGreaterThanOrEqual(1);
    });

    it('should calculate sand for mortar', () => {
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half'
      });

      expect(result.sandM3).toBeGreaterThan(0);
    });

    it('should require more bricks for thicker walls', () => {
      const halfBrick = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half'
      });

      const fullBrick = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'full'
      });

      const oneHalfBrick = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'oneHalf'
      });

      // Thicker walls need more bricks than half brick walls
      expect(fullBrick.bricksRequired).toBeGreaterThan(halfBrick.bricksRequired);
      // One-and-half should be at least as many as full brick
      expect(oneHalfBrick.bricksRequired).toBeGreaterThanOrEqual(fullBrick.bricksRequired);
    });

    it('should handle AAC blocks correctly', () => {
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'aac_200',
        wallThickness: 'half'
      });

      // AAC blocks are larger, so fewer are needed
      expect(result.bricksPerSqm).toBeLessThan(20);
      expect(result.bricksRequired).toBeLessThan(300);
    });

    it('should handle zero openings area', () => {
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half',
        openingsArea: 0
      });

      expect(result.netWallArea).toBe(15);
    });

    it('should not give negative wall area', () => {
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half',
        openingsArea: 20 // More than wall area
      });

      expect(result.netWallArea).toBe(0);
      expect(result.bricksRequired).toBe(0);
    });
  });

  describe('useBrickCalculator composable', () => {
    let calc: ReturnType<typeof useBrickCalculator>;

    beforeEach(() => {
      calc = useBrickCalculator();
      calc.reset();
    });

    it('should initialize with default values', () => {
      expect(calc.length.value).toBe(5);
      expect(calc.height.value).toBe(3);
      expect(calc.brickType.value).toBe('traditional');
      expect(calc.wallThickness.value).toBe('half');
      expect(calc.openingsArea.value).toBe(0);
      expect(calc.wastagePercent.value).toBe(5);
    });

    it('should compute result reactively', () => {
      calc.length.value = 10;

      expect(calc.result.value.wallArea).toBe(30);
    });

    it('should update when brick type changes', () => {
      calc.brickType.value = 'aac_200';

      expect(calc.result.value.bricksPerSqm).toBeLessThan(20);
    });

    it('should provide list of brick types', () => {
      expect(calc.brickTypes).toBeDefined();
      expect(calc.brickTypes.length).toBeGreaterThanOrEqual(5);

      const values = calc.brickTypes.map(b => b.value);
      expect(values).toContain('traditional');
      expect(values).toContain('standard');
      expect(values).toContain('aac_200');
    });

    it('should have dimensions for brick types', () => {
      calc.brickTypes.forEach(brick => {
        expect(brick.dimensions).toBeDefined();
        expect(brick.dimensions).toMatch(/\d+ x \d+ x \d+ mm/);
      });
    });

    it('should provide list of wall thicknesses', () => {
      expect(calc.wallThicknesses).toBeDefined();
      expect(calc.wallThicknesses).toHaveLength(3);

      const values = calc.wallThicknesses.map(w => w.value);
      expect(values).toContain('half');
      expect(values).toContain('full');
      expect(values).toContain('oneHalf');
    });

    it('should reset to default values', () => {
      calc.length.value = 10;
      calc.height.value = 5;
      calc.brickType.value = 'aac_200';
      calc.wastagePercent.value = 15;

      calc.reset();

      expect(calc.length.value).toBe(5);
      expect(calc.height.value).toBe(3);
      expect(calc.brickType.value).toBe('traditional');
      expect(calc.wastagePercent.value).toBe(5);
    });

    it('should expose utility functions', () => {
      expect(typeof calc.calculateBricks).toBe('function');
      expect(typeof calc.calculateBricksPerSqm).toBe('function');
    });

    it('should update openings correctly', () => {
      calc.openingsArea.value = 5;

      expect(calc.result.value.openingsArea).toBe(5);
      expect(calc.result.value.netWallArea).toBe(10);
    });
  });

  describe('Real-world scenarios', () => {
    it('should calculate for a typical room wall', () => {
      // 4m wall, 3m height, with 1 door (2 sqm) and 1 window (1 sqm)
      const result = calculateBricks({
        length: 4,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half',
        openingsArea: 3
      });

      expect(result.wallArea).toBe(12);
      expect(result.netWallArea).toBe(9);
      // Traditional brick: ~49 per sqm (with mortar joints)
      // 9 sqm × 49 ≈ 440 bricks
      expect(result.bricksRequired).toBeGreaterThan(400);
      expect(result.bricksRequired).toBeLessThan(500);
    });

    it('should calculate for boundary wall', () => {
      // 20m boundary wall, 2m height, no openings
      const result = calculateBricks({
        length: 20,
        height: 2,
        brickType: 'traditional',
        wallThickness: 'half',
        wastagePercent: 10
      });

      expect(result.wallArea).toBe(40);
      // ~50 bricks per sqm × 40 = 2000 bricks + 10% wastage
      expect(result.bricksWithWastage).toBeGreaterThan(2000);
    });

    it('should calculate for load-bearing wall', () => {
      // 5m × 3m load-bearing wall (full brick)
      const result = calculateBricks({
        length: 5,
        height: 3,
        brickType: 'traditional',
        wallThickness: 'full',
        openingsArea: 2
      });

      expect(result.netWallArea).toBe(13);
      // Double layer, so roughly double the bricks
      expect(result.bricksRequired).toBeGreaterThan(1000);
    });

    it('should calculate for AAC block partition', () => {
      // 6m × 3m partition wall with AAC blocks
      const result = calculateBricks({
        length: 6,
        height: 3,
        brickType: 'aac_200',
        wallThickness: 'half',
        openingsArea: 2
      });

      // AAC blocks are much larger, ~8 per sqm
      expect(result.bricksPerSqm).toBeLessThan(15);
      expect(result.bricksRequired).toBeLessThan(200);
    });

    it('should estimate materials for complete room', () => {
      // Complete room: 4 walls
      // 2 walls: 4m × 3m = 24 sqm
      // 2 walls: 3m × 3m = 18 sqm
      // Total: 42 sqm, less 3 sqm openings = 39 sqm
      const result = calculateBricks({
        length: 13, // Approximate perimeter
        height: 3,
        brickType: 'traditional',
        wallThickness: 'half',
        openingsArea: 3
      });

      expect(result.netWallArea).toBe(36);
      expect(result.cementBags).toBeGreaterThanOrEqual(2);
    });
  });
});
