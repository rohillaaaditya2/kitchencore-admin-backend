const mongoose = require('mongoose');

const demoSessionSchema = new mongoose.Schema({
  restaurantName: { type: String },
  email: { type: String },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true },
  converted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('DemoSession', demoSessionSchema);
