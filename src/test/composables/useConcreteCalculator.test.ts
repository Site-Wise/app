import { describe, it, expect, beforeEach } from 'vitest';
import {
  useConcreteCalculator,
  calculateConcrete,
  CONCRETE_GRADES,
  CEMENT_BAG_WEIGHT,
  CEMENT_BAG_VOLUME,
  DRY_VOLUME_FACTOR,
  SAND_BULK_DENSITY,
  AGGREGATE_BULK_DENSITY,
  type ConcreteGrade
} from '../../composables/useConcreteCalculator';

describe('useConcreteCalculator', () => {
  describe('Constants', () => {
    it('should have correct cement bag weight', () => {
      expect(CEMENT_BAG_WEIGHT).toBe(50); // 50 kg per bag
    });

    it('should have correct cement bag volume', () => {
      expect(CEMENT_BAG_VOLUME).toBe(0.0347); // m³ per bag
    });

    it('should have correct dry volume factor', () => {
      expect(DRY_VOLUME_FACTOR).toBe(1.54);
    });

    it('should have correct sand bulk density', () => {
      expect(SAND_BULK_DENSITY).toBe(1450); // kg/m³
    });

    it('should have correct aggregate bulk density', () => {
      expect(AGGREGATE_BULK_DENSITY).toBe(1500); // kg/m³
    });
  });

  describe('Concrete Grades', () => {
    it('should have M10 grade with 1:3:6 ratio', () => {
      const m10 = CONCRETE_GRADES.M10;
      expect(m10.cement).toBe(1);
      expect(m10.sand).toBe(3);
      expect(m10.aggregate).toBe(6);
    });

    it('should have M15 grade with 1:2:4 ratio', () => {
      const m15 = CONCRETE_GRADES.M15;
      expect(m15.cement).toBe(1);
      expect(m15.sand).toBe(2);
      expect(m15.aggregate).toBe(4);
    });

    it('should have M20 grade with 1:1.5:3 ratio', () => {
      const m20 = CONCRETE_GRADES.M20;
      expect(m20.cement).toBe(1);
      expect(m20.sand).toBe(1.5);
      expect(m20.aggregate).toBe(3);
    });

    it('should have M25 grade with 1:1:2 ratio', () => {
      const m25 = CONCRETE_GRADES.M25;
      expect(m25.cement).toBe(1);
      expect(m25.sand).toBe(1);
      expect(m25.aggregate).toBe(2);
    });

    it('should have M30 grade with 1:0.75:1.5 ratio', () => {
      const m30 = CONCRETE_GRADES.M30;
      expect(m30.cement).toBe(1);
      expect(m30.sand).toBe(0.75);
      expect(m30.aggregate).toBe(1.5);
    });

    it('should have descriptions for all grades', () => {
      Object.values(CONCRETE_GRADES).forEach(grade => {
        expect(grade.description).toBeDefined();
        expect(grade.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateConcrete', () => {
    it('should calculate for 1 cubic meter of M20 concrete', () => {
      const result = calculateConcrete({
        length: 1,
        width: 1,
        depth: 1,
        grade: 'M20'
      });

      expect(result.wetVolume).toBe(1);
      expect(result.dryVolume).toBeCloseTo(1.54, 2);
      expect(result.ratio).toBe('1:1.5:3');

      // For M20 (1:1.5:3), total parts = 5.5
      // Cement = 1.54 / 5.5 = 0.28 m³
      // Bags = 0.28 / 0.0347 ≈ 8 bags
      expect(result.cementBags).toBeGreaterThanOrEqual(8);
    });

    it('should calculate correctly for a slab', () => {
      // 10m × 5m × 0.15m slab = 7.5 m³
      const result = calculateConcrete({
        length: 10,
        width: 5,
        depth: 0.15,
        grade: 'M20'
      });

      expect(result.wetVolume).toBeCloseTo(7.5, 2);
      expect(result.dryVolume).toBeCloseTo(7.5 * 1.54, 2);
    });

    it('should give more cement for higher grades', () => {
      const m15Result = calculateConcrete({
        length: 1, width: 1, depth: 1, grade: 'M15'
      });
      const m25Result = calculateConcrete({
        length: 1, width: 1, depth: 1, grade: 'M25'
      });

      // M25 should require more cement than M15
      expect(m25Result.cementBags).toBeGreaterThan(m15Result.cementBags);
    });

    it('should calculate sand and aggregate volumes', () => {
      const result = calculateConcrete({
        length: 1,
        width: 1,
        depth: 1,
        grade: 'M20'
      });

      expect(result.sandM3).toBeGreaterThan(0);
      expect(result.aggregateM3).toBeGreaterThan(0);

      // For M20, aggregate should be twice the sand
      expect(result.aggregateM3 / result.sandM3).toBeCloseTo(2, 1);
    });

    it('should calculate weights from volumes', () => {
      const result = calculateConcrete({
        length: 1,
        width: 1,
        depth: 1,
        grade: 'M20'
      });

      expect(result.sandKg).toBeCloseTo(result.sandM3 * SAND_BULK_DENSITY, 0);
      expect(result.aggregateKg).toBeCloseTo(result.aggregateM3 * AGGREGATE_BULK_DENSITY, 0);
    });

    it('should handle small volumes', () => {
      const result = calculateConcrete({
        length: 0.3,
        width: 0.3,
        depth: 0.6,
        grade: 'M25' // Column
      });

      expect(result.wetVolume).toBeCloseTo(0.054, 3);
      expect(result.cementBags).toBeGreaterThanOrEqual(1);
    });

    it('should ceil cement bags', () => {
      // Ensure fractional bags are rounded up
      const result = calculateConcrete({
        length: 0.5,
        width: 0.5,
        depth: 0.1,
        grade: 'M20'
      });

      expect(Number.isInteger(result.cementBags)).toBe(true);
    });
  });

  describe('useConcreteCalculator composable', () => {
    let calc: ReturnType<typeof useConcreteCalculator>;

    beforeEach(() => {
      calc = useConcreteCalculator();
      calc.reset();
    });

    it('should initialize with default values', () => {
      expect(calc.length.value).toBe(1);
      expect(calc.width.value).toBe(1);
      expect(calc.depth.value).toBe(0.15);
      expect(calc.grade.value).toBe('M20');
    });

    it('should compute result reactively', () => {
      calc.length.value = 2;
      calc.width.value = 2;
      calc.depth.value = 0.1;

      expect(calc.result.value.wetVolume).toBeCloseTo(0.4, 2);
    });

    it('should update when grade changes', () => {
      calc.length.value = 1;
      calc.width.value = 1;
      calc.depth.value = 1;

      const m20Bags = calc.result.value.cementBags;
      calc.grade.value = 'M30';
      const m30Bags = calc.result.value.cementBags;

      expect(m30Bags).toBeGreaterThan(m20Bags);
    });

    it('should provide list of grades', () => {
      expect(calc.grades).toBeDefined();
      expect(calc.grades).toHaveLength(5);

      const gradeValues = calc.grades.map(g => g.value);
      expect(gradeValues).toContain('M10');
      expect(gradeValues).toContain('M15');
      expect(gradeValues).toContain('M20');
      expect(gradeValues).toContain('M25');
      expect(gradeValues).toContain('M30');
    });

    it('should have labels for grades', () => {
      calc.grades.forEach(grade => {
        expect(grade.label).toBeDefined();
        expect(grade.description).toBeDefined();
      });
    });

    it('should reset to default values', () => {
      calc.length.value = 10;
      calc.width.value = 5;
      calc.depth.value = 0.3;
      calc.grade.value = 'M30';

      calc.reset();

      expect(calc.length.value).toBe(1);
      expect(calc.width.value).toBe(1);
      expect(calc.depth.value).toBe(0.15);
      expect(calc.grade.value).toBe('M20');
    });

    it('should expose calculateConcrete function', () => {
      expect(typeof calc.calculateConcrete).toBe('function');

      const result = calc.calculateConcrete({
        length: 1,
        width: 1,
        depth: 1,
        grade: 'M20'
      });

      expect(result.wetVolume).toBe(1);
    });
  });

  describe('Real-world scenarios', () => {
    it('should calculate for a typical RCC slab', () => {
      // 6m × 4m × 0.125m slab (5 inch thickness)
      const result = calculateConcrete({
        length: 6,
        width: 4,
        depth: 0.125,
        grade: 'M20'
      });

      // Volume = 3 m³
      expect(result.wetVolume).toBeCloseTo(3, 1);

      // Rough estimate: ~8-9 bags per m³ for M20
      // So 3m³ should need about 24-27 bags
      expect(result.cementBags).toBeGreaterThanOrEqual(20);
      expect(result.cementBags).toBeLessThanOrEqual(30);
    });

    it('should calculate for a column', () => {
      // 0.3m × 0.3m × 3m column
      const result = calculateConcrete({
        length: 0.3,
        width: 0.3,
        depth: 3,
        grade: 'M25'
      });

      expect(result.wetVolume).toBeCloseTo(0.27, 2);
    });

    it('should calculate for a footing', () => {
      // 1.5m × 1.5m × 0.3m footing
      const result = calculateConcrete({
        length: 1.5,
        width: 1.5,
        depth: 0.3,
        grade: 'M20'
      });

      expect(result.wetVolume).toBeCloseTo(0.675, 2);
    });

    it('should calculate for PCC floor', () => {
      // 10m × 8m × 0.1m lean concrete floor
      const result = calculateConcrete({
        length: 10,
        width: 8,
        depth: 0.1,
        grade: 'M10'
      });

      expect(result.wetVolume).toBe(8);
      // M10 uses less cement than M20
      expect(result.ratio).toBe('1:3:6');
    });
  });
});
