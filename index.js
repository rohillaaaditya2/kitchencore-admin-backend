require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const promoRoutes = require('./routes/promoRoutes');
const chatRoutes = require('./routes/chatRoutes');
const platformConfigRoutes = require('./routes/platformConfigRoutes');

const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/platform-config', platformConfigRoutes);

// Global to track connection error for debugging
global.mongoConnError = null;

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pizzatown')
  .then(() => {
    console.log('Connected to MongoDB');
    global.mongoConnError = null;
    // Start the auto-status sweep task
    startAutoStatusSweep();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    global.mongoConnError = err.message;
  });

// Auto-fulfillment sweep logic
const Order = require('./models/Order');
function startAutoStatusSweep() {
  setInterval(async () => {
    try {
      const now = Date.now();
      const ordersToUpdate = await Order.find({ status: 'Preparing' });
      
      for (let order of ordersToUpdate) {
        const prepStart = order.prepTimeUpdatedAt ? new Date(order.prepTimeUpdatedAt).getTime() : new Date(order.createdAt).getTime();
        const durationMs = (order.estimatedPrepTime || 15) * 60 * 1000;
        
        if (now >= (prepStart + durationMs)) {
          order.status = 'Served';
          await order.save();
          console.log(`Auto-serving order #${order.orderId}`);
        }
      }
    } catch (err) {
      console.error('Error in auto-status sweep:', err);
    }
  }, 30000); // Check every 30 seconds
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (accessible on local network)`);
});
