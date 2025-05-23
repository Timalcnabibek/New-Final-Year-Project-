const express = require("express");
const router = express.Router();
const Order = require("../model/order");
// const Product = require("../model/products");
const Product = require("../model/products")
const Customer = require("../model/cusmod");
const mongoose = require('mongoose')

// POST: Create a new order 
const SalesData = require("../model/sales_data"); // Import the SalesData model
const nodemailer = require('nodemailer');

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "timalsinab39@gmail.com", 
        pass: "tsxq kcnz nowd guhr"
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
    console.log("📦 Received order request:", JSON.stringify(req.body, null, 2));

    const {
      customerId,
      products,
      deliveryInfo,
      deliveryType,
      estimatedDeliveryDate,
      paymentMethod,
      customerEmail,
    } = req.body;

    // ✅ Enhanced validation with schema-aware checks
    if (!customerId) {
      console.error("❌ Missing customerId");
      return res.status(400).json({ message: "Customer ID is required." });
    }

    // Validate ObjectId format for customerId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      console.error("❌ Invalid customerId format:", customerId);
      return res.status(400).json({ message: "Invalid customer ID format." });
    }
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error("❌ Invalid products:", products);
      return res.status(400).json({ message: "Products array is required and cannot be empty." });
    }

    // Validate each product has required fields
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (!product.productId) {
        console.error(`❌ Product ${i} missing productId:`, product);
        return res.status(400).json({ message: `Product ${i + 1} is missing productId.` });
      }
      if (!mongoose.Types.ObjectId.isValid(product.productId)) {
        console.error(`❌ Product ${i} invalid productId:`, product.productId);
        return res.status(400).json({ message: `Product ${i + 1} has invalid productId format.` });
      }
      if (!product.quantity || product.quantity <= 0) {
        console.error(`❌ Product ${i} invalid quantity:`, product.quantity);
        return res.status(400).json({ message: `Product ${i + 1} must have a valid quantity.` });
      }
    }
    
    // Validate delivery info (required fields per schema)
    if (!deliveryInfo) {
      console.error("❌ Missing deliveryInfo");
      return res.status(400).json({ message: "Delivery information is required." });
    }

    const requiredDeliveryFields = ['fullName', 'phone', 'address', 'city', 'postalCode'];
    for (const field of requiredDeliveryFields) {
      if (!deliveryInfo[field]) {
        console.error(`❌ Missing delivery field: ${field}`);
        return res.status(400).json({ message: `Delivery ${field} is required.` });
      }
    }
    
    // Validate payment method (must match schema enum)
    const validPaymentMethods = ["Cash", "Khalti", "khalti","cash"];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      console.error("❌ Invalid paymentMethod:", paymentMethod);
      return res.status(400).json({ 
        message: `Payment method must be one of: ${validPaymentMethods.join(', ')}` 
      });
    }
    
    if (!customerEmail) {
      console.error("❌ Missing customerEmail");
      return res.status(400).json({ message: "Customer email is required." });
    }

    // Validate delivery type (must match schema enum)
    const validDeliveryTypes = ["Standard Delivery", "Express Delivery"];
    if (deliveryType && !validDeliveryTypes.includes(deliveryType)) {
      console.error("❌ Invalid deliveryType:", deliveryType);
      return res.status(400).json({ 
        message: `Delivery type must be one of: ${validDeliveryTypes.join(', ')}` 
      });
    }

    console.log("✅ All validation passed");

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
    
    // ✅ Handle both "khalti" and "Khalti" as paid
    const paymentStatus = (paymentMethod.toLowerCase() === "khalti") ? "Paid" : "Unpaid";

    console.log("🔖 Generated order reference:", orderReference);
    console.log("💳 Payment status:", paymentStatus);

    // ✅ Verify customer exists first
    let customer;
    try {
      customer = await Customer.findById(customerId);
      if (!customer) {
        console.error("❌ Customer not found:", customerId);
        return res.status(404).json({ message: "Customer not found." });
      }
      console.log("✅ Customer found:", customer.email);
    } catch (customerError) {
      console.error("❌ Customer lookup error:", customerError);
      return res.status(500).json({ message: "Error verifying customer." });
    }

    // ✅ Fetch and validate all products
    let productDetails;
    try {
      productDetails = await Promise.all(
        products.map(async (p, index) => {
          console.log(`🔍 Looking up product ${index + 1}:`, p.productId);
          
          const prod = await Product.findById(p.productId);
          if (!prod) {
            throw new Error(`Product not found with ID: ${p.productId}`);
          }
          
          // Check stock availability
          if (prod.stock < p.quantity) {
            throw new Error(`Insufficient stock for product "${prod.name}". Available: ${prod.stock}, Requested: ${p.quantity}`);
          }
          
          console.log(`✅ Found product ${index + 1}: ${prod.name} (Price: Rs.${prod.price})`);
          
          return {
            productId: p.productId,
            quantity: p.quantity,
            size: p.size || "N/A",
            price: prod.price,
            name: prod.name,
            category: prod.category || "Uncategorized",
            gender: prod.gender || "Unisex",
            season: prod.season || "All Season",
          };
        })
      );
    } catch (productError) {
      console.error("❌ Product lookup error:", productError.message);
      return res.status(400).json({ message: productError.message });
    }

    console.log(`✅ All ${productDetails.length} products validated successfully`);

    // Calculate financial breakdown
    const subtotal = productDetails.reduce(
      (acc, item) => acc + (item.price * item.quantity),
      0
    );

    console.log("💰 Calculated subtotal:", subtotal);

    // ✅ Delivery charge calculation (matching your frontend logic)
    let deliveryCharge;
    const finalDeliveryType = deliveryType || "Standard Delivery";
    
    if (finalDeliveryType === "Express Delivery") {
      deliveryCharge = 300;
    } else {
      deliveryCharge = subtotal >= 10000 ? 0 : 150;
    }
    
    console.log(`📦 Delivery charge: Rs.${deliveryCharge} (Type: ${finalDeliveryType}, Subtotal: Rs.${subtotal})`);

    // ✅ FIXED: Handle rewards and discounts with proper selection logic
    let discount = 0;
    let usedRewardId = null;
    
    if (customer.redeemedRewards && customer.redeemedRewards.length > 0) {
      console.log("🎁 Checking customer rewards...");
      console.log("Available rewards:", customer.redeemedRewards.map(r => ({
        rewardId: r.rewardId,
        status: r.status,
        rewardName: r.rewardName,
        redeemedAt: r.redeemedAt
      })));

      // ✅ FIXED: Only get ACTIVE rewards, then sort by most recent
      const activeRewards = customer.redeemedRewards
        .filter(reward => reward.status === "active") // ← Only active rewards
        .sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt));
      
      console.log("Active rewards found:", activeRewards.length);
      
      if (activeRewards.length > 0) {
        const activeReward = activeRewards[0]; // Get the most recent active reward
        
        console.log("Selected active reward:", {
          rewardId: activeReward.rewardId,
          status: activeReward.status,
          rewardName: activeReward.rewardName,
          discountType: activeReward.discount.type,
          discountValue: activeReward.discount.value
        });
        
        if (activeReward.discount.type === "fixed") {
          discount = activeReward.discount.value;
        } else if (activeReward.discount.type === "percentage") {
          discount = Math.floor((subtotal * activeReward.discount.value) / 100);
        }
        
        usedRewardId = activeReward.rewardId;
        console.log(`🎁 Will apply discount: Rs.${discount} from reward ${activeReward.rewardId} (${activeReward.rewardName})`);
      } else {
        console.log("⚠️ No active rewards available");
      }
    } else {
      console.log("ℹ️ Customer has no redeemed rewards");
    }

    const tax = 150 // Fixed tax as per your logic
    const totalAmount = subtotal + deliveryCharge + tax - discount;
    const pointsEarned = Math.floor(totalAmount / 100);

    console.log(`💰 Final calculation breakdown:
    - Subtotal: Rs.${subtotal}
    - Delivery: Rs.${deliveryCharge}
    - Tax: Rs.${tax}
    - Discount: Rs.${discount}
    - TOTAL: Rs.${totalAmount}
    - Points Earned: ${pointsEarned}`);

    // ✅ Create the order with all required fields
    let order;
    try {
      const orderData = {
        customerId,
        orderReference,
        products: productDetails,
        deliveryInfo: {
          fullName: deliveryInfo.fullName,
          phone: deliveryInfo.phone,
          address: deliveryInfo.address,
          city: deliveryInfo.city,
          postalCode: deliveryInfo.postalCode,
          instructions: deliveryInfo.instructions || ""
        },
        deliveryType: finalDeliveryType,
        estimatedDeliveryDate: new Date(estimatedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // Default to 7 days from now
        subtotal,
        deliveryCharge,
        discount,
        tax,
        totalAmount,
        status: "Pending",
        paymentStatus,
        paymentMethod,
        pointsEarned,
        usedRewardId
      };

      console.log("💾 Creating order with data:", JSON.stringify(orderData, null, 2));
      
      order = await Order.create(orderData);
      console.log("✅ Order created successfully in database:", order._id);
      
    } catch (orderError) {
      console.error("❌ Order creation error:", orderError);
      console.error("Error details:", orderError.message);
      
      // Handle specific MongoDB validation errors
      if (orderError.name === 'ValidationError') {
        const validationErrors = Object.values(orderError.errors).map(err => err.message);
        return res.status(400).json({ 
          message: "Order validation failed", 
          errors: validationErrors 
        });
      }
      
      if (orderError.code === 11000) {
        return res.status(400).json({ 
          message: "Order reference already exists. Please try again." 
        });
      }
      
      return res.status(500).json({ message: "Failed to create order in database." });
    }

    // ✅ Update customer loyalty points
    try {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { loyaltyPoints: pointsEarned, total_spent: totalAmount }
      });
      console.log(`✅ Added ${pointsEarned} loyalty points and updated total spent`);
    } catch (loyaltyError) {
      console.error("❌ Error updating customer loyalty:", loyaltyError);
      // Don't fail the order for this
    }
    
    // ✅ FIXED: Mark reward as used ONLY if we actually used one
    if (usedRewardId) {
      try {
        console.log(`🔄 Updating reward status from 'active' to 'used':`);
        console.log(`   - customerId: ${customerId}`);
        console.log(`   - rewardId: ${usedRewardId}`);
        console.log(`   - orderId: ${order._id}`);

        // ✅ Use more specific query to ensure we only update active rewards
        const updateResult = await Customer.updateOne(
          {
            _id: customerId,
            "redeemedRewards.rewardId": usedRewardId,
            "redeemedRewards.status": "active"  // ← Only update if status is currently active
          },
          {
            $set: {
              "redeemedRewards.$.status": "used",
              "redeemedRewards.$.usedInOrder": order._id,
              "redeemedRewards.$.usedAt": new Date() // ← Add timestamp when used
            }
          }
        );

        console.log(`📊 Reward update result:`, {
          acknowledged: updateResult.acknowledged,
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount
        });

        if (updateResult.matchedCount === 0) {
          console.warn(`⚠️ No active reward found with ID ${usedRewardId} for customer ${customerId}`);
          console.warn(`This might indicate the reward was already used or doesn't exist`);
        } else if (updateResult.modifiedCount === 0) {
          console.warn(`⚠️ Reward matched but not modified - might already be used`);
        } else {
          console.log(`✅ Successfully marked reward ${usedRewardId} as used`);
        }

      } catch (rewardError) {
        console.error("❌ Error updating reward status:", rewardError);
        // Don't fail the order for this, but log it properly
      }
    } else {
      console.log("ℹ️ No reward was used in this order");
    }

    // ✅ Update product stock
    try {
      for (const product of productDetails) {
        await Product.findByIdAndUpdate(
          product.productId,
          { $inc: { stock: -product.quantity } }
        );
      }
      console.log("✅ Updated product stock for all items");
    } catch (stockError) {
      console.error("❌ Error updating product stock:", stockError);
      // Don't fail the order for this
    }

    // ✅ Send confirmation email
    if (customerEmail) {
      try {
        await sendOrderConfirmation(customerEmail, {
          ...order.toObject(),
          orderReference,
          products: productDetails
        });
        console.log(`📧 Confirmation email sent to: ${customerEmail}`);
      } catch (emailError) {
        console.error("❌ Email sending error:", emailError);
        // Don't fail the order for email issues
      }
    }

    console.log("🎉 Order creation completed successfully!");

    // ✅ Return comprehensive response
    const response = {
      success: true,
      message: "Order placed successfully",
      order: {
        _id: order._id,
        orderReference: order.orderReference,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        ...order.toObject()
      },
      customer: {
        id: customer._id,
        name: customer.username,
        email: customer.email,
        newLoyaltyPoints: customer.loyaltyPoints + pointsEarned
      },
      pointsEarned,
      discountApplied: discount > 0,
      usedRewardId,
      discount,
      calculation: {
        subtotal,
        deliveryCharge,
        tax,
        discount,
        totalAmount
      }
    };

    res.status(201).json(response);

  } catch (error) {
    console.error("❌ Unexpected error in createOrder:", error);
    console.error("Error stack:", error.stack);
    
    res.status(500).json({ 
      success: false,
      message: "Internal server error occurred while creating order",
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
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
