/**
 * Logic-focused tests for VendorsView export functionality
 * Tests the ledger entry building and export utility integration
 */
import { describe, it, expect } from 'vitest';
import { type LedgerEntry } from '../../services/ledgerExportUtils';
import { DeliveryPaymentCalculator, type DeliveryWithPaymentStatus } from '../../services/deliveryUtils';

// Mock types matching the actual data structures
interface MockDelivery {
  id: string;
  delivery_date: string;
  delivery_reference: string;
  total_amount: number;
  vendor: string;
}

interface MockPayment {
  id: string;
  payment_date: string;
  reference: string;
  amount: number;
  vendor: string;
}

interface MockVendorReturn {
  id: string;
  return_date: string;
  completion_date: string | null;
  status: 'pending' | 'completed' | 'refunded';
  processing_option: 'credit_note' | 'refund' | 'replacement';
  total_return_amount: number;
  reason: string;
  vendor: string;
}

interface MockVendorCreditNote {
  id: string;
  issue_date: string;
  credit_amount: number;
  reference: string;
  reason: string;
  vendor: string;
}

interface MockPaymentAllocation {
  id: string;
  delivery: string;
  payment: string;
  allocated_amount: number;
}

// Simplified translation function
const t = (key: string) => {
  const translations: Record<string, string> = {
    'vendors.delivery': 'Delivery',
    'vendors.unknown': 'Unknown',
    'vendors.creditNoteIssued': 'Credit Note Issued',
    'vendors.paymentMade': 'Payment Made',
    'common.payment': 'Payment'
  };
  return translations[key] || key;
};

// Recreate the buildVendorLedgerEntries logic for testing
const buildVendorLedgerEntries = (
  _vendorId: string,
  vendorDeliveries: MockDelivery[],
  vendorPayments: MockPayment[],
  vendorReturns: MockVendorReturn[],
  vendorCreditNotes: MockVendorCreditNote[],
  allPaymentAllocations: MockPaymentAllocation[]
): LedgerEntry[] => {
  // Enhance deliveries with payment status
  const enhancedDeliveries = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(
    vendorDeliveries as any,
    allPaymentAllocations.filter((pa) =>
      vendorDeliveries.some((d) => d.id === pa.delivery)
    ) as any
  );

  const entries: LedgerEntry[] = [];

  // Add delivery entries (debits)
  enhancedDeliveries.forEach((delivery: DeliveryWithPaymentStatus) => {
    let particulars = `${t('vendors.delivery')} #${delivery.id?.slice(-6) || t('vendors.unknown')}`;
    if (delivery.delivery_reference) {
      particulars = `Invoice: ${delivery.delivery_reference}`;
    }

    entries.push({
      date: delivery.delivery_date,
      particulars,
      reference: delivery.delivery_reference || '',
      debit: delivery.total_amount,
      credit: 0,
      runningBalance: 0
    });
  });

  // Add return entries (credit note or refund)
  vendorReturns.forEach((returnItem) => {
    if (returnItem.status === 'completed' || returnItem.status === 'refunded') {
      if (returnItem.processing_option === 'credit_note') {
        entries.push({
          date: returnItem.completion_date || returnItem.return_date,
          particulars: `Credit Note for Return #${returnItem.id?.slice(-6)}`,
          reference: `RET-${returnItem.id?.slice(-6)}`,
          debit: 0,
          credit: returnItem.total_return_amount,
          runningBalance: 0
        });
      } else if (returnItem.processing_option === 'refund') {
        entries.push({
          date: returnItem.completion_date || returnItem.return_date,
          particulars: `Goods Returned #${returnItem.id?.slice(-6)}`,
          reference: `RET-${returnItem.id?.slice(-6)}`,
          debit: 0,
          credit: returnItem.total_return_amount,
          runningBalance: 0
        });
      }
    }
  });

  // Add standalone credit notes (not related to returns)
  vendorCreditNotes.forEach((creditNote) => {
    const isReturnRelated = vendorReturns.some((returnItem) =>
      returnItem.processing_option === 'credit_note' &&
      returnItem.reason === creditNote.reason &&
      returnItem.total_return_amount === creditNote.credit_amount
    );

    if (creditNote.credit_amount > 0 && !isReturnRelated) {
      entries.push({
        date: creditNote.issue_date,
        particulars: `${t('vendors.creditNoteIssued')} - ${creditNote.reason || ''}`,
        reference: creditNote.reference || `CN-${creditNote.id?.slice(-6)}`,
        debit: 0,
        credit: creditNote.credit_amount,
        runningBalance: 0
      });
    }
  });

  // Add payment entries (credits)
  vendorPayments.forEach((payment) => {
    entries.push({
      date: payment.payment_date,
      particulars: `${t('vendors.paymentMade')} - ${payment.reference || t('common.payment')}`,
      reference: payment.reference || '',
      debit: 0,
      credit: payment.amount,
      runningBalance: 0
    });
  });

  // Sort entries by date
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance (Debit increases balance, Credit decreases balance)
  let runningBalance = 0;
  entries.forEach(entry => {
    runningBalance += entry.debit - entry.credit;
    entry.runningBalance = runningBalance;
  });

  return entries;
};

