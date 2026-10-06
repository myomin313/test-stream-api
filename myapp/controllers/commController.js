const express = require("express");
const router = express.Router();
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  error,
  requiredParams,
  internalError
} = require("../commonFunctions/responses");
const UserModel = require("../models/userModel");
const { authentication } = require("../commonFunctions/functions");
const commissionModel = require("../models/commissionModel");

router.get("/", (req, res) => {
  console.log("received from stream file");
  res.sendStatus(200);
});
router.post("/create", async (req, res) => {
  console.log("received from stream/create", req.body);
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }

  try {
    let requiredFields = ["userId", "commission"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, commission } = req.body;
      console.log("userId", userId);
      let userInfo = UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        let commission_details = new commissionModel({
          userId: userId,
          commission_percentage: commission
        });

        let commissionresult = await commission_details.save();

        const result = success("Commission created successfully.", commissionresult);
        return res.json(result);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.get("/TestStream_commission", async (req, res) => {
  try {
    const commissionData = await commissionModel.findOne({ status: "1" });
    if (commissionData) {
      let response = success("TestStream commission percentage", { commissionData });
      return res.json(response);
    } else {
      res.status(404).json({ message: "Commission data not found" });
    }
  } catch (error) {
    console.error("Error fetching commission data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
