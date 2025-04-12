// routes/rewards.js
const express = require('express');
const router = express.Router();
const PromoCode = require('../model/redeem'); // Mongoose model
const moment = require('moment');

router.get('/rewards/available', async (req, res) => {
  try {
    const now = new Date();

    const rewards = await PromoCode.find({
      status: true,
      start_date: { $lte: now },
      $or: [
        { end_date: { $gte: now } },
        { end_date: null }
      ],
      $or: [
        { usage_limit: 0 },
        { $expr: { $lt: ['$usage_count', '$usage_limit'] } }
      ]
    });

    const formatted = rewards.map(r => ({
      _id: r._id,
      code: r.code,
      discount_amount: r.discount_amount,
      discount_type: r.discount_type,
      start_date: moment(r.start_date).format('YYYY-MM-DD'),
      end_date: r.end_date ? moment(r.end_date).format('YYYY-MM-DD') : null,
      usage_limit: r.usage_limit,
      usage_count: r.usage_count || 0
    }));

    res.status(200).json({ success: true, rewards: formatted });
  } catch (err) {
    console.error('Error fetching promo codes:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
