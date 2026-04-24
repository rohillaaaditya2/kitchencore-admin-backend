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
    const { code, discountType, discountValue, minOrderValue, expiryDate } = req.body;
    const newPromo = new PromoCode({
      code,
      discountType,
      discountValue,
      minOrderValue,
      expiryDate,
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
    console.log(`Validating promo: ${code} for restaurant: ${restaurantId}`);
    
    if (!restaurantId) {
      console.log('Validation failed: Missing restaurantId');
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    const promo = await PromoCode.findOne({ 
      code: code.toUpperCase(), 
      restaurantId: restaurantId,
      isActive: true 
    });
    
    if (!promo) {
      console.log(`Validation failed: Promo ${code} not found for ${restaurantId}`);
      return res.status(404).json({ message: 'Invalid promo code' });
    }

    // Check Expiry
    if (promo.expiryDate && new Date() > new Date(promo.expiryDate)) {
      console.log(`Validation failed: Promo ${code} expired on ${promo.expiryDate}`);
      return res.status(400).json({ message: 'Promo code has expired' });
    }
    
    if (subtotal < promo.minOrderValue) {
      console.log(`Validation failed: Subtotal ${subtotal} < Min ${promo.minOrderValue}`);
      return res.status(400).json({ 
        message: `Min order value for this code is ₹${promo.minOrderValue}` 
      });
    }
    
    console.log(`Validation success: ${code}`);
    
    res.json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
