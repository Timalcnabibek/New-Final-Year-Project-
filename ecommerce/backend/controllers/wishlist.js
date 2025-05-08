const mongoose = require("mongoose");
const Customer = require("../model/cusmod");
const Product = require("../model/products");

const addtowishlist = async (req, res) => {
  try {
    const { customerId, productId } = req.body;

    // ✅ Validate input formats
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid Customer ID or Product ID format" });
    }

    // ✅ Fetch customer
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    // ✅ Ensure product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // ✅ Check if product is already in wishlist
    const alreadyExists = customer.wishlist.some(id => id.toString() === productId);
    if (alreadyExists) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    // ✅ Add to wishlist
    customer.wishlist.push(productId);
    await customer.save();

    // ✅ Respond with populated wishlist
    const updatedCustomer = await Customer.findById(customerId).populate("wishlist");

    res.status(200).json({
      message: "Product added to wishlist",
      wishlist: updatedCustomer.wishlist
    });
  } catch (error) {
    console.error("❌ Error in addtowishlist:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ❌ Remove Product from Wishlist
const deletewishlist = async (req, res) => {
    try {
      const { customerId, productId } = req.body;
  
      if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid Customer ID or Product ID format" });
      }
  
      const customer = await Customer.findById(customerId);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
  
      const index = customer.wishlist.findIndex(id => id.toString() === productId);
      if (index === -1) {
        return res.status(400).json({ message: "Product not found in wishlist" });
      }
  
      customer.wishlist.splice(index, 1);
      await customer.save();
  
      const updatedCustomer = await Customer.findById(customerId).populate("wishlist");
  
      res.status(200).json({
        message: "Product removed from wishlist",
        wishlist: updatedCustomer.wishlist
      });
    } catch (error) {
      console.error("❌ Error removing from wishlist:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  

// 📋 Get User Wishlist (Returns Full Product Details)
const userwishlist = async (req, res) => {
    try {
      const { customerId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ message: "Invalid Customer ID format" });
      }
  
      const customer = await Customer.findById(customerId).populate("wishlist");
      if (!customer) return res.status(404).json({ message: "Customer not found" });
  
      res.status(200).json({
        wishlist: customer.wishlist
      });
    } catch (error) {
      console.error("❌ Error fetching wishlist:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  

module.exports = {userwishlist, deletewishlist, addtowishlist};
