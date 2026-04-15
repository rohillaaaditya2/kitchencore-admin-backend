const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  
  const Settings = require('./models/Settings');
  
  const result = await Settings.deleteMany({ 
    $or: [
        { restaurantId: { $exists: false } },
        { restaurantId: null }
    ]
  });
  
  console.log(`Removed ${result.deletedCount} corrupt setting records.`);
  process.exit();
}

cleanup().catch(err => {
    console.error(err);
    process.exit(1);
});
