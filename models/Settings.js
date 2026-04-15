const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  restaurantName: { type: String, default: '' },
  businessType: { type: String, default: 'Restaurant' }, // Cafe or Restaurant
  logoUrl: { type: String, default: '' },
  address: { type: String, default: '' },
  gstin: { type: String, default: '' },
  fssai: { type: String, default: '' },
  gstEnabled: { type: Boolean, default: true },
  packagingCharge: { type: Number, default: 20 },
  upiId: { type: String, default: '' },
  googleReviewLink: { type: String, default: '' },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
