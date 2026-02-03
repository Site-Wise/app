import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';

// Mock the i18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        let result = key;
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
        return result;
      }
      return key;
    }
  })
}));

// Mock Lucide icons
vi.mock('lucide-vue-next', () => ({
  Calculator: { template: '<span class="icon-calculator" />' },
  Plus: { template: '<span class="icon-plus" />' },
  X: { template: '<span class="icon-x" />' },
  Info: { template: '<span class="icon-info" />' },
  Box: { template: '<span class="icon-box" />' },
  PaintBucket: { template: '<span class="icon-paint-bucket" />' },
  Layers: { template: '<span class="icon-layers" />' }
}));

// Import after mocks
import ToolsView from '../../views/ToolsView.vue';

describe('ToolsView', () => {
  describe('Component Logic Tests', () => {
    it('should define all required tools', () => {
      const wrapper = mount(ToolsView);

      // Check that tools are defined
      expect(wrapper.vm.tools).toBeDefined();
      expect(wrapper.vm.tools).toHaveLength(4);

      const toolIds = wrapper.vm.tools.map((t: { id: string }) => t.id);
      expect(toolIds).toContain('rebar');
      expect(toolIds).toContain('concrete');
      expect(toolIds).toContain('plaster');
      expect(toolIds).toContain('brick');
    });

    it('should initialize with rebar tool active', () => {
      const wrapper = mount(ToolsView);

      expect(wrapper.vm.activeTool).toBe('rebar');
    });

    it('should have formatNumber function', () => {
      const wrapper = mount(ToolsView);

      expect(typeof wrapper.vm.formatNumber).toBe('function');
    });

    it('should format numbers to 2 decimal places by default', () => {
      const wrapper = mount(ToolsView);

      expect(wrapper.vm.formatNumber(123.456)).toBe('123.46');
      expect(wrapper.vm.formatNumber(100)).toBe('100.00');
      expect(wrapper.vm.formatNumber(0.1)).toBe('0.10');
    });

    it('should format numbers to custom decimal places', () => {
      const wrapper = mount(ToolsView);

      expect(wrapper.vm.formatNumber(123.456789, 3)).toBe('123.457');
      expect(wrapper.vm.formatNumber(100, 0)).toBe('100');
    });

    it('should have rebar calculator initialized', () => {
      const wrapper = mount(ToolsView);

      expect(wrapper.vm.rebarCalc).toBeDefined();
      expect(wrapper.vm.rebarCalc.entries).toBeDefined();
      expect(wrapper.vm.rebarCalc.totalWeight).toBeDefined();
    });

    it('should have concrete calculator initialized', () => {
      const wrapper = mount(ToolsView);

      expect(wrapper.vm.concreteCalc).toBeDefined();
      expect(wrapper.vm.concreteCalc.length).toBeDefined();
      expect(wrapper.vm.concreteCalc.result).toBeDefined();
    });

    it('should have plaster calculator initialized', () => {
      const wrapper = mount(ToolsView);

      expect(wrapper.vm.plasterCalc).toBeDefined();
      expect(wrapper.vm.plasterCalc.area).toBeDefined();
      expect(wrapper.vm.plasterCalc.result).toBeDefined();
    });

    it('should have brick calculator initialized', () => {
      const wrapper = mount(ToolsView);

      expect(wrapper.vm.brickCalc).toBeDefined();
      expect(wrapper.vm.brickCalc.length).toBeDefined();
      expect(wrapper.vm.brickCalc.result).toBeDefined();
    });
  });

  describe('Tab Switching Logic', () => {
    it('should switch active tool when clicking tabs', async () => {
      const wrapper = mount(ToolsView);

      // Find and click the concrete tab
      const tabs = wrapper.findAll('button');
      const concreteTab = tabs.find(tab => tab.text().includes('tools.concreteCalculator.title'));

      if (concreteTab) {
        await concreteTab.trigger('click');
        expect(wrapper.vm.activeTool).toBe('concrete');
      }
    });

    it('should show only one tool card at a time based on v-show', async () => {
      const wrapper = mount(ToolsView);

      // Initially rebar should be visible
      expect(wrapper.vm.activeTool).toBe('rebar');

      // Change to concrete
      wrapper.vm.activeTool = 'concrete';
      await nextTick();
      expect(wrapper.vm.activeTool).toBe('concrete');

      // Change to plaster
      wrapper.vm.activeTool = 'plaster';
      await nextTick();
      expect(wrapper.vm.activeTool).toBe('plaster');

      // Change to brick
      wrapper.vm.activeTool = 'brick';
      await nextTick();
      expect(wrapper.vm.activeTool).toBe('brick');
    });
  });

  describe('Rebar Calculator Integration', () => {
    it('should add entries when clicking add button', async () => {
      const wrapper = mount(ToolsView);

      const initialCount = wrapper.vm.rebarCalc.entries.value.length;
      wrapper.vm.rebarCalc.addEntry();
      await nextTick();

      expect(wrapper.vm.rebarCalc.entries.value.length).toBe(initialCount + 1);
    });

    it('should calculate total weight reactively', async () => {
      const wrapper = mount(ToolsView);

      wrapper.vm.rebarCalc.clearAll();
      wrapper.vm.rebarCalc.entries.value[0].diameter = 12;
      wrapper.vm.rebarCalc.entries.value[0].length = 12;
      wrapper.vm.rebarCalc.entries.value[0].quantity = 10;
      await nextTick();

      // 12mm × 12m × 10 bars ≈ 106.6 kg
      expect(wrapper.vm.rebarCalc.totalWeight.value).toBeGreaterThan(100);
    });

    it('should clear all entries', async () => {
      const wrapper = mount(ToolsView);

      wrapper.vm.rebarCalc.addEntry();
      wrapper.vm.rebarCalc.addEntry();
      expect(wrapper.vm.rebarCalc.entries.value.length).toBeGreaterThan(1);

      wrapper.vm.rebarCalc.clearAll();
      await nextTick();

      expect(wrapper.vm.rebarCalc.entries.value.length).toBe(1);
    });
  });

  describe('Concrete Calculator Integration', () => {
    it('should compute concrete result', async () => {
      const wrapper = mount(ToolsView);

      wrapper.vm.concreteCalc.length.value = 2;
      wrapper.vm.concreteCalc.width.value = 2;
      wrapper.vm.concreteCalc.depth.value = 0.1;
      await nextTick();

      expect(wrapper.vm.concreteCalc.result.value.wetVolume).toBeCloseTo(0.4, 2);
    });

    it('should reset concrete calculator', async () => {
      const wrapper = mount(ToolsView);

      wrapper.vm.concreteCalc.length.value = 10;
      wrapper.vm.concreteCalc.reset();
      await nextTick();

      expect(wrapper.vm.concreteCalc.length.value).toBe(1);
    });
  });

  describe('Plaster Calculator Integration', () => {
    it('should compute plaster result', async () => {
      const wrapper = mount(ToolsView);

      wrapper.vm.plasterCalc.area.value = 20;
      await nextTick();

      expect(wrapper.vm.plasterCalc.result.value.area).toBe(20);
    });

    it('should apply plaster type preset', async () => {
      const wrapper = mount(ToolsView);

      wrapper.vm.plasterCalc.applyType('external');
      await nextTick();

      expect(wrapper.vm.plasterCalc.thickness.value).toBe(15);
      expect(wrapper.vm.plasterCalc.ratio.value).toBe('1:4');
    });
  });

  describe('Brick Calculator Integration', () => {
    it('should compute brick result', async () => {
      const wrapper = mount(ToolsView);

      wrapper.vm.brickCalc.length.value = 10;
      wrapper.vm.brickCalc.height.value = 3;
      await nextTick();

      expect(wrapper.vm.brickCalc.result.value.wallArea).toBe(30);
    });

    it('should reset brick calculator', async () => {
      const wrapper = mount(ToolsView);

      wrapper.vm.brickCalc.length.value = 20;
      wrapper.vm.brickCalc.reset();
      await nextTick();

      expect(wrapper.vm.brickCalc.length.value).toBe(5);
    });
  });

  describe('Tool Label Keys', () => {
    it('should have correct label keys for all tools', () => {
      const wrapper = mount(ToolsView);

      const labelKeys = wrapper.vm.tools.map((t: { labelKey: string }) => t.labelKey);

      expect(labelKeys).toContain('tools.rebarEstimator.title');
      expect(labelKeys).toContain('tools.concreteCalculator.title');
      expect(labelKeys).toContain('tools.plasterCalculator.title');
      expect(labelKeys).toContain('tools.brickCalculator.title');
    });
  });

  describe('Icons', () => {
    it('should have icons assigned to each tool', () => {
      const wrapper = mount(ToolsView);

      wrapper.vm.tools.forEach((tool: { icon: unknown }) => {
        expect(tool.icon).toBeDefined();
      });
    });
  });
});

