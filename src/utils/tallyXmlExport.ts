import type { Vendor, Delivery, Payment, VendorCreditNote, CreditNoteUsage, VendorReturn } from '../services/pocketbase';

// Tally XML Export Types
export interface TallyLedgerEntry {
  id: string;
  type: 'delivery' | 'payment' | 'credit_note' | 'refund';
  date: string;
  description: string;
  details?: string;
  reference: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
}

export interface TallyVendorLedgerData {
  vendor: Vendor;
  entries: TallyLedgerEntry[];
  totals: {
    totalDebits: number;
    totalCredits: number;
    finalBalance: number;
  };
}

export interface TallyXmlExportOptions {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  includeNarration?: boolean;
  includeVoucherNumber?: boolean;
}

// Utility functions for XML generation
export class TallyXmlExporter {
  private static escapeXml(text: string | undefined): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
  }

  private static formatAmount(amount: number): string {
    return Math.abs(amount).toFixed(2);
  }

  static generateVendorLedgerXml(
    ledgerData: TallyVendorLedgerData,
    options: TallyXmlExportOptions
  ): string {
    const { vendor, entries, totals } = ledgerData;
    const vendorName = this.escapeXml(vendor.contact_person || vendor.name || 'Unknown Vendor');
    const companyName = this.escapeXml(options.companyName);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COMPANY>
            <REMOTECMPINFO.LIST>
              <NAME>${companyName}</NAME>
              <REMOTECMPNAME>${companyName}</REMOTECMPNAME>
            </REMOTECMPINFO.LIST>
          </COMPANY>
`;

    // Add Ledger Definition for Vendor
    xml += `
          <LEDGER NAME="${vendorName}" RESERVEDNAME="">
            <OLDAUDITENTRYIDS.LIST TYPE="Number">
              <OLDAUDITENTRYIDS>-1</OLDAUDITENTRYIDS>
            </OLDAUDITENTRYIDS.LIST>
            <GUID></GUID>
            <PARENT>Sundry Creditors</PARENT>
            <LEDGERNAME>${vendorName}</LEDGERNAME>
            <LEDGERPHONE>${this.escapeXml(vendor.phone || '')}</LEDGERPHONE>
            <LEDGERCONTACT>${this.escapeXml(vendor.email || '')}</LEDGERCONTACT>
            <LEDGERADDRESS>${this.escapeXml(vendor.address || '')}</LEDGERADDRESS>
            <OPENINGBALANCE>${totals.finalBalance >= 0 ? this.formatAmount(totals.finalBalance) : '0.00'}</OPENINGBALANCE>
            <ISCOSTCENTRESON>No</ISCOSTCENTRESON>
            <ISADDABLE>No</ISADDABLE>
            <ISAUDITED>No</ISAUDITED>
            <ISFROMSYSVCH>No</ISFROMSYSVCH>
            <ISDELETED>No</ISDELETED>
            <ISSYSTEM>No</ISSYSTEM>
            <ISEXCLUDEFROMSTOCK>No</ISEXCLUDEFROMSTOCK>
            <ISUPDATINGTARGETID>No</ISUPDATINGTARGETID>
            <ASORIGINAL>Yes</ASORIGINAL>
            <ISRATEINCLUSIVEVAT>No</ISRATEINCLUSIVEVAT>
            <ISPOSINVOICE>No</ISPOSINVOICE>
            <ISINVOICE>No</ISINVOICE>
            <MAILLABEL.LIST>
              <MAILLABEL>General</MAILLABEL>
            </MAILLABEL.LIST>
          </LEDGER>
`;

    // Add Voucher entries
    entries.forEach((entry, index) => {
      const voucherNumber = this.escapeXml(entry.reference || `VCH${String(index + 1).padStart(4, '0')}`);
      const voucherDate = this.formatDate(entry.date);
      const narration = this.escapeXml(entry.description + (entry.details ? ` - ${entry.details}` : ''));
      
      let voucherType = 'Journal';
      if (entry.type === 'payment') {
        voucherType = 'Payment';
      } else if (entry.type === 'delivery') {
        voucherType = 'Purchase';
      }

      xml += `
          <VOUCHER REMOTEID="" VCHKEY="" VCHTYPE="${voucherType}" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <OLDAUDITENTRYIDS.LIST TYPE="Number">
              <OLDAUDITENTRYIDS>-1</OLDAUDITENTRYIDS>
            </OLDAUDITENTRYIDS.LIST>
            <DATE>${voucherDate}</DATE>
            <GUID></GUID>
            <NARRATION>${narration}</NARRATION>
            <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${vendorName}</PARTYLEDGERNAME>
            <BASICBASEPARTYNAME>${vendorName}</BASICBASEPARTYNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <VCHGSTCLASS/>
            <ENTRYTYPE>Item Invoice</ENTRYTYPE>
            <DIFFACTUALQTY>No</DIFFACTUALQTY>
            <AUDITED>No</AUDITED>
            <FORJOBCOSTING>No</FORJOBCOSTING>
            <ISDELETED>No</ISDELETED>
            <ASORIGINAL>Yes</ASORIGINAL>
            <INVOICEDATE>${voucherDate}</INVOICEDATE>
            <BASICBUYERNAME>${vendorName}</BASICBUYERNAME>
            <ISINVOICE>Yes</ISINVOICE>
            <LEDGERENTRIES.LIST>
              <OLDAUDITENTRYIDS.LIST TYPE="Number">
                <OLDAUDITENTRYIDS>-1</OLDAUDITENTRYIDS>
              </OLDAUDITENTRYIDS.LIST>
              <LEDGERNAME>${vendorName}</LEDGERNAME>
              <GSTCLASS/>
              <ISDEEMEDPOSITIVE>${entry.debitAmount > 0 ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>${entry.debitAmount > 0 ? 'Yes' : 'No'}</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>${entry.debitAmount > 0 ? this.formatAmount(entry.debitAmount) : `-${this.formatAmount(entry.creditAmount)}`}</AMOUNT>
              <SERVICETAXDETAILS.LIST>       </SERVICETAXDETAILS.LIST>
              <BANKALLOCATIONS.LIST>       </BANKALLOCATIONS.LIST>
              <BILLALLOCATIONS.LIST>       </BILLALLOCATIONS.LIST>
              <INTERESTCOLLECTION.LIST>       </INTERESTCOLLECTION.LIST>
              <OLDAUDITENTRIES.LIST>       </OLDAUDITENTRIES.LIST>
              <ACCOUNTAUDITENTRIES.LIST>       </ACCOUNTAUDITENTRIES.LIST>
              <AUDITENTRIES.LIST>       </AUDITENTRIES.LIST>
              <INPUTCRALLOCS.LIST>       </INPUTCRALLOCS.LIST>
              <DUTYHEADDETAILS.LIST>       </DUTYHEADDETAILS.LIST>
              <EXCISEDUTYHEADDETAILS.LIST>       </EXCISEDUTYHEADDETAILS.LIST>
              <RATEDETAILS.LIST>       </RATEDETAILS.LIST>
              <SUMMARYALLOCS.LIST>       </SUMMARYALLOCS.LIST>
              <STPYMTDETAILS.LIST>       </STPYMTDETAILS.LIST>
              <EXCISEPAYMENTALLOCATIONS.LIST>       </EXCISEPAYMENTALLOCATIONS.LIST>
              <TAXBILLALLOCATIONS.LIST>       </TAXBILLALLOCATIONS.LIST>
              <TAXOBJECTALLOCATIONS.LIST>       </TAXOBJECTALLOCATIONS.LIST>
              <TDSEXPENSEALLOCATIONS.LIST>       </TDSEXPENSEALLOCATIONS.LIST>
              <VATSTATUTORYDETAILS.LIST>       </VATSTATUTORYDETAILS.LIST>
              <COSTTRACKALLOCATIONS.LIST>       </COSTTRACKALLOCATIONS.LIST>
              <REFVOUCHERDETAILS.LIST>       </REFVOUCHERDETAILS.LIST>
              <INVOICEWISEDETAILS.LIST>       </INVOICEWISEDETAILS.LIST>
              <VATITCDETAILS.LIST>       </VATITCDETAILS.LIST>
              <ADVANCETAXDETAILS.LIST>       </ADVANCETAXDETAILS.LIST>
            </LEDGERENTRIES.LIST>
          </VOUCHER>
`;
    });

    xml += `
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return xml;
  }

  static prepareLedgerData(
    vendor: Vendor,
    deliveries: Delivery[],
    payments: Payment[],
    creditNotes: VendorCreditNote[],
    creditNoteUsages: CreditNoteUsage[],
    vendorReturns: VendorReturn[]
  ): TallyVendorLedgerData {
    const entries: TallyLedgerEntry[] = [];

    // Add delivery entries (debits - what we owe the vendor)
    deliveries.forEach(delivery => {
      let description = `Delivery #${delivery.id?.slice(-6) || 'Unknown'}`;
      let details = '';
      
      if (delivery.expand?.delivery_items && delivery.expand.delivery_items.length > 0) {
        const itemNames = delivery.expand.delivery_items.map((deliveryItem) => {
          const itemName = deliveryItem.expand?.item?.name || 'Unknown Item';
          const quantity = deliveryItem.quantity || 0;
          const unit = deliveryItem.expand?.item?.unit || 'units';
          return `${itemName} (${quantity} ${unit})`;
        });
        details = `Received: ${itemNames.join(', ')}`;
      }

      entries.push({
        id: delivery.id || '',
        type: 'delivery',
        date: delivery.delivery_date,
        description,
        details,
        reference: delivery.delivery_reference || '',
        debitAmount: delivery.total_amount,
        creditAmount: 0,
        runningBalance: 0 // Will be calculated
      });
    });

    // Add payment entries (credits - what we paid to the vendor)
    payments.forEach(payment => {
      entries.push({
        id: payment.id || '',
        type: 'payment',
        date: payment.payment_date,
        description: 'Payment Made',
        details: payment.notes || '',
        reference: payment.reference || '',
        debitAmount: 0,
        creditAmount: payment.amount,
        runningBalance: 0 // Will be calculated
      });
    });

    // Add credit note entries (credits)
    creditNotes.forEach(creditNote => {
      if (creditNote.credit_amount > 0) {
        entries.push({
          id: creditNote.id || '',
          type: 'credit_note',
          date: creditNote.issue_date,
          description: 'Credit Note Issued',
          details: creditNote.reason || '',
          reference: creditNote.reference || `CN-${creditNote.id?.slice(-6)}`,
          debitAmount: 0,
          creditAmount: creditNote.credit_amount,
          runningBalance: 0 // Will be calculated
        });
      }
    });

    // Add credit note usage entries (debits)
    creditNoteUsages.forEach(usage => {
      entries.push({
        id: usage.id || '',
        type: 'credit_note',
        date: usage.used_date,
        description: 'Credit Note Used',
        details: usage.description || 'Applied to payment',
        reference: usage.expand?.credit_note?.reference || `CN-${usage.credit_note?.slice(-6)}`,
        debitAmount: usage.used_amount,
        creditAmount: 0,
        runningBalance: 0 // Will be calculated
      });
    });

    // Add refund entries (credits)
    vendorReturns.forEach(returnItem => {
      if (returnItem.status === 'refunded' && returnItem.actual_refund_amount && returnItem.actual_refund_amount > 0) {
        entries.push({
          id: returnItem.id || '',
          type: 'refund',
          date: returnItem.completion_date || returnItem.return_date,
          description: 'Refund Processed',
          details: `Refund for Return #${returnItem.id?.slice(-6)}${returnItem.reason ? ` - ${returnItem.reason}` : ''}`,
          reference: `REF-${returnItem.id?.slice(-6)}`,
          debitAmount: 0,
          creditAmount: returnItem.actual_refund_amount,
          runningBalance: 0 // Will be calculated
        });
      }
    });

    // Sort entries by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    entries.forEach(entry => {
      runningBalance += entry.debitAmount - entry.creditAmount;
      entry.runningBalance = runningBalance;
    });

    // Calculate totals
    const totalDebits = entries.reduce((sum, entry) => sum + entry.debitAmount, 0);
    const totalCredits = entries.reduce((sum, entry) => sum + entry.creditAmount, 0);
    const finalBalance = totalDebits - totalCredits;

    return {
      vendor,
      entries,
      totals: {
        totalDebits,
        totalCredits,
        finalBalance
      }
    };
  }

  static downloadXmlFile(xmlContent: string, filename: string): void {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}