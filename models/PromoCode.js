const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true },
  discountAmount: { type: Number, required: true },
  minOrderValue: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }
}, { timestamps: true });

promoCodeSchema.index({ code: 1, restaurantId: 1 }, { unique: true });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
