const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  phone: { type: String, required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  lastOrderDate: { type: Date, default: Date.now },
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  favoriteItems: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    count: { type: Number, default: 1 }
  }],
  visitHistory: [{ type: Date }],
  notes: { type: String },
  segment: { 
    type: String, 
    enum: ['New', 'Repeat', 'Loyal', 'Inactive'],
    default: 'New'
  },
  loyaltyPoints: { type: Number, default: 0 }
}, { timestamps: true });

// Compound unique index for phone and restaurantId
customerSchema.index({ phone: 1, restaurantId: 1 }, { unique: true });

// Middleware to calculate segment before saving
customerSchema.pre('save', function(next) {
  if (this.totalOrders > 10 || this.totalSpent > 5000) {
    this.segment = 'Loyal';
  } else if (this.totalOrders > 1) {
    this.segment = 'Repeat';
  } else {
    this.segment = 'New';
  }
  
  // Inactive logic could be handled by a cron job or on fetch, 
  // but let's stick to these for now.
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
