const express = require("express");
const router = express.Router();

const dmarketDota2Model = require("../models/dmarketDota2Model");
const { success, internalError } = require("../commonFunctions/responses");

router.get("/dota_assets", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1; // Default to descending order

    const { hero, rarity, type, minPrice, maxPrice } = req.query;

    const filter = {};
    if (hero) filter["extra.hero"] = hero;
    if (rarity) filter["extra.rarity"] = rarity;
    if (type) filter["extra.type"] = type;
    if (minPrice || maxPrice) {
      filter["price.USD"] = {};
      if (minPrice) filter["price.USD"].$gte = minPrice;
      if (maxPrice) filter["price.USD"].$lte = maxPrice;
    }

    const dotaAssets = await dmarketDota2Model
      .find(filter)
      .select("_id title description image price extra createdAt")
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalDotaAssets = await dmarketDota2Model.countDocuments(filter);
    const totalPages = Math.ceil(totalDotaAssets / limit);

    const result = success("Dota assets retrieve process success", {
      totalDotaAssets,
      dotaAssets,
      totalPages
    });
    return res.json(result);
  } catch (err) {
    console.log("err", err);
    const response = internalError();
    return res.json(response);
  }
});

module.exports = router;
