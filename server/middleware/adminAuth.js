const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Admin authentication middleware.
 * Verifies JWT token AND checks that the user has is_admin === true.
 */
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    if (user.is_banned) {
      return res.status(403).json({ message: 'Your account has been banned.' });
    }

    if (!user.is_admin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

module.exports = adminAuth;
