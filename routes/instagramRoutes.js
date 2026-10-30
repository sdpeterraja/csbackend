const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');

router.get('/config', instagramController.getConfig);
router.post('/config', instagramController.saveConfig);

router.get('/posts', instagramController.getPosts);
router.post('/posts', instagramController.createCustomPost);

router.get('/automations', instagramController.getAutomations);
router.post('/automations', instagramController.createAutomation);
router.put('/automations/:id', instagramController.updateAutomation);
router.delete('/automations/:id', instagramController.deleteAutomation);

router.post('/simulate-comment', instagramController.simulateComment);
router.post('/verify-follow', instagramController.verifyFollowAndUnlockLink);

router.get('/webhook', instagramController.verifyWebhook);
router.post('/webhook', instagramController.handleWebhook);

module.exports = router;

