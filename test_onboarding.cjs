const mongoose = require('mongoose');

const API_BASE = 'http://localhost:5000/api';
const DB_URI = 'mongodb://127.0.0.1:27017/pizzatown';

const RestaurantSchema = new mongoose.Schema({
  restaurantName: String,
  email: String,
  otp: String,
  isVerified: Boolean,
  status: String
}, { strict: false });

async function testOnboarding() {
  try {
    console.log('--- Step 1: Merchant Signup ---');
    const signupData = {
      restaurantName: 'Test Smart Cafe',
      email: 'test_merchant@smartcafe.com',
      password: 'password123'
    };

    const signupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData)
    });
    
    const signupResult = await signupRes.json();
    console.log('Signup Result:', signupResult.message);

    console.log('\n--- Step 2: Connection to DB to fetch OTP ---');
    if (mongoose.connection.readyState === 0) await mongoose.connect(DB_URI);
    
    // Clear existing if needed to ensure fresh OTP
    // await mongoose.connection.db.collection('restaurants').deleteOne({ email: signupData.email });
    
    const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema, 'restaurants');
    const merchant = await Restaurant.findOne({ email: 'test_merchant@smartcafe.com' });
    
    if (!merchant) {
      console.log('Merchant NOT found in DB!');
      process.exit(1);
    }
    
    console.log(`Found Merchant: ${merchant.restaurantName}, OTP: ${merchant.otp}`);

    console.log('\n--- Step 3: Verify OTP ---');
    const verifyRes = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_merchant@smartcafe.com',
        otp: merchant.otp
      })
    });
    const verifyResult = await verifyRes.json();
    console.log('Verification Result:', verifyResult.message);

    console.log('\n--- Step 4: Simulate Admin Approval ---');
    merchant.status = 'Approved';
    await merchant.save();
    console.log('Merchant Status manually set to Approved');

    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err.message);
    process.exit(1);
  }
}

testOnboarding();
