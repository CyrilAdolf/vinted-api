const express = require("express");
const router = express.Router();

// UID2 AND CRYPTO-JS ARE USED TO DEAL WITH PASSWORD SECURITY
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

// MODEL IMPORT
const User = require("../models/User");
const Offer = require("../models/Offer");

// SIGNUP
router.post("/user/signup", async (req, res) => {
  try {
    const { email, username, phone, password } = req.fields;
    // console.log(req.fields);
    const user = await User.findOne({ email: email });
    // USER ALREADY REGISTERED?
    if (user) {
      res.status(409).json({
        message: "This email already has an account",
      });
    } else {
      if (email && username && password) {
        // 1. CREATE TOKEN, ENCRYPT PASSWORD
        const token = uid2(64);
        const salt = uid2(64);
        const hash = SHA256(password + salt).toString(encBase64);
        // 2. CREATE A NEW USER
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
        // 3. SAVE THE USER
        await newUser.save();
        // 4. SEND RESPONSE WITHOUT HASH AND SALT
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

// LOGIN
router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.fields;
    // FIND USER IN THE DATABASE
    const user = await User.findOne({ email: email });
    // console.log(user);
    if (user) {
      // COMPARE SAVED AND NEWLY GENERATED HASH
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
