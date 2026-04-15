const mongoose = require('mongoose');
require('dotenv').config();

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pizzatown');
    const Restaurant = require('./models/Restaurant');
    const merchants = await Restaurant.find({});
    console.log('--- Registered Merchants ---');
    merchants.forEach(m => {
      console.log(`- ID: ${m._id}, Name: ${m.restaurantName}, Email: ${m.email}, Verified: ${m.isVerified}, Status: ${m.status}, Role: ${m.role}`);
    });
    console.log('---------------------------');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDb();
