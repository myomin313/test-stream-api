const mongoose = require("mongoose");

const userRewardsschema = new mongoose.Schema({
  userID: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  minting_points: {
    type: Number,
    default: 0
  },
  buying_points: {
    type: Number,
    default: 0
  },
  selling_points: {
    type: Number,
    default: 0
  },
  signup_points: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 0
  }
});

const UserRewards = mongoose.model("Userrewards", userRewardsschema);

module.exports = UserRewards;
