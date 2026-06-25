import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Logic-focused guard for the relation-filtered query methods that back the
 * deep-link/filter feature (e.g. /deliveries?vendor=<id>).
 *
 * For each new method we assert:
 *  (a) it throws when no site is selected (site-isolation invariant),
 *  (b) it passes the correct combined `site && <relation>` filter string, and
 *  (c) for the paginated deliveryService.getByVendor, the page/perPage args and
 *      the distinct requestKey are forwarded.
 *
 * Mirrors the self-contained mock pattern in deliveryService.requestKey.test.ts:
 * stable getList/getFullList spies on a mocked pocketbase, importing the REAL
 * service classes.
 */

const getListSpy = vi.fn();
const getFullListSpy = vi.fn();

vi.mock('pocketbase', () => {
  const MockPocketBase = function () {
    return {
      autoCancellation: vi.fn(),
      authStore: { isValid: true, model: { id: 'user-1' }, token: 'tok', onChange: vi.fn(), clear: vi.fn() },
      collection: vi.fn(() => ({
        getList: getListSpy,
        getFullList: getFullListSpy,
      })),
    };
  };
  return { default: MockPocketBase };
});

const {
  DeliveryService,
  PaymentService,
  ServiceBookingService,
  QuotationService,
  setCurrentSiteId,
  setCurrentUserRole,
} = await import('../../services/pocketbase');

describe('Relation-filtered query methods (deep-link/filter feature)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentSiteId('site-1');
    setCurrentUserRole('owner');
    getListSpy.mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 });
    getFullListSpy.mockResolvedValue([]);
  });

  describe('DeliveryService.getByVendor (paginated)', () => {
    let service: InstanceType<typeof DeliveryService>;
    beforeEach(() => { service = new DeliveryService(); });

    it('throws when no site is selected', async () => {
      setCurrentSiteId(null);
      await expect(service.getByVendor('vendor-9', 1, 50)).rejects.toThrow('No site selected');
      expect(getListSpy).not.toHaveBeenCalled();
    });

    it('passes the combined site + vendor filter', async () => {
      await service.getByVendor('vendor-9', 1, 50);
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        50,
        expect.objectContaining({
          filter: 'site="site-1" && vendor="vendor-9"',
          expand: 'vendor,delivery_items,delivery_items.item',
          sort: '-delivery_date',
        })
      );
    });

    it('forwards page/perPage and the distinct requestKey', async () => {
      await service.getByVendor('vendor-9', 3, 25);
      const [page, perPage, opts] = getListSpy.mock.calls[0];
      expect(page).toBe(3);
      expect(perPage).toBe(25);
      expect(opts.requestKey).toBe('deliveries-by-vendor');
    });

    it('defaults to "-delivery_date" sort when no sort arg is supplied', async () => {
      await service.getByVendor('vendor-9', 1, 50);
      expect(getListSpy.mock.calls[0][2].sort).toBe('-delivery_date');
    });

    it('passes a provided sort string to the query', async () => {
      await service.getByVendor('vendor-9', 1, 50, 'total_amount');
      expect(getListSpy.mock.calls[0][2].sort).toBe('total_amount');
    });

    it('returns mapped items with pagination metadata', async () => {
      getListSpy.mockResolvedValue({ items: [], totalItems: 7, totalPages: 1 });
      const result = await service.getByVendor('vendor-9', 1, 50);
      expect(result).toEqual({ items: [], totalItems: 7, totalPages: 1 });
    });
  });

  describe('PaymentService.getByVendor', () => {
    let service: InstanceType<typeof PaymentService>;
    beforeEach(() => { service = new PaymentService(); });

    it('throws when no site is selected', async () => {
      setCurrentSiteId(null);
      await expect(service.getByVendor('vendor-2')).rejects.toThrow('No site selected');
      expect(getFullListSpy).not.toHaveBeenCalled();
    });

    it('passes the combined site + vendor filter with the payment expand', async () => {
      await service.getByVendor('vendor-2');
      expect(getFullListSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'site="site-1" && vendor="vendor-2"',
          expand: 'vendor,account,deliveries,service_bookings,payment_allocations,payment_allocations.delivery,payment_allocations.service_booking,payment_allocations.service_booking.service,credit_notes',
          sort: '-payment_date',
        })
      );
    });
  });

  describe('PaymentService.getByAccount', () => {
    let service: InstanceType<typeof PaymentService>;
    beforeEach(() => { service = new PaymentService(); });

    it('throws when no site is selected', async () => {
      setCurrentSiteId(null);
      await expect(service.getByAccount('acc-5')).rejects.toThrow('No site selected');
      expect(getFullListSpy).not.toHaveBeenCalled();
    });

    it('passes the combined site + account filter with the payment expand', async () => {
      await service.getByAccount('acc-5');
      expect(getFullListSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'site="site-1" && account="acc-5"',
          expand: 'vendor,account,deliveries,service_bookings,payment_allocations,payment_allocations.delivery,payment_allocations.service_booking,payment_allocations.service_booking.service,credit_notes',
          sort: '-payment_date',
        })
      );
    });
  });

  describe('ServiceBookingService.getByVendor', () => {
    let service: InstanceType<typeof ServiceBookingService>;
    beforeEach(() => { service = new ServiceBookingService(); });

    it('throws when no site is selected', async () => {
      setCurrentSiteId(null);
      await expect(service.getByVendor('vendor-3')).rejects.toThrow('No site selected');
      expect(getFullListSpy).not.toHaveBeenCalled();
    });

    it('passes the combined site + vendor filter mirroring getByService expand', async () => {
      await service.getByVendor('vendor-3');
      expect(getFullListSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'site="site-1" && vendor="vendor-3"',
          expand: 'vendor,service',
        })
      );
    });
  });

  describe('QuotationService relation filters', () => {
    let service: InstanceType<typeof QuotationService>;
    beforeEach(() => { service = new QuotationService(); });

    it('getByVendor throws when no site is selected', async () => {
      setCurrentSiteId(null);
      await expect(service.getByVendor('vendor-7')).rejects.toThrow('No site selected');
      expect(getFullListSpy).not.toHaveBeenCalled();
    });

    it('getByVendor passes the combined site + vendor filter', async () => {
      await service.getByVendor('vendor-7');
      expect(getFullListSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'site="site-1" && vendor="vendor-7"',
          expand: 'vendor,item,service',
        })
      );
    });

    it('getByItem throws when no site is selected', async () => {
      setCurrentSiteId(null);
      await expect(service.getByItem('item-4')).rejects.toThrow('No site selected');
      expect(getFullListSpy).not.toHaveBeenCalled();
    });

    it('getByItem passes the combined site + item filter', async () => {
      await service.getByItem('item-4');
      expect(getFullListSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'site="site-1" && item="item-4"',
          expand: 'vendor,item,service',
        })
      );
    });

    it('getByService throws when no site is selected', async () => {
      setCurrentSiteId(null);
      await expect(service.getByService('svc-8')).rejects.toThrow('No site selected');
      expect(getFullListSpy).not.toHaveBeenCalled();
    });

    it('getByService passes the combined site + service filter', async () => {
      await service.getByService('svc-8');
      expect(getFullListSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'site="site-1" && service="svc-8"',
          expand: 'vendor,item,service',
        })
      );
    });
  });
});
