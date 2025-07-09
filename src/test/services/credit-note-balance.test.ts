import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vendorCreditNoteService } from '../../services/pocketbase';

// Mock PocketBase
const mockCollection = vi.fn();
vi.mock('pocketbase', () => ({
  default: vi.fn(() => ({
    collection: mockCollection,
    autoCancellation: vi.fn()
  }))
}));

vi.mock('../../services/pocketbase', async () => {
  const actual = await vi.importActual('../../services/pocketbase');
  return {
    ...actual,
    getCurrentSiteId: vi.fn(() => 'site-1'),
    pb: {
      collection: mockCollection
    }
  };
});

describe('Credit Note Balance Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate actual balance based on usage records', async () => {
    // Mock credit note record
    const mockCreditNote = {
      id: 'cn-1',
      credit_amount: 1000,
      balance: 500, // This should be ignored in favor of calculated balance
      vendor: 'vendor-1',
      status: 'active',
      site: 'site-1'
    };

    // Mock usage records
    const mockUsageRecords = [
      { used_amount: 300 },
      { used_amount: 200 }
    ];

    // Mock PocketBase calls
    mockCollection
      .mockReturnValueOnce({
        getOne: vi.fn().mockResolvedValue(mockCreditNote)
      })
      .mockReturnValueOnce({
        getFullList: vi.fn().mockResolvedValue(mockUsageRecords)
      });

    const actualBalance = await vendorCreditNoteService.calculateActualBalance('cn-1');

    // Should calculate: 1000 - (300 + 200) = 500
    expect(actualBalance).toBe(500);
  });

  it('should return 0 if usage exceeds credit amount', async () => {
    const mockCreditNote = {
      id: 'cn-1',
      credit_amount: 1000,
      balance: 1000,
      vendor: 'vendor-1',
      status: 'active',
      site: 'site-1'
    };

    const mockUsageRecords = [
      { used_amount: 600 },
      { used_amount: 500 }
    ];

    mockCollection
      .mockReturnValueOnce({
        getOne: vi.fn().mockResolvedValue(mockCreditNote)
      })
      .mockReturnValueOnce({
        getFullList: vi.fn().mockResolvedValue(mockUsageRecords)
      });

    const actualBalance = await vendorCreditNoteService.calculateActualBalance('cn-1');

    // Should calculate: max(0, 1000 - (600 + 500)) = 0
    expect(actualBalance).toBe(0);
  });

  it('should return full credit amount if no usage records exist', async () => {
    const mockCreditNote = {
      id: 'cn-1',
      credit_amount: 1000,
      balance: 800,
      vendor: 'vendor-1',
      status: 'active',
      site: 'site-1'
    };

    const mockUsageRecords: any[] = [];

    mockCollection
      .mockReturnValueOnce({
        getOne: vi.fn().mockResolvedValue(mockCreditNote)
      })
      .mockReturnValueOnce({
        getFullList: vi.fn().mockResolvedValue(mockUsageRecords)
      });

    const actualBalance = await vendorCreditNoteService.calculateActualBalance('cn-1');

    // Should return full credit amount: 1000 - 0 = 1000
    expect(actualBalance).toBe(1000);
  });
});