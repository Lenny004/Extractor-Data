const express = require('express');
const router = express.Router();
const schemaController = require('../controllers/schemaController');

// Validate schema against data
router.post('/validate', schemaController.validateSchema);

// Detect schema from data
router.post('/detect', schemaController.detectSchema);

// Get supported data types
router.get('/types', schemaController.getSupportedTypes);

module.exports = router;
