const model = require("../model/cusmod");
const nodemailer = require("nodemailer");

const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await model.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Generate new OTP
        const newOTP = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
        const otpExpiration = new Date();
        otpExpiration.setMinutes(otpExpiration.getMinutes() + 5); // Set OTP expiry to 5 minutes

        // Update OTP in the database
        user.otp = newOTP;
        user.otpExpiration = otpExpiration;
        await user.save(); //
        //  Save the new OTP before sending email
        // Send OTP via email using Nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "timalsinab39@gmail.com",
                pass: "fdkv gdno fdzo bgwu",
            },
        });

        const mailOptions = {
            from: "timalsinab39@gmail.com",
            to: email,
            subject: "Your New OTP Code",
            text: `Your new OTP is ${newOTP}. It will expire in 5 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "OTP resent successfully" });

    } catch (error) {
        res.status(500).json({ message: "Failed to resend OTP" });
        console.log(error);
    }
};

module.exports = resendOTP;
