// routes/listRoutes.js
const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const { authenticateUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

// List CRUD operations
router.get('/', listController.getLists);
router.get('/:id', listController.getList);
router.post('/', listController.createList);
router.put('/:id', listController.updateList);
router.delete('/:id', listController.deleteList);

// List management
router.get('/:id/subscribers', listController.getListSubscribers);
router.post('/:id/add-subscribers', listController.addSubscribersToList);
router.post('/:id/remove-subscribers', listController.removeSubscribersFromList);
router.post('/:id/import', listController.importToBrevoList);

// List statistics
router.get('/:id/stats', listController.getListStats);

// List export
router.get('/:id/export', listController.exportList);

module.exports = router;