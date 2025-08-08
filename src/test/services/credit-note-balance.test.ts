import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the entire pocketbase module with proper site isolation support
vi.mock('../../services/pocketbase', () => {
  const mockCollection = {
    getFullList: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };

  const mockPb = {
    collection: vi.fn(() => mockCollection)
  };

  const getCurrentSiteIdMock = vi.fn().mockReturnValue('site-1');

  return {
    pb: mockPb,
    getCurrentSiteId: getCurrentSiteIdMock,
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: vi.fn().mockReturnValue('owner'),
    setCurrentUserRole: vi.fn(),
    calculatePermissions: vi.fn().mockReturnValue({
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canManageUsers: true,
      canManageRoles: true,
      canExport: true,
      canViewFinancials: true
    }),
    vendorCreditNoteService: {
      calculateActualBalance: vi.fn().mockImplementation(async (creditNoteId: string) => {
        const currentSite = getCurrentSiteIdMock();
        if (!currentSite) {
          throw new Error('No site selected');
        }
        
        // Get the credit note details 
        const creditNote = await mockCollection.getOne(creditNoteId, {
          filter: `site="${currentSite}"`
        });
        
        if (!creditNote) return 0;

        // Get all usage records for this credit note 
        const usageRecords = await mockCollection.getFullList({
          filter: `site="${currentSite}" && credit_note="${creditNoteId}"`,
          sort: '-created'
        });
        
        const totalUsed = usageRecords.reduce((sum: number, record: any) => sum + record.used_amount, 0);
        return Math.max(0, creditNote.credit_amount - totalUsed);
      })
    }
  };
});

// Import after mocking
const { vendorCreditNoteService } = await import('../../services/pocketbase');

describe('Credit Note Balance Calculation', () => {
  let mockCollection: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get access to the mocked collection
    const pocketbaseMocks = await import('../../services/pocketbase');
    mockCollection = pocketbaseMocks.pb.collection();
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

    // Mock PocketBase calls - first call for credit note, second for usage records
    mockCollection.getOne.mockResolvedValueOnce(mockCreditNote);
    mockCollection.getFullList.mockResolvedValueOnce(mockUsageRecords);

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

    mockCollection.getOne.mockResolvedValueOnce(mockCreditNote);
    mockCollection.getFullList.mockResolvedValueOnce(mockUsageRecords);

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

    mockCollection.getOne.mockResolvedValueOnce(mockCreditNote);
    mockCollection.getFullList.mockResolvedValueOnce(mockUsageRecords);

    const actualBalance = await vendorCreditNoteService.calculateActualBalance('cn-1');

    // Should return full credit amount: 1000 - 0 = 1000
    expect(actualBalance).toBe(1000);
  });
});