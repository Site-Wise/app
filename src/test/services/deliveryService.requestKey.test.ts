import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Regression guard for the Deliveries-page auto-cancellation bug.
 *
 * The deliveries list loads TWO concurrent requests to the same `deliveries`
 * collection on mount: the paginated browse query (getList) and the photo-gallery
 * query (getAllWithPhotos -> getFullList). PocketBase's global autoCancellation
 * (pb.autoCancellation(true)) cancels concurrent requests that share a cancel key,
 * which silently emptied the browse list ("No deliveries recorded").
 *
 * The fix gives each query a DISTINCT, stable `requestKey` so they can't cancel
 * each other (while a newer browse load still supersedes a stale one on site
 * switch). These tests assert those keys are passed and differ.
 */

// Stable spies so we can inspect the options passed across calls.
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

const { DeliveryService, setCurrentSiteId, setCurrentUserRole } = await import('../../services/pocketbase');

describe('DeliveryService request keys (auto-cancellation guard)', () => {
  let service: InstanceType<typeof DeliveryService>;

  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentSiteId('site-1');
    setCurrentUserRole('owner');
    service = new DeliveryService();
    getListSpy.mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 });
    getFullListSpy.mockResolvedValue([]);
  });

  it('getList passes the "deliveries-list" requestKey', async () => {
    await service.getList(1, 50);
    expect(getListSpy).toHaveBeenCalledWith(
      1,
      50,
      expect.objectContaining({ requestKey: 'deliveries-list' })
    );
  });

  it('getAllWithPhotos passes the "deliveries-photos" requestKey', async () => {
    await service.getAllWithPhotos();
    expect(getFullListSpy).toHaveBeenCalledWith(
      expect.objectContaining({ requestKey: 'deliveries-photos' })
    );
  });

  it('browse and photo queries use DIFFERENT request keys so they cannot cancel each other', async () => {
    await service.getList(1, 50);
    await service.getAllWithPhotos();

    const browseKey = getListSpy.mock.calls[0][2].requestKey;
    const photosKey = getFullListSpy.mock.calls[0][0].requestKey;

    expect(browseKey).toBeTruthy();
    expect(photosKey).toBeTruthy();
    expect(browseKey).not.toBe(photosKey);
  });

  it('getList still carries the same site filter/expand/sort as getAll', async () => {
    await service.getList(2, 50);
    expect(getListSpy).toHaveBeenCalledWith(
      2,
      50,
      expect.objectContaining({
        filter: 'site="site-1"',
        expand: 'vendor,delivery_items,delivery_items.item',
        sort: '-delivery_date',
      })
    );
  });
});
