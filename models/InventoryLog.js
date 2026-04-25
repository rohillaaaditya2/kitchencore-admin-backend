const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true }, // IN = Purchase/Addition, OUT = Usage/Reduction
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  date: { type: Date, default: Date.now },
  referenceId: { type: mongoose.Schema.Types.ObjectId, refPath: 'referenceModel' },
  referenceModel: { type: String, enum: ['Purchase', 'Order', 'Manual'] },
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
