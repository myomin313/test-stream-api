const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
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
  text: {
    type: String,
    default: ""
  },
  messageType: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    default: ""
  },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "chat_files"
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
const chat = mongoose.model("chat", chatSchema);

module.exports = chat;
