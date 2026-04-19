const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, college_email, password } = req.body;

    // Validate required fields
    if (!username || !college_email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    // Validate email domain
    if (!college_email.toLowerCase().endsWith('@vit.edu')) {
      return res.status(400).json({ message: 'Only @vit.edu email addresses are allowed.' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Validate username length
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ message: 'Username must be between 3 and 30 characters.' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ college_email: college_email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // Check for existing username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ message: 'This username is already taken.' });
    }

    // Create user
    const user = new User({
      username,
      college_email: college_email.toLowerCase(),
      password,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      trust_score: 100,
      is_admin: false,
      is_banned: false,
    });

    await user.save();

    const token = generateToken(user._id);
    const profile = user.toProfile();

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: profile,
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email or username already in use.' });
    }
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { college_email, password } = req.body;

    if (!college_email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ college_email: college_email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check if banned
    if (user.is_banned) {
      return res.status(403).json({ message: 'Your account has been banned. Contact support.' });
    }

    const token = generateToken(user._id);
    const profile = user.toProfile();

    res.json({
      message: 'Welcome back!',
      token,
      user: profile,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me — verify token & return current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    res.json({ user: user.toProfile() });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

// PATCH /api/auth/profile — update user profile (auth required)
const authMiddleware = require('../middleware/auth');
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, contact } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (full_name !== undefined) user.full_name = full_name.trim();
    if (contact !== undefined) user.contact = contact.trim();

    await user.save();
    res.json({ message: 'Profile updated!', user: user.toProfile() });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

module.exports = router;
