const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const protect = require('../middleware/auth');

router.get('/', protect, customerController.getAllCustomers);
router.get('/stats', protect, customerController.getCRMStats);
router.get('/profile/:id', protect, customerController.getCustomerProfile);
router.get('/:phone', customerController.getCustomerByPhone);

module.exports = router;
