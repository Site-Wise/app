import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePlasterCalculator,
  calculatePlaster,
  calculatePlasterPerSqm,
  PLASTER_RATIOS,
  PLASTER_TYPES,
  CEMENT_BAG_WEIGHT,
  CEMENT_BAG_VOLUME,
  DRY_VOLUME_FACTOR,
  SAND_BULK_DENSITY,
  type PlasterRatio,
  type PlasterType
} from '../../composables/usePlasterCalculator';

describe('usePlasterCalculator', () => {
  describe('Constants', () => {
    it('should have correct cement bag weight', () => {
      expect(CEMENT_BAG_WEIGHT).toBe(50);
    });

    it('should have correct cement bag volume', () => {
      expect(CEMENT_BAG_VOLUME).toBe(0.0347);
    });

    it('should have correct dry volume factor', () => {
      expect(DRY_VOLUME_FACTOR).toBe(1.35);
    });

    it('should have correct sand bulk density', () => {
      expect(SAND_BULK_DENSITY).toBe(1450);
    });
  });

  describe('Plaster Ratios', () => {
    it('should have 1:3 rich mix', () => {
      const ratio = PLASTER_RATIOS['1:3'];
      expect(ratio.cement).toBe(1);
      expect(ratio.sand).toBe(3);
      expect(ratio.description).toContain('waterproof');
    });

    it('should have 1:4 external walls', () => {
      const ratio = PLASTER_RATIOS['1:4'];
      expect(ratio.cement).toBe(1);
      expect(ratio.sand).toBe(4);
    });

    it('should have 1:5 economical', () => {
      const ratio = PLASTER_RATIOS['1:5'];
      expect(ratio.cement).toBe(1);
      expect(ratio.sand).toBe(5);
    });

    it('should have 1:6 internal walls', () => {
      const ratio = PLASTER_RATIOS['1:6'];
      expect(ratio.cement).toBe(1);
      expect(ratio.sand).toBe(6);
    });
  });

  describe('Plaster Types', () => {
    it('should have external type preset', () => {
      const type = PLASTER_TYPES.external;
      expect(type.name).toBe('External');
      expect(type.thickness).toBe(15);
      expect(type.ratio).toBe('1:4');
    });

    it('should have internal type preset', () => {
      const type = PLASTER_TYPES.internal;
      expect(type.name).toBe('Internal');
      expect(type.thickness).toBe(12);
      expect(type.ratio).toBe('1:6');
    });

    it('should have ceiling type preset', () => {
      const type = PLASTER_TYPES.ceiling;
      expect(type.name).toBe('Ceiling');
      expect(type.thickness).toBe(8);
      expect(type.ratio).toBe('1:6');
    });

    it('should have waterproof type preset', () => {
      const type = PLASTER_TYPES.waterproof;
      expect(type.name).toBe('Waterproofing');
      expect(type.thickness).toBe(15);
      expect(type.ratio).toBe('1:3');
    });
  });

  describe('calculatePlaster', () => {
    it('should calculate for 10 sqm internal plaster', () => {
      const result = calculatePlaster({
        area: 10,
        thickness: 12,
        ratio: '1:6'
      });

      expect(result.area).toBe(10);
      expect(result.thickness).toBe(12);
      expect(result.ratio).toBe('1:6');

      // Wet volume = 10 × 0.012 = 0.12 m³
      expect(result.wetVolume).toBeCloseTo(0.12, 3);

      // Dry volume = 0.12 × 1.35 = 0.162 m³
      expect(result.dryVolume).toBeCloseTo(0.162, 3);
    });

    it('should calculate cement bags correctly', () => {
      const result = calculatePlaster({
        area: 100,
        thickness: 12,
        ratio: '1:6'
      });

      // For 100 sqm at 12mm with 1:6 ratio
      // Wet volume = 1.2 m³
      // Dry volume = 1.62 m³
      // Cement volume = 1.62 / 7 = 0.231 m³
      // Bags = 0.231 / 0.0347 ≈ 7 bags
      expect(result.cementBags).toBeGreaterThanOrEqual(6);
      expect(result.cementBags).toBeLessThanOrEqual(8);
    });

    it('should use more cement for richer mixes', () => {
      const lean = calculatePlaster({ area: 10, thickness: 12, ratio: '1:6' });
      const rich = calculatePlaster({ area: 10, thickness: 12, ratio: '1:3' });

      expect(rich.cementKg).toBeGreaterThan(lean.cementKg);
    });

    it('should scale with area', () => {
      const small = calculatePlaster({ area: 10, thickness: 12, ratio: '1:6' });
      const large = calculatePlaster({ area: 20, thickness: 12, ratio: '1:6' });

      expect(large.cementKg).toBeCloseTo(small.cementKg * 2, 1);
      expect(large.sandKg).toBeCloseTo(small.sandKg * 2, 1);
    });

    it('should scale with thickness', () => {
      const thin = calculatePlaster({ area: 10, thickness: 10, ratio: '1:6' });
      const thick = calculatePlaster({ area: 10, thickness: 20, ratio: '1:6' });

      expect(thick.wetVolume).toBeCloseTo(thin.wetVolume * 2, 4);
    });

    it('should calculate sand requirements', () => {
      const result = calculatePlaster({
        area: 10,
        thickness: 12,
        ratio: '1:4'
      });

      expect(result.sandM3).toBeGreaterThan(0);
      expect(result.sandKg).toBeCloseTo(result.sandM3 * SAND_BULK_DENSITY, 0);
    });

    it('should ceil cement bags', () => {
      const result = calculatePlaster({
        area: 5,
        thickness: 10,
        ratio: '1:6'
      });

      expect(Number.isInteger(result.cementBags)).toBe(true);
    });
  });

  describe('calculatePlasterPerSqm', () => {
    it('should calculate per sqm for internal plaster', () => {
      const result = calculatePlasterPerSqm(12, '1:6');

      expect(result.cementKg).toBeGreaterThan(0);
      expect(result.sandKg).toBeGreaterThan(0);

      // Rough estimate: ~1.5-2 kg cement per sqm at 12mm
      expect(result.cementKg).toBeGreaterThan(1);
      expect(result.cementKg).toBeLessThan(5);
    });

    it('should give more cement for richer mix', () => {
      const lean = calculatePlasterPerSqm(12, '1:6');
      const rich = calculatePlasterPerSqm(12, '1:3');

      expect(rich.cementKg).toBeGreaterThan(lean.cementKg);
    });

    it('should give more materials for thicker plaster', () => {
      const thin = calculatePlasterPerSqm(10, '1:6');
      const thick = calculatePlasterPerSqm(20, '1:6');

      expect(thick.cementKg).toBeCloseTo(thin.cementKg * 2, 1);
    });
  });

  describe('usePlasterCalculator composable', () => {
    let calc: ReturnType<typeof usePlasterCalculator>;

    beforeEach(() => {
      calc = usePlasterCalculator();
      calc.reset();
    });

    it('should initialize with default values', () => {
      expect(calc.area.value).toBe(10);
      expect(calc.thickness.value).toBe(12);
      expect(calc.ratio.value).toBe('1:6');
      expect(calc.plasterType.value).toBe('internal');
    });

    it('should compute result reactively', () => {
      calc.area.value = 20;

      expect(calc.result.value.area).toBe(20);
      expect(calc.result.value.wetVolume).toBeGreaterThan(0);
    });

    it('should compute per sqm values', () => {
      expect(calc.perSqm.value.cementKg).toBeGreaterThan(0);
      expect(calc.perSqm.value.sandKg).toBeGreaterThan(0);
    });

    it('should update per sqm when thickness changes', () => {
      const initial = calc.perSqm.value.cementKg;
      calc.thickness.value = 24;
      const updated = calc.perSqm.value.cementKg;

      expect(updated).toBeCloseTo(initial * 2, 1);
    });

    it('should provide list of ratios', () => {
      expect(calc.ratios).toBeDefined();
      expect(calc.ratios).toHaveLength(4);

      const ratioValues = calc.ratios.map(r => r.value);
      expect(ratioValues).toContain('1:3');
      expect(ratioValues).toContain('1:4');
      expect(ratioValues).toContain('1:5');
      expect(ratioValues).toContain('1:6');
    });

    it('should provide list of types', () => {
      expect(calc.types).toBeDefined();
      expect(calc.types).toHaveLength(4);

      const typeValues = calc.types.map(t => t.value);
      expect(typeValues).toContain('internal');
      expect(typeValues).toContain('external');
      expect(typeValues).toContain('ceiling');
      expect(typeValues).toContain('waterproof');
    });

    it('should apply preset type', () => {
      calc.applyType('external');

      expect(calc.plasterType.value).toBe('external');
      expect(calc.thickness.value).toBe(15);
      expect(calc.ratio.value).toBe('1:4');
    });

    it('should apply ceiling preset', () => {
      calc.applyType('ceiling');

      expect(calc.plasterType.value).toBe('ceiling');
      expect(calc.thickness.value).toBe(8);
      expect(calc.ratio.value).toBe('1:6');
    });

    it('should apply waterproof preset', () => {
      calc.applyType('waterproof');

      expect(calc.plasterType.value).toBe('waterproof');
      expect(calc.thickness.value).toBe(15);
      expect(calc.ratio.value).toBe('1:3');
    });

    it('should reset to default values', () => {
      calc.area.value = 50;
      calc.thickness.value = 20;
      calc.ratio.value = '1:3';
      calc.applyType('external');

      calc.reset();

      expect(calc.area.value).toBe(10);
      expect(calc.thickness.value).toBe(12);
      expect(calc.ratio.value).toBe('1:6');
      expect(calc.plasterType.value).toBe('internal');
    });

    it('should expose utility functions', () => {
      expect(typeof calc.calculatePlaster).toBe('function');
      expect(typeof calc.calculatePlasterPerSqm).toBe('function');
    });
  });

  describe('Real-world scenarios', () => {
    it('should calculate for a room (4 walls)', () => {
      // Room: 4m × 3m × 3m height
      // Wall area = 2×(4×3) + 2×(3×3) = 24 + 18 = 42 sqm
      // Less 2 sqm for door, 2 sqm for window = 38 sqm
      const result = calculatePlaster({
        area: 38,
        thickness: 12,
        ratio: '1:6'
      });

      expect(result.cementBags).toBeGreaterThanOrEqual(2);
      expect(result.cementBags).toBeLessThanOrEqual(5);
    });

    it('should calculate for external wall', () => {
      // External wall: 10m × 3m = 30 sqm at 15mm
      const result = calculatePlaster({
        area: 30,
        thickness: 15,
        ratio: '1:4'
      });

      expect(result.cementBags).toBeGreaterThanOrEqual(3);
    });

    it('should calculate for ceiling', () => {
      // Ceiling: 5m × 4m = 20 sqm at 8mm
      const result = calculatePlaster({
        area: 20,
        thickness: 8,
        ratio: '1:6'
      });

      expect(result.wetVolume).toBeCloseTo(0.16, 2);
    });

    it('should calculate for waterproofing', () => {
      // Bathroom waterproofing: 3m × 2m = 6 sqm at 15mm
      const result = calculatePlaster({
        area: 6,
        thickness: 15,
        ratio: '1:3'
      });

      // Rich mix should use more cement
      const leanResult = calculatePlaster({
        area: 6,
        thickness: 15,
        ratio: '1:6'
      });

      expect(result.cementKg).toBeGreaterThan(leanResult.cementKg);
    });
  });
});
