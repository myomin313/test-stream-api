const express = require("express");
const router = express.Router();
const { success, requiredParams, notFound } = require("../commonFunctions/responses");
const { paymentModel } = require("../models/paymentModel");
const { hyperIdModel } = require("../models/usertranactionsModel");
const { Types } = require("mongoose");

router.get("/byProduct", async (req, res) => {
  try {
    let productId = req.query.productId;
    let productObjectId = new Types.ObjectId(productId);

    if (productId == undefined || productId == null) {
      let result = requiredParams("productId");
      return res.json(result);
    } else {
      let queryResult = await paymentModel.aggregate(
        [
          {
            $match: {
              productId: productObjectId
            }
          },
          {
            $lookup: {
              from: "products",
              localField: "productId",
              foreignField: "_id",
              as: "result"
            }
          },
          { $unwind: { path: "$result" } },
          {
            $project: {
              _id: 0,
              paymentId: "$_id",
              productId: 1,
              amount: 1,
              currency: 1,
              buyer: "$userId",
              owner: "$result.productOwner",
              product_name: "$result.productName"
            }
          },
          {
            $lookup: {
              from: "TestStream_users",
              localField: "buyer",
              foreignField: "_id",
              as: "result"
            }
          },
          {
            $addFields: {
              result: { $arrayElemAt: ["$result", 0] }
            }
          },
          {
            $project: {
              _id: 0,
              paymentId: 1,
              productId: 1,
              amount: 1,
              currency: 1,
              buyer: 1,
              owner: 1,
              product_name: 1,
              buyer_name: "$result.name"
            }
          }
        ],
        { allowDiskUse: true, maxTimeMS: 60000 }
      );

      if (queryResult.length == 0) {
        console.log("no record found");
        const result = notFound("no transaction found for this product");
        return res.json(result);
      } else {
        const result = success(
          "product transaction list retieved successfully",
          queryResult
        );
        return res.json(result);
      }
    }
  } catch (err) {
    console.error(err);
  }
});

router.get("/transactionDetails", async (req, res) => {
  try {
    const hyperIdDetails = await hyperIdModel.find().exec();
    const result = success("HyperId Details", hyperIdDetails);
    return res.json(result);
  } catch (err) {
    console.error(err);
  }
});

module.exports = router;
