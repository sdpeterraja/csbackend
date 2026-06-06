// routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticateUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

// Campaign CRUD operations
router.get('/', campaignController.getCampaigns);           // GET /api/campaigns
router.get('/:id', campaignController.getCampaign);         // GET /api/campaigns/:id (FULL campaign)
router.post('/', campaignController.createCampaign);        // POST /api/campaigns
router.put('/:id', campaignController.updateCampaign);      // PUT /api/campaigns/:id
router.delete('/:id', campaignController.deleteCampaign);   // DELETE /api/campaigns/:id

// Campaign actions
router.post('/:id/send', campaignController.sendCampaign);       // POST /api/campaigns/:id/send
router.post('/:id/test', campaignController.sendTestEmail);      // POST /api/campaigns/:id/test
router.post('/:id/duplicate', campaignController.duplicateCampaign); // POST /api/campaigns/:id/duplicate
router.get('/:id/stats', campaignController.getCampaignStats);   // GET /api/campaigns/:id/stats (ONLY stats)
router.get('/:id/debug', campaignController.debugCampaignBrevoId);
router.post('/:id/refresh-stats', campaignController.refreshCampaignStats);
router.get('/stats/overall', campaignController.getOverallStats);


module.exports = router;