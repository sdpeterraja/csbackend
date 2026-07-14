const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticateUser } = require('../middleware/auth');

// Note: base64 uploads can be quite large, ensure body-parser limits in server.js are sufficient
router.post('/base64', authenticateUser, uploadController.uploadBase64Image);

module.exports = router;
