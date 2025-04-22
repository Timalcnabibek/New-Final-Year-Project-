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
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,  // Reference to Customer model
    required: true,
    ref: "Customer"
  },
  tax: Number,
  deliveryType: String,
  deliveryInfo: {
    fullName: String,
    phone: String,
    address: String,
    city: String,
    postalCode: String,
    instructions: String
  }
});

module.exports = mongoose.model("PurchasedItem", purchasedItemSchema);
