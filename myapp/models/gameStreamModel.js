const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
  user_id: {
    type: String,
    default: ""
  },
  stream_sid: {
    type: String,
    default: ""
  },
  type: {
    type: String,
    default: ""
  },
  channel_id: {
    type: String,
    default: ""
  },
  stream_alias: {
    type: String,
    default: ""
  },
  publish_id: {
    type: String,
    default: ""
  },
  publish_name: {
    type: String,
    default: ""
  },
  rtmp_url: [String],
  hls_url: [String],
  hdl_url: [String],
  pic_url: [String],
  create_time: {
    type: String,
    default: ""
  },
  timestamp: {
    type: String,
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
  extra_info: {
    type: String,
    default: ""
  },
  appid: {
    type: String,
    default: ""
  },
  event: {
    type: String,
    default: ""
  },
  stream_id: {
    type: String,
    default: ""
  },
  stream_seq: {
    type: String,
    default: ""
  },
  room_id: {
    type: String,
    default: ""
  },
  recreate: {
    type: String,
    default: ""
  },
  user_name: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Stream = mongoose.model("gamestream", streamSchema);

module.exports = Stream;
