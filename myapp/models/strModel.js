const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user",
    required: true
  },
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "streams",
    required: true
  },
  text: {
    type: String,
    default: ""
  },
  comment_like: {
    type: [String],
    default: []
  },
  comment_type: {
    type: String,
    default: "text"
  },
  image_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "stream_comments_images"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const stream_comment = mongoose.model("stream_comments", commentSchema);

module.exports = stream_comment;
