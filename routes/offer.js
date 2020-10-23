const express = require("express");
const router = express.Router();
const { enc } = require("crypto-js");

// Import model
const User = require("../models/User");
const Offer = require("../models/Offer");

// Import and ID specification for Cloudinary
const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "cyrila",
  api_key: "642784334279441",
  api_secret: "Ce-NNZhcZ_5ABTTu4zi1LNjKvAo",
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

        // Proceed the update
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

// _______________________________________________________________
// EXERCISE october 22
// _______________________________________________________________

// Consult the offers (ADD MIDDLEWARE IF NEEDED).
router.get("/offers", async (req, res) => {
  try {
    // define variables from query
    // treat Cases where query are not defined
    // treat Cases where query are not defined
    // treat Cases where query are not defined
    // treat Cases where query are not defined
    let { title, priceMin, priceMax, page, sort } = req.query;
    if (!page) {
      page = 1;
    }
    if (req.query.sort === "price-desc") {
      sort = -1;
    } else {
      sort = 1;
    }
    // Fixed value of result per page
    const limitPerPage = 2;

    // find offers that match asked parameters
    const result = await Offer.find({
      product_name: new RegExp(title, "i"),
      product_price: { $gte: priceMin, $lte: priceMax },
    })
      .sort({ product_price: sort })
      .limit(limitPerPage)
      .skip(limitPerPage * (page - 1));

    // count
    const count = await Offer.countDocuments(result);

    res.json({ count: count, offers: result });
  } catch (error) {
    res.json({ msgFromOffers: error.message });
  }
});

// Get ONE offer (by ID)
router.get("/offer/:id", async (req, res) => {
  try {
    let result = await Offer.findById(req.params.id);

    result = result.populate("owner");
    res.json(result);
  } catch (error) {
    res.json({ msgFromOfferId: error.message });
  }
});

module.exports = router;