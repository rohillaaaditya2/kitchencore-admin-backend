const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const restaurantSchema = new mongoose.Schema({
  restaurantName: { type: String, required: true },
  ownerName: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  
  // Approval System
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  
  // SaaS Role
  role: { 
    type: String, 
    enum: ['Merchant', 'SuperAdmin'], 
    default: 'Merchant' 
  },

  isActive: { type: Boolean, default: true },
  
  // Subscription & Trial System
  plan: { 
    type: String, 
    enum: ['FREE', 'BASIC', 'PRO', 'PREMIUM'], 
    default: 'FREE' 
  },
  trialStartDate: { type: Date, default: Date.now },
  trialEndDate: { type: Date },
  
  subscriptionStartDate: { type: Date },
  subscriptionEndDate: { type: Date },
  
  // Legacy fields (optional cleanup later)
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date }
  
}, { timestamps: true });

restaurantSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

restaurantSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Restaurant', restaurantSchema);
