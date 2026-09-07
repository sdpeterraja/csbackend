// routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.get('/usage', billingController.getUsageAndCharges);

module.exports = router;
