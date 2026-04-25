const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'Raw Material' },
  quantity: { type: Number, default: 0 },
  unit: { type: String, required: true }, // g, kg, ml, l, pcs, slice
  costPerUnit: { type: Number, default: 0 },
  avgCost: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);
