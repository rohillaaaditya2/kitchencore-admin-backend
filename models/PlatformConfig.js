const mongoose = require('mongoose');

const platformConfigSchema = new mongoose.Schema({
  phone:     { type: String, default: '+917470502182' },
  whatsapp:  { type: String, default: '917470502182' },
  email:     { type: String, default: 'support@kitchcores.com' },
  monthlyPrice: { type: Number, default: 999 },
  yearlyPrice:  { type: Number, default: 9999 },
  freeTrialDays: { type: Number, default: 14 },
  // Only one document ever exists (singleton config)
}, { timestamps: true });

module.exports = mongoose.model('PlatformConfig', platformConfigSchema);
