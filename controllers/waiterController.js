const WaiterRequest = require('../models/WaiterRequest');

exports.createRequest = async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.body;
    if (!restaurantId || !tableNumber) {
      return res.status(400).json({ message: 'Missing restaurantId or tableNumber' });
    }
    const request = await WaiterRequest.create({ restaurantId, tableNumber });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create waiter request', error: err.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ message: 'Missing restaurantId' });
    }
    const requests = await WaiterRequest.find({ restaurantId, status: 'Pending' }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch waiter requests', error: err.message });
  }
};

exports.resolveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await WaiterRequest.findByIdAndUpdate(id, { status: 'Resolved' }, { new: true });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to resolve request', error: err.message });
  }
};
