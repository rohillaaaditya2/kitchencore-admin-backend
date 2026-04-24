const Ingredient = require('../models/Ingredient');

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
