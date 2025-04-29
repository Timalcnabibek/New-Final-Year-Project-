const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");
require("../backend/controllers/autostatusupdater.js");

// Load environment variables
dotenv.config();
console.log("Loaded JWT_SECRET_KEY:", process.env.JWT_SECRET_KEY);


// Import routes
const newcus = require("./routes/signup_r.js");
const Login = require("./routes/login_r.js");
const verifyOTP = require("./controllers/otpverification.js");
const ResentOtp = require("./routes/resent.js");
const productRoutes = require("./routes/products.js");
const cartRoutes = require("./routes/cart.js"); // ✅ Added Cart Routes
const wishlistRoutes = require("./routes/wishlist.js"); // ✅ Added Wishlist Routes
const trackorders = require("./routes/order.js")
const loyaltyRoutes = require("./routes/loyalty");
const redeemRewards = require('./controllers/redeem.js')
const khalti = require('./controllers/initializekhalti.js')
const reward = require('./controllers/reward.js')


// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// Route to serve pages
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/signup.html"));
});
app.get("/verify-otp", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/authenticate.html"));
});
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
});
app.get("/details", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/products_description.html"));
});
app.get("/loyalty", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/loyalty.html"));
});
app.get("/cart", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/cart.html"));
});
app.get("/wishlist", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/wishlist.html"));
});
app.get("/payment", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/payment.html"));
});

app.get("/trackorder",(req,res) =>{
  res.sendFile(path.join(__dirname, "../frontend/trackorder.html"));
})

app.get("/invoice", (req, res) => {
  res.sendFile(path.join(__dirname,"../frontend/invoice.html"))
})
// ✅ API Routes

app.use("/api/loyalty", loyaltyRoutes);

app.use("/api", newcus);
app.use("/api", Login);
app.use("/api/verify-otp", verifyOTP);
app.use("/api/resent-otp", ResentOtp);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes); // ✅ Cart API
app.use("/api/wishlist", wishlistRoutes); // ✅ Wishlist API
app.use('/api', trackorders);
app.use('/api', redeemRewards);
app.use('/api/payment', khalti);
app.use('/api',reward);

// Database connection
const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((error) => console.error("❌ Error connecting to MongoDB:", error));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server is running on port ${PORT}`);
});
