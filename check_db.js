require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));
  const Settings = mongoose.model('Settings', new mongoose.Schema({}, { strict: false }));

  const rest = await Restaurant.findOne({ email: 'rohillaaadityarohilla2@gmail.com' });
  console.log("Restaurant:", rest);

  if (rest) {
    const settings = await Settings.findOne({ restaurantId: rest._id.toString() });
    console.log("Settings string ID:", settings);
    const settingsObj = await Settings.findOne({ restaurantId: rest._id });
    console.log("Settings Obj ID:", settingsObj);
  }
  
  process.exit();
}

test();
