const Restaurant = require('../models/Restaurant');
const PlatformConfig = require('../models/PlatformConfig');

const billingMiddleware = async (req, res, next) => {
  try {
    const restaurantId = req.restaurantId || req.body.restaurantId || req.query.restaurantId;
    if (!restaurantId || !restaurantId.match(/^[0-9a-fA-F]{24}$/)) return next();

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return next();

    // SuperAdmin is exempt
    if (restaurant.role === 'SuperAdmin') return next();

    const now = new Date();
    
    // Check if trial is active
    const trialActive = (restaurant.trialEndDate || restaurant.trialEndsAt) && new Date(restaurant.trialEndDate || restaurant.trialEndsAt) > now;
    
    // Check if subscription is active
    const subscriptionActive = (restaurant.subscriptionEndDate || restaurant.subscriptionEndsAt) && new Date(restaurant.subscriptionEndDate || restaurant.subscriptionEndsAt) > now;

    if (!trialActive && !subscriptionActive) {
      return res.status(402).json({ 
        message: 'Subscription Required', 
        reason: 'Trial or subscription expired',
        trialEndDate: restaurant.trialEndDate,
        subscriptionEndDate: restaurant.subscriptionEndDate
      });
    }

    next();
  } catch (error) {
    console.error('Billing Middleware Error:', error);
    next();
  }
};

module.exports = billingMiddleware;
