/**
 * Modelos de dominio para el flujo de extracción de Excel/CSV.
 *
 * Propósito: centralizar tipos compartidos entre apartados sin importar componentes entre sí.
 * Buena práctica: DTOs y estados explícitos facilitan validación y mensajes de error coherentes.
 */

/** Estados posibles del proceso de subida (máquina de estados simple y legible). */
export type EstadoSubida = 'idle' | 'uploading' | 'validating' | 'done' | 'error';

/**
 * Representa una columna detectada en el archivo, tal como la consume la UI de selección.
 * El backend envía nombres distintos; aquí normalizamos para la vista.
 */
export interface ColumnaExcel {
  posicion: number;
  titulo: string;
  tipo: string;
  ejemploCelda: string;
  elegida: boolean;
}

/** Información de una hoja del archivo (respuesta de /api/sheets). */
export interface SheetInfo {
  name: string;
  rowCount: number;
  isEmpty: boolean;
}

/** Resultado de validar el ancho de columnas entre hoja origen y hoja destino (respuesta de /api/extract). */
export interface ValidacionTransferenciaColumnas {
  habilitada: boolean;
  hojaDestino: string;
  columnasOrigen: number;
  columnasDestino: number;
  encabezadosTransferidos: string[];
  encabezadosOmitidos: string[];
}

/** Metadatos del SQL generado para una hoja. */
export interface SqlMeta {
  truncated: boolean;
  totalRowsInFile: number;
  rowCountInScript: number;
  sheetName: string;
}

/**
 * Estado completo del workflow de una hoja individual.
 * Cada hoja activa tiene su propio flujo: columnas → preview → SQL.
 */
export interface SheetWorkflow {
  sheetName: string;
  isEmpty: boolean;

  // Column selection
  columns: ColumnaExcel[];
  columnSearchText: string;
  columnPage: number;
  loadingColumns: boolean;
  totalRowsInFile: number;

  // Preview / extraction
  previewHeaders: string[];
  previewRows: string[][];
  previewTruncated: boolean;
  previewTotalRowsInFile: number;
  previewLoading: boolean;
  previewError: string;
  previewPageSize: 10 | 15 | 20;
  previewPage: number;
  columnTransferValidation: ValidacionTransferenciaColumnas | null;

  // Optional cross-sheet target validation
  targetSheetName: string;

  // SQL generation
  sqlOutput: string;
  sqlMeta: SqlMeta | null;
  sqlGenerating: boolean;
  sqlError: string;
  tableName: string;
  dialect: 'mysql' | 'postgresql';
  includeCreateTable: boolean;
  emptyStringAsNull: boolean;
}
