const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  orderId: { type: String },
  customerName: { type: String, default: 'Anonymous' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  foodQuality: { type: Number, min: 1, max: 5 },
  service: { type: Number, min: 1, max: 5 },
  feedback: { type: String },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
