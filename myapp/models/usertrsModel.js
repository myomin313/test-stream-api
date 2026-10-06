const mongoose = require("mongoose");

const usertranactions = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user",
    required: true
  },
  signupDetails: {
    type: Object,
    default: ""
  },
  WalletDetails: {
    type: Object,
    default: ""
  },
  smartcontractDetails: {
    type: Object,
    default: ""
  },
  purchaseDetails: [
    {
      count: {
        type: "string",
        default: ""
      },
      transactionhash: {
        type: "string",
        default: ""
      },
      tokenId: {
        type: "string",
        default: ""
      }
    }
  ],
  sellingDetails: [
    {
      count: {
        type: "string",
        default: ""
      },
      transactionhash: {
        type: "string",
        default: ""
      },
      tokenId: {
        type: "string",
        default: ""
      }
    }
  ],
  mintingdetails: [
    {
      count: {
        type: "string",
        default: ""
      }
    }
  ],
  points: {
    type: "number",
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const usertranactionsdetails = mongoose.model("usertransactions", usertranactions);

module.exports = usertranactionsdetails;
