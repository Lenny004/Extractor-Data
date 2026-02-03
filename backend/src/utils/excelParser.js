const ExcelJS = require('exceljs');

/**
 * Parse Excel buffer and return JSON data
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Parse options
 * @returns {Promise<Array>} Parsed data as array of objects
 */
async function parseExcelBuffer(buffer, options = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = options.sheetName 
    ? workbook.getWorksheet(options.sheetName) 
    : workbook.worksheets[0];
  
  if (!worksheet) {
    throw new Error('No worksheet found');
  }

  const data = [];
  const headers = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
      });
    } else {
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1] || `Column${colNumber}`;
        rowData[header] = getCellValue(cell);
      });
      // Fill missing columns with null
      headers.forEach(header => {
        if (!(header in rowData)) {
          rowData[header] = null;
        }
      });
      data.push(rowData);
    }
  });

  if (options.limit && options.limit > 0) {
    return data.slice(0, options.limit);
  }

  return data;
}

/**
 * Get cell value handling different types
 * @param {Object} cell - ExcelJS cell object
 * @returns {*} Cell value
 */
function getCellValue(cell) {
  if (cell.value === null || cell.value === undefined) {
    return null;
  }
  
  // Handle rich text
  if (typeof cell.value === 'object' && cell.value.richText) {
    return cell.value.richText.map(rt => rt.text).join('');
  }
  
  // Handle formula results
  if (typeof cell.value === 'object' && cell.value.result !== undefined) {
    return cell.value.result;
  }
  
  // Handle dates
  if (cell.value instanceof Date) {
    return cell.value.toISOString().split('T')[0];
  }
  
  return cell.value;
}

/**
 * Get all sheet names from a workbook
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Array>} Array of sheet names
 */
async function getSheetNames(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets.map(ws => ws.name);
}

/**
 * Parse specific sheet from Excel file
 * @param {Buffer} buffer - File buffer
 * @param {string} sheetName - Name of the sheet to parse
 * @returns {Promise<Array>} Parsed data as array of objects
 */
async function parseSheet(buffer, sheetName) {
  return parseExcelBuffer(buffer, { sheetName });
}

/**
 * Parse Excel buffer and return raw data (headers + rows)
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Object>} Object with headers and rows arrays
 */
async function parseExcelRaw(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  
  if (!worksheet) {
    throw new Error('No worksheet found');
  }

  const headers = [];
  const rows = [];
  
  worksheet.eachRow((row, rowNumber) => {
    const rowValues = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowValues[colNumber - 1] = getCellValue(cell);
    });
    
    if (rowNumber === 1) {
      headers.push(...rowValues.map((v, i) => v?.toString() || `Column${i + 1}`));
    } else {
      // Ensure row has same length as headers
      while (rowValues.length < headers.length) {
        rowValues.push(null);
      }
      rows.push(rowValues.slice(0, headers.length));
    }
  });

  return {
    sheetName: worksheet.name,
    headers,
    rows
  };
}

module.exports = {
  parseExcelBuffer,
  getSheetNames,
  parseSheet,
  parseExcelRaw
};
