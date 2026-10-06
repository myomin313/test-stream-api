const mongoose = require("mongoose");

const checkinsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const user_checkins = mongoose.model("user_checkins", checkinsSchema);

module.exports = user_checkins;
