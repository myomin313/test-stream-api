const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const csAssetSchema = new Schema({
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
    exterior: String,
    quality: String,
    category: String,
    itemType: String
  }
});

const CsAsset = mongoose.model("dmarket_cs", csAssetSchema);

module.exports = CsAsset;
