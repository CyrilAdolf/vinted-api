const mongoose = require("mongoose");
const User = require("./User");

const Offer = mongoose.model("Offer", {
  product_name: {
    type: String,
    maxLength: 50,
  },
  product_description: {
    type: String,
    maxLength: 500,
  },
  product_price: {
    type: Number,
    maxValue: 1000000,
  },
  product_details: Array,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  product_image: { type: mongoose.Schema.Types.Mixed, default: {} },
});

module.exports = Offer;
