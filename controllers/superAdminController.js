const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const PlatformConfig = require('../models/PlatformConfig');

exports.getGlobalStats = async (req, res) => {
  try {
    const totalMerchants = await Restaurant.countDocuments({ role: 'Merchant' });
    const activeMerchants = await Restaurant.countDocuments({ role: 'Merchant', isActive: true });
    
    const allOrders = await Order.find();
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrdersCount = allOrders.length;

    const merchants = await Restaurant.find({ role: 'Merchant' }, 'restaurantName email status isActive trialEndsAt subscriptionEndsAt createdAt')
      .sort({ createdAt: -1 });

    const stats = {
      totalMerchants,
      activeMerchants,
      totalRevenue,
      totalOrdersCount,
      merchants
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch global stats', error: error.message });
  }
};

exports.updatePlatformConfig = async (req, res) => {
  try {
    const { monthlyPrice, yearlyPrice, freeTrialDays, email, phone, whatsapp } = req.body;
    
    let config = await PlatformConfig.findOne();
    if (!config) {
      config = new PlatformConfig();
    }

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
