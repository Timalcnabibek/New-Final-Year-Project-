const express = require("express");
const cartController = require("../controllers/wishlist");

const router = express.Router();

// Add product to cart
router.post("/addwish", cartController.addtowishlist);

// Remove product from cart
router.delete("/removewish", cartController.deletewishlist);

// Get all cart items for a customer
router.get("/wish/:customerId", cartController.userwishlist);

// Update product quantity in cart
// router.put("/updatewish", cartController.updateproductsincart);

module.exports = router;
