const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');
const billingMiddleware = require('../middleware/billing');

// Public: Create order and get history
router.post('/', orderController.createOrder);
router.get('/history/:phone', orderController.getOrdersByPhone);
router.get('/public/:id', orderController.getPublicOrder);

// Protected: Admin actions (Kitchen Terminal)
router.get('/', authMiddleware, billingMiddleware, orderController.getAllOrders);
router.patch('/:id/status', authMiddleware, billingMiddleware, orderController.updateOrderStatus);
router.patch('/:id/accept', authMiddleware, billingMiddleware, orderController.acceptOrder);
router.patch('/:id/preptime', authMiddleware, billingMiddleware, orderController.updateOrderPrepTime);
router.patch('/:id/payment', authMiddleware, billingMiddleware, orderController.updatePaymentStatus);

module.exports = router;
