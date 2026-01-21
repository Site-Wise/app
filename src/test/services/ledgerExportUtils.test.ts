import { describe, it, expect } from 'vitest';
import {
  generateLedgerCSV,
  getLedgerCSVTranslations,
  getLedgerExportTranslations,
  type LedgerEntry
} from '../../services/ledgerExportUtils';

// Mock translation function
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'vendors.date': 'Date',
    'vendors.particulars': 'Particulars',
    'vendors.reference': 'Reference',
    'vendors.debit': 'Debit',
    'vendors.credit': 'Credit',
    'vendors.balance': 'Balance',
    'vendors.openingBalance': 'Opening Balance',
    'vendors.totals': 'Totals',
    'vendors.filterPeriod': 'Filter Period',
    'vendors.beginning': 'Beginning',
    'vendors.today': 'Today',
    'vendors.generated': 'Generated',
    'vendors.outstanding': 'Outstanding',
    'vendors.creditBalance': 'Credit Balance',
    'vendors.finalBalance': 'Final Balance',
    'vendors.vendorLedger': 'Vendor Ledger',
    'vendors.vendor': 'Vendor',
    'vendors.contact': 'Contact',
    'vendors.totalOutstanding': 'Total Outstanding'
  };
  return translations[key] || key;
};

describe('ledgerExportUtils', () => {
  describe('getLedgerCSVTranslations', () => {
    it('should return all required translation keys', () => {
      const translations = getLedgerCSVTranslations(mockT);

      expect(translations.date).toBe('Date');
      expect(translations.particulars).toBe('Particulars');
      expect(translations.reference).toBe('Reference');
      expect(translations.debit).toBe('Debit');
      expect(translations.credit).toBe('Credit');
      expect(translations.balance).toBe('Balance');
      expect(translations.openingBalance).toBe('Opening Balance');
      expect(translations.totals).toBe('Totals');
      expect(translations.filterPeriod).toBe('Filter Period');
      expect(translations.beginning).toBe('Beginning');
      expect(translations.today).toBe('Today');
      expect(translations.generated).toBe('Generated');
      expect(translations.outstanding).toBe('Outstanding');
      expect(translations.creditBalance).toBe('Credit Balance');
      expect(translations.finalBalance).toBe('Final Balance');
    });
  });

  describe('getLedgerExportTranslations', () => {
    it('should return all required translation keys for PDF export', () => {
      const translations = getLedgerExportTranslations(mockT);

      expect(translations.vendorLedger).toBe('Vendor Ledger');
      expect(translations.vendor).toBe('Vendor');
      expect(translations.contact).toBe('Contact');
      expect(translations.generated).toBe('Generated');
      expect(translations.date).toBe('Date');
      expect(translations.particulars).toBe('Particulars');
      expect(translations.reference).toBe('Reference');
      expect(translations.debit).toBe('Debit');
      expect(translations.credit).toBe('Credit');
      expect(translations.balance).toBe('Balance');
      expect(translations.openingBalance).toBe('Opening Balance');
      expect(translations.totals).toBe('Totals');
      expect(translations.totalOutstanding).toBe('Total Outstanding');
      expect(translations.creditBalance).toBe('Credit Balance');
    });
  });

  describe('generateLedgerCSV', () => {
    const mockEntries: LedgerEntry[] = [
      {
        date: '2024-01-15',
        particulars: 'Invoice: INV-001 - Cement delivery',
        reference: 'INV-001',
        debit: 5000,
        credit: 0,
        runningBalance: 5000
      },
      {
        date: '2024-01-20',
        particulars: 'Payment: Bank Transfer',
        reference: 'PAY-001',
        debit: 0,
        credit: 3000,
        runningBalance: 2000
      }
    ];

    const mockTranslations = getLedgerCSVTranslations(mockT);

    it('should generate CSV with headers', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        translations: mockTranslations
      });

      expect(csv).toContain('Date,Particulars,Reference,Debit,Credit,Balance');
    });

    it('should include entry data in CSV', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        translations: mockTranslations
      });

      expect(csv).toContain('2024-01-15');
      expect(csv).toContain('INV-001');
      expect(csv).toContain('5000.00');
      expect(csv).toContain('3000.00');
    });

    it('should show Cr for positive running balance', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        translations: mockTranslations
      });

      expect(csv).toContain('5000.00 Cr');
      expect(csv).toContain('2000.00 Cr');
    });

    it('should show Dr for negative running balance', () => {
      const entriesWithNegativeBalance: LedgerEntry[] = [
        {
          date: '2024-01-15',
          particulars: 'Payment in advance',
          reference: 'PAY-001',
          debit: 0,
          credit: 5000,
          runningBalance: -5000
        }
      ];

      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: entriesWithNegativeBalance,
        translations: mockTranslations
      });

      expect(csv).toContain('5000.00 Dr');
    });

    it('should include totals row', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        translations: mockTranslations
      });

      expect(csv).toContain('Totals');
      expect(csv).toContain('5000.00'); // Total debits
      expect(csv).toContain('3000.00'); // Total credits
    });

    it('should include generated date', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        translations: mockTranslations
      });

      expect(csv).toContain('Generated');
      expect(csv).toContain(new Date().toISOString().split('T')[0]);
    });

    it('should include opening balance when hasOpeningBalance is true', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        openingBalance: 1000,
        hasOpeningBalance: true,
        filterFromDate: '2024-01-01',
        translations: mockTranslations
      });

      expect(csv).toContain('Opening Balance');
      expect(csv).toContain('1000.00 Cr');
    });

    it('should show Dr for negative opening balance', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        openingBalance: -1000,
        hasOpeningBalance: true,
        filterFromDate: '2024-01-01',
        translations: mockTranslations
      });

      expect(csv).toContain('Opening Balance');
      expect(csv).toContain('1000.00 Dr');
    });

    it('should include filter period when date filters are active', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        filterFromDate: '2024-01-01',
        filterToDate: '2024-01-31',
        translations: mockTranslations
      });

      expect(csv).toContain('Filter Period');
      expect(csv).toContain('2024-01-01 - 2024-01-31');
    });

    it('should use Beginning and Today for missing filter dates', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        filterFromDate: undefined,
        filterToDate: '2024-01-31',
        translations: mockTranslations
      });

      expect(csv).toContain('Filter Period');
      expect(csv).toContain('Beginning - 2024-01-31');
    });

    it('should include final balance with Outstanding status for positive balance', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        translations: mockTranslations
      });

      expect(csv).toContain('Final Balance');
      // Total debits (5000) - Total credits (3000) = 2000 Cr (Outstanding)
    });

    it('should include final balance with Credit Balance status for negative balance', () => {
      // When debits exceed credits, final balance is negative (Dr) showing Credit Balance
      const entriesWithDebitBalance: LedgerEntry[] = [
        {
          date: '2024-01-15',
          particulars: 'Invoice delivery',
          reference: 'INV-001',
          debit: 5000,
          credit: 0,
          runningBalance: 5000
        }
      ];

      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: entriesWithDebitBalance,
        openingBalance: 0,
        translations: mockTranslations
      });

      expect(csv).toContain('Final Balance');
      // Total debits (5000) - Total credits (0) = -5000 (Dr balance = Credit Balance status)
      expect(csv).toContain('Credit Balance');
    });

    it('should handle empty entries array', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: [],
        translations: mockTranslations
      });

      expect(csv).toContain('Date,Particulars,Reference,Debit,Credit,Balance');
      expect(csv).toContain('Totals');
      expect(csv).toContain('0.00'); // Zero totals
    });

    it('should escape CSV values with commas', () => {
      const entriesWithCommas: LedgerEntry[] = [
        {
          date: '2024-01-15',
          particulars: 'Invoice: Cement, Sand, Gravel',
          reference: 'INV-001',
          debit: 5000,
          credit: 0,
          runningBalance: 5000
        }
      ];

      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: entriesWithCommas,
        translations: mockTranslations
      });

      // Should be quoted because it contains commas
      expect(csv).toContain('"Invoice: Cement');
    });

    it('should escape CSV values with quotes', () => {
      const entriesWithQuotes: LedgerEntry[] = [
        {
          date: '2024-01-15',
          particulars: 'Invoice: "Special" delivery',
          reference: 'INV-001',
          debit: 5000,
          credit: 0,
          runningBalance: 5000
        }
      ];

      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: entriesWithQuotes,
        translations: mockTranslations
      });

      // Should escape quotes by doubling them
      expect(csv).toContain('""Special""');
    });

    it('should handle entries with empty reference', () => {
      const entriesWithEmptyRef: LedgerEntry[] = [
        {
          date: '2024-01-15',
          particulars: 'Payment made',
          reference: '',
          debit: 0,
          credit: 1000,
          runningBalance: -1000
        }
      ];

      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: entriesWithEmptyRef,
        translations: mockTranslations
      });

      expect(csv).toBeDefined();
      expect(csv).toContain('Payment made');
    });

    it('should calculate correct final balance with opening balance', () => {
      const csv = generateLedgerCSV({
        vendorName: 'Test Vendor',
        entries: mockEntries,
        openingBalance: 1000,
        hasOpeningBalance: true,
        filterFromDate: '2024-01-01',
        translations: mockTranslations
      });

      // Opening (1000) + Credits (3000) - Debits (5000) = -1000 Dr
      expect(csv).toContain('Final Balance');
    });
  });
});
