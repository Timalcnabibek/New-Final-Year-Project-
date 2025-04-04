const express = require('express');
const router = express.Router();
const Order = require('../model/order'); // Assuming this is where your Order model is located

// Get order summary (counts by status)
router.get('/api/orders/summary', async (req, res) => {
  try {
    // Count total orders
    const totalOrders = await Order.countDocuments();
    
    // Count orders by status
    const processingOrders = await Order.countDocuments({ status: 'Processing' });
    const shippedOrders = await Order.countDocuments({ status: 'Shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });
    const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
    
    return res.status(200).json({
      success: true,
      data: {
        all: totalOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        pending: pendingOrders,
        cancelled: cancelledOrders
      }
    });
  } catch (error) {
    console.error(`❌ Error fetching order summary: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order summary'
    });
  }
});

// Get recent orders with optional status filter
router.get('/api/orders', async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    
    // Build query based on status filter
    const query = {};
    if (status && status !== 'All') {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (page - 1) * parseInt(limit);
    
    // Fetch orders
    const orders = await Order.find(query)
      .sort({ orderedAt: -1 }) // Most recent first
      .skip(skip)
      .limit(parseInt(limit))
      .select('orderReference status orderedAt totalAmount products deliveryInfo estimatedDeliveryDate');
    
    // Count total matching documents for pagination
    const total = await Order.countDocuments(query);
    
    // Format the response
    const formattedOrders = orders.map(order => {
      return {
        id: order._id,
        orderNumber: order.orderReference,
        status: order.status,
        date: order.orderedAt,
        itemCount: order.products.length,
        totalAmount: order.totalAmount,
        estimatedDelivery: order.estimatedDeliveryDate,
        trackingNumber: order.deliveryInfo?.trackingNumber || null,
        // Additional fields as needed
      };
    });
    
    return res.status(200).json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(`❌ Error fetching orders: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// Get detailed information for a specific order
router.get('/api/orders/:orderReference', async (req, res) => {
  try {
    const { orderReference } = req.params;
    
    const order = await Order.findOne({ orderReference })
      .populate('customerId', 'name email') // Populate customer info
      .populate('products.productId', 'name images'); // Populate product info
      console.log(`Searching for order with reference: ${orderReference}`);
      
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error(`❌ Error fetching order details: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order details'
    });
  }
});

// Update order status
router.patch('/api/orders/:orderReference/status', async (req, res) => {
  try {
    const { orderReference } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
    const order = await Order.findOneAndUpdate(
      { orderReference },
      { status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    console.error(`❌ Error updating order status: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

// Add tracking number to shipped order
router.patch('/api/orders/:orderReference/tracking', async (req, res) => {
  try {
    const { orderReference } = req.params;
    const { trackingNumber } = req.body;
    
    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        error: 'Tracking number is required'
      });
    }
    
    // Find the order and update it
    const order = await Order.findOne({ orderReference });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    // Add tracking number to deliveryInfo
    order.deliveryInfo.trackingNumber = trackingNumber;
    // Also update status to shipped if not already
    if (order.status !== 'Shipped' && order.status !== 'Delivered') {
      order.status = 'Shipped';
    }
    
    await order.save();
    
    return res.status(200).json({
      success: true,
      data: order,
      message: 'Tracking number added successfully'
    });
  } catch (error) {
    console.error(`❌ Error adding tracking number: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to add tracking number'
    });
  }
});

module.exports = router;