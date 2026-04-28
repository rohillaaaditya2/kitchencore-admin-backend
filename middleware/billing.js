const Restaurant = require('../models/Restaurant');

const billingMiddleware = async (req, res, next) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) return next();

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return next();

    // SuperAdmin is exempt
    if (restaurant.role === 'SuperAdmin') return next();

    const now = new Date();
    
    // If no trial date is set at all (legacy account created before billing system),
    // auto-grant a 90-day grace period and save it so they aren't immediately blocked.
    if (!restaurant.trialEndDate && !restaurant.subscriptionEndDate) {
      const gracePeriod = new Date();
      gracePeriod.setDate(gracePeriod.getDate() + 90);
      restaurant.trialEndDate = gracePeriod;
      await restaurant.save();
      console.log(`[SUBSCRIPTION] Auto-granted 90-day trial via middleware: ${restaurant.restaurantName}`);
      return next();
    }
    
    // Check if trial is active
    const trialActive = restaurant.trialEndDate && new Date(restaurant.trialEndDate) > now;
    
    // Check if subscription is active
    const subscriptionActive = restaurant.subscriptionEndDate && new Date(restaurant.subscriptionEndDate) > now;

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
