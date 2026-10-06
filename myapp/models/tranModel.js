const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema({
  productOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user"
  },
  productImages: {
    type: [String],
    default: []
  },
  price: {
    type: Number
  },
  currencyType: {
    type: String,
    default: "BNB"
  },
  transaction_hash: [
    {
      tokenId: { type: String, required: true },
      transactionHash: { type: String, required: true }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
});

const Transfer = mongoose.model("TransferDetails", transferSchema);

module.exports = Transfer;
