const express = require('express');
const router = express.Router();
const User = require('../models/User');

function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    next();
}

router.post('/register', async (req, res) => {
    const { name, dateOfBirth, phoneNumber, email, password } = req.body;

    if (!name || !dateOfBirth || !phoneNumber || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists' });
        }

        // password hashing happens in the User model's pre-save hook
        const user = await User.create({ name, dateOfBirth, phoneNumber, email, password });

        req.session.userId = user._id.toString();
        res.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('REGISTER ERROR:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        req.session.userId = user._id.toString();
        res.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

router.get('/me', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, authenticated: false, message: 'Not logged in' });
    }
    try {
        const user = await User.findById(req.session.userId).select('name email phoneNumber dateOfBirth');
        if (!user) return res.status(401).json({ success: false, authenticated: false, message: 'Not logged in' });
        res.json({ success: true, authenticated: true, user: { id: user._id, name: user.name, email: user.email, phoneNumber: user.phoneNumber, dateOfBirth: user.dateOfBirth } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
module.exports.requireAuth = requireAuth;