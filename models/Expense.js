const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  title: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Rent', 'Electricity', 'Water', 'Salary', 'Maintenance', 'Marketing', 'Utilities', 'Taxes', 'Other']
  },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now, index: true },
  paymentMethod: { type: String, enum: ['Cash', 'Online', 'Bank Transfer', 'Credit Card'], default: 'Cash' },
  note: { type: String },
  receiptImage: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
