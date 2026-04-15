const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');

// Public: Submit a review
router.post('/', reviewController.createReview);

// Public/Admin (depends on query or token)
router.get('/', reviewController.getAllReviews);

module.exports = router;
