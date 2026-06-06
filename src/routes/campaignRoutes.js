// routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.get('/', campaignController.getCampaigns);
router.get('/:id', campaignController.getCampaign);
router.get('/:id/stats', campaignController.getCampaignStats);
router.post('/', campaignController.createCampaign);
router.put('/:id', campaignController.updateCampaign);
router.post('/:id/send', campaignController.sendCampaign);
router.post('/:id/test', campaignController.sendTestEmail);
router.post('/:id/duplicate', campaignController.duplicateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router;