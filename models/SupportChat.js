const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  restaurantName: { type: String, default: '' },
  sender: { type: String, enum: ['merchant', 'superadmin'], required: true },
  text: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('SupportChat', messageSchema);
