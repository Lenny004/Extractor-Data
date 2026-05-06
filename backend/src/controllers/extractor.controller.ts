import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { detectType, formatValue } from '../utils/file.utils';
import { uploadsDir } from '../middleware/upload.middleware';

const MAX_EXTRACT_ROWS = 5000;

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
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!data || data.length === 0) {
            throw new Error('El archivo está totalmente vacío');
        }
        res.json({ success: true, data: workbook.SheetNames });
    } catch (error) {
        res.status(422).json({ success: false, message: 'El archivo está corrupto, vacío o no tiene un formato tabular válido.' });
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
        const sheetName = requestedSheet && workbook.SheetNames.includes(requestedSheet)
            ? requestedSheet
            : workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

        if (!data || data.length === 0 || !data.some(row => row && row.length > 0)) {
            res.status(422).json({ success: false, message: 'El archivo está vacío o no tiene un formato de datos tabular válido para leer.' });
            return;
        }

        if (data.length < headerRow) {
            res.status(400).json({ success: false, message: 'La fila de encabezado excede el número de filas del archivo' });
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

    if (!filename || typeof filename !== 'string' || /[/\\]/.test(filename)) {
        res.status(400).json({ success: false, message: 'Nombre de archivo inválido' });
        return;
    }

    if (!Array.isArray(columnIndices) || columnIndices.length === 0) {
        res.status(400).json({ success: false, message: 'Indica al menos una columna (columnIndices)' });
        return;
    }

    const indices = columnIndices.map((i) => parseInt(String(i), 10)).filter((i) => !Number.isNaN(i) && i >= 0);

    if (indices.length === 0) {
        res.status(400).json({ success: false, message: 'Índices de columna no válidos' });
        return;
    }

    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'Archivo no encontrado' });
        return;
    }

    try {
        const workbook = XLSX.readFile(filePath, { cellDates: true });
        const sheetName = requestedSheet && workbook.SheetNames.includes(requestedSheet) ? requestedSheet : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

        if (!data || data.length === 0 || !data.some(row => row && row.length > 0)) {
            res.status(422).json({ success: false, message: 'El archivo está vacío o no tiene un formato de datos tabular válido para leer.' });
            return;
        }

        if (data.length < headerRow) {
            res.status(400).json({ success: false, message: 'La fila de encabezado excede el número de filas del archivo' });
            return;
        }

        const headers = data[headerRow - 1] as unknown[];
        const dataRows = data.slice(headerRow);
        const maxIndex = Math.max(...indices);
        if (maxIndex >= headers.length) {
            res.status(400).json({ success: false, message: 'Algún índice de columna está fuera de rango' });
            return;
        }

        const headerLabels = indices.map((i) => String(headers[i] || `Column_${i + 1}`));
        const limitedRows = dataRows.slice(0, MAX_EXTRACT_ROWS);
        const rows = limitedRows.map((row) => indices.map((colIdx) => formatValue((row as unknown[])[colIdx] ?? '')));

        res.json({
            success: true,
            data: { sheetName, headers: headerLabels, rows, totalRowsInFile: dataRows.length, truncated: dataRows.length > MAX_EXTRACT_ROWS },
        });
    } catch (error) {
        res.status(422).json({ success: false, message: 'Error al extraer datos. Verifica el formato del archivo.' });
    }
};