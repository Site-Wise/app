import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the entire pocketbase module
const mockCollection = {
  getFullList: vi.fn(),
  getOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
};

vi.mock('pocketbase', () => ({
  default: class MockPocketBase {
    collection = vi.fn(() => mockCollection);
    autoCancellation = vi.fn();
  }
}));

// Mock site context functions
vi.mock('../../services/pocketbase', async () => {
  const actual = await vi.importActual('../../services/pocketbase');
  return {
    ...actual,
    getCurrentSiteId: vi.fn(() => 'site-1'),
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: vi.fn(() => 'owner'),
    setCurrentUserRole: vi.fn(),
    calculatePermissions: vi.fn(() => ({
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canManageUsers: true,
      canManageRoles: true,
      canExport: true,
      canViewFinancials: true
    })),
    pb: {
      collection: vi.fn(() => mockCollection)
    }
  };
});

describe('DeliveryItemService Site Isolation', () => {
  let deliveryItemService: any;
  let getCurrentSiteId: any;
  let setCurrentSiteId: any;
  let getCurrentUserRole: any;
  let calculatePermissions: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the service after mocks are set up
    const module = await import('../../services/pocketbase');
    deliveryItemService = module.deliveryItemService;
    getCurrentSiteId = module.getCurrentSiteId;
    setCurrentSiteId = module.setCurrentSiteId;
    getCurrentUserRole = module.getCurrentUserRole;
    calculatePermissions = module.calculatePermissions;
    
    // Set default values
    getCurrentSiteId.mockReturnValue('site-1');
    getCurrentUserRole.mockReturnValue('owner');
    calculatePermissions.mockReturnValue({
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canManageUsers: true,
      canManageRoles: true,
      canExport: true,
      canViewFinancials: true
    });
  });

  describe('getByDelivery', () => {
    it('should include site filter in query', async () => {
      const mockRecords = [
        {
          id: 'item-1',
          delivery: 'delivery-1',
          item: 'item-1',
          quantity: 10,
          unit_price: 100,
          total_amount: 1000,
          site: 'site-1'
        }
      ];

      mockCollection.getFullList.mockResolvedValue(mockRecords);

      await deliveryItemService.getByDelivery('delivery-1');

      expect(mockCollection.getFullList).toHaveBeenCalledWith({
        filter: 'delivery="delivery-1" && site="site-1"',
        expand: 'delivery,item'
      });
    });

    it('should throw error when no site is selected', async () => {
      getCurrentSiteId.mockReturnValue(null);

      await expect(deliveryItemService.getByDelivery('delivery-1')).rejects.toThrow('No site selected');
    });
  });

  describe('getById', () => {
    it('should validate site access after fetching record', async () => {
      const mockRecord = {
        id: 'item-1',
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000,
        site: 'site-1'
      };

      mockCollection.getOne.mockResolvedValue(mockRecord);

      const result = await deliveryItemService.getById('item-1');

      expect(result.site).toBe('site-1');
      expect(mockCollection.getOne).toHaveBeenCalledWith('item-1', {
        expand: 'delivery,item'
      });
    });

    it('should throw error for cross-site access attempt', async () => {
      const mockRecord = {
        id: 'item-1',
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000,
        site: 'site-2' // Different site
      };

      mockCollection.getOne.mockResolvedValue(mockRecord);

      await expect(deliveryItemService.getById('item-1')).rejects.toThrow('Access denied: DeliveryItem not found in current site');
    });
  });

  describe('create', () => {
    it('should automatically add site to creation data', async () => {
      const mockDelivery = {
        id: 'delivery-1',
        site: 'site-1',
        delivery_items: []
      };

      const mockCreatedRecord = {
        id: 'item-1',
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000,
        site: 'site-1'
      };

      mockCollection.create.mockResolvedValue(mockCreatedRecord);
      mockCollection.getOne.mockResolvedValue(mockDelivery);
      mockCollection.update.mockResolvedValue(mockDelivery);

      const createData = {
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000,
        notes: 'Test item'
      };

      await deliveryItemService.create(createData);

      expect(mockCollection.create).toHaveBeenCalledWith({
        ...createData,
        site: 'site-1'
      });
    });

    it('should validate delivery belongs to current site', async () => {
      const mockDelivery = {
        id: 'delivery-1',
        site: 'site-2', // Different site
        delivery_items: []
      };

      mockCollection.getOne.mockResolvedValue(mockDelivery);

      const createData = {
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000
      };

      await expect(deliveryItemService.create(createData)).rejects.toThrow('Access denied: Cannot create delivery item for delivery in different site');
    });

    it('should throw error when no site is selected', async () => {
      getCurrentSiteId.mockReturnValue(null);

      const createData = {
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000
      };

      await expect(deliveryItemService.create(createData)).rejects.toThrow('No site selected');
    });
  });

  describe('update', () => {
    it('should validate site access before updating', async () => {
      const mockExistingRecord = {
        id: 'item-1',
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000,
        site: 'site-1'
      };

      const mockUpdatedRecord = {
        ...mockExistingRecord,
        quantity: 15,
        total_amount: 1500
      };

      mockCollection.getOne.mockResolvedValue(mockExistingRecord);
      mockCollection.update.mockResolvedValue(mockUpdatedRecord);

      const updateData = {
        quantity: 15,
        total_amount: 1500
      };

      await deliveryItemService.update('item-1', updateData);

      expect(mockCollection.getOne).toHaveBeenCalledWith('item-1');
      expect(mockCollection.update).toHaveBeenCalledWith('item-1', updateData);
    });

    it('should prevent cross-site updates', async () => {
      const mockExistingRecord = {
        id: 'item-1',
        site: 'site-2' // Different site
      };

      mockCollection.getOne.mockResolvedValue(mockExistingRecord);

      const updateData = {
        quantity: 15,
        total_amount: 1500
      };

      await expect(deliveryItemService.update('item-1', updateData)).rejects.toThrow('Access denied: Cannot update delivery item from different site');
    });

    it('should prevent site field modification', async () => {
      const mockExistingRecord = {
        id: 'item-1',
        site: 'site-1'
      };

      mockCollection.getOne.mockResolvedValue(mockExistingRecord);

      const updateData = {
        site: 'site-2', // Attempting to change site
        quantity: 15
      };

      await expect(deliveryItemService.update('item-1', updateData)).rejects.toThrow('Access denied: Cannot move delivery item to different site');
    });
  });

  describe('delete', () => {
    it('should validate site access before deleting', async () => {
      const mockExistingRecord = {
        id: 'item-1',
        delivery: 'delivery-1',
        site: 'site-1'
      };

      const mockDelivery = {
        id: 'delivery-1',
        site: 'site-1',
        delivery_items: ['item-1']
      };

      mockCollection.getOne.mockImplementation((id) => {
        if (id === 'item-1') return Promise.resolve(mockExistingRecord);
        if (id === 'delivery-1') return Promise.resolve(mockDelivery);
        return Promise.reject(new Error('Not found'));
      });
      mockCollection.delete.mockResolvedValue(true);
      mockCollection.update.mockResolvedValue(mockDelivery);

      const result = await deliveryItemService.delete('item-1');

      expect(result).toBe(true);
      expect(mockCollection.delete).toHaveBeenCalledWith('item-1');
    });

    it('should prevent cross-site deletion', async () => {
      const mockExistingRecord = {
        id: 'item-1',
        site: 'site-2' // Different site
      };

      mockCollection.getOne.mockResolvedValue(mockExistingRecord);

      await expect(deliveryItemService.delete('item-1')).rejects.toThrow('Access denied: Cannot delete delivery item from different site');
    });
  });
});