const Restaurant = require('../models/Restaurant');

const billingMiddleware = async (req, res, next) => {
  try {
    const restaurantId = req.restaurantId || req.body.restaurantId;
    if (!restaurantId) return next();

    // DEBUG: Log the request
    console.log(`Billing Check: ${req.method} ${req.originalUrl}`);

    // Always allow critical operations (Orders, Menu viewing, Promo validation)
    const isCritical = req.originalUrl.includes('/orders') || 
                       req.originalUrl.includes('/products') || 
                       req.originalUrl.includes('/promos/validate') ||
                       req.originalUrl.includes('/settings');
    
    if (isCritical) {
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
      gracePeriod.setDate(gracePeriod.getDate() + 90);
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
        message: 'Subscription Required', 
        reason: 'Your trial or subscription has expired.',
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
