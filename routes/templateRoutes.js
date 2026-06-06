// routes/templateRoutes.js
const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.get('/', templateController.getTemplates);
router.get('/:id', templateController.getTemplate);
router.post('/', templateController.createTemplate);
router.put('/:id', templateController.updateTemplate);
router.delete('/:id', templateController.deleteTemplate);
router.post('/:id/favorite', templateController.toggleFavorite);
router.post('/:id/increment-usage', templateController.incrementUsage);

module.exports = router;