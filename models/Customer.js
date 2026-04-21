const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: String, required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  lastOrderDate: { type: Date, default: Date.now },
  totalOrders: { type: Number, default: 1 },
  totalSpent: { type: Number, default: 0 }
}, { timestamps: true });

// Compound unique index for phone and restaurantId
customerSchema.index({ phone: 1, restaurantId: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
