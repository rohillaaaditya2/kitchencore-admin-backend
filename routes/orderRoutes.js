const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// Public: Create order and get history
router.post('/', orderController.createOrder);
router.get('/history/:phone', orderController.getOrdersByPhone);

// Protected: Admin actions (Kitchen Terminal)
router.get('/', authMiddleware, orderController.getAllOrders);
router.patch('/:id/status', authMiddleware, orderController.updateOrderStatus);
router.patch('/:id/accept', authMiddleware, orderController.acceptOrder);
router.patch('/:id/preptime', authMiddleware, orderController.updateOrderPrepTime);

module.exports = router;
