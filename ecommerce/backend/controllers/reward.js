const express = require("express");
const router = express.Router();
const Reward = require("../model/reward");
const Customer = require("../model/cusmod")
// Add reward
router.post("/redeemreward", async (req, res) => {
    const { customerId, rewardId, pointsUsed, rewardName } = req.body;
  
    if (!customerId || !rewardId || !pointsUsed || !rewardName) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    // Check customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
  
    if (customer.loyaltyPoints < pointsUsed) {
      return res.status(400).json({ error: "Not enough points" });
    }
  
    // Deduct points
    customer.loyaltyPoints -= pointsUsed;
  
    // Add to redeemedRewards
    customer.redeemedRewards = customer.redeemedRewards || [];
    const rewardData = await Reward.findById(rewardId);
    if (!rewardData) return res.status(404).json({ error: "Reward not found" });
    
    customer.redeemedRewards.push({
      rewardId,
      rewardName,
      pointsUsed,
      discount: {
        type: rewardData.discount.type,
        value: rewardData.discount.value
      },
      redeemedAt: new Date()
    });
    
  
    await customer.save();
    console.log("Customer points:", customer.loyaltyPoints, "Required:", pointsUsed);  
    res.status(200).json({ message: "Reward redeemed successfully" });
  });
  

// Get all rewards
router.get("/getreward", async (req, res) => {
  const rewards = await Reward.find();
  res.status(200).json(rewards);
});

// Update reward
router.put("/reward/:id", async (req, res) => {
  try {
    const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reward) return res.status(404).json({ error: "Reward not found" });
    res.json({ success: true, message: "Reward updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete reward
router.delete("/reward/delete:id", async (req, res) => {
  try {
    const deleted = await Reward.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Reward not found" });
    res.json({ message: "Reward deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
