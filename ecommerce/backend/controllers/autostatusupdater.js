const cron = require("node-cron");
const Customer = require("../model/cusmod");

// Run every day at midnight (adjust as needed)
cron.schedule("0 0 * * *", async () => {
  console.log("🕐 Running auto status check...");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const usersToUpdate = await Customer.find({
      status: "Pending",
      "statusHistory.status": "Pending",
      "statusHistory.changedAt": { $lte: sevenDaysAgo }
    });

    for (let user of usersToUpdate) {
      user.status = "Inactive";
      user.statusHistory.push({
        status: "Inactive",
        changedAt: new Date()
      });
      await user.save();
      console.log(`🔄 Marked user ${user.email} as Inactive`);
    }

    console.log(`✅ Auto status update complete: ${usersToUpdate.length} user(s) updated`);
  } catch (error) {
    console.error("❌ Error during auto status update:", error);
  }
});
