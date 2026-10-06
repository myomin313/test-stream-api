const express = require("express");
const router = express.Router();

const dmarketTf2Model = require("../models/dmarketTf2Model");
const { success, internalError } = require("../commonFunctions/responses");

router.get("/team_fortress_assets", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1; // Default to descending order

    const { quality, type, minPrice, maxPrice } = req.query;

    const filter = {};
    if (quality) filter["extra.quality"] = quality;
    if (type) filter["extra.type"] = type;
    if (minPrice || maxPrice) {
      filter["price.USD"] = {};
      if (minPrice) filter["price.USD"].$gte = minPrice;
      if (maxPrice) filter["price.USD"].$lte = maxPrice;
    }

    const teamFortressAssets = await dmarketTf2Model
      .find(filter)
      .select("_id title description image price extra createdAt")
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalTeamFortressAssets = await dmarketTf2Model.countDocuments(filter);
    const totalPages = Math.ceil(totalTeamFortressAssets / limit);

    const result = success("Team Fortress assets retrieve process success", {
      totalTeamFortressAssets,
      teamFortressAssets,
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
