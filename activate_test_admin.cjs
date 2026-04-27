const mongoose = require('mongoose');
require('dotenv').config();

async function activate() {
  await mongoose.connect(process.env.MONGO_URI);
  const Restaurant = require('./models/Restaurant');
  
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  
  await Restaurant.findOneAndUpdate(
    { email: 'admin_test@kitchencore.com' },
    { 
      isActive: true, 
      subscriptionEndDate: futureDate,
      trialEndDate: futureDate,
      status: 'Approved',
      plan: 'PREMIUM'
    }
  );
  
  console.log('Successfully activated test account for 10 years.');
  process.exit();
}
activate();
