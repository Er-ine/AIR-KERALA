const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, dateOfBirth, phoneNumber, email, password, confirmPassword } = req.body;

  if (!name || !dateOfBirth || !phoneNumber || !email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const newUser = await User.create({
      name,
      dateOfBirth,
      phoneNumber,
      email: email.toLowerCase().trim(),
      password
    });

    // Auto login on registration
    req.session.userId = newUser._id;

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        dateOfBirth: newUser.dateOfBirth,
        phoneNumber: newUser.phoneNumber
      }
    });
  } catch (err) {
    console.error('REGISTRATION ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    req.session.userId = user._id;

    res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ success: true, authenticated: false, user: null });
  }

  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      req.session.destroy(() => {});
      return res.json({ success: true, authenticated: false, user: null });
    }

    res.json({
      success: true,
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (err) {
    console.error('AUTH ME ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error checking session.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Could not log out.' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully.' });
    });
  } else {
    res.json({ success: true, message: 'Logged out successfully.' });
  }
});

module.exports = router;
