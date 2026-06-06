// routes/templateSyncRoutes.js
const express = require('express');
const router = express.Router();
const BrevoTemplateService = require('../services/brevoTemplateService');
const BrevoConfig = require('../models/BrevoConfig');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

// Get template service instance
const getTemplateService = async (userId) => {
  const brevoConfig = await BrevoConfig.findOne({ userId, isConnected: true });
  if (!brevoConfig) {
    throw new Error('Brevo not connected');
  }
  return new BrevoTemplateService(process.env.BREVO_API_KEY);
};

// ============ TRANSACTIONAL TEMPLATES ============

// Get all SMTP templates
router.get('/smtp', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    const { page, limit } = req.query;
    const templates = await service.getSmtpTemplates(true, page, limit);
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single SMTP template
router.get('/smtp/:id', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    const template = await service.getSmtpTemplate(parseInt(req.params.id));
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create SMTP template
router.post('/smtp', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    const template = await service.createSmtpTemplate(req.body);
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update SMTP template
router.put('/smtp/:id', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    await service.updateSmtpTemplate(parseInt(req.params.id), req.body);
    res.json({ success: true, message: 'Template updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete SMTP template
router.delete('/smtp/:id', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    await service.deleteSmtpTemplate(parseInt(req.params.id));
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send test email for template
router.post('/smtp/:id/test', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    const { testEmails } = req.body;
    await service.sendTestSmtpTemplate(parseInt(req.params.id), testEmails);
    res.json({ success: true, message: 'Test email sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Preview template
router.post('/smtp/:id/preview', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    const preview = await service.previewSmtpTemplate(parseInt(req.params.id), req.body);
    res.json({ success: true, data: preview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ CAMPAIGN TEMPLATES ============

// Get all campaign templates
router.get('/campaign', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    const { page, limit } = req.query;
    const templates = await service.getCampaignTemplates(page, limit);
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create campaign template
router.post('/campaign', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    const template = await service.createCampaignTemplate(req.body);
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update campaign template
router.put('/campaign/:id', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    await service.updateCampaignTemplate(parseInt(req.params.id), req.body);
    res.json({ success: true, message: 'Campaign updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete campaign template
router.delete('/campaign/:id', async (req, res) => {
  try {
    const service = await getTemplateService(req.user.userId);
    await service.deleteCampaignTemplate(parseInt(req.params.id));
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;