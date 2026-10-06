const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_user",
    required: true
  },
  url: {
    type: String,
    default: ""
  },
  key: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    default: "1"
  },
  imaage_favourite: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const stream_comment = mongoose.model("stream_comments_images", commentSchema);

module.exports = stream_comment;
