const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number,
    instructions: { type: String, default: '' },
    category: { type: String }
  }],
  totalAmount: { type: Number, required: true },
  tableNumber: { type: String, required: true, default: 'Takeaway' },
  status: { 
    type: String, 
    enum: ['Pending', 'Preparing', 'Ready', 'Served', 'Cancelled'], 
    default: 'Pending' 
  },
  isAccepted: { type: Boolean, default: false },
  paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['Cash', 'QR', 'Online', 'Other', 'PAY_LATER'], default: 'Cash' },
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
  kotPrinted: { type: Boolean, default: false },
  
  // Performance Analytics
  acceptedAt: { type: Date },
  preparingAt: { type: Date },
  readyAt: { type: Date },
  servedAt: { type: Date },
  
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
