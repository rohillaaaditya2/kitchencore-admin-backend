const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const authMiddleware = require('../middleware/auth');

router.post('/create-order', authMiddleware, billingController.createOrder);
router.post('/verify', authMiddleware, billingController.verifyPayment);

module.exports = router;
