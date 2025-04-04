const express = require("express");
const router = express.Router();
const Customer = require("../model/cusmod");

// Tier logic
function getTier(points) {
  if (points >= 5000) return "Platinum";
  if (points >= 2000) return "Gold";
  if (points >= 1000) return "Silver";
  return "Bronze";
}

// GET: Loyalty dashboard info
router.get("/:customerId", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    res.json({
      loyaltyPoints: customer.loyaltyPoints,
      tier: getTier(customer.loyaltyPoints),
      redeemedRewards: customer.redeemedRewards || []
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST: Redeem a reward
router.post("/redeem/:customerId", async (req, res) => {
  const { rewardName, pointsRequired } = req.body;

  if (!rewardName || !pointsRequired) {
    return res.status(400).json({ message: "Missing reward data" });
  }

  try {
    const customer = await Customer.findById(req.params.customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    if (customer.loyaltyPoints < pointsRequired) {
      return res.status(400).json({ message: "Not enough points to redeem this reward" });
    }

    // Deduct points and add to redeemed history
    customer.loyaltyPoints -= pointsRequired;
    customer.redeemedRewards.push({
      rewardName,
      pointsUsed: pointsRequired
    });

    await customer.save();

    res.json({
      message: "Reward redeemed successfully",
      updatedPoints: customer.loyaltyPoints,
      tier: getTier(customer.loyaltyPoints),
      redeemedReward: rewardName
    });
    console.log("reward redeemed successfully!!!")

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
