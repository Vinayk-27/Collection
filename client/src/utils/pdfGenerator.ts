import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RegisterData, ALL_MONTHS } from '../types';

export function exportRegisterToPDF(data: RegisterData, year: number) {
  // A4 Landscape is 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Background bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('MONTHLY PAYMENT REGISTER', 14, 14);

  // Financial Year Badge in Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Financial / Calendar Year: ${year}`, pageWidth - 14, 14, { align: 'right' });

  // Subheader info: Generation date & Google Sheets sync status
  const genDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated on: ${genDate} | Total Members: ${data.members.length}`, 14, 28);

  // Summary Metrics Banner Box
  const boxY = 32;
  const boxHeight = 16;
  const colWidth = (pageWidth - 28) / 4;

  // Expected
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxY, colWidth - 4, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL MEMBERS', 18, boxY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.summary.totalMembers} Members`, 18, boxY + 12);

  // Expected Amount
  doc.roundedRect(14 + colWidth, boxY, colWidth - 4, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL EXPECTED', 18 + colWidth, boxY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Rs. ${data.summary.totalExpectedYear.toLocaleString('en-IN')}`, 18 + colWidth, boxY + 12);

  // Collected Amount (Green)
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(14 + colWidth * 2, boxY, colWidth - 4, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(4, 120, 87);
  doc.text('TOTAL COLLECTED', 18 + colWidth * 2, boxY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`Rs. ${data.summary.totalCollectedYear.toLocaleString('en-IN')}`, 18 + colWidth * 2, boxY + 12);

  // Pending Amount (Orange)
  doc.setFillColor(255, 247, 237); // orange-50
  doc.setDrawColor(254, 215, 170); // orange-200
  doc.roundedRect(14 + colWidth * 3, boxY, colWidth - 4, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(194, 65, 12);
  doc.text('TOTAL PENDING', 18 + colWidth * 3, boxY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text(`Rs. ${data.summary.totalPendingYear.toLocaleString('en-IN')}`, 18 + colWidth * 3, boxY + 12);

  // Build Table Headers
  const tableHeaders = [
    ['Sr.', 'Member Name', 'Fee', ...ALL_MONTHS]
  ];

  // Build Table Rows
  const tableRows = data.members.map((member, idx) => {
    const row: any[] = [
      (idx + 1).toString(),
      member.name,
      `Rs. ${member.monthlyAmount}`,
    ];

    ALL_MONTHS.forEach((month) => {
      const cell = member.months[month];
      // Display actual amount (with indicator if paid)
      row.push(`Rs. ${cell.amount}`);
    });

    return row;
  });

  // Footer Totals Rows
  const collectedRow = [
    '',
    'Total Collected',
    '',
    ...ALL_MONTHS.map((m) => `Rs. ${data.summary.monthlyBreakdown[m].collected}`),
  ];

  const pendingRow = [
    '',
    'Total Pending',
    '',
    ...ALL_MONTHS.map((m) => `Rs. ${data.summary.monthlyBreakdown[m].pending}`),
  ];

  // Track paid cells lookup
  const paidMatrix: boolean[][] = data.members.map((member) => {
    return ALL_MONTHS.map((m) => member.months[m].status === 'PAID');
  });

  // Call autoTable with landscape columns
  autoTable(doc, {
    startY: 53,
    head: tableHeaders,
    body: tableRows,
    foot: [collectedRow, pendingRow],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      halign: 'center',
      valign: 'middle',
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // Sr
      1: { cellWidth: 38, halign: 'left', fontStyle: 'bold' }, // Name
      2: { cellWidth: 16, halign: 'center' }, // Fee
      3: { cellWidth: 17 }, // Jan
      4: { cellWidth: 17 }, // Feb
      5: { cellWidth: 17 }, // Mar
      6: { cellWidth: 17 }, // Apr
      7: { cellWidth: 17 }, // May
      8: { cellWidth: 17 }, // Jun
      9: { cellWidth: 17 }, // Jul
      10: { cellWidth: 17 }, // Aug
      11: { cellWidth: 17 }, // Sep
      12: { cellWidth: 17 }, // Oct
      13: { cellWidth: 17 }, // Nov
      14: { cellWidth: 17 }, // Dec
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center',
    },
    didParseCell: (hookData) => {
      // Body month columns (indices 3 to 14)
      if (hookData.section === 'body' && hookData.column.index >= 3) {
        const rowIndex = hookData.row.index;
        const monthIndex = hookData.column.index - 3;
        const isPaid = paidMatrix[rowIndex] && paidMatrix[rowIndex][monthIndex];

        if (isPaid) {
          // Paid: Distinct green background and dark green text
          hookData.cell.styles.fillColor = [209, 250, 229]; // emerald-100
          hookData.cell.styles.textColor = [6, 95, 70]; // emerald-800
          hookData.cell.styles.fontStyle = 'bold';
        } else {
          // Unpaid: Neutral background and soft grey text
          hookData.cell.styles.fillColor = [255, 255, 255];
          hookData.cell.styles.textColor = [100, 116, 139];
        }
      }

      // Foot styling
      if (hookData.section === 'foot') {
        if (hookData.row.index === 0) {
          // Collected
          hookData.cell.styles.fillColor = [236, 253, 245];
          hookData.cell.styles.textColor = [4, 120, 87];
        } else if (hookData.row.index === 1) {
          // Pending
          hookData.cell.styles.fillColor = [255, 247, 237];
          hookData.cell.styles.textColor = [194, 65, 12];
        }
      }
    },
    margin: { top: 52, left: 14, right: 14, bottom: 15 },
    didDrawPage: (pageData) => {
      // Footer page numbers
      const str = `Page ${pageData.pageNumber} of ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth - 14, pageHeight - 8, { align: 'right' });
      doc.text(
        'Monthly Payment Register - Digital Records Verified with Google Sheets',
        14,
        pageHeight - 8
      );
    },
  });

  // Trigger download automatically
  doc.save(`Monthly_Payment_Register_${year}.pdf`);
}
