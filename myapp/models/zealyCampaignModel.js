const mongoose = require("mongoose");

const ZealyCampaignSchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },
  checkedAt: {
    type: Date,
    default: Date.now
  }
});

ZealyCampaignSchema.set("toJSON", {
  virtuals: true
});

const ZealyCampaign = mongoose.model("zealy", ZealyCampaignSchema);

module.exports = ZealyCampaign;
