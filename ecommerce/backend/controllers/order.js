const express = require("express");
const router = express.Router();
const Order = require("../model/order");
const Product = require("../model/products");
const Customer = require("../model/cusmod");

// POST: Create a new order 
const SalesData = require("../model/sales_data"); // Import the SalesData model
const nodemailer = require('nodemailer');

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "timalsinab39@gmail.com", 
        pass: "qugu anew evjk dfbm"
    }
});

// Function to send order confirmation email
const sendOrderConfirmation = async (email, order) => {
    try {
        // Create products HTML for email
        const productsHtml = order.products.map(product => 
            `<tr>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>$${(product.price * product.quantity).toFixed(2)}</td>
            </tr>`
        ).join('');

        await transporter.sendMail({
            from: '"ECommerce" <timalsinab39@gmail.com>',
            to: email,
            subject: `Order Confirmation: ${order.orderReference}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Thank you for your order!</h2>
                    <p>Your order <strong>${order.orderReference}</strong> has been received and is being processed.</p>
                    
                    <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3>Order Summary</h3>
                        <p><strong>Order ID:</strong> ${order.orderReference}</p>
                        <p><strong>Status:</strong> ${order.status}</p>
                        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                        <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
                        <p><strong>Delivery Type:</strong> ${order.deliveryType}</p>
                        <p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryDate).toLocaleDateString()}</p>
                    </div>
                    
                    <h3>Items Ordered</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="text-align: left; padding: 8px;">Product</th>
                                <th style="text-align: left; padding: 8px;">Quantity</th>
                                <th style="text-align: left; padding: 8px;">Price</th>
                                <th style="text-align: left; padding: 8px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productsHtml}
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 20px; text-align: right;">
                        <p><strong>Subtotal:</strong> $${order.subtotal.toFixed(2)}</p>
                        <p><strong>Delivery Charge:</strong> $${order.deliveryCharge.toFixed(2)}</p>
                        <p><strong>Tax:</strong> $${order.tax.toFixed(2)}</p>
                        <p><strong>Discount:</strong> -$${order.discount.toFixed(2)}</p>
                        <p style="font-size: 18px;"><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
                    </div>
                    
                    <div style="background-color: #e6f7e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Loyalty Points Earned:</strong> ${order.pointsEarned}</p>
                    </div>
                    
                    <div style="margin-top: 30px;">
                        <h3>Delivery Information</h3>
                        <p><strong>Address:</strong> ${order.deliveryInfo.address}</p>
                        <p><strong>City:</strong> ${order.deliveryInfo.city}</p>
                        <p><strong>Phone:</strong> ${order.deliveryInfo.phone}</p>
                    </div>
                    
                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                        <p>If you have any questions about your order, please contact our customer service.</p>
                        <p>Thank you for shopping with us!</p>
                    </div>
                </div>
            `
        });
        console.log(`Order confirmation sent to ${email}`);
    } catch (error) {
        console.error("Error sending order confirmation email:", error);
    }
};

