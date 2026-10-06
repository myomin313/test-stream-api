const mongoose = require("mongoose");

const chatFileSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_users",
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestStream_users",
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
  size: {
    type: Number,
    default: 0
  },
  fileType: {
    type: String,
    default: ""
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
const chat_files = mongoose.model("chat_files", chatFileSchema);

module.exports = chat_files;
