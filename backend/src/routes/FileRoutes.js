const express = require('express');
const router = express.Router();
const multer = require('multer');
const FileController = require('../controllers/FileController');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/upload', upload.single('file'), FileController.UploadFile);
router.post('/process', FileController.ProcessFile);
router.get('/download/:id', FileController.DownloadFile);

module.exports = router;
