const Order = require('../models/Order');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { items, totalAmount, customerPhone, customerName, tableNumber, diningOption, packagingCharge, promoDiscount, promoCodeUsed, loyaltyDiscount, source, status, paymentStatus, restaurantId } = req.body;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });
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
      restaurantId
    });

    const savedOrder = await newOrder.save();
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
