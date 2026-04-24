const express = require('express');
const router = express.Router();
const { getIngredients, addIngredient, updateIngredient, deleteIngredient } = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.route('/')
  .get(getIngredients)
  .post(addIngredient);

router.route('/:id')
  .put(updateIngredient)
  .delete(deleteIngredient);

module.exports = router;
