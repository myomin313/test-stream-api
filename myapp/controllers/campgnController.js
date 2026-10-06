const express = require("express");
const AWS = require("aws-sdk");
const router = express.Router();
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  requiredParams,
  internalError
} = require("../commonFunctions/responses");
const {
  authentication,
  authentication_email_exists
} = require("../commonFunctions/functions");
const campaignModel = require("../models/cmpgModel");


router.get("/", (req, res) => {
  console.log("received from stream file");
  res.sendStatus(200);
});

router.post("/upload_user", async (req, res) => {
  console.log("received from stream/create", req.body);

  try {
    let requiredFields = ["token", "data"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let campaign = new campaignModel({
        token: req.body.token,
        data: req.body.data
      });

      let campaignesult = await campaign.save();

      const result = success("Campaign created successfully.", campaignesult);
      return res.json(result);
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

module.exports = router;
