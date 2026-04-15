const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Webhook endpoints for Zomato and Swiggy
router.post('/zomato', webhookController.zomatoWebhook);
router.post('/swiggy', webhookController.swiggyWebhook);

module.exports = router;
