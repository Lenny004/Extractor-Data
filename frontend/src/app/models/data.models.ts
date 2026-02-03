export interface FileData {
  filename: string;
  sheetName?: string;
  headers: string[];
  rows: any[][];
  totalRows: number;
}

export interface ParsedFileResponse {
  success: boolean;
  filename: string;
  sheetName: string;
  headers: string[];
  rows: any[][];
  totalRows: number;
}

export interface SchemaDefinition {
  [columnName: string]: string;
}

export interface ValidationError {
  row: number;
  column: string;
  value: any;
  expectedType: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  isValid: boolean;
  errors: ValidationError[];
  totalErrors: number;
}

export interface SqlGenerationResult {
  success: boolean;
  sql: string;
  statements?: string[];
  totalStatements?: number;
  createTable?: string;
  insertStatements?: string[];
  totalRows?: number;
}

export interface SupportedType {
  name: string;
  description: string;
}
