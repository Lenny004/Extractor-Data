/**
 * Supported SQL data types
 */
const SUPPORTED_TYPES = [
  { name: 'VARCHAR', description: 'Variable-length string' },
  { name: 'TEXT', description: 'Long text' },
  { name: 'INTEGER', description: 'Whole number' },
  { name: 'DECIMAL', description: 'Decimal number' },
  { name: 'FLOAT', description: 'Floating point number' },
  { name: 'DATE', description: 'Date value' },
  { name: 'DATETIME', description: 'Date and time value' },
  { name: 'BOOLEAN', description: 'True/False value' }
];

/**
 * Detect the data type of a column based on its values
 * @param {Array} values - Array of column values
 * @returns {string} Detected SQL type
 */
function detectColumnType(values) {
  if (!values || values.length === 0) {
    return 'VARCHAR(255)';
  }

  const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonEmptyValues.length === 0) {
    return 'VARCHAR(255)';
  }

  // Check for boolean
  const boolValues = ['true', 'false', '1', '0', 'yes', 'no'];
  if (nonEmptyValues.every(v => boolValues.includes(String(v).toLowerCase()))) {
    return 'BOOLEAN';
  }

  // Check for integer
  if (nonEmptyValues.every(v => Number.isInteger(Number(v)) && !isNaN(Number(v)))) {
    return 'INTEGER';
  }

  // Check for decimal/float
  if (nonEmptyValues.every(v => !isNaN(parseFloat(v)))) {
    return 'DECIMAL(10,2)';
  }

  // Check for date
  const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{2}-\d{2}-\d{4}$/;
  if (nonEmptyValues.every(v => datePattern.test(String(v)) || !isNaN(Date.parse(v)))) {
    const hasTime = nonEmptyValues.some(v => String(v).includes(':'));
    return hasTime ? 'DATETIME' : 'DATE';
  }

  // Default to VARCHAR with appropriate length
  const maxLength = Math.max(...nonEmptyValues.map(v => String(v).length));
  if (maxLength > 255) {
    return 'TEXT';
  }
  
  return `VARCHAR(${Math.min(Math.max(maxLength * 2, 50), 255)})`;
}

module.exports = {
  SUPPORTED_TYPES,
  detectColumnType
};
