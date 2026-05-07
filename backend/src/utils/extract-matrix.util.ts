import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

import { formatValue } from './file.utils';
import { uploadsDir } from '../middleware/upload.middleware';

export const MAX_EXTRACT_ROWS = 5000;

/** Fila cuyas celdas extraídas son todas vacías (tras trim), p. ej. `''` o solo espacios. */
function isCompletelyEmptyExtractedRow(cells: string[]): boolean {
    return cells.every((c) => String(c ?? '').trim() === '');
}

export type ColumnTransferValidation = {
    enabled: boolean;
    targetSheetName: string;
    sourceColumnCount: number;
    destinationColumnCount: number;
    transferredHeaders: string[];
    omittedHeaders: string[];
};

export type ExtractMatrixSuccess = {
    sheetName: string;
    headerLabels: string[];
    rows: string[][];
    totalRowsInFile: number;
    truncated: boolean;
    columnTransferValidation?: ColumnTransferValidation;
};

export type ExtractMatrixResult =
    | { ok: true; data: ExtractMatrixSuccess }
    | { ok: false; status: number; message: string };

/**
 * Lee el archivo subido y devuelve encabezados + filas formateadas como en `/api/extract`.
 * Centraliza validaciones para reutilizarlas en extracción y generación SQL.
 * Omite filas en las que todas las columnas seleccionadas quedan vacías.
 */
export function extractMatrixFromUploadedFile(params: {
    filename: string;
    headerRow: number;
    columnIndices: unknown;
    requestedSheet?: string;
    requestedTargetSheet?: string;
}): ExtractMatrixResult {
    const { filename, headerRow, columnIndices, requestedSheet, requestedTargetSheet } = params;

    if (!filename || typeof filename !== 'string' || /[/\\]/.test(filename)) {
        return { ok: false, status: 400, message: 'Nombre de archivo inválido' };
    }

    if (!Array.isArray(columnIndices) || columnIndices.length === 0) {
        return { ok: false, status: 400, message: 'Indica al menos una columna (columnIndices)' };
    }

    const indices = columnIndices
        .map((i) => parseInt(String(i), 10))
        .filter((i) => !Number.isNaN(i) && i >= 0);

    if (indices.length === 0) {
        return { ok: false, status: 400, message: 'Índices de columna no válidos' };
    }

    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
        return { ok: false, status: 404, message: 'Archivo no encontrado' };
    }

    try {
        const workbook = XLSX.readFile(filePath, { cellDates: true });
        const sheetName =
            requestedSheet && workbook.SheetNames.includes(requestedSheet)
                ? requestedSheet
                : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

        if (!data || data.length === 0 || !data.some((row) => row && row.length > 0)) {
            return {
                ok: false,
                status: 422,
                message: 'El archivo está vacío o no tiene un formato de datos tabular válido para leer.',
            };
        }

        if (data.length < headerRow) {
            return {
                ok: false,
                status: 400,
                message: 'La fila de encabezado excede el número de filas del archivo',
            };
        }

        const headers = data[headerRow - 1] as unknown[];
        const dataRows = data.slice(headerRow);
        const sourceColumnCount = headers.length;

        let indicesToExtract = [...indices];
        let columnTransferValidation: ColumnTransferValidation | undefined;

        const targetSheet = typeof requestedTargetSheet === 'string' ? requestedTargetSheet.trim() : '';

        if (targetSheet) {
            if (!workbook.SheetNames.includes(targetSheet)) {
                return {
                    ok: false,
                    status: 400,
                    message: `La hoja destino "${targetSheet}" no existe en el archivo.`,
                };
            }

            const destSheet = workbook.Sheets[targetSheet];
            const destData: unknown[][] = XLSX.utils.sheet_to_json(destSheet, {
                header: 1,
                defval: '',
                raw: true,
            });

            if (!destData || destData.length < headerRow) {
                return {
                    ok: false,
                    status: 400,
                    message: `La hoja destino "${targetSheet}" no tiene datos en la fila de encabezado indicada (fila ${headerRow}).`,
                };
            }

            const destHeaders = destData[headerRow - 1] as unknown[];
            const destinationColumnCount = destHeaders.length;

            if (sourceColumnCount < destinationColumnCount) {
                return {
                    ok: false,
                    status: 400,
                    message:
                        `No se puede transferir: la hoja origen "${sheetName}" tiene ${sourceColumnCount} columnas ` +
                        `y la hoja destino "${targetSheet}" tiene ${destinationColumnCount}. ` +
                        'La hoja origen debe tener al menos tantas columnas como la destino.',
                };
            }

            const cappedIndices = indices.slice(0, destinationColumnCount);
            const omittedIndices = indices.slice(destinationColumnCount);

            columnTransferValidation = {
                enabled: true,
                targetSheetName: targetSheet,
                sourceColumnCount,
                destinationColumnCount,
                transferredHeaders: cappedIndices.map((i) => String(headers[i] || `Column_${i + 1}`)),
                omittedHeaders: omittedIndices.map((i) => String(headers[i] || `Column_${i + 1}`)),
            };
            indicesToExtract = cappedIndices;
        }

        if (indicesToExtract.length === 0) {
            return {
                ok: false,
                status: 400,
                message:
                    'Tras comparar con la hoja destino no queda ninguna columna seleccionada para transferir. ' +
                    'Elige al menos una columna dentro del ancho permitido.',
            };
        }

        const maxIndex = Math.max(...indicesToExtract);
        if (maxIndex >= headers.length) {
            return { ok: false, status: 400, message: 'Algún índice de columna está fuera de rango' };
        }

        const headerLabels = indicesToExtract.map((i) => String(headers[i] || `Column_${i + 1}`));

        const rows: string[][] = [];
        let truncated = false;
        for (let ri = 0; ri < dataRows.length; ri++) {
            const srcRow = dataRows[ri] as unknown[];
            const extractedRow = indicesToExtract.map((colIdx) => formatValue(srcRow[colIdx] ?? ''));
            if (isCompletelyEmptyExtractedRow(extractedRow)) {
                continue;
            }
            if (rows.length >= MAX_EXTRACT_ROWS) {
                truncated = true;
                break;
            }
            rows.push(extractedRow);
        }

        return {
            ok: true,
            data: {
                sheetName,
                headerLabels,
                rows,
                totalRowsInFile: dataRows.length,
                truncated,
                ...(columnTransferValidation ? { columnTransferValidation } : {}),
            },
        };
    } catch {
        return {
            ok: false,
            status: 422,
            message: 'Error al extraer datos. Verifica el formato del archivo.',
        };
    }
}
