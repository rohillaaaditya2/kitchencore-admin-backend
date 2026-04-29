const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aadityarohilla2:QvIdGx5j4TgZhAB0@kitchencore.j6oi2fy.mongodb.net/KitchenCore?retryWrites=true&w=majority&appName=kitchencore';

const restaurantSchema = new mongoose.Schema({
  email: String,
  otp: String,
  otpExpiry: Date,
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

async function checkOTP() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const latest = await Restaurant.findOne().sort({ createdAt: -1 });
    if (latest) {
      console.log('Latest Signup Account:');
      console.log(`Email: ${latest.email}`);
      console.log(`OTP: ${latest.otp}`);
      console.log(`Expiry: ${latest.otpExpiry}`);
    } else {
      console.log('No restaurants found');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkOTP();
