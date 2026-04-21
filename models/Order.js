const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  items: [{
    name: String,
    price: Number,
    quantity: Number
  }],
  totalAmount: { type: Number, required: true },
  tableNumber: { type: String, required: true, default: 'Takeaway' },
  status: { type: String, enum: ['Pending', 'Preparing', 'Served'], default: 'Pending' },
  isAccepted: { type: Boolean, default: false },
  paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['Cash', 'QR', 'Online', 'Other'], default: 'Cash' },
  customerName: { type: String },
  customerPhone: { type: String },
  estimatedPrepTime: { type: Number, default: 15 },
  prepTimeUpdatedAt: { type: Date, default: Date.now },
  diningOption: { type: String, enum: ['Dine-in', 'Parcel'], default: 'Dine-in' },
  packagingCharge: { type: Number, default: 0 },
  promoCodeUsed: { type: String, default: null },
  promoDiscount: { type: Number, default: 0 },
  loyaltyDiscount: { type: Number, default: 0 },
  source: { type: String, enum: ['Direct', 'Zomato', 'Swiggy', 'POS'], default: 'Direct' },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
