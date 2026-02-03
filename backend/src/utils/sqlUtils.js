/**
 * Escape a value for SQL insertion
 * @param {*} value - The value to escape
 * @param {string} type - The SQL type of the column
 * @returns {string} Escaped value for SQL
 */
function escapeValue(value, type) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }

  const upperType = (type || 'VARCHAR').toUpperCase();

  // Numeric types
  if (['INTEGER', 'INT', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC'].some(t => upperType.includes(t))) {
    const num = parseFloat(value);
    return isNaN(num) ? 'NULL' : String(num);
  }

  // Boolean type
  if (upperType.includes('BOOLEAN') || upperType.includes('BOOL')) {
    const boolValue = String(value).toLowerCase();
    if (['true', '1', 'yes'].includes(boolValue)) {
      return 'TRUE';
    }
    if (['false', '0', 'no'].includes(boolValue)) {
      return 'FALSE';
    }
    return 'NULL';
  }

  // Date/DateTime types
  if (upperType.includes('DATE') || upperType.includes('DATETIME') || upperType.includes('TIMESTAMP')) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'NULL';
    }
    if (upperType.includes('DATETIME') || upperType.includes('TIMESTAMP')) {
      return `'${date.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    return `'${date.toISOString().slice(0, 10)}'`;
  }

  // String types (VARCHAR, TEXT, CHAR, etc.)
  const escaped = String(value).replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Sanitize column/table name for SQL
 * @param {string} name - The name to sanitize
 * @returns {string} Sanitized name
 */
function sanitizeColumnName(name) {
  // Remove or replace invalid characters
  let sanitized = String(name)
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  // Ensure name is not empty
  if (!sanitized) {
    sanitized = 'column';
  }

  return sanitized.toLowerCase();
}

module.exports = {
  escapeValue,
  sanitizeColumnName
};
