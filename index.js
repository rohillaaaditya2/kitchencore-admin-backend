require('dotenv').config();
console.log('--- REBUILD TRIGGER: ' + new Date().toISOString() + ' ---');
const express = require('express');
// FORCE_REDEPLOY_TIMESTAMP: 2026-04-27T13:05:00Z
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

const activityLogger = require('./middleware/activityLogger');
const errorLogger = require('./middleware/errorLogger');

const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use(activityLogger);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/orders', (req, res, next) => {
  if (req.method === 'POST') {
    console.log('--- FORCED BYPASS FOR ORDER ---');
  }
  next();
}, orderRoutes);
app.use('/api/reviews', billingMiddleware, reviewRoutes);
app.use('/api/inventory', billingMiddleware, inventoryRoutes);
app.get('/api/inventory-test-v2', (req, res) => res.json({ status: 'ok', "version": "1.0.1-deploy-fix-402" }));
app.get('/api/inventory-status', (req, res) => res.json({ 
  status: 'ok', 
  time: new Date().toISOString(),
  version: '1.0.1-deploy-fix-402-v2',
  env: process.env.NODE_ENV
}));
app.use('/api/products', billingMiddleware, productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/promos', billingMiddleware, promoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/platform-config', platformConfigRoutes);
app.use('/api/waiter-requests', billingMiddleware, waiterRoutes);
app.use('/api/billing', billingMiddleware, billingRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/customers', billingMiddleware, customerRoutes);
app.use('/api/notifications', billingMiddleware, notificationRoutes);
app.use('/api/purchases', billingMiddleware, purchaseRoutes);
app.use('/api/reports', billingMiddleware, reportRoutes);
app.use('/api/expenses', billingMiddleware, expenseRoutes);
app.use('/api/demo-sessions', demoSessionRoutes);

app.use(errorLogger);

// (Moved to superAdminRoutes/Controller)

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pizzatown')
  .then(() => {
    console.log('Connected to MongoDB');
    if (!process.env.VERCEL) {
      setTimeout(() => {
        startAutoStatusSweep();
        startPurchaseCleanupSweep();
        startInventoryStockBlocker();
      }, 5000);
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
          await Order.updateOne({ _id: order._id }, { $set: { status: 'Served' } });
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

const PORT = process.env.PORT || process.env.PORI || 5000;
const http = require('http');
const server = http.createServer(app);
const socketIO = require('./socket');
socketIO.init(server);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Inventory Route Active: ${new Date().toISOString()}`);
});
