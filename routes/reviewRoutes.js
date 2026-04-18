const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');

// Public: Submit a review
router.post('/', reviewController.createReview);

// Protected/Admin (depends on query or token)
router.get('/', authMiddleware, reviewController.getAllReviews);

module.exports = router;
