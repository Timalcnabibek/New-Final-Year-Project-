const express = require('express');
const router = express.Router();

const {
  createOrder,
  deleteorder,     // gets all orders for a customer
  getorder,        // gets one order by ID
  updateorder      // updates status of an order
} = require('../controllers/order');

// POST: Create a new order
router.post('/trackorder', createOrder);

// GET: All orders for a customer (e.g. /api/orders/customer/:customerId)
router.get('/trackorder/:customerId', deleteorder);

// GET: Get single order by ID
router.get('/:orderId', getorder);

// PUT: Update order status
router.put('/update/:orderId', updateorder);

module.exports = router;
