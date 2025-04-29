const express = require("express");
const router = express.Router();
const { initializeKhaltiPayment, verifyKhaltiPayment } = require("./khalti");
const Payment = require("../model/paymentModel");
const PurchasedItem = require("../model/purchcaseditemmodel");
const Item = require("../model/itemmodel");
const mongoose = require("mongoose");
const productModel = require("../model/products");
const Order = require("../model/order");
const nodemailer = require("nodemailer");
const { format } = require("date-fns");

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "timalsinab39@gmail.com",
    pass: "qugu anew evjk dfbm"
  }
});

// Function to send order confirmation email
const sendOrderConfirmationEmail = async (order, customerEmail) => {
  try {
    // Format the order date
    const orderDate = format(new Date(), "MMMM dd, yyyy");
    
    // Calculate the order total
    const subtotal = (order.subtotal || 0).toFixed(2);
    const tax = (order.tax || 0).toFixed(2);
    const deliveryCharge = (order.deliveryCharge || 0).toFixed(2);
    const discount = (order.discount || 0).toFixed(2);
    const total = (order.totalAmount || 0).toFixed(2);
    
    // Create product list HTML
    const productsList = order.products.map(product => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${product.name || "Product"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${product.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">Rs. ${product.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">Rs. ${(product.price * product.quantity).toFixed(2)}</td>
      </tr>
    `).join('');
    
    // Email HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4a4a4a;">Thank You for Your Purchase!</h1>
          <p style="color: #777;">Your order has been successfully placed.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="color: #4a4a4a; font-size: 18px;">Order Details</h2>
          <p><strong>Order Reference:</strong> ${order.orderReference}</p>
          <p><strong>Date:</strong> ${orderDate}</p>
          <p><strong>Payment Method:</strong> Khalti</p>
          <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="color: #4a4a4a; font-size: 18px;">Shipping Address</h2>
          <p>${order.deliveryInfo.fullName}<br>
          ${order.deliveryInfo.address}<br>
          ${order.deliveryInfo.city}, ${order.deliveryInfo.postalCode}<br>
          Phone: ${order.deliveryInfo.phone}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="color: #4a4a4a; font-size: 18px;">Order Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8f8f8;">
                <th style="padding: 10px; text-align: left;">Product</th>
                <th style="padding: 10px; text-align: left;">Quantity</th>
                <th style="padding: 10px; text-align: left;">Unit Price</th>
                <th style="padding: 10px; text-align: left;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${productsList}
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 20px; text-align: right;">
          <p><strong>Subtotal:</strong> Rs. ${subtotal}</p>
          <p><strong>Tax:</strong> Rs. ${tax}</p>
          <p><strong>Shipping:</strong> Rs. ${deliveryCharge}</p>
          <p><strong>Discount:</strong> Rs. ${discount}</p>
          <p style="font-size: 18px;"><strong>Total:</strong> Rs. ${total}</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #777; font-size: 14px;">
          <p>If you have any questions about your order, please contact our customer support.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    `;
    
    // Send email
    await transporter.sendMail({
      from: '"ECommerce" <timalsinab39@gmail.com>',
      to: customerEmail,
      subject: `Order Confirmation - ${order.orderReference}`,
      html: htmlContent
    });
    
    console.log(`Order confirmation email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return false;
  }
};

// ✅ Route to initialize Khalti payment
router.post("/initialize-khalti", async (req, res) => {
  try {
    const {
      itemId,
      quantity,
      unitPrice,
      website_url,
      items,
      totalAmount,
      tax,
      customerId,
      deliveryInfo,
      deliveryType
    } = req.body;
    console.log("🔍 Full Incoming Request Body:", JSON.stringify(req.body, null, 2));

    // ✅ Enhanced Validation - ensure customerId is a valid MongoDB ObjectId
    if (!customerId) {
      console.error("❌ Missing customerId in request body");
      return res.status(400).json({ success: false, message: "Customer ID is required" });
    }
    let customerObjectId;
    try {
      customerObjectId = new mongoose.Types.ObjectId(customerId);
    } catch (err) {
      console.error("❌ Invalid customerId format:", customerId);
      return res.status(400).json({ success: false, message: "Invalid Customer ID format" });
    }

    if (!deliveryInfo || !deliveryInfo.fullName || !deliveryInfo.phone || !deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.postalCode) {
      console.error("❌ Incomplete delivery info:", deliveryInfo);
      return res.status(400).json({ success: false, message: "Incomplete delivery information" });
    }

    const websiteURL = website_url || "http://localhost:3000";
    let totalPrice = 0;
    let purchasedItems = [];

    // ✅ Handle cart items
    if (items && Array.isArray(items)) {
      for (let item of items) {
        const product = await productModel.findById(item.productId);
        if (!product) {
          return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
        }

        purchasedItems.push({
          productId: item.productId,
          name: product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });

        totalPrice += item.unitPrice * item.quantity;
      }

      if (totalAmount) totalPrice = totalAmount;
    } else {
      // ✅ Handle single item
      const product = await productModel.findById(itemId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      purchasedItems.push({
        productId: itemId,
        name: product.name,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      });

      totalPrice = unitPrice * quantity;
    }

    // ✅ Create PurchasedItem in DB
    const purchasedItemData = await PurchasedItem.create({
      items: purchasedItems,
      totalPrice: totalPrice * 100,
      paymentMethod: "khalti",
      status: "pending",
      customerId: customerObjectId,
      tax: tax || 0,
      deliveryType: deliveryType || "Standard Delivery",
      deliveryInfo: {
        fullName: deliveryInfo.fullName,
        phone: deliveryInfo.phone,
        address: deliveryInfo.address,
        city: deliveryInfo.city,
        postalCode: deliveryInfo.postalCode,
        instructions: deliveryInfo.instructions || ""
      }
    });

    console.log("Created purchase with ID:", purchasedItemData._id);
    console.log("With customerId:", purchasedItemData.customerId);

    // ✅ Generate Khalti Payment URL
    const payment = await initializeKhaltiPayment({
      amount: totalPrice * 100,
      purchase_order_id: purchasedItemData._id,
      purchase_order_name: "Multi Product Order",
      return_url: `${process.env.BACKEND_URI || "http://localhost:3000"}/api/payment/complete-khalti-payment`,
      website_url: websiteURL,
    });

    if (!payment || !payment.payment_url) {
      console.error("❌ Failed to generate Khalti payment URL");
      return res.status(500).json({ success: false, message: "Failed to generate Khalti payment URL" });
    }

    return res.json({
      success: true,
      paymentURL: payment.payment_url,
      pidx: payment.pidx,
      purchase: purchasedItemData,
    });

  } catch (error) {
    console.error("❌ Error initializing Khalti:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error during Khalti initialization",
      error: error.message,
    });
  }
});

// Complete Khalti payment and send order confirmation email
// Complete Khalti payment and send order confirmation email
router.get('/complete-khalti-payment', async (req, res) => {
  try {
    console.log("Received payment completion request:", req.query);

    let purchaseOrderId = req.query.purchase_order_id;
    const status = req.query.status;
    const pidx = req.query.pidx;

    if (!purchaseOrderId) {
      return res.status(400).json({ success: false, message: "Missing required parameters: purchase_order_id" });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: "Missing required parameters: status" });
    }

    if (purchaseOrderId.includes('/')) {
      purchaseOrderId = purchaseOrderId.split('/')[0];
    }

    console.log(`Looking for purchase with cleaned ID: ${purchaseOrderId}`);

    const purchaseOrder = await PurchasedItem.findById(purchaseOrderId);

    if (!purchaseOrder) {
      console.error("Purchase order not found:", purchaseOrderId);
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }

    console.log("Found purchase order:", JSON.stringify(purchaseOrder, null, 2));

    if (status === "Completed" || status === "success") {
      purchaseOrder.status = "completed";
      await purchaseOrder.save();

      let customerEmail = null;
      let discount = 0;
      let usedRewardId = null;

      const customerModel = require("../model/cusmod");

      if (purchaseOrder.customerId) {
        try {
          const customer = await customerModel.findById(purchaseOrder.customerId);
          if (customer) {
            customerEmail = customer.email;
            console.log("Found customer email:", customerEmail);

            // 🛒 Fetch active rewards
            const activeReward = customer.redeemedRewards
              ?.filter(reward => reward.status === "active")
              .sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt))[0];

            if (activeReward) {
              console.log(`Applying reward: ${activeReward._id}`);

              // Calculate subtotal
              const subtotal = purchaseOrder.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

              // Apply discount
              if (activeReward.discount.type === "fixed") {
                discount = activeReward.discount.value;
              } else if (activeReward.discount.type === "percentage") {
                discount = Math.floor((subtotal * activeReward.discount.value) / 100);
              }

              usedRewardId = activeReward._id;

              // Mark reward as used
              console.log("Attempting to mark reward used:");
console.log("Customer ID:", purchaseOrder.customerId);
console.log("Used Reward ID:", usedRewardId);

await customerModel.updateOne(
  { _id: purchaseOrder.customerId, "redeemedRewards._id": usedRewardId },
  { $set: { "redeemedRewards.$.status": "used" } }
);


console.log("MongoDB update result:", updateResult);

              
            }
          }
        } catch (customerErr) {
          console.error("Error fetching customer:", customerErr);
        }
      }

      // Calculate subtotal again (in case needed here)
      const subtotal = purchaseOrder.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

      // Calculate deliveryCharge based on deliveryType
      const deliveryCharge = purchaseOrder.deliveryType === "Express Delivery" ? 300 : 150;

      const tax = purchaseOrder.tax || 0;
      const totalAmount = subtotal + deliveryCharge + tax - discount;

      const generateOrderReference = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const random = Array.from({ length: 6 }, () =>
          chars.charAt(Math.floor(Math.random() * chars.length))
        ).join("");
        const number = Math.floor(1000 + Math.random() * 9000);
        return `ORD-${number}-${random}`;
      };

      // 📝 Create a new Order with updated fields
      const newOrder = await Order.create({
        customerId: purchaseOrder.customerId,
        orderReference: generateOrderReference(),
        products: purchaseOrder.items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice
        })),
        subtotal: subtotal,
        deliveryCharge: deliveryCharge,
        discount: discount,
        tax: tax,
        totalAmount: totalAmount,
        status: "pending",
        paymentMethod: "khalti",
        paymentStatus: "Paid",
        deliveryInfo: {
          fullName: (purchaseOrder.deliveryInfo && purchaseOrder.deliveryInfo.fullName) || "Customer",
          phone: (purchaseOrder.deliveryInfo && purchaseOrder.deliveryInfo.phone) || "Not provided",
          address: (purchaseOrder.deliveryInfo && purchaseOrder.deliveryInfo.address) || "Not provided",
          city: (purchaseOrder.deliveryInfo && purchaseOrder.deliveryInfo.city) || "Not provided",
          postalCode: (purchaseOrder.deliveryInfo && purchaseOrder.deliveryInfo.postalCode) || "Not provided",
          instructions: (purchaseOrder.deliveryInfo && purchaseOrder.deliveryInfo.instructions) || ""
        },
        khaltiReference: pidx || "Unknown",
        pointsEarned: Math.floor(totalAmount / 100),
        usedRewardId: usedRewardId
      });

      console.log("✅ New order created with reward discount:", newOrder._id);

      if (customerEmail) {
        await sendOrderConfirmationEmail(newOrder, customerEmail);
        console.log("✅ Order confirmation email sent to:", customerEmail);
      } else {
        console.log("⚠️ No customer email found for order confirmation");
      }

      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoice.html?orderId=${newOrder._id}&ref=${newOrder.orderReference}`;
      return res.redirect(redirectUrl);

    } else {
      const failureUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment.html?status=failed`;
      return res.redirect(failureUrl);
    }
  } catch (error) {
    console.error("Error in completing Khalti payment:", error);
    const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment.html?error=server`;
    return res.redirect(errorUrl);
  }
});


// Get order by ID (for viewing order details/receipt)
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required"
      });
    }
    
    // Find the order by ID
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Return the order details
    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// Get orders by customer ID
router.get('/customer-orders/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required"
      });
    }
    
    // Validate customer ID format
    let customerObjectId;
    try {
      customerObjectId = new mongoose.Types.ObjectId(customerId);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid Customer ID format"
      });
    }
    
    // Find all orders for this customer, sorted by creation date (newest first)
    const orders = await Order.find({ customerId: customerObjectId })
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// Add a utility endpoint to manually send order confirmation emails
router.post('/resend-order-email/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { email } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required"
      });
    }
    
    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // If email is provided in request, use it, otherwise try to fetch from customer
    let customerEmail = email;
    
    if (!customerEmail && order.customerId) {
      try {
        const customerModel = require("../model/cusmod");
        const customer = await customerModel.findById(order.customerId);
        if (customer && customer.email) {
          customerEmail = customer.email;
        }
      } catch (err) {
        console.error("Error fetching customer email:", err);
      }
    }
    
    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: "Customer email is required"
      });
    }
    
    // Send order confirmation email
    const emailSent = await sendOrderConfirmationEmail(order, customerEmail);
    
    if (emailSent) {
      return res.json({
        success: true,
        message: "Order confirmation email sent successfully"
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send order confirmation email"
      });
    }
  } catch (error) {
    console.error("Error resending order email:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;