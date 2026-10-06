const express = require("express");
const router = express.Router();

const dmarketCsModel = require("../models/dmarketCsModel");
const { success, internalError } = require("../commonFunctions/responses");

router.get("/cs_assets", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1; // Default to descending order

    const { exterior, quality, category, itemType, minPrice, maxPrice } = req.query;

    const filter = {};
    if (exterior) filter["extra.exterior"] = exterior;
    if (quality) filter["extra.quality"] = quality;
    if (category) filter["extra.category"] = category;
    if (itemType) filter["extra.itemType"] = itemType;
    if (minPrice || maxPrice) {
      filter["price.USD"] = {};
      if (minPrice) filter["price.USD"].$gte = minPrice;
      if (maxPrice) filter["price.USD"].$lte = maxPrice;
    }

    const csAssets = await dmarketCsModel
      .find(filter)
      .select("_id itemId title description image price extra createdAt")
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();

    // Remove duplicates based on itemId
    const uniqueCsAssets = [];
    const seenItemIds = new Set();

    csAssets.forEach((asset) => {
      if (!seenItemIds.has(asset.itemId)) {
        uniqueCsAssets.push(asset);
        seenItemIds.add(asset.itemId);
      }
    });

    const totalCsAssets = await dmarketCsModel.countDocuments(filter);
    const totalPages = Math.ceil(totalCsAssets / limit);

    const result = success("CS assets retrieve process success", {
      totalCsAssets: uniqueCsAssets.length,
      csAssets: uniqueCsAssets,
      totalPages
    });
    return res.json(result);
  } catch (err) {
    console.error("err", err);
    const response = internalError();
    return res.json(response);
  }
});

module.exports = router;
