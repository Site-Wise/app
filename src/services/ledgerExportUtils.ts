import jsPDF from 'jspdf';

export type LedgerEntry = {
  date: string;
  particulars: string;
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
};

export type LedgerExportOptions = {
  vendorName: string;
  contactPerson?: string;
  entries: LedgerEntry[];
  openingBalance?: number;
  hasOpeningBalance?: boolean;
  filterFromDate?: string;
  filterToDate?: string;
  translations: {
    vendorLedger: string;
    vendor: string;
    contact: string;
    generated: string;
    filterPeriod: string;
    beginning: string;
    today: string;
    date: string;
    particulars: string;
    reference: string;
    debit: string;
    credit: string;
    balance: string;
    openingBalance: string;
    totals: string;
    totalOutstanding: string;
    creditBalance: string;
  };
};

const addFooter = (doc: jsPDF, pageWidth: number, pageHeight: number, margin: number, pageNum: number) => {
  const footerY = pageHeight - 15;

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  // Footer text
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128); // Gray color
  doc.text('Generated with SiteWise - One stop solution for construction site management', margin, footerY);

  // Page number (right aligned)
  doc.text(`Page ${pageNum}`, pageWidth - margin - 15, footerY);
};

/**
 * Generates a PDF document for a vendor ledger
 * @returns The jsPDF document instance (call .save() or .output('blob') on it)
 */
