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

// Create mock functions that will be used across tests
const getCurrentSiteIdMock = vi.fn();
const getCurrentUserRoleMock = vi.fn();
const calculatePermissionsMock = vi.fn();

// Mock site context functions
vi.mock('../../services/pocketbase', async () => {
  const actual = await vi.importActual('../../services/pocketbase');
  
  return {
    ...actual,
    getCurrentSiteId: getCurrentSiteIdMock,
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: getCurrentUserRoleMock,
    setCurrentUserRole: vi.fn(),
    calculatePermissions: calculatePermissionsMock,
    pb: {
      collection: vi.fn(() => mockCollection)
    }
  };
});

describe('DeliveryItemService Site Isolation', () => {
  let deliveryItemService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset mocks to their default values
    getCurrentSiteIdMock.mockReturnValue('site-1');
    getCurrentUserRoleMock.mockReturnValue('owner');
    calculatePermissionsMock.mockReturnValue({
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canManageUsers: true,
      canManageRoles: true,
      canExport: true,
      canViewFinancials: true
    });
    
    // Import the service after mocks are set up
    const module = await import('../../services/pocketbase');
    deliveryItemService = module.deliveryItemService;
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

      const result = await deliveryItemService.getByDelivery('delivery-1');

      expect(mockCollection.getFullList).toHaveBeenCalledWith({
        filter: 'delivery="delivery-1" && site="site-1"',
        expand: 'delivery,item'
      });
      expect(result).toEqual(mockRecords);
    });

    it('should throw error when no site is selected', async () => {
      getCurrentSiteIdMock.mockReturnValue(null);

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

    it('should throw error when no site is selected', async () => {
      getCurrentSiteIdMock.mockReturnValue(null);

      await expect(deliveryItemService.getById('item-1')).rejects.toThrow('No site selected');
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

      const result = await deliveryItemService.create(createData);

      expect(mockCollection.create).toHaveBeenCalledWith({
        ...createData,
        site: 'site-1'
      });
      expect(result).toEqual(mockCreatedRecord);
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
      getCurrentSiteIdMock.mockReturnValue(null);

      const createData = {
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000
      };

      await expect(deliveryItemService.create(createData)).rejects.toThrow('No site selected');
    });

    it('should throw error when user lacks create permissions', async () => {
      calculatePermissionsMock.mockReturnValue({
        canCreate: false,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        canManageUsers: false,
        canManageRoles: false,
        canExport: true,
        canViewFinancials: true
      });

      const createData = {
        delivery: 'delivery-1',
        item: 'item-1',
        quantity: 10,
        unit_price: 100,
        total_amount: 1000
      };

      await expect(deliveryItemService.create(createData)).rejects.toThrow('Permission denied: Cannot create delivery items');
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

      const result = await deliveryItemService.update('item-1', updateData);

      expect(mockCollection.getOne).toHaveBeenCalledWith('item-1');
      expect(mockCollection.update).toHaveBeenCalledWith('item-1', updateData);
      expect(result).toEqual(mockUpdatedRecord);
    });

    it('should throw error when user lacks update permissions', async () => {
      calculatePermissionsMock.mockReturnValue({
        canCreate: true,
        canRead: true,
        canUpdate: false,
        canDelete: true,
        canManageUsers: false,
        canManageRoles: false,
        canExport: true,
        canViewFinancials: true
      });

      const updateData = {
        quantity: 15,
        total_amount: 1500
      };

      await expect(deliveryItemService.update('item-1', updateData)).rejects.toThrow('Permission denied: Cannot update delivery items');
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

    it('should throw error when user lacks delete permissions', async () => {
      calculatePermissionsMock.mockReturnValue({
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        canManageUsers: false,
        canManageRoles: false,
        canExport: true,
        canViewFinancials: true
      });

      await expect(deliveryItemService.delete('item-1')).rejects.toThrow('Permission denied: Cannot delete delivery items');
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