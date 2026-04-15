const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');

// Public/Admin (depends on query or token)
router.get('/', settingsController.getSettings);
router.get('/public', settingsController.getPublicSettings);

// Protected: Admin only
router.patch('/', authMiddleware, settingsController.updateSettings);

module.exports = router;
