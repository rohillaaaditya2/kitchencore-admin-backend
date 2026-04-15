const express = require('express');
const router = express.Router();
const SupportChat = require('../models/SupportChat');
const authMiddleware = require('../middleware/auth');

// ── Merchant: Send a message ──────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { text, restaurantName } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });

    const msg = await SupportChat.create({
      restaurantId: req.restaurantId,
      restaurantName: restaurantName || 'Unknown Restaurant',
      sender: 'merchant',
      text: text.trim(),
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Merchant: Get own chat history ────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const msgs = await SupportChat.find({ restaurantId: req.restaurantId })
      .sort({ createdAt: 1 })
      .limit(100);

    await SupportChat.updateMany(
      { restaurantId: req.restaurantId, sender: 'superadmin', read: false },
      { $set: { read: true } }
    );

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Merchant: Count unread superadmin replies ─────────────────────────────────
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const count = await SupportChat.countDocuments({
      restaurantId: req.restaurantId,
      sender: 'superadmin',
      read: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── SuperAdmin: Get all chats grouped by restaurant ───────────────────────────
router.get('/admin/all', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'SuperAdmin') throw new Error();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get latest message per restaurant for inbox view
    const conversations = await SupportChat.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$restaurantId',
          restaurantName: { $first: '$restaurantName' },
          lastMessage: { $first: '$text' },
          lastSender: { $first: '$sender' },
          lastTime: { $first: '$createdAt' },
          unreadCount: {
            $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'merchant'] }, { $eq: ['$read', false] }] }, 1, 0] }
          }
        }
      },
      { $sort: { lastTime: -1 } }
    ]);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── SuperAdmin: Get messages of a specific restaurant ─────────────────────────
router.get('/admin/:restaurantId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'SuperAdmin') throw new Error();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const msgs = await SupportChat.find({ restaurantId: req.params.restaurantId })
      .sort({ createdAt: 1 })
      .limit(200);

    // Mark merchant messages as read
    await SupportChat.updateMany(
      { restaurantId: req.params.restaurantId, sender: 'merchant', read: false },
      { $set: { read: true } }
    );

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── SuperAdmin: Reply to a restaurant ────────────────────────────────────────
router.post('/admin/reply', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'SuperAdmin') throw new Error();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { restaurantId, restaurantName, text } = req.body;
    if (!text?.trim() || !restaurantId) return res.status(400).json({ message: 'Missing fields' });

    const msg = await SupportChat.create({
      restaurantId,
      restaurantName: restaurantName || '',
      sender: 'superadmin',
      text: text.trim(),
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
