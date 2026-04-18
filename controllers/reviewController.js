const Review = require('../models/Review');

exports.createReview = async (req, res) => {
  try {
    const { orderId, customerName, rating, foodQuality, service, feedback, restaurantId } = req.body;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    const newReview = new Review({
      orderId,
      customerName,
      rating,
      foodQuality,
      service,
      feedback,
      restaurantId
    });

    const savedReview = await newReview.save();
    res.status(201).json(savedReview);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting review', error });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || req.query.restaurantId;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    if (restaurantId !== 'master_admin' && !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Valid Restaurant ID is required' });
    }

    const query = restaurantId === 'master_admin' ? {} : { restaurantId };
    const reviews = await Review.find(query).sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error });
  }
};
