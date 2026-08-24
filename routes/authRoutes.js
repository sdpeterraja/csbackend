// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

// POST /api/user/login
router.post('/login', authController.login);

// POST /api/user/register
router.post('/register', authController.register);

// GET /api/user/me
router.get('/me', authenticateUser, authController.getMe);

// POST /api/user/logout
router.post('/logout', authenticateUser, async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;