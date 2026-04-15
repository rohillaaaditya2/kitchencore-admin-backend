const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://127.0.0.1:27017/pizzatown';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const order = await db.collection('orders').findOne({});
    console.log('Sample Order:', JSON.stringify(order, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

check();
