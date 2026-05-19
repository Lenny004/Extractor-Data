import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

import { detectType, formatValue } from '../utils/file.utils';
import { uploadsDir } from '../middleware/upload.middleware';
import {
    extractMatrixFromUploadedFile,
    type ColumnTransferValidation,
} from '../utils/extract-matrix.util';
import { buildInsertSqlScript, type SqlDialect } from '../utils/sql-insert.util';

export type { ColumnTransferValidation };

export const healthCheck = (_req: Request, res: Response) => {
    res.json({ success: true, message: 'OK' });
};

export const uploadFile = (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No se envió ningún archivo' });
        return;
    }
    res.json({
        success: true,
        data: {
            originalName: req.file.originalname,
            storedName: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
        },
        message: 'Archivo subido correctamente',
    });
};

export const getSheets = (req: Request, res: Response) => {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'Archivo no encontrado' });
        return;
    }

    try {
        const workbook = XLSX.readFile(filePath, { cellDates: true });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('El archivo no tiene hojas');
        }
        const sheets = workbook.SheetNames.map((name) => {
            const sheet = workbook.Sheets[name];
            const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            const dataRows = data && data.length > 0 && data.some((r) => r.some((c) => c !== ''))
                ? data
                : [];
            return {
                name,
                rowCount: dataRows.length,
                isEmpty: dataRows.length === 0,
            };
        });
        res.json({ success: true, data: sheets });
    } catch (error) {
        res.status(422).json({
            success: false,
            message: 'El archivo está corrupto, vacío o no tiene un formato tabular válido.',
        });
    }
};

export const getColumns = (req: Request, res: Response) => {
    const { filename } = req.params;
    const headerRow = parseInt(req.query.headerRow as string) || 1;
    const requestedSheet = req.query.sheetName as string;

    if (/[/\\]/.test(filename)) {
        res.status(400).json({ success: false, message: 'Nombre de archivo inválido' });
        return;
    }

    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'Archivo no encontrado' });
        return;
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
            res.status(422).json({
                success: false,
                message: 'El archivo está vacío o no tiene un formato de datos tabular válido para leer.',
            });
            return;
        }

        if (data.length < headerRow) {
            res.status(400).json({
                success: false,
                message: 'La fila de encabezado excede el número de filas del archivo',
            });
            return;
        }

        const headers = data[headerRow - 1] as unknown[];
        const dataRows = data.slice(headerRow);

        const columns = headers.map((header: unknown, index: number) => {
            const values = dataRows
                .map((row: unknown[]) => row[index])
                .filter((v: unknown) => v != null && v !== '');
            const sampleValue = values.length > 0 ? formatValue(values[0]) : '';
            const type = detectType(values);

            return {
                index,
                name: String(header || `Column_${index + 1}`),
                type,
                sampleData: sampleValue,
            };
        });

        res.json({ success: true, data: { sheetName, totalRows: dataRows.length, columns } });
    } catch (error) {
        res.status(422).json({ success: false, message: 'Error al leer el archivo. Verifica que no esté corrupto.' });
    }
};

export const extractData = (req: Request, res: Response) => {
    const filename = req.body?.filename as string | undefined;
    const headerRow = parseInt(String(req.body?.headerRow), 10) || 1;
    const columnIndices = req.body?.columnIndices as unknown;
    const requestedSheet = req.body?.sheetName as string;
    const requestedTargetSheet =
        typeof req.body?.targetSheetName === 'string' ? req.body.targetSheetName.trim() : '';

    const result = extractMatrixFromUploadedFile({
        filename: filename ?? '',
        headerRow,
        columnIndices,
        requestedSheet,
        requestedTargetSheet,
    });

    if (!result.ok) {
        res.status(result.status).json({ success: false, message: result.message });
        return;
    }

    const d = result.data;
    res.json({
        success: true,
        data: {
            sheetName: d.sheetName,
            headers: d.headerLabels,
            rows: d.rows,
            totalRowsInFile: d.totalRowsInFile,
            truncated: d.truncated,
            ...(d.columnTransferValidation ? { columnTransferValidation: d.columnTransferValidation } : {}),
        },
    });
};

export const generateSql = (req: Request, res: Response) => {
    const filename = req.body?.filename as string | undefined;
    const headerRow = parseInt(String(req.body?.headerRow), 10) || 1;
    const columnIndices = req.body?.columnIndices as unknown;
    const requestedSheet = req.body?.sheetName as string;
    const requestedTargetSheet =
        typeof req.body?.targetSheetName === 'string' ? req.body.targetSheetName.trim() : '';

    const tableNameRaw = typeof req.body?.tableName === 'string' ? req.body.tableName.trim() : '';
    if (!tableNameRaw) {
        res.status(400).json({ success: false, message: 'Indica el nombre de la tabla (tableName)' });
        return;
    }

    const dialectRaw = req.body?.dialect;
    const dialect: SqlDialect = dialectRaw === 'postgresql' ? 'postgresql' : 'mysql';
    const includeCreateTable = Boolean(req.body?.includeCreateTable);
    const emptyStringAsNull = Boolean(req.body?.emptyStringAsNull);

    const result = extractMatrixFromUploadedFile({
        filename: filename ?? '',
        headerRow,
        columnIndices,
        requestedSheet,
        requestedTargetSheet,
    });

    if (!result.ok) {
        res.status(result.status).json({ success: false, message: result.message });
        return;
    }

    const d = result.data;
    const sql = buildInsertSqlScript({
        tableName: tableNameRaw,
        headers: d.headerLabels,
        rows: d.rows,
        dialect,
        includeCreateTable,
        emptyStringAsNull,
    });

    res.json({
        success: true,
        data: {
            sql,
            dialect,
            sheetName: d.sheetName,
            truncated: d.truncated,
            totalRowsInFile: d.totalRowsInFile,
            rowCountInScript: d.rows.length,
            ...(d.columnTransferValidation ? { columnTransferValidation: d.columnTransferValidation } : {}),
        },
    });
};
