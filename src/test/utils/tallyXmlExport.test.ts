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

  const mockCreditNoteUsages: CreditNoteUsage[] = [];
  const mockVendorReturns: VendorReturn[] = [];

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
      expect(ledgerData.entries).toHaveLength(3); // 1 delivery + 1 payment + 1 credit note
      expect(ledgerData.totals.totalDebits).toBe(10000); // One delivery
      expect(ledgerData.totals.totalCredits).toBe(6000); // Payment (5000) + Credit note (1000)
      expect(ledgerData.totals.finalBalance).toBe(4000); // 10000 - 6000
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

      // Entries should be: delivery (15th), payment (20th), credit note (25th)
      expect(ledgerData.entries[0].runningBalance).toBe(10000); // After delivery
      expect(ledgerData.entries[1].runningBalance).toBe(5000);  // After payment
      expect(ledgerData.entries[2].runningBalance).toBe(4000);  // After credit note
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