const createOrder = async (req, res) => {
  try {
    const {
      customerId,
      products,
      deliveryInfo,
      deliveryType,
      estimatedDeliveryDate,
      paymentMethod,
      customerEmail,
      // Remove the redeemedReward from request body since we'll fetch it
    } = req.body;

    // Generate order reference
    const generateOrderReference = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const random = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");
      const number = Math.floor(1000 + Math.random() * 9000);
      return `ORD-${number}-${random}`;
    };

    const orderReference = generateOrderReference();
    const paymentStatus = paymentMethod === "khalti" ? "Paid" : "Unpaid";

    // Validation checks...
    if (!customerId || !products || products.length === 0 || !deliveryInfo || !paymentMethod || !customerEmail) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Fetch product details
    const productDetails = await Promise.all(
      products.map(async (p) => {
        const prod = await Product.findById(p.productId);
        if (!prod) {
          throw new Error(`Invalid product ID: ${p.productId}`);
        }
        return {
          ...p,
          price: prod.price,
          name: prod.name,
          category: prod.category,
          gender: prod.gender,
          season: prod.season,
        };
      })
    );

    const subtotal = productDetails.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    const deliveryCharge = deliveryType === "Express Delivery" ? 300 : 150;
    
    // FETCH ACTIVE REWARDS AUTOMATICALLY
    let discount = 0;
    let usedRewardId = null;
    
    // Get customer and check for active rewards
    const customer = await Customer.findById(customerId);
    if (customer && customer.redeemedRewards && customer.redeemedRewards.length > 0) {
      // Get the most recently redeemed active reward
      const activeReward = customer.redeemedRewards
        .filter(reward => reward.status === "active")
        .sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt))[0];
      
      if (activeReward) {
        // Apply discount based on reward type
        if (activeReward.discount.type === "fixed") {
          discount = activeReward.discount.value;
        } else if (activeReward.discount.type === "percentage") {
          discount = Math.floor((subtotal * activeReward.discount.value) / 100);
        }
        
        // Mark which reward we're using
        usedRewardId = activeReward.rewardId;
        
        console.log(`Applied discount from reward ${activeReward.rewardId}: ${discount}`);
      }
    }

    const tax = 50;
    const totalAmount = subtotal + deliveryCharge + tax - discount;

    // Loyalty points calculation: 1 point per 100 units spent
    const pointsEarned = Math.floor(totalAmount / 100);

    // Create order with the same orderReference that will be displayed in the frontend
    const order = await Order.create({
      customerId,
      orderReference,
      products: productDetails,
      deliveryInfo,
      deliveryType,
      estimatedDeliveryDate: new Date(estimatedDeliveryDate),
      subtotal,
      deliveryCharge,
      discount,
      tax,
      totalAmount,
      status: "Pending",
      paymentStatus,
      paymentMethod,
      pointsEarned,
      usedRewardId // Add this to track which reward was used
    });

    // Update customer's loyalty points
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { loyaltyPoints: pointsEarned }
    });
    
    // If we used a reward, mark it as used
    if (usedRewardId) {
      await Customer.updateOne(
        { _id: customerId, "redeemedRewards.rewardId": usedRewardId },
        { $set: { "redeemedRewards.$.status": "used" } }
      );
    }

    // Update sales data...
    
    // Send confirmation email
    if (customerEmail) {
      await sendOrderConfirmation(customerEmail, {
        ...order.toObject(),
        orderReference,
        products: productDetails
      });
    }

    res.status(201).json({
      message: "Order placed successfully",
      order: {
        ...order.toObject(),
        orderReference
      },
      pointsEarned,
      discountApplied: discount > 0, // Tell frontend if discount was applied
      usedRewardId, // Include which reward was used
      discount // Send the discount amount to frontend
    });
    
    console.log(`🎁 Earned loyalty points: ${pointsEarned}`);
    console.log(`💰 Applied discount: ${discount}`);
    console.log("✅ Order successfully placed!");
    console.log(`📧 Order confirmation email sent to: ${customerEmail}`);

  } catch (error) {
    console.error("❌ Error creating order:", error.message);
    if (error.message.startsWith("Invalid product ID")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};


const getallorder = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.customerId })
          .sort({ createdAt: -1 })
          .populate("products.productId", "name images price");
    
        res.json(orders);
      } catch (err) {
        res.status(500).json({ message: "Failed to fetch orders" });
      }}


// GET: Single Order by ID
const getorder = async (req, res) =>{
    try {
        const order = await Order.findById(req.params.orderId)
          .populate("products.productId", "name images price");
    
        if (!order) return res.status(404).json({ message: "Order not found" });
    
        res.json(order);
      } catch (err) {
        res.status(500).json({ message: "Error fetching order" });
      }
}
const updateorder = async (req, res) => {
    try {
        const { status } = req.body;
    
        const order = await Order.findByIdAndUpdate(
          req.params.orderId,
          { status },
          { new: true }
        );
    
        res.json(order);
      } catch (err) {
        res.status(500).json({ message: "Failed to update order status" });
      }
}
const getreward = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findById(customerId);

    if (!customer || !customer.redeemedRewards) {
      return res.json({ activeRewards: [] });
    }

    // Filter all active rewards
    const activeRewards = customer.redeemedRewards.filter(
      reward => reward.status === "active"
    );

    res.json({ activeRewards }); // Return the full list of active rewards
  } catch (err) {
    console.error("❌ Error fetching rewards:", err);
    res.status(500).json({ message: "Server error" });
  }
};



  
module.exports = {createOrder, getallorder, getorder, updateorder, getreward};
