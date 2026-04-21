const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

// Get all notifications for a restaurant
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ restaurantId: req.restaurantId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
});

// Mark notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error });
  }
});

// Mark all as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { restaurantId: req.restaurantId, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error });
  }
});

// Clear all notifications
router.delete('/clear-all', authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({ restaurantId: req.restaurantId });
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing notifications', error });
  }
});

module.exports = router;
