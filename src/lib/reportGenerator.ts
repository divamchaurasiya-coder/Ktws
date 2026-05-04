import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export async function generateBookReport(books: any[], stats: any) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Book Record');

  // Set default column widths
  worksheet.columns = [
    { width: 8 },  // A: SR. NO.
    { width: 15 }, // B: BOOK ID
    { width: 35 }, // C: BOOK TITLE
    { width: 25 }, // D: AUTHOR
    { width: 15 }, // E: CATEGORY
    { width: 20 }, // F: PUBLISHER
    { width: 15 }, // G: PUBLISHED YEAR
    { width: 12 }, // H: TOTAL COPIES
    { width: 15 }, // I: AVAILABLE COPIES
    { width: 12 }, // J: ISSUED COPIES
    { width: 15 }, // K: LOCATION
    { width: 12 }, // L: STATUS
  ];

  // --- HEADER SECTION ---
  // Merge cells for the main header (Rows 1-6)
  worksheet.mergeCells('A1:L6');
  const headerCell = worksheet.getCell('A1');
  headerCell.value = {
    richText: [
      { text: 'KTWS SCHOOL\n', font: { bold: true, size: 24, color: { argb: 'FF1E293B' } } },
      { text: 'BOOK RECORD\n', font: { bold: true, size: 36, color: { argb: 'FF1E293B' } } },
      { text: 'LIBRARY MANAGEMENT SYSTEM', font: { bold: true, size: 14, color: { argb: 'FF94A3B8' } } }
    ]
  };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' }
  };

  // Add Date and Total Books on the right side if needed, but the image has them in specific boxes
  worksheet.mergeCells('M3:N4');
  const dateCell = worksheet.getCell('M3');
  dateCell.value = {
    richText: [
      { text: 'DATE\n', font: { size: 10, bold: true, color: { argb: 'FFFFFFFF' } } },
      { text: format(new Date(), 'dd-MMM-yyyy'), font: { size: 14, bold: true, color: { argb: 'FFFFFFFF' } } }
    ]
  };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  dateCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  worksheet.mergeCells('M5:N6');
  const totalBooksCell = worksheet.getCell('M5');
  totalBooksCell.value = {
    richText: [
      { text: 'TOTAL BOOKS\n', font: { size: 10, bold: true, color: { argb: 'FFFFFFFF' } } },
      { text: stats.totalBooks.toString(), font: { size: 18, bold: true, color: { argb: 'FFFFFFFF' } } }
    ]
  };
  totalBooksCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  totalBooksCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  totalBooksCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  // --- STATS BOXES SECTION (Row 8) ---
  const statsConfig = [
    { label: 'TOTAL BOOKS', value: stats.totalBooks, color: 'FF4F46E5', col: 'A' },
    { label: 'AVAILABLE BOOKS', value: stats.availableBooks, color: 'FF10B981', col: 'D' },
    { label: 'ISSUED BOOKS', value: stats.issuedBooks, color: 'FFF59E0B', col: 'G' },
    { label: 'OVERDUE BOOKS', value: stats.overdueBooks, color: 'FFEF4444', col: 'I' },
    { label: 'TOTAL CATEGORIES', value: stats.totalCategories, color: 'FF8B5CF6', col: 'K' }
  ];

  statsConfig.forEach((config, idx) => {
    // Assuming boxes are 2-3 columns wide
    const startCol = config.col;
    const endCol = String.fromCharCode(config.col.charCodeAt(0) + 1);
    const range = `${startCol}8:${endCol}8`;
    worksheet.mergeCells(range);
    const cell = worksheet.getCell(startCol + '8');
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

  // --- TABLE HEADER (Row 10) ---
  const tableHeader = [
    'SR. NO.', 'BOOK ID', 'BOOK TITLE', 'AUTHOR', 'CATEGORY', 'PUBLISHER', 'PUBLISHED YEAR', 'TOTAL COPIES', 'AVAILABLE COPIES', 'ISSUED COPIES', 'LOCATION', 'STATUS'
  ];
  
  const headerRow = worksheet.getRow(11);
  headerRow.values = tableHeader;
  headerRow.eachCell((cell) => {
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  headerRow.height = 30;

  // --- DATA ROWS ---
  books.forEach((book, index) => {
    const issuedCopies = (book.total_copies || 0) - (book.available_copies || 0);
    const row = worksheet.addRow([
      index + 1,
      book.barcode || 'N/A',
      book.title,
      book.author,
      book.category || 'General',
      book.publisher || 'N/A',
      book.published_year || 'N/A',
      book.total_copies || 0,
      book.available_copies || 0,
      issuedCopies,
      book.location || 'N/A',
      book.available_copies > 0 ? 'Available' : 'Issued'
    ]);

    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
      };
      cell.font = { size: 9 };

      // Status Coloring
      if (colNumber === 12) {
        if (cell.value === 'Available') {
          cell.font = { color: { argb: 'FF10B981' }, bold: true, size: 9 };
        } else {
          cell.font = { color: { argb: 'FFEF4444' }, bold: true, size: 9 };
        }
      }
    });

    row.height = 25;
  });

  // --- FOOTER SECTION ---
  const lastRow = worksheet.lastRow ? worksheet.lastRow.number : 11;
  const footerRowStart = lastRow + 3;
  
  // Category Summary
  const categoriesMap = books.reduce((acc: any, b: any) => {
    const cat = b.category || 'General';
    acc[cat] = (acc[cat] || 0) + (b.total_copies || 0);
    return acc;
  }, {});

  const categories = Object.entries(categoriesMap);
  const midPoint = Math.ceil(categories.length / 2);
  const leftCats = categories.slice(0, midPoint);
  const rightCats = categories.slice(midPoint);

  worksheet.mergeCells(`E${footerRowStart}:H${footerRowStart}`);
  const catHeader = worksheet.getCell(`E${footerRowStart}`);
  catHeader.value = 'CATEGORY SUMMARY';
  catHeader.font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
  catHeader.alignment = { horizontal: 'center' };
  catHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  // Left column of categories
  leftCats.forEach((cat: any, i: number) => {
    const rowIdx = footerRowStart + 1 + i;
    worksheet.getCell(`E${rowIdx}`).value = cat[0];
    worksheet.getCell(`F${rowIdx}`).value = cat[1];
    worksheet.getCell(`E${rowIdx}`).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    worksheet.getCell(`F${rowIdx}`).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  });

  // Right column of categories
  rightCats.forEach((cat: any, i: number) => {
    const rowIdx = footerRowStart + 1 + i;
    worksheet.getCell(`G${rowIdx}`).value = cat[0];
    worksheet.getCell(`H${rowIdx}`).value = cat[1];
    worksheet.getCell(`G${rowIdx}`).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    worksheet.getCell(`H${rowIdx}`).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  });

  // Legend & Notes
  worksheet.mergeCells(`A${footerRowStart}:D${footerRowStart + 5}`);
  const legendCell = worksheet.getCell(`A${footerRowStart}`);
  legendCell.value = {
    richText: [
      { text: 'LEGEND\n', font: { bold: true, size: 11, color: { argb: 'FF1E293B' } } },
      { text: '■ Available: Book in library\n', font: { color: { argb: 'FF10B981' }, size: 9 } },
      { text: '■ Issued: Book with student\n', font: { color: { argb: 'FFF59E0B' }, size: 9 } },
      { text: '■ Overdue: Return date passed\n', font: { color: { argb: 'FFEF4444' }, size: 9 } }
    ]
  };
  legendCell.alignment = { vertical: 'top', wrapText: true, indent: 1 };
  legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  legendCell.border = { top: { style: 'medium', color: { argb: 'FFF1F5F9' } }, left: { style: 'medium', color: { argb: 'FFF1F5F9' } }, bottom: { style: 'medium', color: { argb: 'FFF1F5F9' } }, right: { style: 'medium', color: { argb: 'FFF1F5F9' } } };

  worksheet.mergeCells(`I${footerRowStart}:L${footerRowStart + 5}`);
  const notesCell = worksheet.getCell(`I${footerRowStart}`);
  notesCell.value = {
    richText: [
      { text: 'NOTES\n', font: { bold: true, size: 11, color: { argb: 'FF1E293B' } } },
      { text: '• Handle books with care.\n', font: { size: 9 } },
      { text: '• Return books on time.\n', font: { size: 9 } },
      { text: '• Report any damages.\n\n', font: { size: 9 } },
      { text: 'THANK YOU!', font: { italic: true, bold: true, size: 12, color: { argb: 'FF4F46E5' } } }
    ]
  };
  notesCell.alignment = { vertical: 'top', wrapText: true, indent: 1 };
  notesCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  notesCell.border = { top: { style: 'medium', color: { argb: 'FFF1F5F9' } }, left: { style: 'medium', color: { argb: 'FFF1F5F9' } }, bottom: { style: 'medium', color: { argb: 'FFF1F5F9' } }, right: { style: 'medium', color: { argb: 'FFF1F5F9' } } };

  // Bottom text
  worksheet.mergeCells(`A${footerRowStart + 7}:L${footerRowStart + 7}`);
  const finalFooter = worksheet.getCell(`A${footerRowStart + 7}`);
  finalFooter.value = '"A BOOK IS A GIFT YOU CAN OPEN AGAIN AND AGAIN."  - KTWS SCHOOL LIBRARY';
  finalFooter.alignment = { horizontal: 'center' };
  finalFooter.font = { italic: true, size: 10, color: { argb: 'FF94A3B8' } };
  finalFooter.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  finalFooter.font = { color: { argb: 'FFFFFFFF' }, italic: true };

  // Generate Buffer and Save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Book_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
