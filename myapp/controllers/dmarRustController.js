const express = require("express");
const router = express.Router();

const dmarketRustModel = require("../models/dmarketRustModel");
const { success, internalError } = require("../commonFunctions/responses");

router.get("/rust_assets", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1; // Default to descending order

    const { type, minPrice, maxPrice } = req.query;

    const filter = {};
    if (type) filter["extra.type"] = type;
    if (minPrice || maxPrice) {
      filter["price.USD"] = {};
      if (minPrice) filter["price.USD"].$gte = minPrice;
      if (maxPrice) filter["price.USD"].$lte = maxPrice;
    }

    const rustAssets = await dmarketRustModel
      .find(filter)
      .select("_id title description image price extra createdAt")
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalRustAssets = await dmarketRustModel.countDocuments(filter);
    const totalPages = Math.ceil(totalRustAssets / limit);

    const result = success("Rust assets retrieve process success", {
      totalRustAssets,
      rustAssets,
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
