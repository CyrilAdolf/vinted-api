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

    // Est-ce qu'un user possède déjà cet email ?
    const user = await User.findOne({ email: email });
    // Si oui, on renvoie un message d'erreur
    if (user) {
      res.status(409).json({
        message: "This email already has an account",
      });
    } else {
      // Sinon, on passe à la suite

      // est-ce que je reçois les infos nécessaires ?
      if (email && username && password) {
        // on peut créer le user
        // Etape 1 : encrypter le mot de passe
        // Générer token + encrypter MDP
        const token = uid2(64);
        const salt = uid2(64);
        const hash = SHA256(password + salt).toString(encBase64);
        // Etape 2 : créer le nouveau user
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
        // Etpae 3 : sauvegarder le nouveau user
        await newUser.save();
        // Etape 4 : répondre au client
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
    // Quel est le user qui souhaite se loguer ?
    const user = await User.findOne({ email: email });
    console.log(user);
    // S'il existe dans la BDD
    if (user) {
      // On fait la suite
      // Est-ce qu'il a rentré le bon mot de passe ?
      const testHash = SHA256(password + user.salt).toString(encBase64);
      if (testHash === user.hash) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
        // Le mot de passe n'est pas bon
      } else {
        res.status(401).json({
          message: "Unauthorized",
        });
      }
    } else {
      // Sinon => erreur
      res.status(400).json({
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
