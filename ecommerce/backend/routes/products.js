const express = require('express');
const productController = require('../controllers/product');

const router = express.Router();

// Get all products
router.get('/', productController.getAllProducts);

// Get featured products
router.get('/featured', productController.getFeaturedProducts);

// Get trending products
router.get('/trending', productController.getTrendingProducts);

// Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// Get a single product by ID
router.get('/:id', productController.getProductById);

module.exports = router;