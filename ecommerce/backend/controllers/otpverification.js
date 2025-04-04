const model = require("../model/cusmod");

const verifyOTP = async (req, res) => {
    try {
        let { email, otp } = req.body;

        // Extensive input validation
        if (!email || !otp) {
            console.error("❌ Validation Error: Missing email or OTP");
            return res.status(400).json({ 
                message: "Email and OTP are required",
                error: "MISSING_CREDENTIALS" 
            });
        }

        // Normalize email
        email = email.trim().toLowerCase();
        console.log("🔍 Received Verification Request:");
        console.log("📧 Email:", email);
        console.log("🔢 OTP:", otp);

        // Find user in database
        const user = await model.findOne({ email });

        if (!user) {
            console.error("❌ User Not Found Error:");
            console.error("📧 Attempted Email:", email);
            
            // Debug: List all existing users
            const allUsers = await model.find({}, { email: 1 });
            console.error("📋 Registered Emails:", allUsers.map(u => u.email));

            return res.status(404).json({ 
                message: "User not found. Please sign up again.",
                error: "USER_NOT_FOUND" 
            });
        }

        // Comprehensive OTP verification logging
        console.log("🔍 User Found Details:");
        console.log("📧 Stored Email:", user.email);
        console.log("🔢 Stored OTP:", user.otp);
        console.log("⏰ OTP Expiration:", user.otpExpiration);
        console.log("🕒 Current Time:", new Date());

        // Strict OTP verification
        if (!user.otp) {
            console.error("❌ No OTP Generated Error");
            return res.status(400).json({ 
                message: "No OTP generated. Request a new OTP.",
                error: "NO_OTP_GENERATED" 
            });
        }

        // Compare OTPs (with added type coercion)
        const isOTPMatch = user.otp == otp;
        console.log("🔍 OTP Match Result:", isOTPMatch);

        if (!isOTPMatch) {
            console.error("❌ OTP Mismatch Error:");
            console.error("📥 Received OTP:", otp);
            console.error("📤 Stored OTP:", user.otp);

            return res.status(400).json({ 
                message: "Invalid OTP. Please try again.",
                error: "INVALID_OTP" 
            });
        }

        // Check OTP expiration
        const currentTime = new Date();
        const otpExpirationTime = new Date(user.otpExpiration);

        console.log("⏰ Expiration Comparison:");
        console.log("🕒 Current Time:", currentTime);
        console.log("⌛ OTP Expiration:", otpExpirationTime);

        if (!user.otpExpiration || currentTime > otpExpirationTime) {
            console.error("❌ OTP Expired Error");
            return res.status(400).json({ 
                message: "OTP has expired. Request a new one.",
                error: "OTP_EXPIRED" 
            });
        }

        // Successful verification
        user.isVerified = true;
        user.otp = null;
        user.otpExpiration = null;
        await user.save();

        console.log("✅ OTP Verified Successfully!");
        res.status(200).json({ 
            message: "OTP verified successfully. Account activated!",
            status: "VERIFIED" 
        });

    } catch (error) {
        console.error("❌ Comprehensive OTP Verification Error:", error);
        res.status(500).json({ 
            message: "Server error during OTP verification.",
            error: "SERVER_ERROR",
            details: error.message 
        });
    }
};

module.exports = verifyOTP;