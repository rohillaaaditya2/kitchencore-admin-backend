const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function reset() {
  await mongoose.connect(process.env.MONGO_URI);
  const Restaurant = require('./models/Restaurant');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const result = await Restaurant.updateOne(
    { email: 'aadityarohilla668@gmail.com' },
    { $set: { password: hashedPassword } }
  );
  if (result.matchedCount > 0) {
    console.log('Successfully reset password for aadityarohilla668@gmail.com to admin123');
  } else {
    console.log('Account not found');
  }
  process.exit();
}
reset();
