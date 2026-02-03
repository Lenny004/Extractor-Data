const express = require('express');
const router = express.Router();
const sqlController = require('../controllers/sqlController');

// Generate INSERT statements
router.post('/generate/insert', sqlController.generateInsert);

// Generate CREATE TABLE statement
router.post('/generate/create-table', sqlController.generateCreateTable);

// Generate full SQL script (CREATE TABLE + INSERT)
router.post('/generate/full', sqlController.generateFullScript);

module.exports = router;
