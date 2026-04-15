const Order = require('../models/Order');

// Zomato Webhook Handler
// Reference: Mapping Zomato JSON to our Order Schema
exports.zomatoWebhook = async (req, res) => {
  try {
    const data = req.body;
    
    // Mapping Zomato structure to our app's Order model
    // Note: Zomato usually sends order details in 'order_details' or similar
    const orderData = {
      orderId: data.order_id || `ZMT-${Math.floor(1000 + Math.random() * 9000)}`,
      items: (data.items || []).map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      totalAmount: data.total_amount || 0,
      customerName: data.customer_name || 'Zomato Customer',
      customerPhone: data.customer_phone || '',
      tableNumber: 'ZOMATO',
      diningOption: 'Parcel',
      source: 'Zomato',
      status: 'Pending',
      paymentStatus: 'Paid' // External platform orders are usually pre-paid
    };

    const newOrder = new Order(orderData);
    await newOrder.save();

    console.log('✅ New Zomato Order Received:', orderData.orderId);
    res.status(200).json({ success: true, message: 'Order received' });
  } catch (error) {
    console.error('❌ Zomato Webhook Error:', error);
    res.status(500).json({ success: false, error });
  }
};

// Swiggy Webhook Handler
exports.swiggyWebhook = async (req, res) => {
  try {
    const data = req.body;
    
    const orderData = {
      orderId: data.orderId || `SWG-${Math.floor(1000 + Math.random() * 9000)}`,
      items: (data.cart?.items || []).map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      totalAmount: data.bill_amount || 0,
      customerName: data.customer?.name || 'Swiggy Customer',
      customerPhone: data.customer?.phone || '',
      tableNumber: 'SWIGGY',
      diningOption: 'Parcel',
      source: 'Swiggy',
      status: 'Pending',
      paymentStatus: 'Paid'
    };

    const newOrder = new Order(orderData);
    await newOrder.save();

    console.log('✅ New Swiggy Order Received:', orderData.orderId);
    res.status(200).json({ success: true, message: 'Order received' });
  } catch (error) {
    console.error('❌ Swiggy Webhook Error:', error);
    res.status(500).json({ success: false, error });
  }
};
