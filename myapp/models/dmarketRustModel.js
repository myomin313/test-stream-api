const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const rustAssetSchema = new Schema(
  {
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
      type: {
        type: String
      }
    }
  },
  {
    collection: "dmarket_rust"
  }
);

const RustAsset = mongoose.model("dmarket_rust", rustAssetSchema);

module.exports = RustAsset;
