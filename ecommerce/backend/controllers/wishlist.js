const express = require("express");
const router = express.Router();
const Customer = require("../model/cusmod");
const Product = require("../model/products");

// ✅ Add Product to Wishlist

const addtowishlist =  async (req, res) => {
    try {
        const { customerId, productId } = req.body;

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ message: "Customer not found" });

        const productExists = await Product.findById(productId);
        if (!productExists) return res.status(404).json({ message: "Product not found" });

        if (customer.wishlist.includes(productId)) {
            return res.status(400).json({ message: "Product already in wishlist" });
        }

        customer.wishlist.push(productId);
        await customer.save();

        res.status(200).json({ message: "Added to wishlist", wishlist: customer.wishlist });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// ❌ Remove Product from Wishlist
const deletewishlist =  async (req, res) => {
    try {
        const { customerId, productId } = req.body;

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ message: "Customer not found" });

        customer.wishlist = customer.wishlist.filter(id => id.toString() !== productId);
        await customer.save();

        res.status(200).json({ message: "Removed from wishlist", wishlist: customer.wishlist });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// 📋 Get User Wishlist (Returns Full Product Details)
const userwishlist = async (req, res) => {
    try {
        const { customerId } = req.params;
        const customer = await Customer.findById(customerId).populate("wishlist"); // Populates full product details
        if (!customer) return res.status(404).json({ message: "Customer not found" });

        res.status(200).json({ wishlist: customer.wishlist });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

module.exports = {userwishlist, deletewishlist, addtowishlist};
