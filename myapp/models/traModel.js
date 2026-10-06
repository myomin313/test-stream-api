const mongoose = require("mongoose");

const transactionActivitySchema = new mongoose.Schema({
  productName: { type: String },
  quantity: { type: Number },
  price: { type: String },
  from: {
    type: mongoose.Types.ObjectId,
    ref: "TestStream_users"
  },
  to: {
    type: mongoose.Types.ObjectId,
    ref: "TestStream_users"
  },
  createdDate: { type: Date, default: Date.now }
});

const transactionActivity = mongoose.model(
  "transaction_history",
  transactionActivitySchema
);
module.exports = transactionActivity;
