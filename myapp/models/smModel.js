const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user",
    required: true
  },
  game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "games",
    default: null
  },
  video: {
    type: String,
    default: ""
  },
  stream_url: {
    type: String,
    default: ""
  },
  thumbnail: {
    type: String,
    default: ""
  },
  postProfile: {
    type: String,
    default: ""
  },
  title: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    default: ""
  },
  gameName: {
    type: String,
    default: ""
  },
  viewersCount: {
    type: Number,
    default: 0
  },
  streamStatus: {
    type: String,
    default: "archive"
  },
  likes: {
    type: Number,
    default: 0
  },
  stream_like: {
    type: [String],
    default: []
  },
  isLike: {
    type: Boolean,
    default: false
  },
  isLive: {
    type: Boolean,
    default: true
  },
  isHit: {
    type: Boolean,
    default: false
  },
  streamId: {
    type: Number,
    default: ""
  },
  roomId: {
    type: Number,
    default: ""
  },
  screenShareRoomId: {
    type: Number,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  streamType: {
    type: String,
    default: ""
  },
  streamToken: {
    type: String,
    default: ""
  },
  screenShareUserId: {
    type: String,
    default: ""
  },
  screenShareToken: {
    type: String,
    default: ""
  },
  stream_count: {
    type: String,
    default: ""
  },
  stream_viewers: {
    type: [String],
    default: []
  },
  videoDuration: {
    type: Number,
    default: 0
  },
  stream_duration: {
    type: String,
    default: "0"
  },
  stream_source: {
    type: String,
    default: "zegocloud"
  },
  video_url: {
    type: String,
    default: ""
  },
  thumbnail_url: {
    type: String,
    default: ""
  },
  stream_visibilty: {
    type: String,
     default: "public"
  },

  isDeleted: {
    type: Boolean,
    default: false
  },
schedule_date: {
    type: Date,
    default: ""
  },
  tournament_thumbnail: {
    type: String,
    default: ""
  }

});

streamSchema.index({ isLive: -1, createdAt: -1 });
const Stream = mongoose.model("stream", streamSchema);

module.exports = Stream;
