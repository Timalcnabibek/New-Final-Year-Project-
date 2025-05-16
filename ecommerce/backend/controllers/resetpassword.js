const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../model/cusmod'); // adjust path as needed

// POST /api/users/update-password
router.post('/update-password', async (req, res) => {
    try {
        const { customerId, currentPassword, newPassword } = req.body;

        if (!customerId || !currentPassword || !newPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const user = await User.findById(customerId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Password updated successfully." });

    } catch (error) {
        console.error("Password update error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router;
