const express = require("express");
const router = express.Router();
const { enc } = require("crypto-js");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// Import models
const User = require("../models/User");
const Offer = require("../models/Offer");

// Import and ID specification for Cloudinary
const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const isAuthenticated = require("../Middleware/isAuthenticated");
const { count } = require("../models/User");

// Publish
router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    // We got access to actualUser through isAuthenticated
    const owner = req.actualUser;

    // Store data from fields parameters
    const {
      title,
      description,
      price,
      condition,
      city,
      brand,
      size,
      color,
    } = req.fields;
    const product_details = [];
    product_details.push(
      { ETAT: condition },
      { EMPLACEMENT: city },
      { MARQUE: brand },
      { TAILLE: size },
      { COULEUR: color }
    );
    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details,
      owner,
    });

    await newOffer.save();
    const offerId = newOffer._id;
    // save the picture path to send to cloudinary.v2
    const pictureToUpload = req.files.picture.path;

    const result = await cloudinary.v2.uploader.upload(pictureToUpload, {
      folder: `/vinted/offers/${offerId}`,
    });

    // To update offer
    (newOffer.product_image = result), await newOffer.save();
    res.json(newOffer);
  } catch (error) {
    res.status(400).json({ msgPublishRoute: error.message });
  }
});

// Update an offer
router.put("/offer/modify", isAuthenticated, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      condition,
      city,
      brand,
      size,
      color,
    } = req.fields;
    const pictureToUpload = req.files.picture.path;
    // Check if something to update
    if (
      !title &&
      !description &&
      !price &&
      !condition &&
      !city &&
      !brand &&
      !size &&
      !color &&
      !pictureToUpload
    ) {
      res.json({ msg: "not enough data for an update" });
    } else {
      const offerId = await Offer.findById(req.query._id);
      const ownerId = offerId.owner;

      if (ownerId.toString() === req.actualUser._id.toString()) {
        const offerToUpdate = await Offer.findOne({ _id: offerId });
        const product_details = [
          { ÉTAT: condition },
          { EMPLACEMENT: city },
          { MARQUE: brand },
          { TAILLE: size },
          { COULEUR: color },
        ];

        // Proceed to the update
        if (title) {
          offerToUpdate.product_name = title;
        }
        if (description) {
          offerToUpdate.product_description = description;
        }
        if (price) {
          offerToUpdate.product_price = price;
        }
        if (product_details) {
          offerToUpdate.product_details = product_details;
        }
        if (pictureToUpload) {
          const result = await cloudinary.v2.uploader.upload(pictureToUpload, {
            folder: `/vinted/offers/${offerId}`,
          });
          offerToUpdate.product_image = result;
        }

        await offerToUpdate.save();
        res.status(200).json({ msg: "Offers successfully updated" });
      } else {
        res.status(400).json({ msg: "Offer HASN'T been updated" });
      }
    }
  } catch (error) {
    res.status(400).json({ msg: error.message });
    console.log(error.message);
  }
});

// Delete an offer
router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
    const owner = await Offer.findById(req.query._id);
    const ownerId = owner.owner;

    if (owner.owner.toString() === req.actualUser._id.toString()) {
      await Offer.deleteOne({ owner: ownerId });

      res.status(200).json({ msg: "Offers successfully deleted" });
    } else {
      res.status(400).json({ msg: "Offer NOT deleted" });
    }
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// To consult the offers
router.get("/offers", async (req, res) => {
  try {
    // define variables from query
    let { title, priceMin, priceMax, page, sort, limit } = req.query;
    // define a filters object to be tested
    let filters = {};
    if (title) {
      filters.product_name = new RegExp(title, "i");
    }
    if (priceMin) {
      filters.product_price = { $gte: priceMin };
    }
    if (priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = priceMax;
      } else {
        filters.product_price = {
          $lte: priceMax,
        };
      }
    }
    // define sorted condition
    let sorted = {};
    if (sort === "price-desc") {
      sorted = { product_price: -1 };
    } else {
      sorted = { product_price: 1 };
    }

    if (Number(page) < 1) {
      page = 1;
    } else {
      page = Number(page);
    }

    const result = await Offer.find(filters)
      .populate({ path: "owner", select: "account" })
      .sort(sorted)
      .skip(limit * (page - 1))
      .limit(limit);

    const count = await Offer.countDocuments(filters);

    res.json({ count: count, offers: result });
  } catch (error) {
    res.json({ msgFromOffers: error.message });
  }
});

// Get ONE offer (PARAMS)
router.get("/offer/:id", async (req, res) => {
  try {
    let result = await Offer.findById(req.params.id);

    result = result.populate("owner");
    res.json(result);
  } catch (error) {
    res.json({ msgFromOfferId: error.message });
  }
});

// PAYMENT ROUTE
// PAYMENT ROUTE
router.post("/payment", async (req, res) => {
  try {
    // REQ COMING FROM FRONTEND CONTAINING STRIPE TOKEN
    const { stripeToken, price, descritpion } = req.fields;
    console.log(price);
    // REQ TO STRIPE API WITH DATA
    const response = await stripe.charges.create({
      amount: price,
      currency: "eur",
      description: descritpion,
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

module.exports = router;
