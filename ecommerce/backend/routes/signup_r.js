const express = require("express");
const {createcus, getcustomer, updateCustomer, requestPasswordReset,verifyotp,  confirmPasswordReset} = require("../controllers/signup");
const verifyOTP = require("../controllers/otpverification");

const router = express.Router();

router.post("/signup", createcus);
router.post("/verify-otp", verifyOTP);
router.get("/getcustomer/:customerId", getcustomer);
router.put("/updatecustomer/:customerId",updateCustomer);
router.post("/reset-password/request", requestPasswordReset);
router.post("/reset-password/confirm", confirmPasswordReset);
router.post("/reset-password/verify", verifyotp);

module.exports = router;
