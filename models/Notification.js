const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  type: { 
    type: String, 
    enum: ['NEW_ORDER', 'PAYMENT_COMPLETED', 'ORDER_STATUS_UPDATED', 'NEW_CUSTOMER'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  orderId: { type: String }, // Optional: link to order
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
