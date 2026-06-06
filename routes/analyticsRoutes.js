// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

// Dashboard analytics
router.get('/dashboard', analyticsController.getDashboardAnalytics);
router.get('/overview', analyticsController.getOverview);
router.get('/realtime', analyticsController.getRealtimeStats);

// Campaign analytics
router.get('/campaigns', analyticsController.getCampaignAnalytics);
router.get('/campaigns/:campaignId', analyticsController.getSingleCampaignAnalytics);
router.get('/campaigns/compare', analyticsController.compareCampaigns);

// Subscriber analytics
router.get('/subscribers/growth', analyticsController.getSubscriberGrowth);
router.get('/subscribers/engagement', analyticsController.getSubscriberEngagement);
router.get('/subscribers/segmentation', analyticsController.getSegmentationAnalytics);
router.get('/subscribers/retention', analyticsController.getRetentionAnalytics);

// Email performance
router.get('/email/performance', analyticsController.getEmailPerformance);
router.get('/email/timing', analyticsController.getBestSendingTimes);
router.get('/email/subject-lines', analyticsController.getSubjectLineAnalytics);

// Revenue analytics
router.get('/revenue/attribution', analyticsController.getRevenueAttribution);
router.get('/revenue/roi', analyticsController.getROIAnalytics);

// Export analytics
router.get('/export', analyticsController.exportAnalytics);
router.get('/reports/weekly', analyticsController.getWeeklyReport);
router.get('/reports/monthly', analyticsController.getMonthlyReport);

// Custom queries
router.post('/custom', analyticsController.customQuery);

module.exports = router;