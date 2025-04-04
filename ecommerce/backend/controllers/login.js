const bcrypt = require("bcryptjs"); // Import bcrypt for password hashing
const jwt = require("jsonwebtoken"); // Import JWT
const model = require("../model/cusmod");

const cusLogin = async (req, res) => {
    try {
        const { email, password } = req.body; // Extract email and password from request body

        // Check if user exists
        const cus = await model.findOne({ email });
        if (!cus) {
            return res.status(404).json({ message: "User not found" });
        }

        // Compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(password, cus.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // ✅ Generate JWT Token
const token = jwt.sign(
    { id: cus._id, email: cus.email }, // Payload
    process.env.JWT_SECRET_KEY, // Corrected Secret Key
    { expiresIn: "1h" } // Token expires in 1 hour
);

// ✅ Send token, customerId, and email in response
res.status(200).json({ 
    message: "Login successful", 
    token, // Send JWT token
    customerId: cus._id, // Send customer ID
    email: cus.email, // Send email
    username: cus.username
});


    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = cusLogin;
