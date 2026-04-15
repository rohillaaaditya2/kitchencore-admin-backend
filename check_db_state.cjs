const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://127.0.0.1:27017/pizzatown';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Define Schema
    const RestaurantSchema = new mongoose.Schema({}, { strict: false });
    const Restaurant = mongoose.model('Restaurant', RestaurantSchema, 'restaurants');

    const merchants = await Restaurant.find({});
    console.log('Total Restaurants/Merchants:', merchants.length);
    merchants.forEach(m => {
      console.log(`- ID: ${m._id}, Name: ${m.restaurantName}, Email: ${m.email}, Role: ${m.role}, Status: ${m.status}, Verified: ${m.isVerified}`);
    });

    const OrderSchema = new mongoose.Schema({}, { strict: false });
    const Order = mongoose.model('Order', OrderSchema, 'orders');
    const orders = await Order.countDocuments({});
    console.log('Total Orders:', orders);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

check();
