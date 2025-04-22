const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        size: {
          type: String,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],

    // 🧾 Financial Breakdown
    subtotal: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // 📦 Delivery Info
    deliveryInfo: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      instructions: { type: String }, // optional
    },

    deliveryType: {
      type: String,
      enum: ["Standard Delivery", "Express Delivery"],
      default: "Standard Delivery",
    },

    estimatedDeliveryDate: {
      type: Date,
    },

    // ✅ Order & Payment Status
    status: {
      type: String,
      enum: ["Pending", "pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    pointsEarned: {
      type: Number,
      default: 0
    }, 
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Failed", "Refunded"],
      default: "Unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Khalti","khalti"],
      required: true,
    },
    orderReference: {
      type: String,
      required: true,
      unique: true,
    },  
    orderedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
