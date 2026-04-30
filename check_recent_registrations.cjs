const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const restaurants = await mongoose.connection.db.collection('restaurants').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log('Last 10 Restaurants:');
    restaurants.forEach(r => {
      console.log(`- ${r.restaurantName} (${r.email}) [Status: ${r.status}] Created: ${r.createdAt}`);
    });
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
