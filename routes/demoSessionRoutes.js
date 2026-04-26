const express = require('express');
const router = express.Router();
const DemoSession = require('../models/DemoSession');
const adminAuth = require('../middleware/adminAuth');

// Start a demo session (public - from merchant auth page)
router.post('/start', async (req, res) => {
  try {
    const { restaurantName, email } = req.body;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const session = await DemoSession.create({ restaurantName, email, expiresAt, isActive: true });
    res.json({ sessionId: session._id, expiresAt, token: 'DEMO_' + session._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to start demo', error: err.message });
  }
});

// Get all demo sessions (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const sessions = await DemoSession.find().sort({ createdAt: -1 }).limit(200);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sessions', error: err.message });
  }
});

// Extend a demo session (admin only)
router.patch('/:id/extend', adminAuth, async (req, res) => {
  try {
    const { hours = 1 } = req.body;
    const session = await DemoSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    const base = new Date(session.expiresAt) > new Date() ? new Date(session.expiresAt) : new Date();
    session.expiresAt = new Date(base.getTime() + hours * 60 * 60 * 1000);
    session.isActive = true;
    await session.save();
    res.json({ message: `Extended by ${hours}h`, session });
  } catch (err) {
    res.status(500).json({ message: 'Failed to extend', error: err.message });
  }
});

// Stop a demo session (admin only)
router.patch('/:id/stop', adminAuth, async (req, res) => {
  try {
    const session = await DemoSession.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.json({ message: 'Demo stopped', session });
  } catch (err) {
    res.status(500).json({ message: 'Failed to stop demo', error: err.message });
  }
});

module.exports = router;
