const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', purchaseController.createPurchase);
router.get('/', purchaseController.getPurchases);
router.get('/stats', purchaseController.getStats);

module.exports = router;
