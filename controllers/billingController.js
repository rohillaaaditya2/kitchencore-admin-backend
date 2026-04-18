const Razorpay = require('razorpay');
const crypto = require('crypto');
const Restaurant = require('../models/Restaurant');
const PlatformConfig = require('../models/PlatformConfig');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

exports.createOrder = async (req, res) => {
  try {
    const { planType } = req.body; // 'month' or 'year'
    const restaurantId = req.restaurantId;

    if (!['month', 'year'].includes(planType)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }

    const config = await PlatformConfig.findOne();
    if (!config) return res.status(500).json({ message: 'Platform configuration not found' });

    const amount = planType === 'month' ? config.monthlyPrice : config.yearlyPrice;
    
    const options = {
      amount: amount * 100, // razorpay expects amount in paise
      currency: "INR",
      receipt: `receipt_${restaurantId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      keyId: process.env.RAZORPAY_KEY_ID
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
      planType 
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
      let newExpiry;
      
      // Extend from current expiry if it's in the future, otherwise from now
      const currentExpiry = restaurant.subscriptionEndsAt || now;
      const baseDate = currentExpiry > now ? currentExpiry : now;

      if (planType === 'month') {
        newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        newExpiry = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      }

      restaurant.subscriptionEndsAt = newExpiry;
      restaurant.planType = planType;
      restaurant.isActive = true;
      await restaurant.save();

      res.status(200).json({ message: 'Payment verified and subscription extended!', expiry: newExpiry });
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Razorpay Verify Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
