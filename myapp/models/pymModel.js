const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user",
    required: true
  },
  productId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product"
    }
  ],
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: "USD"
  },
  status: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Refunded"],
    default: "Pending"
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentInfo: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const paymentModel = mongoose.model("payment", paymentSchema);

const paymentHistorySchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
    required: true
  },
  status: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },

  description: {
    type: String
  }
});

const PaymentHistoryModel = mongoose.model("PaymentHistory", paymentHistorySchema);
module.exports = { paymentModel, PaymentHistoryModel };
