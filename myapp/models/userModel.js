const mongoose = require("mongoose");

//TestStream user schema

const walletSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true
  },
  walletPrivateKey: {
    type: String,
    required: true
  },
  walletQRCode: {
    type: String,
    required: true
  },
  networkName: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  userName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },
  password: {
    type: String
  },
  bio: { type: String, default: "" },
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestStreamUser",
      default: null
    }
  ],
  purchases: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "payment",
      default: null
    }
  ],
  followersCount: {
    type: Number,
    default: 0
  },
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestStreamUser",
      default: null
    }
  ],
  followingCount: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ["user", "admin", "creator"],
    default: "user"
  },
  socialProviders: [Object],
  preferredGames: {
    type: [String],
    maxLength: 3
  },
  links: [
    {
      title: { type: String, default: "" },
      url: { type: String, default: "" }
    }
  ],
  signupType: {
    type: String,
    enum: ["normal", "gmail", "fb", "apple", "binance", "google"],
    default: "normal"
  },
  companyName: { type: String, default: "" },
  storeName: { type: String, default: "" },
  country: { type: String, default: "" },
  preferredCurrency: { type: String, default: "" },
  linkInstagram: { type: String, default: "" },
  linkX: { type: String, default: "" },
  linkYoutube: { type: String, default: "" },
  otherLink: { type: String, default: "" },
  portFolio: {
    links: [String],
    files: [String]
  },
  marketplaceCreationReason: { type: String, default: "" },
  previousPlatForm: [String],
  gamingTags: [String],
  tags: [String],
  profileImgUrl: { type: String, default: "" },
  coverImgUrl: { type: String, default: "" },
  signupOtp: { type: Number, default: 0 },
  loginOtp: { type: Number, default: 0 },
  reSigninOtp: { type: Number, default: 0 },
  resigninToken: { type: String, default: "" },
  emailVerification: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  push_token: {
    type: String,
    required: false,
    default: ""
  },
  device_type: {
    type: String,
    required: false,
    default: ""
  },
  walletAddress: {
    type: String,
    required: false,
    default: ""
  },
  walletQRCode: {
    type: String,
    required: false,
    default: ""
  },
  walletPrivateKey: {
    type: String,
    required: false,
    default: ""
  },

  walletDetails: [walletSchema],

  contractAddress: {
    type: String,
    required: false,
    default: ""
  },
  contractTransactionHash: {
    type: String,
    default: ""
  },
  qrCode: { type: String },
  steam: {
    steamId: {
      type: String,
      default: ""
    },
    displayName: {
      type: String,
      default: ""
    },
    profileUrl: {
      type: String,
      default: ""
    },
    avatar: {
      type: String,
      default: ""
    },
    realName: {
      type: String,
      default: ""
    },
    profileState: {
      type: Number
    },
    communityVisibilityState: {
      type: Number
    }
  }
});

userSchema.pre("save", async function (next) {
  this.followersCount = this.followers.length;
  this.followingCount = this.following.length;
  next();
});

const TestStreamUser = mongoose.model("TestStream_user", userSchema);

module.exports = TestStreamUser;
