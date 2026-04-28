const Razorpay = require('razorpay');
const crypto = require('crypto');
const Restaurant = require('../models/Restaurant');
const PlatformConfig = require('../models/PlatformConfig');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

// Plan Pricing Configuration (Can be moved to PlatformConfig later)
const PLAN_PRICES = {
  'BASIC': 999,    // ₹999/month
  'PRO': 1999,     // ₹1999/month
  'PREMIUM': 4999  // ₹4999/month
};

exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body; // 'BASIC', 'PRO', 'PREMIUM'
    const restaurantId = req.restaurantId;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const amount = PLAN_PRICES[plan];
    
    const options = {
      amount: amount * 100, // razorpay expects amount in paise
      currency: "INR",
      receipt: `receipt_${restaurantId}_${Date.now()}`,
      notes: {
        restaurantId,
        plan
      }
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      keyId: process.env.RAZORPAY_KEY_ID,
      currency: "INR",
      plan
    });
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      plan 
    } = req.body;
    const restaurantId = req.restaurantId;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder')
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment Successful
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

      const now = new Date();
      
      // Calculate new expiry (30 days from now)
      const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      restaurant.subscriptionStartDate = now;
      restaurant.subscriptionEndDate = newExpiry;
      restaurant.plan = plan;
      restaurant.status = 'Approved'; // Ensure they are approved if they paid
      restaurant.isActive = true;
      
      await restaurant.save();

      res.status(200).json({ 
        message: 'Subscription activated successfully!', 
        plan,
        expiry: newExpiry 
      });
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Razorpay Verify Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.getSubscriptionStatus = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.restaurantId).select('plan trialEndDate subscriptionEndDate status');
        if (!restaurant) return res.status(404).json({ message: 'Not found' });

        const now = new Date();
        let status = 'ACTIVE';
        let daysLeft = 0;

        if (restaurant.plan === 'FREE') {
            if (now > new Date(restaurant.trialEndDate)) {
                status = 'EXPIRED';
            } else {
                status = 'TRIAL';
                const diff = new Date(restaurant.trialEndDate) - now;
                daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                // Cap trial days to 90 for display sanity
                if (daysLeft > 90) daysLeft = 90; 
            }
        } else {
            if (now > new Date(restaurant.subscriptionEndDate)) {
                status = 'EXPIRED';
            } else {
                status = 'PAID';
                daysLeft = Math.ceil((new Date(restaurant.subscriptionEndDate) - now) / (1000 * 60 * 60 * 24));
            }
        }

        res.json({
            plan: restaurant.plan,
            status,
            daysLeft,
            expiryDate: restaurant.plan === 'FREE' ? restaurant.trialEndDate : restaurant.subscriptionEndDate
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
