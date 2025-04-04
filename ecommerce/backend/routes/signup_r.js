const express = require("express");
const {createcus, getcustomer} = require("../controllers/signup");
const verifyOTP = require("../controllers/otpverification");

const router = express.Router();

router.post("/signup", createcus);
router.post("/verify-otp", verifyOTP);
router.get("/getcustomer/:customerId", getcustomer);

module.exports = router;
