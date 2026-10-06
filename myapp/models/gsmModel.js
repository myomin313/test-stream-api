const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
  appid: {
    type: String,
    default: ""
  },
  event: {
    type: String,
    default: ""
  },
  seq: {
    type: Number,
    default: ""
  },
  task_id: {
    type: String,
    default: ""
  },
  channel_id: {
    type: String,
    default: ""
  },
  publish_id: {
    type: String,
    default: ""
  },
  mix_url: {
    type: String,
    default: ""
  },
  mix_stream_alias: {
    type: String,
    default: ""
  },
  rtmp_urls: [String],
  hls_urls: [String],
  hdl_urls: [String],
  stream_alias: {
    type: String,
    default: ""
  },
  timestamp: {
    type: Number,
    default: ""
  },
  nonce: {
    type: String,
    default: ""
  },
  signature: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Stream = mongoose.model("gamestreammixing", streamSchema);

module.exports = Stream;
