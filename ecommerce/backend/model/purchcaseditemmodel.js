const mongoose = require("mongoose");

const purchasedItemSchema = new mongoose.Schema({
  items: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      name: String,
      quantity: Number,
      unitPrice: Number,
    }
  ],
  totalPrice: Number,
  paymentMethod: String,
  status: {
    type: String,
    default: "pending"
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("PurchasedItem", purchasedItemSchema);
