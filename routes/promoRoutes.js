const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promoController');
const authMiddleware = require('../middleware/auth');

// Get all promos (Admin)
router.get('/', authMiddleware, promoController.getAllPromos);

// Create new promo (Admin)
router.post('/', authMiddleware, promoController.createPromo);

// Delete promo (Admin)
router.delete('/:id', authMiddleware, promoController.deletePromo);

// Validate promo (Customer)
router.post('/validate', promoController.validatePromo);

module.exports = router;
