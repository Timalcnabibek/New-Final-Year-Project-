const mongoose = require("mongoose");

const RewardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  points_required: { type: Number, required: true },
  discount: {
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true }
  },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Reward", RewardSchema);
