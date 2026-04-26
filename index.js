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
const waiterRoutes = require('./routes/waiterRoutes');
const billingRoutes = require('./routes/billingRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const customerRoutes = require('./routes/customerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const demoSessionRoutes = require('./routes/demoSessionRoutes');
const billingMiddleware = require('./middleware/billing');
const checkSubscription = require('./middleware/checkSubscription');

const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/orders', billingMiddleware, checkSubscription, orderRoutes);
app.use('/api/reviews', billingMiddleware, checkSubscription, reviewRoutes);
app.use('/api/inventory', billingMiddleware, checkSubscription, inventoryRoutes);
app.get('/api/inventory-test-v2', (req, res) => res.json({ status: 'ok', version: '2.0.1' }));
app.get('/api/inventory-status', (req, res) => res.json({ status: 'ok', msg: 'Route is at the top' }));
app.use('/api/products', billingMiddleware, checkSubscription, productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/promos', billingMiddleware, promoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/platform-config', platformConfigRoutes);
app.use('/api/waiter-requests', billingMiddleware, checkSubscription, waiterRoutes);
app.use('/api/billing', billingMiddleware, billingRoutes); // status must work even when expired
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/customers', billingMiddleware, checkSubscription, customerRoutes);
app.use('/api/notifications', billingMiddleware, checkSubscription, notificationRoutes);
app.use('/api/purchases', billingMiddleware, checkSubscription, purchaseRoutes);
app.use('/api/reports', billingMiddleware, checkSubscription, reportRoutes);
app.use('/api/expenses', billingMiddleware, checkSubscription, expenseRoutes);
app.use('/api/demo-sessions', demoSessionRoutes);
// --- SUPER ADMIN ROUTES ---
const adminAuth = require('./middleware/adminAuth');
const DemoRequest = require('./models/DemoRequest');
const Restaurant = require('./models/Restaurant');
const jwt = require('jsonwebtoken');

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

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const masterEmail = process.env.SUPER_ADMIN_EMAIL || 'aadityarohilla668@gmail.com';
    const masterPass = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

    if (email === masterEmail && password === masterPass) {
      const token = jwt.sign(
        { role: 'SuperAdmin', id: 'master_admin' }, 
        process.env.JWT_SECRET || 'secret', 
        { expiresIn: '1d' }
      );
      return res.status(200).json({ token, role: 'SuperAdmin' });
    }

    const dbAdmin = await Restaurant.findOne({ email: email.toLowerCase().trim(), role: 'SuperAdmin' });
    if (dbAdmin) {
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(password, dbAdmin.password);
      if (isMatch) {
        const token = jwt.sign(
          { role: 'SuperAdmin', id: dbAdmin._id },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '1d' }
        );
        return res.status(200).json({ token, role: 'SuperAdmin' });
      }
    }
    res.status(401).json({ message: 'Invalid Super Admin credentials' });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.get('/api/restaurants', adminAuth, async (req, res) => {
  try {
    const merchants = await Restaurant.find({ isVerified: true, role: 'Merchant' }, '-password').sort({ createdAt: -1 });
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
    if (!process.env.VERCEL) {
      startAutoStatusSweep();
      startPurchaseCleanupSweep();
      startInventoryStockBlocker();
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

const Order = require('./models/Order');
function startAutoStatusSweep() {
  setInterval(async () => {
    try {
      const now = Date.now();
      const ordersToUpdate = await Order.find({ 
        status: 'Preparing',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
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
  }, 30000);
}

const Purchase = require('./models/Purchase');
function startPurchaseCleanupSweep() {
  // Run once on start and then every 24 hours
  const cleanup = async () => {
    try {
      const now = new Date();
      // Logic: If today is 45 days or more from start, delete anything older than 30 days
      // The requirement says: After 45 days, delete purchases older than last 30 days.
      // We can implement this by deleting anything older than 30 days once a day.
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await Purchase.deleteMany({
        purchaseDate: { $lt: thirtyDaysAgo }
      });
      
      if (result.deletedCount > 0) {
        console.log(`Auto-cleanup: Deleted ${result.deletedCount} old purchase records.`);
      }
    } catch (err) {
      console.error('Error in purchase cleanup sweep:', err);
    }
  };

  cleanup(); // Run immediately
  setInterval(cleanup, 24 * 60 * 60 * 1000); // Every 24 hours
}

const Ingredient = require('./models/Ingredient');
const Product = require('./models/Product');

function startInventoryStockBlocker() {
  // Check every 5 minutes
  setInterval(async () => {
    try {
      const products = await Product.find({ 'recipe.0': { $exists: true } }); // Only products with recipes
      const ingredients = await Ingredient.find();
      const ingredientMap = ingredients.reduce((acc, ing) => {
        acc[ing._id.toString()] = ing.quantity;
        return acc;
      }, {});

      for (const product of products) {
        let shouldBeAvailable = true;
        for (const item of product.recipe) {
          if (item.ingredient) {
            const currentStock = ingredientMap[item.ingredient.toString()] || 0;
            if (currentStock <= 0) {
              shouldBeAvailable = false;
              break;
            }
          }
        }

        if (product.isAvailable !== shouldBeAvailable) {
          product.isAvailable = shouldBeAvailable;
          await product.save();
          console.log(`Auto-Update: Product "${product.name}" is now ${shouldBeAvailable ? 'Available' : 'OUT OF STOCK'}`);
        }
      }
    } catch (err) {
      console.error('Error in inventory stock blocker:', err);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

const PORT = process.env.PORT || 5000;
const http = require('http');
const server = http.createServer(app);
const socketIO = require('./socket');
socketIO.init(server);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Inventory Route Active: ${new Date().toISOString()}`);
});
