import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload.middleware';
import {
    healthCheck,
    uploadFile,
    getSheets,
    getColumns,
    extractData,
    generateSql,
} from '../controllers/extractor.controller';

const router = Router();

router.get('/health', healthCheck);
router.post('/upload', uploadMiddleware.single('file'), uploadFile);
router.get('/sheets/:filename', getSheets);
router.get('/columns/:filename', getColumns);
router.post('/extract', extractData);
router.post('/generate-sql', generateSql);

export default router;