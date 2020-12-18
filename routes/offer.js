const express = require("express");
const router = express.Router();

// IMPORT STRIPE FOR PAYMENT FUNCTIONNALITY
// KEY IN DOTENV FILE
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// Import models
const User = require("../models/User");
const Offer = require("../models/Offer");

// IMPORT AND CONFIG CLOUDINARY
const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const isAuthenticated = require("../Middleware/isAuthenticated");
const { count } = require("../models/User");

// CREATE
router.post("/offer/publish", isAuthenticated, async (req, res) => {
  // ONLY AUTHENTICATED USER GET ACCESS THROUGH MIDDLEWARE
  try {
    // VAR ADDED VIA MIDDLEWARE
    const owner = req.actualUser;
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
    // GENERATE DATA USING MODEL TEMPLATE
    const product_details = [];
    product_details.push(
      { ETAT: condition },
      { EMPLACEMENT: city },
      { MARQUE: brand },
      { TAILLE: size },
      { COULEUR: color }
    );
    // CREATE AND SAVE A NEW OFFER
    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details,
      owner,
    });
    await newOffer.save();
    const offerId = newOffer._id;
    // SAVE THE PICTURE PATH TO SEND TO CLOUDINARY
    const pictureToUpload = req.files.picture.path;
    const result = await cloudinary.v2.uploader.upload(pictureToUpload, {
      folder: `/vinted/offers/${offerId}`,
    });
    // UPDATE OFFER WITH PICTURE
    // THIS STEP BY STEP METHOD WAS USED TO SAVE PICTURE IN A FILE NAMED BY THE ID, IT NEEDED TO BE GENERATED BEFORE SENDING THE PICTURE.
    (newOffer.product_image = result), await newOffer.save();
    res.json(newOffer);
  } catch (error) {
    res.status(400).json({ msgPublishRoute: error.message });
  }
});

// UPDATE
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
    // CHECK IF SOMETHING TO UPDATE
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
      // FIND THE TARGETED OFFER
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
        // PROCEED TO UPDATE
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
        // SAVE OFFER
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

// DELETE
router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
    // FIND TARGETED OFFER
    const owner = await Offer.findById(req.query._id);
    const ownerId = owner.owner;
    // CHECK IF OWNER IS LINKED TO THE OFFER
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

// READ
router.get("/offers", async (req, res) => {
  try {
    let { title, priceMin, priceMax, page, sort, limit } = req.query;
    // DECLARE A FILTER OBJECT TO BE TESTED
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
    // DECLARE SORTED CONDITIONS
    let sorted = {};
    if (sort === "price-desc") {
      sorted = { product_price: -1 };
    } else {
      sorted = { product_price: 1 };
    }
    // PAGINATION
    if (Number(page) < 1) {
      page = 1;
    } else {
      page = Number(page);
    }
    // FIND OFFERS
    const result = await Offer.find(filters)
      .populate({ path: "owner", select: "account" })
      .sort(sorted)
      .skip(limit * (page - 1))
      .limit(parseInt(limit));
    // ADD COUNT VALUE TO DEAL WITH PAGINATION IN FRONTEND
    const count = await Offer.countDocuments(filters);
    // SEND RESULT DATA
    res.json({ count: count, offers: result });
  } catch (error) {
    res.json({ msgFromOffers: error.message });
  }
});

// READ ONE
router.get("/offer/:id", async (req, res) => {
  try {
    // PARAMS VALUE
    let result = await Offer.findById(req.params.id);
    // ALSO INCLUDE OWNER INFORMATIONS
    result = result.populate("owner");
    res.json(result);
  } catch (error) {
    res.json({ msgFromOfferId: error.message });
  }
});

// PAYMENT ROUTE
router.post("/payment", async (req, res) => {
  try {
    const { stripeToken, price, descritpion } = req.fields;
    // REQUEST TO STRIPE API WITH TOKEN AND AMOuNT
    const response = await stripe.charges.create({
      amount: Number(parseInt(price).toFixed(2)) * 100,
      currency: "eur",
      description: descritpion,
      // SOURCE VALUE = TOKEN
      source: stripeToken,
    });
    // console.log(response);
    // POSSIBILITY TO SAVE IN DB
    res.json(response);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ eror: error.message });
  }
});

module.exports = router;
