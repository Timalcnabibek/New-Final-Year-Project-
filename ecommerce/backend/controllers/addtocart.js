const express = require("express");
const Customer = require("../model/cusmod");
const Product = require("../model/products");
const mongoose = require("mongoose");

// Add Product to Cart
const addProductToCart = async (req, res) => {
    try {
        const { customerId, productId, quantity } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: "Invalid Customer ID or Product ID format" });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ message: "Customer not found" });

        const productExists = await Product.findById(productId);
        if (!productExists) return res.status(404).json({ message: "Product not found" });

        // Check if product is already in the cart
        const itemIndex = customer.cart.findIndex(item => item.productId.toString() === productId);
        if (itemIndex > -1) {
            // If item exists, update quantity
            customer.cart[itemIndex].quantity += parseInt(quantity);
        } else {
            // Else, add new product
            customer.cart.push({ productId, quantity: parseInt(quantity) });
        }

        await customer.save();
        
        // Fetch the updated cart with product details
        const updatedCustomer = await Customer.findById(customerId).populate("cart.productId");
        
        res.status(200).json({ message: "Product added to cart", cart: updatedCustomer.cart });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Controller function to delete product from cart
const deleteProductFromCart = async (req, res) => {
    try {
        const { customerId, productId } = req.body;
        
        console.log("Delete request received:", { customerId, productId });
        
        // Validate inputs
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ message: "Invalid customer ID format" });
        }
        
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: "Invalid product ID format" });
        }

        // Find the customer
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        
        // Log the cart before deletion
        console.log("Cart before deletion:", customer.cart);
        
        // Filter out the product to be removed
        const initialLength = customer.cart.length;
        customer.cart = customer.cart.filter(item => item.productId.toString() !== productId.toString());
        
        // Check if anything was actually removed
        if (customer.cart.length === initialLength) {
            console.log("⚠️ Product not found in cart:", productId);
            return res.status(404).json({ message: "Product not found in cart" });
        }
        
        // Save the updated cart
        await customer.save();
        console.log("Cart after deletion:", customer.cart);
        
        // Return the updated cart
        res.status(200).json({ 
            message: "Product removed from cart successfully",
            cart: customer.cart 
        });
    } catch (error) {
        console.error("Error removing product from cart:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Cart Items
// Get Cart Items
const getCartItems = async (req, res) => {
    try {
        const { customerId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ message: "Invalid Customer ID format" });
        }
        
        const customer = await Customer.findById(customerId).populate("cart.productId");

        if (!customer) return res.status(404).json({ message: "Customer not found" });

        // Get latest redeemed reward (last in array)
        const latestReward = customer.redeemedRewards?.length
            ? customer.redeemedRewards[customer.redeemedRewards.length - 1]
            : null;

        // ✅ Return cart and reward in a single response
        res.status(200).json({
            cart: customer.cart,
            redeemedReward: latestReward 
        });

    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// Update Products in Cart
const updateproductsincart = async (req, res) => {
    try {
        const { customerId, productId, quantity } = req.body;
        console.log("Received Update Request:", req.body);
        
        if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: "Invalid Customer ID or Product ID format" });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            console.log("❌ Customer Not Found:", customerId);
            return res.status(404).json({ message: "Customer not found" });
        }

        const itemIndex = customer.cart.findIndex(item => item.productId.toString() === productId);
        
        if (itemIndex > -1) {
            // Update with the absolute quantity value, not the change
            customer.cart[itemIndex].quantity = parseInt(quantity);
            await customer.save();
            
            // Fetch the updated cart with product details
            const updatedCustomer = await Customer.findById(customerId).populate("cart.productId");
            
            console.log("✅ Cart Updated:", updatedCustomer.cart);
            return res.status(200).json({ message: "Cart updated", cart: updatedCustomer.cart });
        } else {
            console.log("❌ Product Not Found in Cart:", productId);
            return res.status(400).json({ message: "Product not found in cart" });
        }
    } catch (error) {
        console.error("❌ Server Error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { addProductToCart, deleteProductFromCart, getCartItems, updateproductsincart };