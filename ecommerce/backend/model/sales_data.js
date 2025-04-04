const mongoose = require('mongoose');

const salesDataSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  product_name: {
    type: String,
    required: true
  },
  category: String,
  gender: String,
  season: String,
  price: {
    type: Number,
    required: true
  },
  total_sold: {
    type: Number,
    default: 0
  },
  total_revenue: {
    type: Number,
    default: 0
  },
  growth_rate: {
    type: Number,
    default: 0.0
  },
  historical_sales: [
    {
      date: Date,
      quantity: Number,
      revenue: Number
    }
  ],
  last_updated: {
    type: Date,
    default: Date.now
  }
  
});

module.exports = mongoose.model('sales_data', salesDataSchema);
