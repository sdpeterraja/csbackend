// routes/subscriberRoutes.js
const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController');
const { authenticateUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

// Subscriber CRUD operations
router.get('/', subscriberController.getSubscribers);
router.get('/stats', subscriberController.getSubscriberStats);
router.get('/export', subscriberController.exportSubscribers);
router.get('/:id', subscriberController.getSubscriber);
router.post('/', subscriberController.createSubscriber);
router.put('/:id', subscriberController.updateSubscriber);
router.delete('/:id', subscriberController.deleteSubscriber);

// Bulk operations
router.post('/bulk-import', subscriberController.bulkImport);
router.post('/bulk-delete', subscriberController.bulkDelete);
router.post('/bulk-update', subscriberController.bulkUpdate);

// Subscriber management
router.post('/:id/unsubscribe', subscriberController.unsubscribe);
router.post('/:id/resubscribe', subscriberController.resubscribe);
router.post('/:id/add-to-list', subscriberController.addToList);
router.post('/:id/remove-from-list', subscriberController.removeFromList);

// List management
router.get('/lists/all', subscriberController.getAllLists);
router.post('/lists', subscriberController.createList);
router.get('/lists/:listId/subscribers', subscriberController.getSubscribersByList);
router.delete('/lists/:listId', subscriberController.deleteList);

// Segmentation
router.post('/segments', subscriberController.createSegment);
router.get('/segments', subscriberController.getSegments);
router.get('/segments/:segmentId/subscribers', subscriberController.getSubscribersBySegment);
router.put('/segments/:segmentId', subscriberController.updateSegment);
router.delete('/segments/:segmentId', subscriberController.deleteSegment);

// Analytics
router.get('/analytics/overview', subscriberController.getAnalytics);
router.get('/analytics/growth', subscriberController.getGrowthData);
router.get('/analytics/engagement', subscriberController.getEngagementData);

// Tags
router.post('/:id/tags', subscriberController.addTags);
router.delete('/:id/tags', subscriberController.removeTags);

// Search
router.get('/search/:query', subscriberController.searchSubscribers);

// Import/Export
router.post('/import/csv', subscriberController.importFromCSV);
router.get('/export/csv', subscriberController.exportToCSV);

module.exports = router;