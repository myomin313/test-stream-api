const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const teamFortressAssetSchema = new Schema({
  uuid: {
    type: String,
    default: uuidv4,
    unique: true
  },
  itemId: String,
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: ""
  },
  price: {
    USD: {
      type: String,
      default: ""
    }
  },
  extra: {
    gameId: {
      type: String,
      default: ""
    },
    name: {
      type: String,
      trim: true
    },
    categoryPath: {
      type: String,
      default: ""
    },
    quality: String,
    type: {
      type: String
    }
  }
});

const TeamFortressAsset = mongoose.model("dmarket_tf2", teamFortressAssetSchema);

module.exports = TeamFortressAsset;
