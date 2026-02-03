const xlsx = require('xlsx');

/**
 * Parse Excel buffer and return JSON data
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Parse options
 * @returns {Array} Parsed data as array of objects
 */
function parseExcelBuffer(buffer, options = {}) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = options.sheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  let data = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false
  });

  if (options.limit && options.limit > 0) {
    data = data.slice(0, options.limit);
  }

  return data;
}

/**
 * Get all sheet names from a workbook
 * @param {Buffer} buffer - File buffer
 * @returns {Array} Array of sheet names
 */
function getSheetNames(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  return workbook.SheetNames;
}

/**
 * Parse specific sheet from Excel file
 * @param {Buffer} buffer - File buffer
 * @param {string} sheetName - Name of the sheet to parse
 * @returns {Array} Parsed data as array of objects
 */
function parseSheet(buffer, sheetName) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  return xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false
  });
}

module.exports = {
  parseExcelBuffer,
  getSheetNames,
  parseSheet
};
