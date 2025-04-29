const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    username: { 
      type: String,
      required: true
    },
    email:{ 
      type: String, 
      required: true,
      unique: true
    },
    phone: { 
      type: Number, 
      required: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    otp: { 
      type: String
    },
    otpExpiration: { 
      type: Date
    },
    isVerified: {
      type: Boolean,
      default: false 
    },
    lastLogin: {
      type: Date
    },

    // ✅ New Fields Added
    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending"],
      default: "Active"
    },
    
    // Track status history over time
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["Active", "Inactive", "Pending"],
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],
    loyaltyPoints: {
      type: Number,
      default: 0
    },
    redeemedRewards: [
      {
        rewardId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Reward",
          required: true
        },
        rewardName: {
          type: String,
          required: true
        },
        pointsUsed: {
          type: Number,
          required: true
        },
        discount: {
          type: {
            type: String,
            enum: ["percentage", "fixed"],
            required: true
          },
          value: {
            type: Number,
            required: true
          }
        },
        redeemedAt: {
          type: Date,
          default: Date.now
        },
        status: {
          type: String,
          enum: ["active", "used"],
          default: "active"
        },
        usedInOrder: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order"
        }
      }
    ],    
    total_spent: {
      type: Number,
      default: 0.00
    },
    registration_date: {
      type: Date,
      default: Date.now
    },

    // ✅ Wishlist (Stored as Product IDs)
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    // ✅ Shopping Cart (Stores Product ID, Quantity)
    cart: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, required: true, default: 1 },
        size: { type: String }, // ✅ NEW: Store selected size like "Medium"
        addedAt: { type: Date, default: Date.now },
      },
    ],  
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
