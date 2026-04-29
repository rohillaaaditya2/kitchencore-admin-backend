const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['error', 'activity', 'payment', 'system'], 
    required: true 
  },
  message: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  restaurantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Restaurant',
    required: false 
  },
  ip: { type: String },
  userAgent: { type: String },
  path: { type: String },
  method: { type: String },
  statusCode: { type: Number },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Log', logSchema);