export const generateLedgerPDF = async (options: LedgerExportOptions): Promise<jsPDF> => {
  const {
    vendorName,
    contactPerson,
    entries,
    openingBalance = 0,
    hasOpeningBalance = false,
    filterFromDate,
    filterToDate,
    translations: t
  } = options;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  let yPosition = 25;
  const hasDateFilter = !!(filterFromDate || filterToDate);

  // Load and add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
      logoImg.src = '/logo.png';
    });

    // Add logo to the right side of header with proper aspect ratio
    const maxLogoWidth = 25;
    const maxLogoHeight = 15;

    // Calculate aspect ratio and fit within bounds
    const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
    let logoWidth = maxLogoWidth;
    let logoHeight = maxLogoWidth / aspectRatio;

    // If height exceeds max, scale by height instead
    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = maxLogoHeight * aspectRatio;
    }

    const logoX = pageWidth - margin - logoWidth;
    const logoY = yPosition - 5;

    doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    // Continue without logo if it fails to load
  }

  // Document title
  yPosition += 10;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(t.vendorLedger, margin, yPosition);

  // Vendor information
  yPosition += 12;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`${t.vendor}: ${vendorName}`, margin, yPosition);

  yPosition += 6;
  if (contactPerson) {
    doc.text(`${t.contact}: ${contactPerson}`, margin, yPosition);
    yPosition += 6;
  }

  doc.text(`${t.generated}: ${new Date().toLocaleDateString('en-CA')}`, margin, yPosition);

  // Show filter period if active
  if (hasDateFilter) {
    yPosition += 6;
    const periodText = `${t.filterPeriod}: ${filterFromDate || t.beginning} - ${filterToDate || t.today}`;
    doc.text(periodText, margin, yPosition);
  }

  yPosition += 15;

  // Table headers with adjusted column widths
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const headers = [t.date, t.particulars, t.reference, t.debit, t.credit, t.balance];
  const colWidths = [22, 70, 25, 22, 22, 22];
  let xPos = margin;

  headers.forEach((header, i) => {
    doc.text(header, xPos, yPosition);
    xPos += colWidths[i];
  });

  yPosition += 6;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  // Add opening balance row if filtering
  if (hasOpeningBalance) {
    xPos = margin;

    const openingBalanceDisplay = openingBalance >= 0
      ? `${Math.abs(openingBalance).toFixed(0)} Cr`
      : `${Math.abs(openingBalance).toFixed(0)} Dr`;

    doc.text(filterFromDate || '', xPos, yPosition);
    xPos += colWidths[0];
    doc.text(t.openingBalance, xPos, yPosition);
    xPos += colWidths[1];
    doc.text('', xPos, yPosition);
    xPos += colWidths[2];
    doc.text('', xPos, yPosition);
    xPos += colWidths[3];
    doc.text('', xPos, yPosition);
    xPos += colWidths[4];
    doc.text(openingBalanceDisplay, xPos, yPosition);

    yPosition += 5;
  }

  // Calculate export totals
  let exportTotalDebits = 0;
  let exportTotalCredits = 0;

  // Render entries
  for (const entry of entries) {
    if (yPosition > 245) {
      doc.addPage();
      yPosition = 25;
    }

    xPos = margin;

    // Truncate particulars to fit in column
    const maxParticularsWidth = colWidths[1] - 2;
    let particularsText = entry.particulars;
    while (doc.getTextWidth(particularsText) > maxParticularsWidth && particularsText.length > 3) {
      particularsText = particularsText.slice(0, -4) + '...';
    }

    // Truncate reference similarly
    const maxRefWidth = colWidths[2] - 2;
    let refText = entry.reference || '-';
    while (doc.getTextWidth(refText) > maxRefWidth && refText.length > 3) {
      refText = refText.slice(0, -4) + '...';
    }

    // Balance display with Cr/Dr notation
    const balanceDisplay = entry.runningBalance >= 0
      ? `${Math.abs(entry.runningBalance).toFixed(0)} Cr`
      : `${Math.abs(entry.runningBalance).toFixed(0)} Dr`;

    // Draw each column
    doc.text(new Date(entry.date).toLocaleDateString('en-CA'), xPos, yPosition);
    xPos += colWidths[0];

    doc.text(particularsText, xPos, yPosition);
    xPos += colWidths[1];

    doc.text(refText, xPos, yPosition);
    xPos += colWidths[2];

    doc.text(entry.debit > 0 ? entry.debit.toFixed(0) : '-', xPos, yPosition);
    xPos += colWidths[3];

    doc.text(entry.credit > 0 ? entry.credit.toFixed(0) : '-', xPos, yPosition);
    xPos += colWidths[4];

    doc.text(balanceDisplay, xPos, yPosition);

    exportTotalDebits += entry.debit;
    exportTotalCredits += entry.credit;

    yPosition += 5;
  }

  // Summary
  if (yPosition > 210) {
    doc.addPage();
    yPosition = 25;
  }

  yPosition += 8;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // Add totals
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  xPos = margin;

  doc.text(t.totals, xPos, yPosition);
  xPos += colWidths[0] + colWidths[1] + colWidths[2];

  doc.text(exportTotalDebits.toFixed(0), xPos, yPosition);
  xPos += colWidths[3];

  doc.text(exportTotalCredits.toFixed(0), xPos, yPosition);
  xPos += colWidths[4];

  const exportFinalBalance = openingBalance + exportTotalCredits - exportTotalDebits;
  const finalBalanceDisplay = exportFinalBalance >= 0
    ? `${Math.abs(exportFinalBalance).toFixed(0)} Cr`
    : `${Math.abs(exportFinalBalance).toFixed(0)} Dr`;
  doc.text(finalBalanceDisplay, xPos, yPosition);

  yPosition += 8;

  // Final balance summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const balanceText = exportFinalBalance >= 0
    ? `${t.totalOutstanding}: ₹${exportFinalBalance.toFixed(0)}`
    : `${t.creditBalance}: ₹${Math.abs(exportFinalBalance).toFixed(0)}`;
  doc.text(balanceText, margin, yPosition);

  // Add footer to all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, pageWidth, pageHeight, margin, i);
  }

  return doc;
};

/**
 * Helper function to get translations object for ledger export
 */
export const getLedgerExportTranslations = (t: (key: string) => string) => ({
  vendorLedger: t('vendors.vendorLedger'),
  vendor: t('vendors.vendor'),
  contact: t('vendors.contact'),
  generated: t('vendors.generated'),
  filterPeriod: t('vendors.filterPeriod'),
  beginning: t('vendors.beginning'),
  today: t('vendors.today'),
  date: t('vendors.date'),
  particulars: t('vendors.particulars'),
  reference: t('vendors.reference'),
  debit: t('vendors.debit'),
  credit: t('vendors.credit'),
  balance: t('vendors.balance'),
  openingBalance: t('vendors.openingBalance'),
  totals: t('vendors.totals'),
  totalOutstanding: t('vendors.totalOutstanding'),
  creditBalance: t('vendors.creditBalance'),
});

/**
 * CSV export options
 */
export type LedgerCSVOptions = {
  vendorName: string;
  entries: LedgerEntry[];
  openingBalance?: number;
  hasOpeningBalance?: boolean;
  filterFromDate?: string;
  filterToDate?: string;
  translations: {
    date: string;
    particulars: string;
    reference: string;
    debit: string;
    credit: string;
    balance: string;
    openingBalance: string;
    totals: string;
    filterPeriod: string;
    beginning: string;
    today: string;
    generated: string;
    outstanding: string;
    creditBalance: string;
    finalBalance: string;
  };
};

