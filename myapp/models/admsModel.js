const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  userName: {
    type: String,
    trim: true,
    default: ""
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },
  password: { type: String, default: "" },
  profileImage: { type: String, default: "" },
  status: { type: Boolean, default: true },
  emailVerification: { type: Boolean, default: false },
  email_verified_at: { type: Date, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const adminModel = mongoose.model("admin_users", adminSchema);

module.exports = adminModel;
