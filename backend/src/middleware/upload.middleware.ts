import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Como estamos en src/middleware, subimos dos niveles para llegar a la raíz del backend
export const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
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

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.dat'];

export const uploadMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Formato no soportado. Usa .xlsx, .xls, .csv o .dat'));
        }
    },
});