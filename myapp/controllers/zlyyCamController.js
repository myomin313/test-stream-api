const express = require("express");
const axios = require("axios");
const ZealyCampaign = require("../models/zealyCampaignModel");
const UserModel = require("../models/userModel");

const router = express.Router();
const dominoAPI =
  "https://matiz.domino.run/automations/NqmtXp4Ze4bqZnhzf1VgePlb2i9FKXBFcZRPVsyedCw%3D";

router.post("/daily-check", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    let userExisting = await UserModel.findOne({ email });

    if (!userExisting) {
      return res.status(400).json({ error: "You need to register first." });
    }

    let entry = await ZealyCampaign.findOne({ email });

    if (entry) {
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Compare checkedAt date with today's date
      const lastChecked = new Date(entry.checkedAt);
      lastChecked.setHours(0, 0, 0, 0);

      if (lastChecked.getTime() === today.getTime()) {
        return res
          .status(429)
          .json({ message: "Daily check already completed for today" });
      }

      // Send the POST request to the external URL
      try {
        await axios.post(`${dominoAPI}?email=${encodeURIComponent(email)}`);

        // Update the checkedAt field to the current date and time
        entry.checkedAt = new Date();
        await entry.save();

        return res.status(200).json({
          message: "Daily check completed and POST request sent",
          entry
        });
      } catch (postError) {
        console.error("Error sending POST request:", postError);
        return res.status(500).json({ error: "Failed to send POST request" });
      }
    } else {
      // If no entry exists, create a new one
      try {
        await axios.post(`${dominoAPI}?email=${encodeURIComponent(email)}`);

        // Update the checkedAt field to the current date and time
        entry = new ZealyCampaign({ email });
        await entry.save();

        return res.status(200).json({
          message: "Daily check completed and POST request sent",
          entry
        });
      } catch (postError) {
        console.error("Error sending POST request:", postError);
        return res.status(500).json({ error: "Failed to send POST request" });
      }
    }
  } catch (error) {
    console.error("Error checking email in database:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
