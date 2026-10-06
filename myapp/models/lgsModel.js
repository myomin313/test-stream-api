const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  request: {
    type: Object,
    required: true
  },
  response: {
    type: Object,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("api_logs", logSchema);
