const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user",
    required: true
  },
  commission_percentage: {
    type: Number,
    default: "",
    required: true
  },
  status: {
    type: String,
    default: "1"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const commission_data = mongoose.model("commission_data", commissionSchema);

module.exports = commission_data;
