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

// --- SUPER ADMIN DEMO ROUTES (MERGED) ---
const DemoRequest = require('./models/DemoRequest');
const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'SuperAdmin') throw new Error();
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

app.post('/api/demo-request', async (req, res) => {
  try {
    const { name, phone, restaurant, city, outletType } = req.body;
    if (!name || !phone || !restaurant || !city) return res.status(400).json({ message: 'Missing fields' });
    const demo = await DemoRequest.create({ name, phone, restaurant, city, outletType: outletType || 'Fine Dine' });
    res.status(201).json({ message: 'Demo saved', demo });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/demo-requests', adminAuth, async (req, res) => {
  try {
    const demos = await DemoRequest.find().sort({ createdAt: -1 });
    res.json(demos);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/demo-requests/:id', adminAuth, async (req, res) => {
  try {
    const demo = await DemoRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ demo });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// To ensure super admin frontend compatibility using /login
app.post('/api/login', (req, res) => {
    res.redirect(307, '/api/auth/login');
});

const Restaurant = require('./models/Restaurant');
app.get('/api/restaurants', adminAuth, async (req, res) => {
  try {
    const merchants = await Restaurant.find({}, '-password').sort({ createdAt: -1 });
    res.json(merchants);
  } catch (err) { res.status(500).json({ message: 'Failed to fetch merchants', error: err.message }); }
});

app.patch('/api/restaurant-status', adminAuth, async (req, res) => {
  try {
    const { restaurantId, status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const restaurant = await Restaurant.findByIdAndUpdate(restaurantId, { status }, { new: true });
    if (!restaurant) return res.status(404).json({ message: 'Merchant not found' });
    res.json({ message: `Merchant application ${status.toLowerCase()} successfully`, restaurant });
  } catch (err) { res.status(500).json({ message: 'Update failed', error: err.message }); }
});



// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pizzatown')
  .then(() => {
    console.log('Connected to MongoDB');
    // Start the auto-status sweep task
    startAutoStatusSweep();
  })
  .catch(err => console.error('MongoDB connection error:', err));

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
