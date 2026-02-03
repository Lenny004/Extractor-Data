const express = require('express');
const router = express.Router();
const SchemaController = require('../controllers/SchemaController');

router.post('/validate', SchemaController.ValidateSchema);
router.get('/templates', SchemaController.GetTemplates);

module.exports = router;
