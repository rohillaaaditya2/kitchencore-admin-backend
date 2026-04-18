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
    // auto-grant a 30-day grace period and save it so they aren't immediately blocked.
    if (!restaurant.trialEndsAt && !restaurant.subscriptionEndsAt) {
      const gracePeriod = new Date();
      gracePeriod.setDate(gracePeriod.getDate() + 30);
      restaurant.trialEndsAt = gracePeriod;
      await restaurant.save();
      return next();
    }
    
    // Check if trial is active
    const trialActive = restaurant.trialEndsAt && restaurant.trialEndsAt > now;
    
    // Check if subscription is active
    const subscriptionActive = restaurant.subscriptionEndsAt && restaurant.subscriptionEndsAt > now;

    if (!trialActive && !subscriptionActive) {
      return res.status(402).json({ 
        message: 'Subscription Required', 
        reason: 'Trial or subscription expired',
        trialEndsAt: restaurant.trialEndsAt,
        subscriptionEndsAt: restaurant.subscriptionEndsAt
      });
    }

    next();
  } catch (error) {
    console.error('Billing Middleware Error:', error);
    next();
  }
};

module.exports = billingMiddleware;
