const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
  appid: {
    type: Number,
    default: ""
  },
  signature_nonce: {
    type: String,
    default: ""
  },
  signature: {
    type: String,
    default: ""
  },
  stream_id: {
    type: String,
    default: ""
  },
  UserId: {
    type: String,
    default: ""
  },
  task_id: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Stream = mongoose.model("gamestreammixing_stop", streamSchema);

module.exports = Stream;
