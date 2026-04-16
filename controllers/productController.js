const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const restaurantId = req.query.restaurantId || req.restaurantId;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid Restaurant ID format' });
    }
    const products = await Product.find({ restaurantId, isAvailable: true });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

// Add a new product
exports.createProduct = async (req, res) => {
  try {
    const productData = { ...req.body, restaurantId: req.restaurantId };
    
    // If file was uploaded via multer, use the file path
    if (req.file) {
      productData.image = `/uploads/${req.file.filename}`;
    }
    
    if (productData.price) productData.price = Number(productData.price);

    const newProduct = new Product(productData);
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Error creating product', error });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!deleted) return res.status(404).json({ message: 'Product not found or unauthorized' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    
    if (updateData.price) updateData.price = Number(updateData.price);
    
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, restaurantId: req.restaurantId }, 
      updateData, 
      { new: true }
    );
    
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found or unauthorized' });
    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product', error });
  }
};
