const Settings = require('../models/Settings');
const mongoose = require('mongoose');

exports.getSettings = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || req.query.restaurantId;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid Restaurant ID format' });
    }

    let settings = await Settings.findOne({ restaurantId });
    if (!settings) {
      settings = await Settings.create({ 
        restaurantId,
        packagingCharge: 20,
        restaurantName: 'New Business',
        businessType: 'Restaurant',
        address: 'Enter your address',
        gstin: '',
        fssai: '',
        gstEnabled: true,
        logoUrl: ''
      });
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error });
  }
};

exports.getPublicSettings = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid Restaurant ID format' });
    }

    const settings = await Settings.findOne({ restaurantId });
    if (!settings) return res.status(404).json({ message: 'Settings not found' });
    
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public settings', error });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { packagingCharge, restaurantName, address, gstin, fssai, gstEnabled, upiId, logoUrl, businessType } = req.body;
    let settings = await Settings.findOne({ restaurantId: req.restaurantId });
    
    const updateData = { 
      packagingCharge, 
      restaurantName, 
      address, 
      gstin, 
      fssai, 
      gstEnabled,
      upiId,
      logoUrl,
      businessType,
      restaurantId: req.restaurantId
    };

    if (settings) {
      Object.assign(settings, updateData);
      await settings.save();
    } else {
      settings = await Settings.create(updateData);
    }
    
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error });
  }
};
