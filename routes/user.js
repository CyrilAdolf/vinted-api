const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

// Import model
const User = require("../models/User");
const { enc } = require("crypto-js");
const Offer = require("../models/Offer");

// Import middlewares
const isAuthenticated = require("../Middleware/isAuthenticated");

// Signup
router.post("/user/signup", async (req, res) => {
  try {
    const { email, username, phone, password } = req.fields;

    const user = await User.findOne({ email: email });
    // Is the email already registered ?
    if (user) {
      res.status(409).json({
        message: "This email already has an account",
      });
    } else {
      // Data required
      if (email && username && password) {
        // step1: Create token, encrypt password
        const token = uid2(64);
        const salt = uid2(64);
        const hash = SHA256(password + salt).toString(encBase64);
        // step2: Create a new user
        const newUser = new User({
          email: email,
          account: {
            username: username,
            phone: phone,
          },
          token: token,
          hash: hash,
          salt: salt,
        });
        // step3: save the user
        await newUser.save();
        // step4: resonse without hash and salt
        res.status(200).json({
          _id: newUser._id,
          email: newUser.email,
          account: newUser.account,
          token: newUser.token,
        });
      } else {
        res.status(400).json({
          message: "Missing parameters",
        });
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.fields;
    // Find the user in the DB
    const user = await User.findOne({ email: email });
    console.log(user);
    if (user) {
      // Check the recorded hash with the one generate from salt and password
      const testHash = SHA256(password + user.salt).toString(encBase64);
      if (testHash === user.hash) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
      } else {
        res.status(401).json({
          message: "Unauthorized",
        });
      }
    } else {
      res.status(400).json({
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
