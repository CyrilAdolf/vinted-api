// Get access to dotenv
require("dotenv").config();

const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(formidable());
app.use(cors());

// MONGODB CONFIG
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

// IMPORT CLOUDINARY
const cloudinary = require("cloudinary").v2;
// CLOUDINARY CONFIG
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// ROUTES IMPORT
const userRoutes = require("./routes/user");
app.use(userRoutes);
const offerRoutes = require("./routes/offer");
app.use(offerRoutes);

// DEFAULT ROUTE
app.all("*", (req, res) => {
  res.status(404).json({ message: "all routes" });
});

app.listen(process.env.PORT, () => {
  console.log("Server Started on port : " + process.env.PORT);
});
