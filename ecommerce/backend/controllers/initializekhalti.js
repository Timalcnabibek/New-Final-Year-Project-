const express = require("express");
const router = express.Router();
const { initializeKhaltiPayment, verifyKhaltiPayment } = require("./khalti");
const Payment = require("../model/paymentModel");
const PurchasedItem = require("../model/purchcaseditemmodel");
const Item = require("../model/itemmodel");
const mongoose = require("mongoose");
const productModel = require("../model/products");
const Order = require("../model/order");


// ✅ Route to initialize Khalti payment
router.post("/initialize-khali", async (req, res) => {
  try {
    let { itemId, quantity, unitPrice, website_url } = req.body;
quantity = Number(quantity);
unitPrice = Number(unitPrice);
const websiteURL = website_url || "http://localhost:3000";

const productData = await productModel.findOne({
  _id: new mongoose.Types.ObjectId(itemId),
});

if (!productData) {
  return res.status(404).json({ success: false, message: "Product not found" });
}


    const totalPrice = unitPrice * quantity;

    const purchasedItemData = await PurchasedItem.create({
      items: [
        {
          productId: itemId,
          name: productData.name,
          quantity,
          unitPrice,
        },
      ],
      totalPrice: totalPrice * 100, // Khalti wants paisa
      paymentMethod: "khalti",
    });

    const payment = await initializeKhaltiPayment({
      amount: totalPrice * 100,
      purchase_order_id: purchasedItemData._id,
      purchase_order_name: productData.name,
      return_url: `${process.env.BACKEND_URI}/api/payment/complete-khalti-payment`,
      website_url: websiteURL,
    });
    res.json({
      success: true,
      paymentURL: payment.payment_url,
      pidx: payment.pidx,
      purchase: purchasedItemData,
    });
    
    
    
    
    
  } catch (error) {
    console.error("Khalti Init Error:", error);
    res.status(500).json({ success: false, error });
  }
});


// it is our `return url` where we verify the payment done by user
router.get("/complete-khalti-payment", async (req, res) => {
  const {
    pidx,
    txnId,
    amount,
    mobile,
    purchase_order_id,
    purchase_order_name,
    transaction_id,
  } = req.query;

  try {
    const paymentInfo = await verifyKhaltiPayment(pidx);

    // Check if payment is completed and details match
    if (
      paymentInfo?.status !== "Completed" ||
      paymentInfo.transaction_id !== transaction_id ||
      Number(paymentInfo.total_amount) !== Number(amount)
    ) {
      return res.status(400).json({
        success: false,
        message: "Incomplete information",
        paymentInfo,
      });
    }

    // Check if payment done in valid item
    const purchasedItemData = await PurchasedItem.findOne({
      _id: new mongoose.Types.ObjectId(purchase_order_id),
      totalPrice: Number(amount),
    });

    if (!purchasedItemData) {
      return res.status(400).send({
        success: false,
        message: "Purchased data not found",
      });
    }
    // updating purchase record
    await PurchasedItem.findByIdAndUpdate(
      purchase_order_id,

      {
        $set: {
          status: "completed",
        },
      }
    );

    // Create a new payment record
    const paymentData = await Payment.create({
      pidx,
      transactionId: transaction_id,
      productId: purchase_order_id,
      amount,
      dataFromVerificationReq: paymentInfo,
      apiQueryFromUser: req.query,
      paymentGateway: "khalti",
      status: "success",
    });

    // Send success response
    res.redirect(`http://localhost:3000/invoice?status=success&pidx=${pidx}`);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred",
      error,
    });
  }
});

module.exports = router;