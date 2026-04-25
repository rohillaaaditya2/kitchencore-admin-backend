const Customer = require('../models/Customer');
const Order = require('../models/Order');

exports.getAllCustomers = async (req, res) => {
  try {
    const { search, segment, minSpent, minOrders } = req.query;
    let query = { restaurantId: req.restaurantId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (segment) {
      query.segment = segment;
    }

    if (minSpent) {
      query.totalSpent = { $gte: Number(minSpent) };
    }

    if (minOrders) {
      query.totalOrders = { $gte: Number(minOrders) };
    }

    const customers = await Customer.find(query).sort({ lastOrderDate: -1 });
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error });
  }
};

exports.getCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    const customer = await Customer.findOne({ phone, restaurantId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer', error });
  }
};

exports.getCustomerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findOne({ _id: id, restaurantId: req.restaurantId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const orders = await Order.find({ customerPhone: customer.phone, restaurantId: req.restaurantId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ customer, orders });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};

exports.getCRMStats = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const totalCustomers = await Customer.countDocuments({ restaurantId });
    
    const segmentStats = await Customer.aggregate([
      { $match: { restaurantId: new require('mongoose').Types.ObjectId(restaurantId) } },
      { $group: { _id: '$segment', count: { $sum: 1 } } }
    ]);

    const topSpent = await Customer.find({ restaurantId }).sort({ totalSpent: -1 }).limit(5);

    res.status(200).json({ totalCustomers, segmentStats, topSpent });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching CRM stats', error });
  }
};
