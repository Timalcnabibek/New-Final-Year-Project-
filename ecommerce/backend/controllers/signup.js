const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");  // ✅ Import JWT
const nodemailer = require("nodemailer");
const model = require("../model/cusmod");

// Function to generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Nodemailer setup (Use your email credentials)
const transporter = nodemailer.createTransport({
    service: "gmail", // Use your email service provider
    auth: {
        user: "timalsinab39@gmail.com", 
        pass: "tsxq kcnz nowd guhr"
    }
});

// Function to send OTP via email
const sendOTPEmail = async (email, otp) => {
    try {
        await transporter.sendMail({
            from: '"Ecommerce" <timalsinab39@gmail.com>',
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
            html: `<p>Your OTP code is <strong>${otp}</strong>. It will expire in <strong>5 minutes</strong>.</p>`
        });
        console.log(`OTP sent to ${email}: ${otp}`);
    } catch (error) {
        console.error("Error sending OTP email:", error);
    }
};

const createcus = async (req, res) => {
    try {
        const { username, email, phone, password } = req.body;

        // Check if user already exists
        const existingUser = await model.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // ✅ Generate OTP
        const otp = generateOTP();
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

        // ✅ Hash password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ✅ Create user with OTP
        const cus = await model.create({
            username,
            email,
            phone,
            password: hashedPassword,
            otp,
            otpExpiration,
            isVerified: false
        });

        // ✅ Generate JWT Token
        const token = jwt.sign(
            { id: cus._id, email: cus.email }, // Payload
            process.env.JWT_SECRET_KEY, // Secret key (store in .env)
            { expiresIn: "1h" } // Token expires in 1 hour
        );

        // ✅ Send OTP to user's email
        await sendOTPEmail(email, otp);

        // ✅ Return user details including token
        res.status(201).json({
            message: "User registered successfully. OTP sent to email.",
            userId: cus._id,
            username: cus.username,
            email: cus.email,
            token // Send JWT token
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
        console.log(error);
    }
};

const getcustomer = async (req, res) => {
    try {
        const customerId = req.params.customerId;

        if (!customerId) {
            return res.status(400).json({ message: "Customer ID is required" });
        }

        const customer = await model.findById(customerId);

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.status(200).json(customer);
    } catch (error) {
        console.error("Error fetching customer:", error);
        res.status(500).json({ message: error.message });
    }
};

// PUT: Update user profile
const updateCustomer = async (req, res) => {
    try {
      const { customerId } = req.params;
      const { username, email, phone } = req.body;
  
      const updatedCustomer = await model.findByIdAndUpdate(
        customerId,
        { username, email, phone },
        { new: true }
      );
  
      if (!updatedCustomer) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }
  
      res.json({ success: true, message: "Customer updated", customer: updatedCustomer });
    } catch (err) {
      console.error("❌ Error updating customer:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };


  const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await model.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "No account with this email found." });
        }

        const otp = generateOTP();
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        user.otp = otp;
        user.otpExpiration = otpExpiration;
        await user.save();

        await sendOTPEmail(email, otp);

        res.status(200).json({ message: "OTP sent to your email address." });
    } catch (error) {
        console.error("Reset request error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
};


const verifyotp = async (req, res) => {
    const { email, otp } = req.body;

    const user = await model.findOne({ email: email.trim().toLowerCase() });

    if (
        !user ||
        !user.otp ||
        user.otp !== otp.toString() ||
        !user.otpExpiration ||
        user.otpExpiration < new Date()
    ) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    user.isOtpVerified = true;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully." });
};


const confirmPasswordReset = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await model.findOne({ email: email.trim().toLowerCase() });

        if (
            !user ||
            !user.otp ||
            user.otp !== otp.toString() ||
            !user.otpExpiration ||
            user.otpExpiration < new Date()
        ) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.otp = undefined;
        user.otpExpiration = undefined;
        await user.save();

        res.status(200).json({ message: "Password reset successful." });
    } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({ message: "Failed to reset password." });
    }
};


  


module.exports = {createcus, getcustomer, updateCustomer, requestPasswordReset,verifyotp, confirmPasswordReset};
