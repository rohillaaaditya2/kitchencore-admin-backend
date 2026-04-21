const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const restaurantSchema = new mongoose.Schema({
  restaurantName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  role: { 
    type: String, 
    enum: ['Merchant', 'SuperAdmin'], 
    default: 'Merchant' 
  },
  otp: { type: String },
  otpExpiry: { type: Date },
  isActive: { type: Boolean, default: true },
  trialEndsAt: { type: Date },
  subscriptionEndsAt: { type: Date },
  planType: { type: String, enum: ['month', 'year', 'none'], default: 'none' },
}, { timestamps: true });

restaurantSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  console.log(`[MODEL DEBUG] Hashing password for: ${this.email}`);
  this.password = await bcrypt.hash(this.password, 10);
});

restaurantSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Restaurant', restaurantSchema);
