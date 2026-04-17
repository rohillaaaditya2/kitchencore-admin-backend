const mongoose = require('mongoose');

const demoRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  restaurant: { type: String, required: true },
  city: { type: String, required: true },
  outletType: { type: String, default: 'Fine Dine' },
  status: { type: String, enum: ['New', 'Called', 'Converted', 'Not Interested'], default: 'New' }
}, { timestamps: true });

module.exports = mongoose.model('DemoRequest', demoRequestSchema);
