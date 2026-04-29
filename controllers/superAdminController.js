const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const PlatformConfig = require('../models/PlatformConfig');
const Log = require('../models/Log');
const DemoRequest = require('../models/DemoRequest');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
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
};

exports.getGlobalStats = async (req, res) => {
  try {
    const totalMerchants = await Restaurant.countDocuments({ role: 'Merchant' });
    const activeMerchants = await Restaurant.countDocuments({ role: 'Merchant', isActive: true });
    const pendingMerchants = await Restaurant.countDocuments({ role: 'Merchant', status: 'Pending' });
    
    const allOrders = await Order.find();
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrdersCount = allOrders.length;

    // Growth data (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({ createdAt: { $gte: sevenDaysAgo } });
    
    const stats = {
      totalMerchants,
      activeMerchants,
      pendingMerchants,
      totalRevenue,
      totalOrdersCount,
      revenueHistory: recentOrders.map(o => ({ date: o.createdAt, amount: o.totalAmount }))
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch global stats', error: error.message });
  }
};

exports.getAllMerchants = async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: 'Merchant' };
    
    if (search) {
      query.$or = [
        { restaurantName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const merchants = await Restaurant.find(query, '-password').sort({ createdAt: -1 });
    res.status(200).json(merchants);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch merchants', error: error.message });
  }
};

exports.updatePlatformConfig = async (req, res) => {
  try {
    const { monthlyPrice, yearlyPrice, freeTrialDays, email, phone, whatsapp } = req.body;
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    if (monthlyPrice !== undefined) config.monthlyPrice = monthlyPrice;
    if (yearlyPrice !== undefined) config.yearlyPrice = yearlyPrice;
    if (freeTrialDays !== undefined) config.freeTrialDays = freeTrialDays;
    if (email) config.email = email;
    if (phone) config.phone = phone;
    if (whatsapp) config.whatsapp = whatsapp;

    await config.save();
    res.status(200).json({ message: 'Platform configuration updated!', config });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update config', error: error.message });
  }
};

exports.toggleMerchantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return res.status(404).json({ message: 'Merchant not found' });
    
    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    res.status(200).json({ message: `Merchant is now ${restaurant.isActive ? 'Active' : 'Blocked'}`, isActive: restaurant.isActive });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle status', error: error.message });
  }
};

exports.getMerchantDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id, '-password');
    if (!restaurant) return res.status(404).json({ message: 'Merchant not found' });

    const orders = await Order.find({ restaurantId: id }).sort({ createdAt: -1 });
    const products = await Product.find({ restaurantId: id }).sort({ createdAt: -1 });
    const customers = await Customer.find({ restaurantId: id }).sort({ createdAt: -1 });

    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    res.status(200).json({
      restaurant,
      stats: {
        totalOrders: orders.length,
        totalRevenue,
        productsCount: products.length,
        customersCount: customers.length
      },
      orders: orders.slice(0, 50),
      products: products.slice(0, 50),
      customers: customers.slice(0, 50)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch details', error: error.message });
  }
};

exports.updateMerchantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isVerified } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    
    const restaurant = await Restaurant.findByIdAndUpdate(id, updateData, { new: true });
    res.status(200).json({ message: `Account updated successfully`, restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};

exports.updateMerchantSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { subscriptionStartDate, subscriptionEndDate, plan, isActive } = req.body;
    
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return res.status(404).json({ message: 'Merchant not found' });

    if (subscriptionStartDate !== undefined) restaurant.subscriptionStartDate = subscriptionStartDate;
    if (subscriptionEndDate !== undefined) restaurant.subscriptionEndDate = subscriptionEndDate;
    if (plan !== undefined) restaurant.plan = plan;
    if (isActive !== undefined) restaurant.isActive = isActive;

    await restaurant.save();
    res.status(200).json({ message: 'Subscription updated', restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update subscription', error: error.message });
  }
};

exports.impersonateMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return res.status(404).json({ message: 'Merchant not found' });

    const token = jwt.sign(
      { 
        id: restaurant._id, 
        role: restaurant.role, 
        status: restaurant.status,
        plan: restaurant.plan,
        impersonated: true
      }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '2h' }
    );

    res.status(200).json({ token, restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Impersonation failed', error: error.message });
  }
};

exports.createDemoRequest = async (req, res) => {
  try {
    const { name, phone, restaurant, city, outletType } = req.body;
    const demo = await DemoRequest.create({ name, phone, restaurant, city, outletType });
    res.status(201).json({ message: 'Demo request received', demo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllDemoRequests = async (req, res) => {
  try {
    const demos = await DemoRequest.find().sort({ createdAt: -1 });
    res.status(200).json(demos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDemoRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const demo = await DemoRequest.findByIdAndUpdate(id, { status: req.body.status }, { new: true });
    res.status(200).json(demo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const logs = await Log.find({ type: 'activity' }).sort({ createdAt: -1 }).limit(100).populate('restaurantId', 'restaurantName');
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getErrorLogs = async (req, res) => {
  try {
    const logs = await Log.find({ type: 'error' }).sort({ createdAt: -1 }).limit(100).populate('restaurantId', 'restaurantName');
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
