import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { healthCheck, uploadFile, getSheets, getColumns, extractData } from '../controllers/extractor.controller';

const router = Router();

router.get('/health', healthCheck);
router.post('/upload', uploadMiddleware.single('file'), uploadFile);
router.get('/sheets/:filename', getSheets);
router.get('/columns/:filename', getColumns);
router.post('/extract', extractData);

export default router;