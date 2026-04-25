const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  supplierName: { type: String, required: true },
  items: [
    {
      ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, required: true },
      pricePerUnit: { type: Number, required: true },
      totalCost: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now, index: true },
  paymentType: { type: String, enum: ['Cash', 'Credit'], default: 'Cash' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);
