const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const Restaurant = require('./models/Restaurant');
  
  const restaurant = await Restaurant.findById('69e130880e5089ca33b72a34');
  console.log('Restaurant Status:', JSON.stringify(restaurant, null, 2));
  
  process.exit();
}
check();