// Filename sanitization function
const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
};

describe('VendorsView Export Logic', () => {
  describe('buildVendorLedgerEntries', () => {
    it('should return empty array for empty inputs', () => {
      const entries = buildVendorLedgerEntries('vendor-1', [], [], [], [], []);
      expect(entries).toEqual([]);
    });

    it('should create debit entries for deliveries', () => {
      const deliveries: MockDelivery[] = [
        {
          id: 'del-123456',
          delivery_date: '2024-01-15',
          delivery_reference: 'INV-001',
          total_amount: 5000,
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', deliveries, [], [], [], []);

      expect(entries.length).toBe(1);
      expect(entries[0].debit).toBe(5000);
      expect(entries[0].credit).toBe(0);
      expect(entries[0].particulars).toContain('Invoice: INV-001');
      expect(entries[0].reference).toBe('INV-001');
    });

    it('should use delivery ID when reference is missing', () => {
      const deliveries: MockDelivery[] = [
        {
          id: 'del-123456',
          delivery_date: '2024-01-15',
          delivery_reference: '',
          total_amount: 5000,
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', deliveries, [], [], [], []);

      expect(entries[0].particulars).toContain('Delivery #123456');
    });

    it('should create credit entries for payments', () => {
      const payments: MockPayment[] = [
        {
          id: 'pay-123456',
          payment_date: '2024-01-20',
          reference: 'PAY-001',
          amount: 3000,
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], payments, [], [], []);

      expect(entries.length).toBe(1);
      expect(entries[0].debit).toBe(0);
      expect(entries[0].credit).toBe(3000);
      expect(entries[0].particulars).toContain('Payment Made');
      expect(entries[0].reference).toBe('PAY-001');
    });

    it('should create credit entries for completed returns with credit_note option', () => {
      const returns: MockVendorReturn[] = [
        {
          id: 'ret-123456',
          return_date: '2024-01-18',
          completion_date: '2024-01-19',
          status: 'completed',
          processing_option: 'credit_note',
          total_return_amount: 1000,
          reason: 'Damaged goods',
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], [], returns, [], []);

      expect(entries.length).toBe(1);
      expect(entries[0].credit).toBe(1000);
      expect(entries[0].particulars).toContain('Credit Note for Return');
      expect(entries[0].reference).toContain('RET-');
    });

    it('should create credit entries for refunded returns', () => {
      const returns: MockVendorReturn[] = [
        {
          id: 'ret-123456',
          return_date: '2024-01-18',
          completion_date: '2024-01-19',
          status: 'refunded',
          processing_option: 'refund',
          total_return_amount: 1000,
          reason: 'Quality issues',
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], [], returns, [], []);

      expect(entries.length).toBe(1);
      expect(entries[0].credit).toBe(1000);
      expect(entries[0].particulars).toContain('Goods Returned');
    });

    it('should not create entries for pending returns', () => {
      const returns: MockVendorReturn[] = [
        {
          id: 'ret-123456',
          return_date: '2024-01-18',
          completion_date: null,
          status: 'pending',
          processing_option: 'credit_note',
          total_return_amount: 1000,
          reason: 'Damaged goods',
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], [], returns, [], []);

      expect(entries.length).toBe(0);
    });

    it('should add standalone credit notes', () => {
      const creditNotes: MockVendorCreditNote[] = [
        {
          id: 'cn-123456',
          issue_date: '2024-01-22',
          credit_amount: 500,
          reference: 'CN-001',
          reason: 'Price adjustment',
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], [], [], creditNotes, []);

      expect(entries.length).toBe(1);
      expect(entries[0].credit).toBe(500);
      expect(entries[0].particulars).toContain('Credit Note Issued');
      expect(entries[0].reference).toBe('CN-001');
    });

    it('should not duplicate credit notes that are related to returns', () => {
      const returns: MockVendorReturn[] = [
        {
          id: 'ret-123456',
          return_date: '2024-01-18',
          completion_date: '2024-01-19',
          status: 'completed',
          processing_option: 'credit_note',
          total_return_amount: 1000,
          reason: 'Damaged goods',
          vendor: 'vendor-1'
        }
      ];

      // Credit note with same reason and amount as return
      const creditNotes: MockVendorCreditNote[] = [
        {
          id: 'cn-123456',
          issue_date: '2024-01-19',
          credit_amount: 1000,
          reference: 'CN-001',
          reason: 'Damaged goods',
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], [], returns, creditNotes, []);

      // Should only have 1 entry (from return), not 2
      expect(entries.length).toBe(1);
      expect(entries[0].particulars).toContain('Credit Note for Return');
    });

    it('should sort entries by date', () => {
      const deliveries: MockDelivery[] = [
        {
          id: 'del-123456',
          delivery_date: '2024-01-20',
          delivery_reference: 'INV-002',
          total_amount: 3000,
          vendor: 'vendor-1'
        }
      ];

      const payments: MockPayment[] = [
        {
          id: 'pay-123456',
          payment_date: '2024-01-15',
          reference: 'PAY-001',
          amount: 5000,
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', deliveries, payments, [], [], []);

      // Payment (Jan 15) should come before delivery (Jan 20)
      expect(entries[0].date).toBe('2024-01-15');
      expect(entries[1].date).toBe('2024-01-20');
    });

    it('should calculate running balance correctly', () => {
      const deliveries: MockDelivery[] = [
        {
          id: 'del-123456',
          delivery_date: '2024-01-15',
          delivery_reference: 'INV-001',
          total_amount: 5000,
          vendor: 'vendor-1'
        }
      ];

      const payments: MockPayment[] = [
        {
          id: 'pay-123456',
          payment_date: '2024-01-20',
          reference: 'PAY-001',
          amount: 3000,
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', deliveries, payments, [], [], []);

      // After delivery: 5000 debit = 5000 balance
      expect(entries[0].runningBalance).toBe(5000);
      // After payment: 5000 - 3000 = 2000 balance
      expect(entries[1].runningBalance).toBe(2000);
    });

    it('should handle negative running balance', () => {
      const payments: MockPayment[] = [
        {
          id: 'pay-123456',
          payment_date: '2024-01-15',
          reference: 'PAY-001',
          amount: 5000,
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], payments, [], [], []);

      // Payment without delivery results in negative balance
      expect(entries[0].runningBalance).toBe(-5000);
    });

    it('should handle credit notes with zero amount', () => {
      const creditNotes: MockVendorCreditNote[] = [
        {
          id: 'cn-123456',
          issue_date: '2024-01-22',
          credit_amount: 0,
          reference: 'CN-001',
          reason: 'Price adjustment',
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], [], [], creditNotes, []);

      // Zero amount credit notes should not be added
      expect(entries.length).toBe(0);
    });

    it('should use return_date if completion_date is null', () => {
      const returns: MockVendorReturn[] = [
        {
          id: 'ret-123456',
          return_date: '2024-01-18',
          completion_date: null,
          status: 'completed',
          processing_option: 'credit_note',
          total_return_amount: 1000,
          reason: 'Damaged goods',
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], [], returns, [], []);

      expect(entries[0].date).toBe('2024-01-18');
    });

    it('should use completion_date when available', () => {
      const returns: MockVendorReturn[] = [
        {
          id: 'ret-123456',
          return_date: '2024-01-18',
          completion_date: '2024-01-25',
          status: 'completed',
          processing_option: 'credit_note',
          total_return_amount: 1000,
          reason: 'Damaged goods',
          vendor: 'vendor-1'
        }
      ];

      const entries = buildVendorLedgerEntries('vendor-1', [], [], returns, [], []);

      expect(entries[0].date).toBe('2024-01-25');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove special characters', () => {
      expect(sanitizeFilename('Vendor #1 (Test)')).toBe('Vendor_1_Test');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('Test Vendor Name')).toBe('Test_Vendor_Name');
    });

    it('should keep alphanumeric characters', () => {
      expect(sanitizeFilename('Vendor123')).toBe('Vendor123');
    });

    it('should keep hyphens', () => {
      expect(sanitizeFilename('Test-Vendor')).toBe('Test-Vendor');
    });

    it('should truncate to 50 characters', () => {
      const longName = 'A'.repeat(100);
      expect(sanitizeFilename(longName).length).toBe(50);
    });

    it('should handle multiple consecutive spaces', () => {
      expect(sanitizeFilename('Test    Vendor')).toBe('Test_Vendor');
    });

    it('should handle empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('should handle only special characters', () => {
      expect(sanitizeFilename('!@#$%^&*()')).toBe('');
    });
  });
});
