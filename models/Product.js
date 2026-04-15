const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, default: 'Pizza' },
  image: { type: String, default: 'https://images.unsplash.com/photo-1513104890138-7c749659a591' },
  modelUrl: { type: String },
  isAvailable: { type: Boolean, default: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
