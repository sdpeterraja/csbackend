// routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Public webhook endpoint for Brevo (no auth)
router.post('/brevo', webhookController.handleBrevoWebhook);

module.exports = router;