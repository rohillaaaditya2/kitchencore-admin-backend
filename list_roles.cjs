const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const Restaurant = require('./models/Restaurant');
  const merchants = await Restaurant.find({});
  console.log('--- Current Accounts ---');
  merchants.forEach(m => {
    console.log(`- Name: ${m.restaurantName}, Email: ${m.email}, Role: ${m.role}, Status: ${m.status}, Verified: ${m.isVerified}`);
  });
  console.log('------------------------');
  process.exit();
}
check();
