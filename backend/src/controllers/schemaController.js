const { detectColumnType, SUPPORTED_TYPES } = require('../utils/schemaUtils');

/**
 * Validate data against a provided schema
 */
const validateSchema = async (req, res, next) => {
  try {
    const { schema, data } = req.body;

    if (!schema || !data) {
      return res.status(400).json({ 
        error: true, 
        message: 'Schema and data are required' 
      });
    }

    const errors = [];
    const headers = Object.keys(schema);

    data.forEach((row, rowIndex) => {
      headers.forEach(header => {
        const expectedType = schema[header];
        const value = row[header];
        
        if (!isValidType(value, expectedType)) {
          errors.push({
            row: rowIndex + 1,
            column: header,
            value: value,
            expectedType: expectedType,
            message: `Invalid type at row ${rowIndex + 1}, column "${header}"`
          });
        }
      });
    });

    res.json({
      success: errors.length === 0,
      isValid: errors.length === 0,
      errors: errors,
      totalErrors: errors.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-detect schema from data
 */
const detectSchema = async (req, res, next) => {
  try {
    const { headers, rows } = req.body;

    if (!headers || !rows) {
      return res.status(400).json({ 
        error: true, 
        message: 'Headers and rows are required' 
      });
    }

    const schema = {};
    
    headers.forEach((header, index) => {
      const columnValues = rows.map(row => row[index]).filter(val => val !== null && val !== undefined && val !== '');
      schema[header] = detectColumnType(columnValues);
    });

    res.json({
      success: true,
      schema: schema
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get supported data types
 */
const getSupportedTypes = (req, res) => {
  res.json({
    success: true,
    types: SUPPORTED_TYPES
  });
};

/**
 * Check if value matches expected type
 */
function isValidType(value, expectedType) {
  if (value === null || value === undefined || value === '') {
    return true; // Allow null/empty values
  }

  switch (expectedType.toUpperCase()) {
    case 'INTEGER':
    case 'INT':
      return Number.isInteger(Number(value));
    case 'DECIMAL':
    case 'FLOAT':
    case 'DOUBLE':
      return !isNaN(parseFloat(value));
    case 'VARCHAR':
    case 'TEXT':
    case 'STRING':
      return typeof value === 'string' || typeof value === 'number';
    case 'DATE':
      return !isNaN(Date.parse(value));
    case 'BOOLEAN':
    case 'BOOL':
      return ['true', 'false', '1', '0', true, false, 1, 0].includes(value);
    default:
      return true;
  }
}

module.exports = {
  validateSchema,
  detectSchema,
  getSupportedTypes
};
