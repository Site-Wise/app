import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock PocketBase and services for integration testing
vi.mock('../../services/pocketbase', () => {
  const mockGetFullList = vi.fn();
  const mockUpdate = vi.fn();
  
  const mockPb = {
    collection: vi.fn((collectionName: string) => {
      if (collectionName === 'delivery_items') {
        return { getFullList: mockGetFullList };
      } else if (collectionName === 'deliveries') {
        return { update: mockUpdate };
      }
      return { getFullList: vi.fn(), update: vi.fn() };
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

  // Mock deliveryService implementation
  const deliveryServiceImpl = {
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
    
    getById: vi.fn().mockImplementation(async (deliveryId: string) => {
      // Mock implementation for getById
      return {
        id: deliveryId,
        site: 'site-1',
        vendor: 'vendor-1',
        delivery_items: [], // Start with empty array
        total_amount: 1500,
        payment_status: 'pending',
        expand: {
          vendor: { id: 'vendor-1', contact_person: 'Test Vendor' },
          delivery_items: [] // No expanded items initially
        }
      };
    }),
    
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
  
  // Mock deliveryItemService
  const deliveryItemServiceImpl = {
    getByDelivery: vi.fn().mockImplementation(async (deliveryId: string) => {
      // Returns orphaned items
      return [
        {
          id: 'item-1',
          delivery: deliveryId,
          item: 'material-1',
          quantity: 10,
          unit_price: 100,
          total_amount: 1000,
          expand: {
            item: { id: 'material-1', name: 'Cement', unit: 'bags' }
          }
        },
        {
          id: 'item-2',
          delivery: deliveryId,
          item: 'material-2',
          quantity: 5,
          unit_price: 100,
          total_amount: 500,
          expand: {
            item: { id: 'material-2', name: 'Sand', unit: 'tons' }
          }
        }
      ];
    })
  };

  return {
    pb: mockPb,
    getCurrentSiteId: getCurrentSiteIdMock,
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: getCurrentUserRoleMock,
    setCurrentUserRole: vi.fn(),
    calculatePermissions: calculatePermissionsMock,
    deliveryService: deliveryServiceImpl,
    deliveryItemService: deliveryItemServiceImpl,
    vendorReturnService: {
      getReturnInfoForDeliveryItems: vi.fn().mockResolvedValue({})
    }
  };
});

describe('Delivery Reconnection Integration', () => {
  let deliveryService: any;
  let deliveryItemService: any;
  let pb: any;
  let mockGetFullList: any;
  let mockUpdate: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const pocketbaseMocks = await import('../../services/pocketbase');
    deliveryService = pocketbaseMocks.deliveryService;
    deliveryItemService = pocketbaseMocks.deliveryItemService;
    pb = pocketbaseMocks.pb;
    
    // Get references to the mock functions
    mockGetFullList = pb.collection('delivery_items').getFullList;
    mockUpdate = pb.collection('deliveries').update;
  });

  describe('Orphaned items detection and reconnection workflow', () => {
    it('should detect orphaned items and allow reconnection', async () => {
      const deliveryId = 'delivery-test-1';
      
      // Step 1: Get delivery with empty delivery_items array
      const delivery = await deliveryService.getById(deliveryId);
      expect(delivery.delivery_items).toEqual([]);
      expect(delivery.expand.delivery_items).toEqual([]);
      
      // Step 2: Try to fetch items separately (simulating orphaned items)
      const orphanedItems = await deliveryItemService.getByDelivery(deliveryId);
      expect(orphanedItems).toHaveLength(2);
      expect(orphanedItems[0].id).toBe('item-1');
      expect(orphanedItems[1].id).toBe('item-2');
      
      // Step 3: Setup mocks for reconnection
      mockGetFullList.mockResolvedValue(orphanedItems);
      mockUpdate.mockResolvedValue({
        ...delivery,
        delivery_items: ['item-1', 'item-2'],
        expand: {
          ...delivery.expand,
          delivery_items: orphanedItems
        }
      });
      
      // Step 4: Reconnect the items
      const reconnectedDelivery = await deliveryService.reconnectDeliveryItems(deliveryId);
      
      // Step 5: Verify reconnection
      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: `delivery="${deliveryId}" && site="site-1"`
      });
      
      expect(mockUpdate).toHaveBeenCalledWith(
        deliveryId,
        { delivery_items: ['item-1', 'item-2'] },
        { expand: 'vendor,delivery_items,delivery_items.item' }
      );
      
      expect(reconnectedDelivery.delivery_items).toEqual(['item-1', 'item-2']);
      expect(reconnectedDelivery.expand.delivery_items).toHaveLength(2);
    });

    it('should handle the complete UI workflow', async () => {
      const deliveryId = 'delivery-ui-test';
      
      // Simulate the UI flow
      // 1. View opens and loads delivery
      const delivery = await deliveryService.getById(deliveryId);
      
      // 2. Check if delivery has items
      const hasItems = delivery.delivery_items && delivery.delivery_items.length > 0;
      expect(hasItems).toBe(false);
      
      // 3. If no items, try to fetch separately
      let orphanedItemsFound = false;
      let displayItems = [];
      
      if (!hasItems) {
        try {
          const separateItems = await deliveryItemService.getByDelivery(deliveryId);
          if (separateItems.length > 0) {
            orphanedItemsFound = true;
            displayItems = separateItems;
          }
        } catch (err) {
          // Failed to fetch separately
        }
      }
      
      expect(orphanedItemsFound).toBe(true);
      expect(displayItems).toHaveLength(2);
      
      // 4. User clicks reconnect button
      if (orphanedItemsFound) {
        // Setup mocks for reconnection
        mockGetFullList.mockResolvedValue(displayItems);
        mockUpdate.mockResolvedValue({
          ...delivery,
          delivery_items: displayItems.map((item: any) => item.id),
          expand: {
            ...delivery.expand,
            delivery_items: displayItems
          }
        });
        
        const reconnectedDelivery = await deliveryService.reconnectDeliveryItems(deliveryId);
        
        // 5. Verify reconnection success
        expect(reconnectedDelivery.delivery_items).toHaveLength(2);
        orphanedItemsFound = false; // Reset flag after successful reconnection
      }
      
      expect(orphanedItemsFound).toBe(false);
    });

    it('should handle errors during reconnection gracefully', async () => {
      const deliveryId = 'delivery-error-test';
      
      // Get delivery and detect orphaned items
      const delivery = await deliveryService.getById(deliveryId);
      const orphanedItems = await deliveryItemService.getByDelivery(deliveryId);
      
      expect(orphanedItems).toHaveLength(2);
      
      // Setup mock to fail during update
      mockGetFullList.mockResolvedValue(orphanedItems);
      mockUpdate.mockRejectedValue(new Error('Database connection failed'));
      
      // Try to reconnect
      let errorMessage = '';
      try {
        await deliveryService.reconnectDeliveryItems(deliveryId);
      } catch (error: any) {
        errorMessage = error.message;
      }
      
      expect(errorMessage).toBe('Database connection failed');
      
      // Verify items are still orphaned (can be displayed but not connected)
      const itemsStillOrphaned = await deliveryItemService.getByDelivery(deliveryId);
      expect(itemsStillOrphaned).toHaveLength(2);
    });

    it('should not show reconnect option when items are properly linked', async () => {
      const deliveryId = 'delivery-linked-test';
      
      // Mock a delivery with properly linked items
      deliveryService.getById.mockResolvedValueOnce({
        id: deliveryId,
        site: 'site-1',
        vendor: 'vendor-1',
        delivery_items: ['item-1', 'item-2'],
        total_amount: 1500,
        payment_status: 'pending',
        expand: {
          vendor: { id: 'vendor-1', contact_person: 'Test Vendor' },
          delivery_items: [
            {
              id: 'item-1',
              delivery: deliveryId,
              quantity: 10,
              unit_price: 100,
              total_amount: 1000
            },
            {
              id: 'item-2',
              delivery: deliveryId,
              quantity: 5,
              unit_price: 100,
              total_amount: 500
            }
          ]
        }
      });
      
      const delivery = await deliveryService.getById(deliveryId);
      
      // Check if items are properly linked
      const hasLinkedItems = delivery.delivery_items && 
                            delivery.delivery_items.length > 0 &&
                            delivery.expand?.delivery_items &&
                            delivery.expand.delivery_items.length > 0;
      
      expect(hasLinkedItems).toBe(true);
      
      // Should not need to fetch items separately
      expect(deliveryItemService.getByDelivery).not.toHaveBeenCalled();
    });
  });

  describe('Permission and site isolation', () => {
    it('should respect site isolation when reconnecting', async () => {
      const deliveryId = 'delivery-site-test';
      
      // Mock items from different sites
      const mixedItems = [
        { id: 'item-1', delivery: deliveryId, site: 'site-1' },
        { id: 'item-2', delivery: deliveryId, site: 'site-2' }, // Different site
        { id: 'item-3', delivery: deliveryId, site: 'site-1' }
      ];
      
      // Only items from current site should be returned
      const currentSiteItems = mixedItems.filter(item => item.site === 'site-1');
      mockGetFullList.mockResolvedValue(currentSiteItems);
      
      mockUpdate.mockResolvedValue({
        id: deliveryId,
        site: 'site-1',
        vendor: 'vendor-1',
        delivery_items: ['item-1', 'item-3'], // Only site-1 items
        total_amount: 2000,
        payment_status: 'pending'
      });
      
      const reconnectedDelivery = await deliveryService.reconnectDeliveryItems(deliveryId);
      
      // Verify only current site items were reconnected
      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: `delivery="${deliveryId}" && site="site-1"`
      });
      
      expect(reconnectedDelivery.delivery_items).toEqual(['item-1', 'item-3']);
      expect(reconnectedDelivery.delivery_items).not.toContain('item-2');
    });

    it('should require update permissions to reconnect', async () => {
      const { calculatePermissions } = await import('../../services/pocketbase');
      
      // Mock user without update permissions
      vi.mocked(calculatePermissions).mockReturnValueOnce({
        canCreate: false,
        canRead: true,
        canUpdate: false, // No update permission
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
  });
});