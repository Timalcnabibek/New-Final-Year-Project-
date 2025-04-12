const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  status: {
    type: Boolean,
    default: true
  },
  discount_amount: {
    type: Number,
    required: true,
    min: 0
  },
  discount_type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    default: null
  },
  usage_limit: {
    type: Number,
    required: true,
    min: 0
  },
  usage_count: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date
  }
});

// Update `updated_at` on every update
promoCodeSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Promo_Codes', promoCodeSchema);
