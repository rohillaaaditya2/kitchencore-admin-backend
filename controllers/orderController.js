const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Customer = require('../models/Customer');
const { sendNotification } = require('../socket');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { items, totalAmount, customerPhone, customerName, tableNumber, diningOption, packagingCharge, promoDiscount, promoCodeUsed, loyaltyDiscount, source, status, paymentStatus, paymentMethod, restaurantId } = req.body;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    // SUBSCRIPTION CHECK
    const restaurant = await Restaurant.findById(restaurantId);
    if (restaurant && restaurant.role !== 'SuperAdmin') {
      const now = new Date();
      const trialActive = restaurant.trialEndsAt && restaurant.trialEndsAt > now;
      const subActive = restaurant.subscriptionEndsAt && restaurant.subscriptionEndsAt > now;
      if (!trialActive && !subActive) {
        return res.status(402).json({ message: 'This restaurant\'s service is temporarily suspended due to expired subscription.' });
      }
    }

    const orderId = req.body.orderId || Math.floor(1000 + Math.random() * 9000).toString();
    
    const newOrder = new Order({
      orderId,
      items,
      totalAmount,
      customerPhone,
      customerName,
      tableNumber,
      diningOption,
      packagingCharge,
      promoDiscount,
      promoCodeUsed,
      loyaltyDiscount,
      source: source || 'Direct',
      status: status || 'Pending',
      paymentStatus: paymentStatus || 'Pending',
      paymentMethod: paymentMethod || 'Cash',
      restaurantId
    });

    const savedOrder = await newOrder.save();

    // Trigger New Order Notification
    await sendNotification(restaurantId, {
      type: 'NEW_ORDER',
      title: 'New Order Received',
      message: `Order #${orderId} - ₹${totalAmount}`,
      orderId: savedOrder.orderId
    });

    // If order is pre-paid (e.g. from external platforms), trigger payment notification
    if (paymentStatus === 'Paid') {
      await sendNotification(restaurantId, {
        type: 'PAYMENT_COMPLETED',
        title: 'Payment Completed',
        message: `Payment received for Order #${orderId}`,
        orderId: savedOrder.orderId
      });
    }

    // CUSTOMER UPDATE/UPSERT
    if (customerPhone) {
      try {
        const existingCustomer = await Customer.findOne({ phone: customerPhone, restaurantId });
        if (!existingCustomer) {
          // New Customer Notification
          await sendNotification(restaurantId, {
            type: 'NEW_CUSTOMER',
            title: 'New Customer Added',
            message: `${customerName || 'A new customer'} has been added to your database.`
          });
        }
        await Customer.findOneAndUpdate(
          { phone: customerPhone, restaurantId },
          { 
            $set: { name: customerName, lastOrderDate: new Date() },
            $inc: { totalOrders: 1, totalSpent: totalAmount }
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error("Failed to update customer:", err);
      }
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error });
  }
};

// Get all orders (for admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({ restaurantId: req.restaurantId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedOrder = await Order.findOneAndUpdate({ _id: id, restaurantId: req.restaurantId }, { status }, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });

    // Trigger Notification
    await sendNotification(req.restaurantId, {
      type: 'ORDER_STATUS_UPDATED',
      title: 'Order Status Updated',
      message: `Order #${updatedOrder.orderId} status changed to ${status}`,
      orderId: updatedOrder.orderId
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error });
  }
};

// Accept an order
exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAccepted } = req.body;
    
    const updatedOrder = await Order.findOneAndUpdate({ _id: id, restaurantId: req.restaurantId }, { isAccepted }, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error accepting order', error });
  }
};

// Update order preparation time
exports.updateOrderPrepTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { estimatedPrepTime } = req.body;
    
    const order = await Order.findOne({ _id: id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const updateData = {
      estimatedPrepTime: Number(estimatedPrepTime),
      prepTimeUpdatedAt: Date.now()
    };
    
    if (order.status === 'Pending') {
      updateData.status = 'Preparing';
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true });
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating prep time', error });
  }
};

// Get orders by customer phone
exports.getOrdersByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    const orders = await Order.find({ customerPhone: phone, restaurantId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders by phone', error });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    
    const updatedOrder = await Order.findOneAndUpdate({ _id: id, restaurantId: req.restaurantId }, { paymentStatus }, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });

    if (paymentStatus === 'Paid') {
      // Trigger Notification
      await sendNotification(req.restaurantId, {
        type: 'PAYMENT_COMPLETED',
        title: 'Payment Completed',
        message: `Order #${updatedOrder.orderId} has been paid (₹${updatedOrder.totalAmount})`,
        orderId: updatedOrder.orderId
      });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment status', error });
  }
};
