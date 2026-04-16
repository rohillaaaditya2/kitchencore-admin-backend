const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Public: Get all products for a restaurant
router.get('/', productController.getAllProducts);

// Protected: Admin actions
router.post('/', authMiddleware, upload.single('imageFile'), productController.createProduct);
router.patch('/:id/availability', authMiddleware, productController.toggleAvailability);
router.patch('/:id', authMiddleware, upload.single('imageFile'), productController.updateProduct);
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
