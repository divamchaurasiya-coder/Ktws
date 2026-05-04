import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export async function generateBookReport(books: any[], stats: any) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Accession Register');

  // CBSE 14 Columns + SR NO
  worksheet.columns = [
    { header: 'SR.', key: 'sr', width: 6 },                // A
    { header: 'DATE', key: 'date', width: 12 },            // B
    { header: 'ACC. NO.', key: 'acc_no', width: 15 },      // C
    { header: 'AUTHOR', key: 'author', width: 25 },        // D
    { header: 'TITLE', key: 'title', width: 35 },          // E
    { header: 'EDITION', key: 'edition', width: 10 },      // F
    { header: 'VOL.', key: 'vol', width: 8 },              // G
    { header: 'PUBLISHER', key: 'publisher', width: 25 },  // H
    { header: 'YEAR', key: 'year', width: 10 },            // I
    { header: 'SOURCE', key: 'source', width: 15 },        // J
    { header: 'BILL NO', key: 'bill', width: 12 },         // K
    { header: 'COST', key: 'cost', width: 10 },            // L
    { header: 'CLASS NO.', key: 'class_no', width: 12 },   // M
    { header: 'REMARKS', key: 'remarks', width: 15 },      // N
  ];

  // --- HEADER SECTION ---
  worksheet.mergeCells('A1:N6');
  const headerCell = worksheet.getCell('A1');
  headerCell.value = {
    richText: [
      { text: 'KTWS SCHOOL\n', font: { bold: true, size: 24, color: { argb: 'FF1E293B' } } },
      { text: 'ACCESSION REGISTER\n', font: { bold: true, size: 36, color: { argb: 'FF1E293B' } } },
      { text: 'LIBRARY MANAGEMENT SYSTEM', font: { bold: true, size: 14, color: { argb: 'FF94A3B8' } } }
    ]
  };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

  // Date and Stats in header
  worksheet.mergeCells('O2:P3');
  const dateCell = worksheet.getCell('O2');
  dateCell.value = { richText: [{ text: 'DATE\n', font: { size: 9, bold: true, color: { argb: 'FFFFFFFF' } } }, { text: format(new Date(), 'dd-MMM-yyyy'), font: { size: 12, bold: true, color: { argb: 'FFFFFFFF' } } }] };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  worksheet.mergeCells('O4:P5');
  const totalBooksCell = worksheet.getCell('O4');
  totalBooksCell.value = { richText: [{ text: 'TOTAL BOOKS\n', font: { size: 9, bold: true, color: { argb: 'FFFFFFFF' } } }, { text: stats.totalBooks.toString(), font: { size: 16, bold: true, color: { argb: 'FFFFFFFF' } } }] };
  totalBooksCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  totalBooksCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  // --- STATS BOXES SECTION (Row 8) ---
  const statsConfig = [
    { label: 'TOTAL BOOKS', value: stats.totalBooks, color: 'FF4F46E5', col: 1 },
    { label: 'AVAILABLE', value: stats.availableBooks, color: 'FF10B981', col: 4 },
    { label: 'ISSUED', value: stats.issuedBooks, color: 'FFF59E0B', col: 7 },
    { label: 'OVERDUE', value: stats.overdueBooks, color: 'FFEF4444', col: 10 },
    { label: 'CATEGORIES', value: stats.totalCategories, color: 'FF8B5CF6', col: 13 }
  ];

  statsConfig.forEach((config) => {
    const startCol = config.col;
    worksheet.mergeCells(8, startCol, 8, startCol + 1);
    const cell = worksheet.getCell(8, startCol);
    cell.value = {
      richText: [
        { text: `${config.label}\n`, font: { size: 8, bold: true, color: { argb: config.color } } },
        { text: config.value.toString(), font: { size: 16, bold: true, color: { argb: 'FF1E293B' } } }
      ]
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
  });

  // --- TABLE HEADER ---
  const headerRow = worksheet.getRow(11);
  headerRow.values = ['SR.', 'DATE', 'ACC. NO.', 'AUTHOR', 'TITLE', 'EDITION', 'VOL.', 'PUBLISHER', 'YEAR', 'SOURCE', 'BILL NO', 'COST', 'CLASS NO.', 'REMARKS'];
  headerRow.height = 35;
  headerRow.eachCell((cell) => {
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // --- DATA ROWS ---
  books.forEach((book, index) => {
    const row = worksheet.addRow([
      index + 1,
      book.created_at ? format(new Date(book.created_at), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy'),
      book.barcode || '',
      book.author || '',
      book.title || '',
      '1st', // Default edition
      '-',   // Default vol
      book.publisher || 'N/A',
      book.published_year || '-',
      'Vendor',
      '-',
      '0.00',
      book.category || 'General',
      book.available_copies > 0 ? 'Available' : 'Issued'
    ]);

    row.height = 25;
    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      cell.font = { size: 9 };
      if (colNumber === 14) {
        cell.font = { color: { argb: cell.value === 'Available' ? 'FF10B981' : 'FFEF4444' }, bold: true, size: 9 };
      }
    });
  });

  // --- FOOTER ---
  const lastRow = worksheet.lastRow ? worksheet.lastRow.number : 11;
  const footerStart = lastRow + 3;

  // Category Summary
  const categoriesMap = books.reduce((acc: any, b: any) => {
    const cat = b.category || 'General';
    acc[cat] = (acc[cat] || 0) + (b.total_copies || 0);
    return acc;
  }, {});
  const cats = Object.entries(categoriesMap).slice(0, 10);

  worksheet.mergeCells(`E${footerStart}:H${footerStart}`);
  const catHeader = worksheet.getCell(`E${footerStart}`);
  catHeader.value = 'CATEGORY SUMMARY';
  catHeader.font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
  catHeader.alignment = { horizontal: 'center' };
  catHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  cats.forEach(([cat, count]: [string, any], i: number) => {
    const r = footerStart + 1 + i;
    worksheet.getCell(`E${r}`).value = cat;
    worksheet.getCell(`F${r}`).value = count;
  });

  // Notes
  worksheet.mergeCells(`I${footerStart}:L${footerStart + 5}`);
  const notesCell = worksheet.getCell(`I${footerStart}`);
  notesCell.value = {
    richText: [
      { text: 'NOTES\n', font: { bold: true, size: 11, color: { argb: 'FF1E293B' } } },
      { text: '• CBSE Mandated Accession Register Format\n', font: { size: 9 } },
      { text: '• Handle books with care.\n', font: { size: 9 } },
      { text: '• Return books on time.\n\n', font: { size: 9 } },
      { text: 'THANK YOU!', font: { italic: true, bold: true, size: 12, color: { argb: 'FF4F46E5' } } }
    ]
  };
  notesCell.alignment = { vertical: 'top', wrapText: true, indent: 1 };
  notesCell.border = { top: { style: 'medium', color: { argb: 'FFF1F5F9' } }, left: { style: 'medium', color: { argb: 'FFF1F5F9' } }, bottom: { style: 'medium', color: { argb: 'FFF1F5F9' } }, right: { style: 'medium', color: { argb: 'FFF1F5F9' } } };

  // Banner
  worksheet.mergeCells(`A${lastRow + 12}:N${lastRow + 12}`);
  const banner = worksheet.getCell(`A${lastRow + 12}`);
  banner.value = '"A BOOK IS A GIFT YOU CAN OPEN AGAIN AND AGAIN."  - KTWS SCHOOL LIBRARY';
  banner.alignment = { horizontal: 'center' };
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  banner.font = { color: { argb: 'FFFFFFFF' }, italic: true, bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Accession_Register_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
