const mongoose = require('mongoose');
require('dotenv').config();

async function promote() {
  await mongoose.connect(process.env.MONGO_URI);
  const Restaurant = require('./models/Restaurant');
  const result = await Restaurant.updateOne(
    { email: 'aadityarohilla668@gmail.com' },
    { $set: { role: 'SuperAdmin', status: 'Approved' } }
  );
  if (result.matchedCount > 0) {
    console.log('Successfully promoted aadityarohilla668@gmail.com to SuperAdmin');
  } else {
    console.log('Account not found');
  }
  process.exit();
}
promote();