/**
 * Helper function to escape CSV values
 */
const escapeCSV = (value: string): string => {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Generates CSV content for a vendor ledger
 * @returns CSV content as a string
 */
export const generateLedgerCSV = (options: LedgerCSVOptions): string => {
  const {
    entries,
    openingBalance = 0,
    hasOpeningBalance = false,
    filterFromDate,
    filterToDate,
    translations: t
  } = options;

  const headers = [
    t.date,
    t.particulars,
    t.reference,
    t.debit,
    t.credit,
    t.balance
  ];

  const rows: (string | number)[][] = [];
  const hasDateFilter = !!(filterFromDate || filterToDate);

  // Add opening balance row if filtering
  if (hasOpeningBalance) {
    const openingBalanceDisplay = openingBalance >= 0
      ? `${openingBalance.toFixed(2)} Cr`
      : `${Math.abs(openingBalance).toFixed(2)} Dr`;

    rows.push([
      filterFromDate || '',
      t.openingBalance,
      '',
      '',
      '',
      openingBalanceDisplay
    ]);
  }

  // Calculate export totals
  let exportTotalDebits = 0;
  let exportTotalCredits = 0;

  // Add entries
  entries.forEach(entry => {
    const balanceDisplay = entry.runningBalance >= 0
      ? `${entry.runningBalance.toFixed(2)} Cr`
      : `${Math.abs(entry.runningBalance).toFixed(2)} Dr`;

    rows.push([
      new Date(entry.date).toLocaleDateString('en-CA'),
      escapeCSV(entry.particulars),
      escapeCSV(entry.reference || ''),
      entry.debit > 0 ? entry.debit.toFixed(2) : '',
      entry.credit > 0 ? entry.credit.toFixed(2) : '',
      balanceDisplay
    ]);

    exportTotalDebits += entry.debit;
    exportTotalCredits += entry.credit;
  });

  // Add totals row
  rows.push([
    '',
    t.totals,
    '',
    exportTotalDebits.toFixed(2),
    exportTotalCredits.toFixed(2),
    ''
  ]);

  // Add summary information
  rows.push(['', '', '', '', '', '']);

  // Add filter info if active
  if (hasDateFilter) {
    rows.push([
      t.filterPeriod,
      `${filterFromDate || t.beginning} - ${filterToDate || t.today}`,
      '',
      '',
      '',
      ''
    ]);
  }

  rows.push([
    t.generated,
    new Date().toISOString().split('T')[0],
    '',
    '',
    '',
    ''
  ]);

  const exportFinalBalance = openingBalance + exportTotalCredits - exportTotalDebits;
  const balanceStatus = exportFinalBalance >= 0 ? t.outstanding : t.creditBalance;
  const finalBalanceDisplay = exportFinalBalance >= 0
    ? `₹${exportFinalBalance.toFixed(2)} Cr (${balanceStatus})`
    : `₹${Math.abs(exportFinalBalance).toFixed(2)} Dr (${balanceStatus})`;

  rows.push([
    t.finalBalance,
    finalBalanceDisplay,
    '',
    '',
    '',
    ''
  ]);

  // Convert to CSV
  const csvRows = [headers, ...rows];
  return csvRows.map(row =>
    row.map(field =>
      typeof field === 'string' && field.includes(',') ? `"${field}"` : field
    ).join(',')
  ).join('\n');
};

/**
 * Helper function to get translations object for CSV export
 */
export const getLedgerCSVTranslations = (t: (key: string) => string) => ({
  date: t('vendors.date'),
  particulars: t('vendors.particulars'),
  reference: t('vendors.reference'),
  debit: t('vendors.debit'),
  credit: t('vendors.credit'),
  balance: t('vendors.balance'),
  openingBalance: t('vendors.openingBalance'),
  totals: t('vendors.totals'),
  filterPeriod: t('vendors.filterPeriod'),
  beginning: t('vendors.beginning'),
  today: t('vendors.today'),
  generated: t('vendors.generated'),
  outstanding: t('vendors.outstanding'),
  creditBalance: t('vendors.creditBalance'),
  finalBalance: t('vendors.finalBalance'),
});
