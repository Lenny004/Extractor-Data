import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Usa .xlsx, .xls o .csv'));
    }
  },
});

function detectType(values: unknown[]): string {
  if (values.length === 0) return 'text';
  const sample = values.slice(0, 50);
  if (sample.every(v => v instanceof Date)) return 'date';
  if (sample.every(v => typeof v === 'number')) return 'number';
  if (sample.every(v => typeof v === 'boolean')) return 'boolean';
  if (sample.every(v => typeof v === 'string' && /^\d{4}[-/]\d{2}[-/]\d{2}/.test(v))) return 'date';
  return 'text';
}

function formatValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value);
}

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

app.get('/api/health', (_, res) => {
  res.json({ success: true, message: 'OK' });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
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
});

app.get('/api/columns/:filename', (req, res) => {
  const { filename } = req.params;
  const headerRow = parseInt(req.query.headerRow as string) || 1;

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
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

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

    res.json({
      success: true,
      data: { sheetName, totalRows: dataRows.length, columns },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Error al leer el archivo' });
  }
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'El archivo excede el tamaño máximo de 10MB',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado',
    };
    res.status(400).json({ success: false, message: messages[err.code] || err.message });
    return;
  }
  res.status(400).json({ success: false, message: err.message });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
