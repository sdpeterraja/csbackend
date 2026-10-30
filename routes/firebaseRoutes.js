const express = require('express');
const router = express.Router();
const firebaseController = require('../controllers/firebaseController');

router.post('/test', firebaseController.testConnection);
router.post('/config', firebaseController.saveConfig);
router.post('/send', firebaseController.sendPush);

module.exports = router;
