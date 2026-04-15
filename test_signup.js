const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');
require('dotenv').config();

async function testSignup() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pizzatown');
    console.log('Connected to DB');
    
    const email = 'test' + Date.now() + '@example.com';
    const restaurant = new Restaurant({
      restaurantName: 'Test Cafe',
      email: email,
      password: 'password123',
      otp: '123456',
      otpExpiry: new Date(Date.now() + 1000000)
    });

    console.log('Attempting to save...');
    await restaurant.save();
    console.log('Signup Successful in DB');
    
    await Restaurant.deleteOne({ email });
    console.log('Test record cleaned up');
    process.exit(0);
  } catch (err) {
    console.error('SIGNUP ERROR:', err);
    process.exit(1);
  }
}

testSignup();
