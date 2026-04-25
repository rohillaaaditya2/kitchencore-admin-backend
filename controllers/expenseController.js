const Expense = require('../models/Expense');

exports.getAllExpenses = async (req, res) => {
  try {
    const { category, days } = req.query;
    const query = { restaurantId: req.restaurantId };
    
    if (category) query.category = category;
    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(days));
      query.date = { $gte: date };
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses', error });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const expenseData = { ...req.body, restaurantId: req.restaurantId };
    if (req.file) {
      expenseData.receiptImage = `/uploads/${req.file.filename}`;
    }
    const newExpense = new Expense(expenseData);
    await newExpense.save();
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: 'Error creating expense', error });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const deleted = await Expense.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!deleted) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense', error });
  }
};

exports.getExpenseSummary = async (req, res) => {
  try {
    const expenses = await Expense.find({ restaurantId: req.restaurantId });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
    res.json({ total, byCategory });
  } catch (error) {
    res.status(500).json({ message: 'Error getting summary', error });
  }
};
