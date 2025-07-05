import { describe, it, expect } from 'vitest';
import { TallyXmlExporter } from '../../utils/tallyXmlExport';
import type { Vendor, Delivery, Payment, VendorCreditNote, CreditNoteUsage, VendorReturn } from '../../services/pocketbase';

describe('TallyXmlExporter', () => {
  const mockVendor: Vendor = {
    id: 'vendor-1',
    name: 'Test Vendor Ltd',
    contact_person: 'John Doe',
    email: 'john@testvendor.com',
    phone: '+91-9876543210',
    address: '123 Test Street, Test City',
    site: 'site-1'
  };

  const mockDeliveries: Delivery[] = [
    {
      id: 'delivery-1',
      vendor: 'vendor-1',
      delivery_date: '2024-01-15',
      delivery_reference: 'INV-001',
      total_amount: 10000,
      payment_status: 'pending',
      paid_amount: 0,
      site: 'site-1',
      expand: {
        delivery_items: [
          {
            id: 'item-1',
            delivery: 'delivery-1',
            item: 'cement-bag',
            quantity: 100,
            unit_price: 100,
            total_amount: 10000,
            expand: {
              item: {
                id: 'cement-bag',
                name: 'Cement Bag',
                unit: 'bags',
                site: 'site-1'
              }
            }
          }
        ]
      }
    }
  ];

  const mockPayments: Payment[] = [
    {
      id: 'payment-1',
      vendor: 'vendor-1',
      account: 'bank-account',
      amount: 5000,
      payment_date: '2024-01-20',
      reference: 'CHQ-001',
      notes: 'Partial payment',
      deliveries: ['delivery-1'],
      service_bookings: [],
      site: 'site-1'
    }
  ];

  const mockCreditNotes: VendorCreditNote[] = [
    {
      id: 'credit-1',
      vendor: 'vendor-1',
      credit_amount: 1000,
      balance: 1000,
      issue_date: '2024-01-25',
      reference: 'CN-001',
      reason: 'Damaged goods return',
      status: 'active',
      site: 'site-1'
    }
  ];

  const mockCreditNoteUsages: CreditNoteUsage[] = [
    {
      id: 'usage-1',
      credit_note: 'credit-1',
      used_amount: 500,
      used_date: '2024-01-30',
      payment: 'payment-1',
      vendor: 'vendor-1',
      description: 'Applied to payment CHQ-001',
      site: 'site-1',
      expand: {
        credit_note: {
          id: 'credit-1',
          vendor: 'vendor-1',
          credit_amount: 1000,
          balance: 500,
          issue_date: '2024-01-25',
          reference: 'CN-001',
          reason: 'Damaged goods return',
          status: 'active',
          site: 'site-1'
        }
      }
    }
  ];

  const mockVendorReturns: VendorReturn[] = [
    {
      id: 'return-1',
      vendor: 'vendor-1',
      return_date: '2024-02-01',
      reason: 'defective',
      status: 'refunded',
      total_return_amount: 2000,
      actual_refund_amount: 1800,
      completion_date: '2024-02-05',
      site: 'site-1'
    }
  ];

  describe('prepareLedgerData', () => {
    it('should prepare ledger data correctly', () => {
      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        mockDeliveries,
        mockPayments,
        mockCreditNotes,
        mockCreditNoteUsages,
        mockVendorReturns
      );

      expect(ledgerData.vendor).toEqual(mockVendor);
      expect(ledgerData.entries).toHaveLength(5); // 1 delivery + 1 payment + 1 credit note + 1 credit usage + 1 refund
      expect(ledgerData.totals.totalDebits).toBe(10500); // Delivery (10000) + Credit usage (500)
      expect(ledgerData.totals.totalCredits).toBe(7800); // Payment (5000) + Credit note (1000) + Refund (1800)
      expect(ledgerData.totals.finalBalance).toBe(2700); // 10500 - 7800
    });

    it('should sort entries by date', () => {
      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        mockDeliveries,
        mockPayments,
        mockCreditNotes,
        mockCreditNoteUsages,
        mockVendorReturns
      );

      const dates = ledgerData.entries.map(entry => new Date(entry.date).getTime());
      const sortedDates = [...dates].sort((a, b) => a - b);
      expect(dates).toEqual(sortedDates);
    });

    it('should calculate running balance correctly', () => {
      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        mockDeliveries,
        mockPayments,
        mockCreditNotes,
        mockCreditNoteUsages,
        mockVendorReturns
      );

      // Entries should be: delivery (15th), payment (20th), credit note (25th), credit usage (30th), refund (Feb 5th)
      expect(ledgerData.entries[0].runningBalance).toBe(10000); // After delivery
      expect(ledgerData.entries[1].runningBalance).toBe(5000);  // After payment
      expect(ledgerData.entries[2].runningBalance).toBe(4000);  // After credit note
      expect(ledgerData.entries[3].runningBalance).toBe(4500);  // After credit usage
      expect(ledgerData.entries[4].runningBalance).toBe(2700);  // After refund
    });

    it('should handle credit note usage entries correctly', () => {
      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        [],
        mockCreditNoteUsages,
        []
      );

      const creditUsageEntry = ledgerData.entries.find(entry => entry.type === 'credit_note' && entry.description === 'Credit Note Used');
      expect(creditUsageEntry).toBeDefined();
      expect(creditUsageEntry?.debitAmount).toBe(500);
      expect(creditUsageEntry?.creditAmount).toBe(0);
      expect(creditUsageEntry?.reference).toBe('CN-001');
      expect(creditUsageEntry?.details).toBe('Applied to payment CHQ-001');
    });

    it('should handle credit note usage without expand data', () => {
      const creditUsageWithoutExpand: CreditNoteUsage[] = [
        {
          id: 'usage-2',
          credit_note: 'credit-2',
          used_amount: 300,
          used_date: '2024-01-31',
          payment: 'payment-2',
          vendor: 'vendor-1',
          site: 'site-1'
        }
      ];

      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        [],
        creditUsageWithoutExpand,
        []
      );

      const creditUsageEntry = ledgerData.entries[0];
      expect(creditUsageEntry.reference).toBe('CN-edit-2'); // fallback reference (last 6 chars of 'credit-2')
      expect(creditUsageEntry.details).toBe('Applied to payment'); // default details
    });

    it('should handle vendor returns with refunds correctly', () => {
      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        [],
        [],
        mockVendorReturns
      );

      const refundEntry = ledgerData.entries.find(entry => entry.type === 'refund');
      expect(refundEntry).toBeDefined();
      expect(refundEntry?.debitAmount).toBe(0);
      expect(refundEntry?.creditAmount).toBe(1800);
      expect(refundEntry?.reference).toBe('REF-turn-1'); // last 6 chars of 'return-1'
      expect(refundEntry?.details).toContain('Refund for Return #turn-1'); // last 6 chars
      expect(refundEntry?.details).toContain('defective');
    });

    it('should handle vendor returns without completion date', () => {
      const returnWithoutCompletionDate: VendorReturn[] = [
        {
          id: 'return-2',
          vendor: 'vendor-1',
          return_date: '2024-02-10',
          reason: 'damaged',
          status: 'refunded',
          total_return_amount: 1000,
          actual_refund_amount: 950,
          site: 'site-1'
        }
      ];

      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        [],
        [],
        returnWithoutCompletionDate
      );

      const refundEntry = ledgerData.entries[0];
      expect(refundEntry.date).toBe('2024-02-10'); // should use return_date
    });

    it('should skip vendor returns that are not refunded or have no refund amount', () => {
      const nonRefundedReturns: VendorReturn[] = [
        {
          id: 'return-3',
          vendor: 'vendor-1',
          return_date: '2024-02-15',
          reason: 'wrong_item',
          status: 'completed', // not refunded
          total_return_amount: 500,
          actual_refund_amount: 0,
          site: 'site-1'
        },
        {
          id: 'return-4',
          vendor: 'vendor-1',
          return_date: '2024-02-20',
          reason: 'defective',
          status: 'refunded',
          total_return_amount: 300,
          // no actual_refund_amount
          site: 'site-1'
        }
      ];

      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        [],
        [],
        nonRefundedReturns
      );

      expect(ledgerData.entries).toHaveLength(0); // should skip both
    });

    it('should handle credit notes without reason', () => {
      const creditNoteWithoutReason: VendorCreditNote[] = [
        {
          id: 'credit-3',
          vendor: 'vendor-1',
          credit_amount: 500,
          balance: 500,
          issue_date: '2024-01-30',
          status: 'active',
          site: 'site-1'
          // no reason field
        }
      ];

      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        creditNoteWithoutReason,
        [],
        []
      );

      const creditEntry = ledgerData.entries[0];
      expect(creditEntry.details).toBe(''); // should use empty string fallback
    });

    it('should handle credit notes without reference or id', () => {
      const creditNoteWithoutRef: VendorCreditNote[] = [
        {
          vendor: 'vendor-1',
          credit_amount: 300,
          balance: 300,
          issue_date: '2024-01-31',
          reason: 'Test reason',
          status: 'active',
          site: 'site-1'
          // no id or reference
        }
      ];

      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        creditNoteWithoutRef,
        [],
        []
      );

      const creditEntry = ledgerData.entries[0];
      expect(creditEntry.reference).toBe('CN-undefined'); // slice on undefined results in 'undefined'
      expect(creditEntry.id).toBe(''); // should use empty fallback
    });

    it('should handle vendor returns without reason', () => {
      const returnWithoutReason: VendorReturn[] = [
        {
          id: 'return-5',
          vendor: 'vendor-1',
          return_date: '2024-02-25',
          status: 'refunded',
          total_return_amount: 800,
          actual_refund_amount: 750,
          completion_date: '2024-02-26',
          site: 'site-1'
          // no reason field
        }
      ];

      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        [],
        [],
        returnWithoutReason
      );

      const refundEntry = ledgerData.entries[0];
      expect(refundEntry.details).toBe('Refund for Return #turn-5'); // no reason appended
    });

    it('should handle entries without ids', () => {
      const creditUsageWithoutId: CreditNoteUsage[] = [
        {
          credit_note: 'credit-4',
          used_amount: 200,
          used_date: '2024-02-01',
          payment: 'payment-3',
          vendor: 'vendor-1',
          site: 'site-1'
          // no id field
        }
      ];

      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        [],
        creditUsageWithoutId,
        []
      );

      const usageEntry = ledgerData.entries[0];
      expect(usageEntry.id).toBe(''); // should use empty fallback
    });

    it('should skip credit notes with zero or negative amounts', () => {
      const invalidCreditNotes: VendorCreditNote[] = [
        {
          id: 'credit-zero',
          vendor: 'vendor-1',
          credit_amount: 0,
          balance: 0,
          issue_date: '2024-01-15',
          reason: 'Zero amount',
          status: 'active',
          site: 'site-1'
        },
        {
          id: 'credit-negative',
          vendor: 'vendor-1',
          credit_amount: -100,
          balance: -100,
          issue_date: '2024-01-16',
          reason: 'Negative amount',
          status: 'active',
          site: 'site-1'
        }
      ];

      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        [],
        [],
        invalidCreditNotes,
        [],
        []
      );

      expect(ledgerData.entries).toHaveLength(0); // should skip both
    });
  });

  describe('generateVendorLedgerXml', () => {
    it('should generate valid XML structure', () => {
      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        mockDeliveries,
        mockPayments,
        mockCreditNotes,
        mockCreditNoteUsages,
        mockVendorReturns
      );

      const exportOptions = {
        companyName: 'Test Company',
        periodFrom: '01-04-2024',
        periodTo: '31-03-2025',
        includeNarration: true,
        includeVoucherNumber: true
      };

      const xml = TallyXmlExporter.generateVendorLedgerXml(ledgerData, exportOptions);

      // Basic XML structure checks
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<ENVELOPE>');
      expect(xml).toContain('</ENVELOPE>');
      expect(xml).toContain('<HEADER>');
      expect(xml).toContain('<BODY>');
      expect(xml).toContain('<IMPORTDATA>');
    });

    it('should include vendor information in XML', () => {
      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        mockDeliveries,
        mockPayments,
        mockCreditNotes,
        mockCreditNoteUsages,
        mockVendorReturns
      );

      const exportOptions = {
        companyName: 'Test Company',
        periodFrom: '01-04-2024',
        periodTo: '31-03-2025'
      };

      const xml = TallyXmlExporter.generateVendorLedgerXml(ledgerData, exportOptions);

      expect(xml).toContain('John Doe'); // Contact person
      expect(xml).toContain('+91-9876543210'); // Phone
      expect(xml).toContain('john@testvendor.com'); // Email
      expect(xml).toContain('123 Test Street, Test City'); // Address
    });

    it('should include voucher entries in XML', () => {
      const ledgerData = TallyXmlExporter.prepareLedgerData(
        mockVendor,
        mockDeliveries,
        mockPayments,
        mockCreditNotes,
        mockCreditNoteUsages,
        mockVendorReturns
      );

      const exportOptions = {
        companyName: 'Test Company',
        periodFrom: '01-04-2024',
        periodTo: '31-03-2025'
      };

      const xml = TallyXmlExporter.generateVendorLedgerXml(ledgerData, exportOptions);

      expect(xml).toContain('<VOUCHER'); // Should have voucher entries
      expect(xml).toContain('INV-001'); // Delivery reference
      expect(xml).toContain('CHQ-001'); // Payment reference
      expect(xml).toContain('CN-001'); // Credit note reference
    });

    it('should escape XML special characters', () => {
      const vendorWithSpecialChars: Vendor = {
        ...mockVendor,
        name: 'Test & Co. <Ltd>',
        contact_person: 'John "Test" Doe'
      };

      const ledgerData = TallyXmlExporter.prepareLedgerData(
        vendorWithSpecialChars,
        [],
        [],
        [],
        [],
        []
      );

      const exportOptions = {
        companyName: 'Test & Company',
        periodFrom: '01-04-2024',
        periodTo: '31-03-2025'
      };

      const xml = TallyXmlExporter.generateVendorLedgerXml(ledgerData, exportOptions);

      // Since the vendor name is not used in the ledger name (contact_person is used instead),
      // we should check for the escaped contact person name
      expect(xml).toContain('John &quot;Test&quot; Doe');
      expect(xml).toContain('Test &amp; Company');
    });
  });

  describe('downloadXmlFile', () => {
    it('should create download functionality', () => {
      // Mock DOM methods
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      const mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
        style: {}
      };

      createElementSpy.mockReturnValue(mockLink as any);
      createObjectURLSpy.mockReturnValue('blob:url');

      TallyXmlExporter.downloadXmlFile('<xml>test</xml>', 'test.xml');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:url');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test.xml');
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url');

      // Restore spies
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });
});