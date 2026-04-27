const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const Restaurant = require('../models/Restaurant');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const restaurant = await Restaurant.findOne({ email: 'wisdumcloths@gmail.com' });
  console.log(JSON.stringify(restaurant, null, 2));
  process.exit(0);
}

check();
