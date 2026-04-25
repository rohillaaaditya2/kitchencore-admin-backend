const Ingredient = require('../models/Ingredient');
const InventoryLog = require('../models/InventoryLog');
const mongoose = require('mongoose');

exports.getIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find({ restaurantId: req.restaurantId });
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
};

exports.addIngredient = async (req, res) => {
  try {
    const ingredient = new Ingredient({
      ...req.body,
      restaurantId: req.restaurantId
    });
    await ingredient.save();
    res.status(201).json(ingredient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add ingredient' });
  }
};

exports.updateIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      req.body,
      { new: true }
    );
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ingredient' });
  }
};

exports.deleteIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });
    res.json({ message: 'Ingredient deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ingredient' });
  }
};

exports.logWastage = async (req, res) => {
  try {
    const { ingredientId, quantity, reason } = req.body;
    const restaurantId = req.restaurantId;

    const ingredient = await Ingredient.findOne({ _id: ingredientId, restaurantId });
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });

    // 1. Deduct from inventory
    ingredient.quantity -= Number(quantity);
    await ingredient.save();

    // 2. Create Log
    const log = await InventoryLog.create({
      restaurantId,
      ingredientId,
      type: 'OUT',
      quantity: Number(quantity),
      unit: ingredient.unit,
      date: new Date(),
      referenceModel: 'Manual',
      note: `WASTAGE: ${reason || 'No reason provided'}`
    });

    res.status(201).json({ message: 'Wastage logged', log, ingredient });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log wastage' });
  }
};

exports.getInventoryLogs = async (req, res) => {
  try {
    const logs = await InventoryLog.find({ restaurantId: req.restaurantId })
      .populate('ingredientId', 'name unit')
      .sort({ date: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const ingredients = await Ingredient.find({ restaurantId });

    const stats = {
      totalItems: ingredients.length,
      totalValue: ingredients.reduce((sum, i) => sum + (i.quantity * (i.avgCost || i.costPerUnit || 0)), 0),
      lowStockItems: ingredients.filter(i => i.quantity < (i.lowStockThreshold || 10)).length,
      outOfStockItems: ingredients.filter(i => i.quantity <= 0).length
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory stats' });
  }
};
