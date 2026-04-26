const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');

module.exports = async (req, res, next) => {
  try {
    // Skip for SuperAdmin
    if (req.role === 'SuperAdmin') return next();

    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    // 1. Check Approval Status
    if (restaurant.status !== 'Approved') {
      return res.status(403).json({ 
        message: 'Your account is under review. Please wait for approval.',
        status: restaurant.status 
      });
    }

    // 2. Check Trial Expiry (only for FREE plan)
    if (restaurant.plan === 'FREE') {
      const isExpired = restaurant.trialEndDate && new Date() > new Date(restaurant.trialEndDate);
      if (isExpired) {
        return res.status(403).json({ 
          message: 'Your free trial has expired. Please purchase a subscription to continue.',
          code: 'SUBSCRIPTION_EXPIRED'
        });
      }
    }

    // 3. Check Paid Subscription Expiry
    if (restaurant.plan !== 'FREE') {
       const isExpired = restaurant.subscriptionEndDate && new Date() > new Date(restaurant.subscriptionEndDate);
       if (isExpired) {
         return res.status(403).json({ 
           message: 'Your subscription has expired. Please renew to continue.',
           code: 'SUBSCRIPTION_EXPIRED'
         });
       }
    }

    next();
  } catch (err) {
    res.status(500).json({ message: 'Subscription check failed', error: err.message });
  }
};
