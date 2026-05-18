import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import apiRoutes from './routes/api.routes';
import { cleanupExpiredUploads } from './utils/file.utils';
import { uploadsDir } from './middleware/upload.middleware';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_CLEANUP_INTERVAL_MS = Number(process.env.UPLOAD_CLEANUP_INTERVAL_MS) || 5 * 60 * 1000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Enlazamos todas las rutas modulares
app.use('/api', apiRoutes);

// Middleware global para atrapar errores (como archivos de +10MB)
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
  console.log(`Backend corriendo limpio y ordenado en http://localhost:${PORT}`);
  cleanupExpiredUploads(uploadsDir);
  setInterval(() => cleanupExpiredUploads(uploadsDir), UPLOAD_CLEANUP_INTERVAL_MS);
});