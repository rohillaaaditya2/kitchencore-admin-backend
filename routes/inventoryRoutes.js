const express = require('express');
const router = express.Router();
const { 
  getIngredients, addIngredient, updateIngredient, deleteIngredient, 
  logWastage, getInventoryLogs, getDashboardStats 
} = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/logs', getInventoryLogs);
router.get('/stats', getDashboardStats);
router.post('/wastage', logWastage);

router.route('/')
  .get(getIngredients)
  .post(addIngredient);

router.route('/:id')
  .put(updateIngredient)
  .delete(deleteIngredient);

module.exports = router;
