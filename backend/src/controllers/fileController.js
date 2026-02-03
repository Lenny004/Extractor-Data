const xlsx = require('xlsx');
const { parseExcelBuffer } = require('../utils/excelParser');

/**
 * Upload and process a file
 */
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No file uploaded' });
    }

    const data = parseExcelBuffer(req.file.buffer);
    
    res.json({
      success: true,
      message: 'File uploaded and processed successfully',
      filename: req.file.originalname,
      data: data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Preview file data (limited rows)
 */
const previewFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No file uploaded' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const data = parseExcelBuffer(req.file.buffer, { limit });
    
    res.json({
      success: true,
      filename: req.file.originalname,
      preview: data.slice(0, limit),
      totalRows: data.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Parse file and return structured data with headers
 */
const parseFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = jsonData[0] || [];
    const rows = jsonData.slice(1);

    res.json({
      success: true,
      filename: req.file.originalname,
      sheetName: sheetName,
      headers: headers,
      rows: rows,
      totalRows: rows.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  previewFile,
  parseFile
};
