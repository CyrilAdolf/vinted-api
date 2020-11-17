// Get access to dotenv
require("dotenv").config();
const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const app = express();
app.use(formidable());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

// Import et specification id de Cloudinary
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Import des routes
const userRoutes = require("./routes/user");
app.use(userRoutes);
const offerRoutes = require("./routes/offer");
app.use(offerRoutes);

// PAYMENT ROUTE
// PAYMENT ROUTE
app.post("/payment", async (req, res) => {
  try {
    // REQ COMING FROM FRONTEND VIA STRIPE API
    const stripeToken = req.fields.stripeToken;
    // REQ TO STRIPE API WITH DATA
    const response = await stripe.charges.create({
      amount: 200,
      currency: "eur",
      description: "Masque chirurgical... ",
      source: stripeToken,
      // SOURCE VALUE = THE TOKEN
    });
    console.log(response);

    // SAVE IN MONGODB
    // SAVE IN MONGODB
    // SAVE IN MONGODB

    res.json(response);
  } catch (error) {
    console.log(error.message);
  }
});

app.all("*", (req, res) => {
  res.status(404).json({ message: "all routes" });
});

app.listen(process.env.PORT, () => {
  console.log("Server Started on port : " + process.env.PORT);
});
