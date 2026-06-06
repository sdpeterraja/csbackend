// routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const { 
  handleBrevoWebhook, 
  testWebhook, 
  fixSentCount, 
  debugCampaign,
  simulateEvent
} = require('../controllers/webhookController');
const { authenticateUser } = require('../middleware/auth');

// Public endpoint for Brevo
router.post('/brevo', handleBrevoWebhook);

// Test endpoint (for debugging)
router.post('/test', testWebhook);
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Webhook test endpoint is working',
    endpoints: {
      brevo: 'POST /api/webhooks/brevo',
      test: 'POST /api/webhooks/test',
      fixSentCount: 'POST /api/webhooks/fix-sent-count/:id',
      debugCampaign: 'GET /api/webhooks/debug-campaign/:id',
      simulateEvent: 'POST /api/webhooks/simulate-event/:campaignId'
    }
  });
});

// Protected debug endpoints
router.post('/fix-sent-count/:id', authenticateUser, fixSentCount);
router.get('/debug-campaign/:id', authenticateUser, debugCampaign);
router.post('/simulate-event/:campaignId', authenticateUser, simulateEvent);

module.exports = router;