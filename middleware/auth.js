// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let effectiveUserId = decoded.userId;
    let adminUser = null;
    
    // Multi-tenancy: find organization admin to share resources
    const currentUser = await User.findById(decoded.userId);
    if (currentUser && currentUser.organizationName) {
      adminUser = await User.findOne({
        organizationName: currentUser.organizationName,
        role: { $in: ['admin', 'owner'] },
        organizationLogo: { $ne: null }
      }).sort({ createdAt: 1 });
      
      // Fallback if no admin has a logo but there is an admin
      if (!adminUser) {
        adminUser = await User.findOne({
          organizationName: currentUser.organizationName,
          role: { $in: ['admin', 'owner'] }
        }).sort({ createdAt: 1 });
      }
      
      if (adminUser) {
        effectiveUserId = adminUser._id.toString();
      }
    }
    
    req.user = { 
      userId: effectiveUserId, // effective tenant ID for resources
      authUserId: decoded.userId, // actual authenticated user ID
      email: decoded.email,
      organizationName: currentUser?.organizationName || null,
      organizationLogo: adminUser ? adminUser.organizationLogo : currentUser?.organizationLogo,
      role: currentUser?.role || 'user'
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = { authenticateUser };