// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/profile/avatar', userController.updateAvatar);
router.delete('/profile/avatar', userController.removeAvatar);

// Account settings
router.put('/settings', userController.updateSettings);
router.get('/settings', userController.getSettings);

// Password management
router.post('/change-password', userController.changePassword);
router.post('/reset-password-request', userController.requestPasswordReset);
router.post('/reset-password', userController.resetPassword);

// Two-factor authentication
router.post('/2fa/enable', userController.enable2FA);
router.post('/2fa/verify', userController.verify2FA);
router.post('/2fa/disable', userController.disable2FA);

// User preferences
router.put('/preferences', userController.updatePreferences);
router.get('/preferences', userController.getPreferences);

// API keys management
router.get('/api-keys', userController.getApiKeys);
router.post('/api-keys', userController.createApiKey);
router.delete('/api-keys/:keyId', userController.revokeApiKey);

// Account deletion
router.post('/delete-account', userController.requestAccountDeletion);
router.post('/confirm-deletion', userController.confirmAccountDeletion);

// Activity log
router.get('/activity', userController.getActivityLog);

// Connected services
router.get('/connections', userController.getConnections);
router.delete('/connections/:service', userController.disconnectService);

// Email notifications settings
router.put('/notifications', userController.updateNotificationSettings);
router.get('/notifications', userController.getNotificationSettings);

// Export user data
router.get('/export-data', userController.exportUserData);

module.exports = router;