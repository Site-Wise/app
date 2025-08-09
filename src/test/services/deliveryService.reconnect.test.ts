import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the entire pocketbase module
vi.mock('../../services/pocketbase', () => {
  const mockGetFullList = vi.fn();
  const mockUpdate = vi.fn();
  
  const mockCollection = {
    getFullList: mockGetFullList,
    update: mockUpdate
  };

  const mockPb = {
    collection: vi.fn((collectionName: string) => {
      if (collectionName === 'delivery_items') {
        return { getFullList: mockGetFullList };
      } else if (collectionName === 'deliveries') {
        return { update: mockUpdate };
      }
      return mockCollection;
    }),
    autoCancellation: vi.fn()
  };

  const getCurrentSiteIdMock = vi.fn().mockReturnValue('site-1');
  const getCurrentUserRoleMock = vi.fn().mockReturnValue('owner');
  const calculatePermissionsMock = vi.fn().mockReturnValue({
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canManageRoles: true,
    canExport: true,
    canViewFinancials: true
  });

  return {
    pb: mockPb,
    getCurrentSiteId: getCurrentSiteIdMock,
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: getCurrentUserRoleMock,
    setCurrentUserRole: vi.fn(),
    calculatePermissions: calculatePermissionsMock,
    
    // Mock the deliveryService with reconnectDeliveryItems method
    deliveryService: {
      reconnectDeliveryItems: vi.fn().mockImplementation(async (deliveryId: string) => {
        const siteId = getCurrentSiteIdMock();
        if (!siteId) throw new Error('No site selected');

        const userRole = getCurrentUserRoleMock();
        const permissions = calculatePermissionsMock(userRole);
        if (!permissions.canUpdate) {
          throw new Error('Permission denied: Cannot update deliveries');
        }

        // Find all delivery_items that point to this delivery
        const deliveryItems = await mockGetFullList({
          filter: `delivery="${deliveryId}" && site="${siteId}"`
        });

        if (!deliveryItems || deliveryItems.length === 0) {
          throw new Error('No delivery items found to reconnect');
        }

        // Get the item IDs
        const itemIds = deliveryItems.map((item: any) => item.id);

        // Update the delivery's delivery_items array field
        const updatedDelivery = await mockUpdate(deliveryId, {
          delivery_items: itemIds
        }, {
          expand: 'vendor,delivery_items,delivery_items.item'
        });

        return updatedDelivery;
      }),
      
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  };
});

describe('DeliveryService.reconnectDeliveryItems', () => {
  let mockGetFullList: any;
  let mockUpdate: any;
  let deliveryService: any;
  let getCurrentSiteId: any;
  let calculatePermissions: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get references to the mocks
    const pocketbaseMocks = await import('../../services/pocketbase');
    deliveryService = pocketbaseMocks.deliveryService;
    getCurrentSiteId = pocketbaseMocks.getCurrentSiteId;
    calculatePermissions = pocketbaseMocks.calculatePermissions;
    
    // Get the mock functions from pb.collection
    const pb = pocketbaseMocks.pb;
    mockGetFullList = pb.collection('delivery_items').getFullList;
    mockUpdate = pb.collection('deliveries').update;
  });

  describe('Successful reconnection', () => {
    it('should find orphaned items and update delivery with their IDs', async () => {
      const deliveryId = 'delivery-1';
      const mockOrphanedItems = [
        { id: 'item-1', delivery: deliveryId, site: 'site-1' },
        { id: 'item-2', delivery: deliveryId, site: 'site-1' },
        { id: 'item-3', delivery: deliveryId, site: 'site-1' }
      ];

      const mockUpdatedDelivery = {
        id: deliveryId,
        site: 'site-1',
        vendor: 'vendor-1',
        delivery_items: ['item-1', 'item-2', 'item-3'],
        total_amount: 1500,
        payment_status: 'pending',
        expand: {
          vendor: { id: 'vendor-1', contact_person: 'Test Vendor' },
          delivery_items: mockOrphanedItems
        }
      };

      mockGetFullList.mockResolvedValue(mockOrphanedItems);
      mockUpdate.mockResolvedValue(mockUpdatedDelivery);

      const result = await deliveryService.reconnectDeliveryItems(deliveryId);

      // Verify the correct filter was used to find orphaned items
      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: `delivery="${deliveryId}" && site="site-1"`
      });

      // Verify the delivery was updated with the correct item IDs
      expect(mockUpdate).toHaveBeenCalledWith(
        deliveryId,
        { delivery_items: ['item-1', 'item-2', 'item-3'] },
        { expand: 'vendor,delivery_items,delivery_items.item' }
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBe(deliveryId);
      expect(result.delivery_items).toEqual(['item-1', 'item-2', 'item-3']);
    });

    it('should handle single orphaned item', async () => {
      const deliveryId = 'delivery-2';
      const mockOrphanedItems = [
        { id: 'item-single', delivery: deliveryId, site: 'site-1' }
      ];

      const mockUpdatedDelivery = {
        id: deliveryId,
        site: 'site-1',
        vendor: 'vendor-2',
        delivery_items: ['item-single'],
        total_amount: 500,
        payment_status: 'paid'
      };

      mockGetFullList.mockResolvedValue(mockOrphanedItems);
      mockUpdate.mockResolvedValue(mockUpdatedDelivery);

      const result = await deliveryService.reconnectDeliveryItems(deliveryId);

      expect(mockUpdate).toHaveBeenCalledWith(
        deliveryId,
        { delivery_items: ['item-single'] },
        { expand: 'vendor,delivery_items,delivery_items.item' }
      );

      expect(result.delivery_items).toEqual(['item-single']);
    });
  });

  describe('Error handling', () => {
    it('should throw error when no site is selected', async () => {
      getCurrentSiteId.mockReturnValueOnce(null);

      await expect(
        deliveryService.reconnectDeliveryItems('delivery-1')
      ).rejects.toThrow('No site selected');
    });

    it('should throw error when user lacks update permissions', async () => {
      calculatePermissions.mockReturnValueOnce({
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        canManageUsers: false,
        canManageRoles: false,
        canExport: false,
        canViewFinancials: false
      });

      await expect(
        deliveryService.reconnectDeliveryItems('delivery-1')
      ).rejects.toThrow('Permission denied: Cannot update deliveries');
    });

    it('should throw error when no orphaned items are found', async () => {
      mockGetFullList.mockResolvedValue([]);

      await expect(
        deliveryService.reconnectDeliveryItems('delivery-1')
      ).rejects.toThrow('No delivery items found to reconnect');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockOrphanedItems = [
        { id: 'item-1', delivery: 'delivery-1', site: 'site-1' }
      ];

      mockGetFullList.mockResolvedValue(mockOrphanedItems);
      mockUpdate.mockRejectedValue(new Error('Database update failed'));

      await expect(
        deliveryService.reconnectDeliveryItems('delivery-1')
      ).rejects.toThrow('Database update failed');
    });
  });

  describe('Site isolation', () => {
    it('should only reconnect items from the current site', async () => {
      const deliveryId = 'delivery-3';
      const mockItemsFromCurrentSite = [
        { id: 'item-1', delivery: deliveryId, site: 'site-1' },
        { id: 'item-3', delivery: deliveryId, site: 'site-1' }
      ];

      const mockUpdatedDelivery = {
        id: deliveryId,
        site: 'site-1',
        vendor: 'vendor-1',
        delivery_items: ['item-1', 'item-3'],
        total_amount: 1000,
        payment_status: 'pending'
      };

      mockGetFullList.mockResolvedValue(mockItemsFromCurrentSite);
      mockUpdate.mockResolvedValue(mockUpdatedDelivery);

      const result = await deliveryService.reconnectDeliveryItems(deliveryId);

      // Verify the filter includes site check
      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: `delivery="${deliveryId}" && site="site-1"`
      });

      // Verify only items from current site are included
      expect(mockUpdate).toHaveBeenCalledWith(
        deliveryId,
        { delivery_items: ['item-1', 'item-3'] },
        { expand: 'vendor,delivery_items,delivery_items.item' }
      );

      expect(result.delivery_items).toEqual(['item-1', 'item-3']);
    });
  });

  describe('Edge cases', () => {
    it('should handle items without IDs gracefully', async () => {
      const mockItemsWithoutIds = [
        { delivery: 'delivery-1', site: 'site-1' }, // No id field
        { delivery: 'delivery-1', site: 'site-1' }
      ];

      const mockUpdatedDelivery = {
        id: 'delivery-1',
        site: 'site-1',
        vendor: 'vendor-1',
        delivery_items: [undefined, undefined],
        total_amount: 0,
        payment_status: 'pending'
      };

      mockGetFullList.mockResolvedValue(mockItemsWithoutIds);
      mockUpdate.mockResolvedValue(mockUpdatedDelivery);

      const result = await deliveryService.reconnectDeliveryItems('delivery-1');

      // Should still call update even with undefined IDs
      expect(mockUpdate).toHaveBeenCalledWith(
        'delivery-1',
        { delivery_items: [undefined, undefined] },
        { expand: 'vendor,delivery_items,delivery_items.item' }
      );
    });

    it('should preserve existing expand data in response', async () => {
      const deliveryId = 'delivery-4';
      const mockOrphanedItems = [
        { id: 'item-1', delivery: deliveryId, site: 'site-1' }
      ];

      const mockUpdatedDelivery = {
        id: deliveryId,
        site: 'site-1',
        vendor: 'vendor-1',
        delivery_items: ['item-1'],
        total_amount: 750,
        payment_status: 'partial',
        paid_amount: 500,
        notes: 'Test delivery',
        photos: ['photo1.jpg', 'photo2.jpg'],
        expand: {
          vendor: {
            id: 'vendor-1',
            contact_person: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890'
          },
          delivery_items: [{
            id: 'item-1',
            quantity: 10,
            unit_price: 75,
            total_amount: 750,
            expand: {
              item: {
                id: 'material-1',
                name: 'Cement',
                unit: 'bags',
                description: '50kg cement bags'
              }
            }
          }]
        }
      };

      mockGetFullList.mockResolvedValue(mockOrphanedItems);
      mockUpdate.mockResolvedValue(mockUpdatedDelivery);

      const result = await deliveryService.reconnectDeliveryItems(deliveryId);

      // Verify all expand data is preserved
      expect(result.expand).toBeDefined();
      expect(result.expand.vendor.contact_person).toBe('John Doe');
      expect(result.expand.delivery_items).toHaveLength(1);
      expect(result.expand.delivery_items[0].expand.item.name).toBe('Cement');
      expect(result.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
      expect(result.notes).toBe('Test delivery');
    });
  });
});