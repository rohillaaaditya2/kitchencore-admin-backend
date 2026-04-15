const PromoCode = require('../models/PromoCode');

exports.getAllPromos = async (req, res) => {
  try {
    const promos = await PromoCode.find({ restaurantId: req.restaurantId }).sort({ createdAt: -1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPromo = async (req, res) => {
  try {
    const { code, discountAmount, minOrderValue } = req.body;
    const newPromo = new PromoCode({
      code,
      discountAmount,
      minOrderValue,
      restaurantId: req.restaurantId
    });
    await newPromo.save();
    res.status(201).json(newPromo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deletePromo = async (req, res) => {
  try {
    const deleted = await PromoCode.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!deleted) return res.status(404).json({ message: 'Promo code not found or unauthorized' });
    res.json({ message: 'Promo code deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.validatePromo = async (req, res) => {
  try {
    const { code, subtotal, restaurantId } = req.body;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    const promo = await PromoCode.findOne({ 
      code: code.toUpperCase(), 
      restaurantId,
      isActive: true 
    });
    
    if (!promo) {
      return res.status(404).json({ message: 'Invalid promo code' });
    }
    
    if (subtotal < promo.minOrderValue) {
      return res.status(400).json({ 
        message: `Min order value for this code is ₹${promo.minOrderValue}` 
      });
    }
    
    res.json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
