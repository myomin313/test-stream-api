const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new mongoose.Schema({
  productOwner: { type: Schema.Types.ObjectId, ref: "User" },
  productStatus: {
    type: String,
    enum: ["draft", "live", "paused"],
    default: "draft"
  },
  productName: {
    type: String,
    required: true
  },
  modelUrl: {
    type: String,
    default: ""
  },
  productCategory: {
    type: String
  },
  productKeywords: {
    type: [String],
    default: []
  },
  productImages: {
    type: [String],
    default: []
  },
  productThumnail: {
    type: [String],
    default: []
  },
  productVideos: {
    type: [String],
    default: []
  },
  price: {
    type: Number
  },
  currencyType: {
    type: String,
    default: "USD"
  },
  soldStock: {
    type: Number,
    default: 0
  },
  availableStock: {
    type: Number
  },
  minimumOrder: {
    type: Number
  },
  xsollo_item_id: {
    type: String,
    default: ""
  },
  description: {
    type: String
  },
  variation: {
    type: [String],
    default: []
  },
  assetImages: {
    type: [String],
    default: []
  },
  assetType: {
    type: String,
    default: ""
  },
  productType: {
    type: String,
    default: ""
  },
  mint_tokenIds: [
    {
      tokenId: { type: String, required: true },
      transactionHash: { type: String, required: true },
      sold: { type: Boolean, default: false }
    }
  ],

  transfer_hash: [
    {
      tokenId: { type: String, required: true },
      transactionHash: { type: String, required: true }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
