const Product = require('../model/Products');

// Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ created_at: -1 });
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.category });
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get featured products
exports.getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.find({ featured: true });
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get trending products
exports.getTrendingProducts = async (req, res) => {
    try {
        const products = await Product.find({ trending: true });
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

