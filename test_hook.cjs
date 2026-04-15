const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const restaurantSchema = new mongoose.Schema({
  restaurantName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

restaurantSchema.pre('save', async function(next) {
  console.log('Pre-save hook started');
  console.log('Type of next:', typeof next);
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  console.log('Password hashed');
  next();
  console.log('Next called');
});

const Restaurant = mongoose.model('RestaurantTest', restaurantSchema);

async function test() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/pizzatown_test');
    console.log('Connected');
    const r = new Restaurant({
      restaurantName: 'Test',
      email: 'test' + Date.now() + '@test.com',
      password: 'pass'
    });
    await r.save();
    console.log('Saved');
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
}

test();
