const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `expense-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.get('/', auth, expenseController.getAllExpenses);
router.get('/summary', auth, expenseController.getExpenseSummary);
router.post('/', auth, upload.single('receiptImage'), expenseController.createExpense);
router.delete('/:id', auth, expenseController.deleteExpense);

module.exports = router;
