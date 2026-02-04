import { describe, it, expect, beforeEach } from 'vitest';
import {
  useRebarCalculator,
  calculateWeightPerMeter,
  calculateRebarWeight,
  calculateTotalWeight,
  createEmptyEntry,
  STANDARD_DIAMETERS,
  STEEL_DENSITY,
  WEIGHT_FACTOR
} from '../../composables/useRebarCalculator';

describe('useRebarCalculator', () => {
  describe('Constants', () => {
    it('should have correct standard diameters', () => {
      expect(STANDARD_DIAMETERS).toEqual([6, 8, 10, 12, 16, 20, 25, 32]);
    });

    it('should have correct steel density', () => {
      expect(STEEL_DENSITY).toBe(7850);
    });

    it('should have correct weight factor', () => {
      // WEIGHT_FACTOR = (π/4) × (1/1000000) × 7850 ≈ 0.00617
      const expected = (Math.PI / 4) * (1 / 1000000) * 7850;
      expect(WEIGHT_FACTOR).toBeCloseTo(expected, 10);
    });
  });

  describe('calculateWeightPerMeter', () => {
    it('should calculate weight per meter for 8mm rebar', () => {
      const result = calculateWeightPerMeter(8);
      // 8² × 0.00617 = 64 × 0.00617 ≈ 0.395 kg/m
      expect(result).toBeCloseTo(0.395, 2);
    });

    it('should calculate weight per meter for 10mm rebar', () => {
      const result = calculateWeightPerMeter(10);
      // 10² × 0.00617 = 100 × 0.00617 ≈ 0.617 kg/m
      expect(result).toBeCloseTo(0.617, 2);
    });

    it('should calculate weight per meter for 12mm rebar', () => {
      const result = calculateWeightPerMeter(12);
      // 12² × 0.00617 = 144 × 0.00617 ≈ 0.888 kg/m
      expect(result).toBeCloseTo(0.888, 2);
    });

    it('should calculate weight per meter for 16mm rebar', () => {
      const result = calculateWeightPerMeter(16);
      // 16² × 0.00617 = 256 × 0.00617 ≈ 1.58 kg/m
      expect(result).toBeCloseTo(1.58, 2);
    });

    it('should calculate weight per meter for 20mm rebar', () => {
      const result = calculateWeightPerMeter(20);
      // 20² × 0.00617 = 400 × 0.00617 ≈ 2.47 kg/m
      expect(result).toBeCloseTo(2.47, 2);
    });

    it('should calculate weight per meter for 25mm rebar', () => {
      const result = calculateWeightPerMeter(25);
      // 25² × 0.00617 = 625 × 0.00617 ≈ 3.85 kg/m
      expect(result).toBeCloseTo(3.85, 2);
    });

    it('should return 0 for 0mm diameter', () => {
      const result = calculateWeightPerMeter(0);
      expect(result).toBe(0);
    });
  });

  describe('calculateRebarWeight', () => {
    it('should calculate weight for a single 12mm bar of 12m length', () => {
      const entry = { id: 'test-1', diameter: 12, length: 12, quantity: 1 };
      const result = calculateRebarWeight(entry);

      expect(result.entry).toEqual(entry);
      expect(result.weightPerMeter).toBeCloseTo(0.888, 2);
      expect(result.weightPerBar).toBeCloseTo(10.66, 1);
      expect(result.totalWeight).toBeCloseTo(10.66, 1);
    });

    it('should calculate weight for multiple bars', () => {
      const entry = { id: 'test-2', diameter: 12, length: 12, quantity: 10 };
      const result = calculateRebarWeight(entry);

      expect(result.weightPerBar).toBeCloseTo(10.65, 0);
      expect(result.totalWeight).toBeCloseTo(106.5, 0);
    });

    it('should handle different lengths', () => {
      const entry = { id: 'test-3', diameter: 16, length: 6, quantity: 5 };
      const result = calculateRebarWeight(entry);

      const weightPerMeter = calculateWeightPerMeter(16);
      const weightPerBar = weightPerMeter * 6;
      const totalWeight = weightPerBar * 5;

      expect(result.weightPerMeter).toBeCloseTo(weightPerMeter, 4);
      expect(result.weightPerBar).toBeCloseTo(weightPerBar, 2);
      expect(result.totalWeight).toBeCloseTo(totalWeight, 2);
    });

    it('should handle fractional lengths', () => {
      const entry = { id: 'test-4', diameter: 10, length: 3.5, quantity: 2 };
      const result = calculateRebarWeight(entry);

      const weightPerMeter = calculateWeightPerMeter(10);
      const weightPerBar = weightPerMeter * 3.5;
      const totalWeight = weightPerBar * 2;

      expect(result.totalWeight).toBeCloseTo(totalWeight, 4);
    });
  });

  describe('calculateTotalWeight', () => {
    it('should calculate total weight for multiple entries', () => {
      const entries = [
        { id: '1', diameter: 12, length: 12, quantity: 10 },
        { id: '2', diameter: 16, length: 12, quantity: 5 },
        { id: '3', diameter: 20, length: 6, quantity: 20 }
      ];

      const result = calculateTotalWeight(entries);

      // Calculate expected
      let expected = 0;
      for (const entry of entries) {
        const calc = calculateRebarWeight(entry);
        expected += calc.totalWeight;
      }

      expect(result).toBeCloseTo(expected, 4);
    });

    it('should return 0 for empty array', () => {
      const result = calculateTotalWeight([]);
      expect(result).toBe(0);
    });
  });

  describe('createEmptyEntry', () => {
    it('should create an entry with default values', () => {
      const entry = createEmptyEntry();

      expect(entry.id).toBeDefined();
      expect(entry.id.startsWith('rebar-')).toBe(true);
      expect(entry.diameter).toBe(12);
      expect(entry.length).toBe(12);
      expect(entry.quantity).toBe(1);
    });

    it('should create unique IDs', () => {
      const entry1 = createEmptyEntry();
      const entry2 = createEmptyEntry();

      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('useRebarCalculator composable', () => {
    let calc: ReturnType<typeof useRebarCalculator>;

    beforeEach(() => {
      calc = useRebarCalculator();
      calc.clearAll(); // Start fresh
    });

    it('should initialize with one empty entry', () => {
      expect(calc.entries.value).toHaveLength(1);
      expect(calc.entries.value[0].diameter).toBe(12);
    });

    it('should calculate total weight reactively', () => {
      calc.entries.value[0].diameter = 12;
      calc.entries.value[0].length = 12;
      calc.entries.value[0].quantity = 10;

      // totalWeight should update reactively
      // 12mm × 12m × 10 = approximately 106.5 kg
      expect(calc.totalWeight.value).toBeCloseTo(106.5, 0);
    });

    it('should calculate total bars', () => {
      calc.entries.value[0].quantity = 5;
      calc.addEntry();
      calc.entries.value[1].quantity = 10;

      expect(calc.totalBars.value).toBe(15);
    });

    it('should add new entries', () => {
      calc.addEntry();
      expect(calc.entries.value).toHaveLength(2);
    });

    it('should remove entries by id', () => {
      calc.addEntry();
      calc.addEntry();
      expect(calc.entries.value).toHaveLength(3);

      const idToRemove = calc.entries.value[1].id;
      calc.removeEntry(idToRemove);

      expect(calc.entries.value).toHaveLength(2);
      expect(calc.entries.value.find(e => e.id === idToRemove)).toBeUndefined();
    });

    it('should not remove last entry', () => {
      expect(calc.entries.value).toHaveLength(1);
      const id = calc.entries.value[0].id;

      calc.removeEntry(id);

      // Should still have 1 entry
      expect(calc.entries.value).toHaveLength(1);
    });

    it('should update entries', () => {
      const id = calc.entries.value[0].id;
      calc.updateEntry(id, { diameter: 20, length: 6 });

      expect(calc.entries.value[0].diameter).toBe(20);
      expect(calc.entries.value[0].length).toBe(6);
      expect(calc.entries.value[0].id).toBe(id); // ID should not change
    });

    it('should clear all entries and reset', () => {
      calc.addEntry();
      calc.addEntry();
      calc.entries.value[0].diameter = 25;
      calc.entries.value[1].diameter = 32;

      expect(calc.entries.value).toHaveLength(3);

      calc.clearAll();

      expect(calc.entries.value).toHaveLength(1);
      expect(calc.entries.value[0].diameter).toBe(12); // Default
    });

    it('should set entries from external source', () => {
      const externalEntries = [
        { diameter: 10, length: 10, quantity: 5 },
        { diameter: 16, length: 8, quantity: 3 }
      ];

      calc.setEntries(externalEntries);

      expect(calc.entries.value).toHaveLength(2);
      expect(calc.entries.value[0].diameter).toBe(10);
      expect(calc.entries.value[1].diameter).toBe(16);
      // IDs should be generated
      expect(calc.entries.value[0].id).toBeDefined();
      expect(calc.entries.value[1].id).toBeDefined();
    });

    it('should get calculation for specific entry', () => {
      const id = calc.entries.value[0].id;
      calc.entries.value[0].diameter = 16;
      calc.entries.value[0].length = 10;
      calc.entries.value[0].quantity = 5;

      const calcResult = calc.getCalculation(id);

      expect(calcResult).toBeDefined();
      expect(calcResult?.weightPerMeter).toBeCloseTo(1.58, 2);
      expect(calcResult?.totalWeight).toBeCloseTo(78.9, 1);
    });

    it('should return undefined for non-existent entry', () => {
      const result = calc.getCalculation('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should expose standard diameters', () => {
      expect(calc.standardDiameters).toEqual(STANDARD_DIAMETERS);
    });

    it('should expose utility functions', () => {
      expect(typeof calc.calculateWeightPerMeter).toBe('function');
      expect(typeof calc.calculateRebarWeight).toBe('function');
    });

    it('should provide calculations for all entries', () => {
      calc.addEntry();
      calc.entries.value[0].diameter = 12;
      calc.entries.value[1].diameter = 16;

      const calculations = calc.calculations.value;

      expect(calculations).toHaveLength(2);
      expect(calculations[0].entry.diameter).toBe(12);
      expect(calculations[1].entry.diameter).toBe(16);
    });
  });

  describe('Real-world scenarios', () => {
    it('should match typical construction delivery verification', () => {
      // Scenario: Delivery of 100 bars of 12mm × 12m rebar
      // Expected weight: approx 1065 kg (about 1 tonne)
      const calc = useRebarCalculator();
      calc.clearAll();

      calc.entries.value[0].diameter = 12;
      calc.entries.value[0].length = 12;
      calc.entries.value[0].quantity = 100;

      // Standard weight for 12mm rebar is about 0.888 kg/m
      // 100 bars × 12m × 0.888 kg/m ≈ 1065 kg
      expect(calc.totalWeight.value).toBeGreaterThan(1000);
      expect(calc.totalWeight.value).toBeLessThan(1100);
    });

    it('should handle mixed delivery', () => {
      // Scenario: Mixed delivery
      // 50 bars of 8mm × 12m
      // 30 bars of 12mm × 12m
      // 20 bars of 16mm × 12m
      const calc = useRebarCalculator();
      calc.clearAll();

      calc.entries.value[0].diameter = 8;
      calc.entries.value[0].length = 12;
      calc.entries.value[0].quantity = 50;

      calc.addEntry();
      calc.entries.value[1].diameter = 12;
      calc.entries.value[1].length = 12;
      calc.entries.value[1].quantity = 30;

      calc.addEntry();
      calc.entries.value[2].diameter = 16;
      calc.entries.value[2].length = 12;
      calc.entries.value[2].quantity = 20;

      // Verify total bars
      expect(calc.totalBars.value).toBe(100);

      // Calculate expected weight
      // 8mm: 50 × 12 × 0.395 ≈ 237 kg
      // 12mm: 30 × 12 × 0.888 ≈ 320 kg
      // 16mm: 20 × 12 × 1.58 ≈ 379 kg
      // Total ≈ 935 kg
      expect(calc.totalWeight.value).toBeGreaterThan(900);
      expect(calc.totalWeight.value).toBeLessThan(1000);
    });
  });
});
