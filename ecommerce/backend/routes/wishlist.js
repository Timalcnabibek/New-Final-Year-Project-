const express = require("express");
const {userwishlist, deletewishlist, addtowishlist} = require("../controllers/wishlist");

const router = express.Router();

// Add product to cart
router.post("/addwish", addtowishlist);

// Remove product from cart
router.delete("/removewish", deletewishlist);

// Get all cart items for a customer
router.get("/wish/:customerId", userwishlist);



module.exports = router;