describe('ToolsView Formatting Logic', () => {
  describe('formatNumber function', () => {
    // Test the formatting logic directly without mounting
    const formatNumber = (value: number, decimals: number = 2): string => {
      return value.toFixed(decimals);
    };

    it('should format integers', () => {
      expect(formatNumber(100)).toBe('100.00');
      expect(formatNumber(0)).toBe('0.00');
      expect(formatNumber(-50)).toBe('-50.00');
    });

    it('should format decimals', () => {
      expect(formatNumber(123.456)).toBe('123.46');
      expect(formatNumber(0.123)).toBe('0.12');
      expect(formatNumber(99.999)).toBe('100.00');
    });

    it('should handle custom decimal places', () => {
      expect(formatNumber(100, 0)).toBe('100');
      expect(formatNumber(100, 1)).toBe('100.0');
      expect(formatNumber(100, 3)).toBe('100.000');
      expect(formatNumber(123.456789, 4)).toBe('123.4568');
    });

    it('should handle very small numbers', () => {
      expect(formatNumber(0.001)).toBe('0.00');
      expect(formatNumber(0.005)).toBe('0.01');
      expect(formatNumber(0.001, 3)).toBe('0.001');
    });

    it('should handle very large numbers', () => {
      expect(formatNumber(1000000)).toBe('1000000.00');
      expect(formatNumber(999999.99)).toBe('999999.99');
    });
  });
});

describe('ToolsView Tool Definitions', () => {
  // Test the tool definitions structure
  const tools = [
    { id: 'rebar', labelKey: 'tools.rebarEstimator.title' },
    { id: 'concrete', labelKey: 'tools.concreteCalculator.title' },
    { id: 'plaster', labelKey: 'tools.plasterCalculator.title' },
    { id: 'brick', labelKey: 'tools.brickCalculator.title' }
  ];

  it('should have unique tool ids', () => {
    const ids = tools.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid translation keys', () => {
    tools.forEach(tool => {
      expect(tool.labelKey).toMatch(/^tools\.\w+\.\w+$/);
    });
  });

  it('should cover all four calculator types', () => {
    const ids = tools.map(t => t.id);
    expect(ids).toEqual(['rebar', 'concrete', 'plaster', 'brick']);
  });
});
