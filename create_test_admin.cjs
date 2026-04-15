const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function create() {
  await mongoose.connect(process.env.MONGO_URI);
  const Restaurant = require('./models/Restaurant');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await Restaurant.deleteOne({ email: 'admin_test@kitchencore.com' });
  
  const admin = new Restaurant({
    restaurantName: 'Super Admin Test',
    email: 'admin_test@kitchencore.com',
    password: 'admin123', // Model handles hashing in pre-save
    role: 'SuperAdmin',
    status: 'Approved',
    isVerified: true
  });
  
  await admin.save();
  console.log('Successfully created test SuperAdmin account: admin_test@kitchencore.com / admin123');
  process.exit();
}
create();
