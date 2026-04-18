const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');
const billingMiddleware = require('../middleware/billing');

// Protected/Admin - GET is always allowed (no billing block)
router.get('/', authMiddleware, settingsController.getSettings);
router.get('/public', settingsController.getPublicSettings);

// Protected: Admin only - PATCH requires active subscription
router.patch('/', authMiddleware, billingMiddleware, settingsController.updateSettings);

module.exports = router;
