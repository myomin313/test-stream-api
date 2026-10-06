const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  sku: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "product",
    required: true
  },
  isChecked: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  isDelted: { type: Boolean, default: false },
  _id: false
});

const storeSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user",
    required: true
  },
  products: [itemSchema],
  _id: false
});

const cartShema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user",
    required: true
  },
  items: [storeSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CartModel = mongoose.model("cart", cartShema);
module.exports = { CartModel, itemSchema, storeSchema };
