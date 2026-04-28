const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/apk developend/.env' });
const Restaurant = require('./models/Restaurant');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const rs = await Restaurant.find({}, 'restaurantName trialEndDate subscriptionEndDate role');
  console.log('RESTAURANTS IN DB:');
  rs.forEach(r => {
    console.log(`- ${r.restaurantName} (${r.role}): Trial: ${r.trialEndDate}, Sub: ${r.subscriptionEndDate}`);
  });
  await mongoose.disconnect();
}
check();
