const Restaurant = require('../models/Restaurant');

const billingMiddleware = async (req, res, next) => {
  try {
    const restaurantId = req.restaurantId || req.body.restaurantId;
    if (!restaurantId) return next();

    // CUSTOMER ORDER BYPASS: Always allow orders to be placed
    if (req.originalUrl.includes('/api/orders') && req.method === 'POST') {
      return next();
    }
    
    // For order status updates from customers, skip subscription check if no ID found
    // (though createOrder always sends it)

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return next();

    // SuperAdmin is exempt
    if (restaurant.role === 'SuperAdmin') return next();

    const now = new Date();
    
    // If no trial date is set at all (legacy account created before billing system),
    // auto-grant a 30-day grace period and save it so they aren't immediately blocked.
    if (!restaurant.trialEndDate && !restaurant.subscriptionEndDate) {
      const gracePeriod = new Date();
      gracePeriod.setDate(gracePeriod.getDate() + 30);
      restaurant.trialEndDate = gracePeriod;
      await restaurant.save();
      return next();
    }
    
    // Check if trial is active
    const trialActive = restaurant.trialEndDate && restaurant.trialEndDate > now;
    
    // Check if subscription is active
    const subscriptionActive = restaurant.subscriptionEndDate && restaurant.subscriptionEndDate > now;

    if (!trialActive && !subscriptionActive) {
      return res.status(402).json({ 
        message: 'BYPASS_FAILED_DEBUG', 
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
