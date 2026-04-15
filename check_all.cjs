const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`${col.name}: ${count}`);
    if (count > 0 && col.name === 'settings') {
        const doc = await mongoose.connection.db.collection(col.name).findOne();
        console.log('Sample setting:', doc);
    }
  }
  process.exit();
}
check();
