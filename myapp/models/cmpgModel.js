const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema({
  token: {
    type: String,
    default: ""
  },
  data: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const user_campaign = mongoose.model("user_campaign", campaignSchema);

module.exports = user_campaign;
