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
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  
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
  
  // Registration Tracking
  loginMethod: { type: String, enum: ['email', 'phone', 'google'], default: 'email' },
  registrationIP: { type: String },
  registrationDevice: { type: String },
    
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for restaurantId (alias for _id)
restaurantSchema.virtual('restaurantId').get(function() {
  return this._id.toHexString();
});

// Legacy Field Support (Aliases)
restaurantSchema.virtual('trialEndsAt').get(function() { return this.trialEndDate; }).set(function(v) { this.trialEndDate = v; });
restaurantSchema.virtual('subscriptionEndsAt').get(function() { return this.subscriptionEndDate; }).set(function(v) { this.subscriptionEndDate = v; });

restaurantSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

restaurantSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Restaurant', restaurantSchema);
