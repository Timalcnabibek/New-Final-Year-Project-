const express = require("express");
const cartController = require("../controllers/addtocart");

const router = express.Router();

// Add product to cart
router.post("/add", cartController.addProductToCart);

// Remove product from cart
router.delete("/remove", cartController.deleteProductFromCart);

// Get all cart items for a customer
router.get("/:customerId", cartController.getCartItems);

// Update product quantity in cart
router.put("/update", cartController.updateproductsincart);

module.exports = router;
