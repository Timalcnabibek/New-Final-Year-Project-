const express = require('express');
const Router = express.Router();
const resentotp = require("../controllers/resentOTP");

Router.post("/resent_otp",resentotp);

module.exports = Router;