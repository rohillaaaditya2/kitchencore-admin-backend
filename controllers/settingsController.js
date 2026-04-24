const Settings = require('../models/Settings');
const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');

exports.getSettings = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || req.query.restaurantId;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    if (restaurantId !== 'master_admin' && !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid Restaurant ID format' });
    }

    let settings = await Settings.findOne({ restaurantId });
    
    // Safely get original name
    let initialName = 'New Business';
    if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        const restaurant = await Restaurant.findById(restaurantId);
        if (restaurant && restaurant.restaurantName) {
            initialName = restaurant.restaurantName;
        }
    } else if (restaurantId === 'master_admin') {
        initialName = 'KitchenCore Admin';
    }

    if (!settings) {
      settings = await Settings.create({ 
        restaurantId,
        packagingCharge: 20,
        restaurantName: initialName,
        businessType: 'Restaurant',
        address: 'Enter your address',
        gstin: '',
        fssai: '',
        gstEnabled: true,
        logoUrl: ''
      });
    } else if (!settings.restaurantName || !settings.restaurantName.trim()) {
      settings.restaurantName = initialName;
      await settings.save();
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error: error.message });
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
    
    if (!settings.restaurantName || !settings.restaurantName.trim()) {
       const restaurant = await Restaurant.findById(restaurantId);
       settings.restaurantName = restaurant && restaurant.restaurantName ? restaurant.restaurantName : 'New Business';
       await settings.save();
    }
    
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public settings', error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });
    
    const allowedFields = [
      'packagingCharge', 'restaurantName', 'address', 'gstin', 
      'fssai', 'gstEnabled', 'upiId', 'logoUrl', 
      'businessType', 'googleReviewLink', 'tables'
    ];
    
    let settings = await Settings.findOne({ restaurantId });
    if (!settings) {
       settings = new Settings({ restaurantId });
    }

    // Apply updates safely (do NOT allow empty restaurantName update if already exists)
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'restaurantName' && (!req.body[field] || !String(req.body[field]).trim())) {
           return; 
        }
        settings[field] = req.body[field];
      }
    });

    await settings.save();
    
    // Double sync to Restaurant model so the fallback doesn't stay stale
    if (req.body.restaurantName && String(req.body.restaurantName).trim() && mongoose.Types.ObjectId.isValid(restaurantId)) {
        await Restaurant.findByIdAndUpdate(restaurantId, { restaurantName: req.body.restaurantName });
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Settings Update Error:', error);
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
};
