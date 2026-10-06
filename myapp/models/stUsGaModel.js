const mongoose = require("mongoose");

const steamUserGameSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },

  appId: {
    type: String,
    required: true
  },
  name: {
    type: String,
  },
  playtimeForever: {
    type: Number,
    default: 0
  },
  playtimeWindowsForever: {
    type: Number,
    default: 0
  },
  playtimeMacForever: {
    type: Number,
    default: 0
  },
  playtimeLinuxForever: {
    type: Number,
    default: 0
  },
  playtimeDexForever: {
    type: Number,
    default: 0
  },
  rTimeLastPlayed: {
    type: Number,
    default: 0
  },
  playtimeDisconnected: {
    type: Number,
    default: 0
  },
  imgIconUrl: {
    type: String,
  },
  hasCommunityVisibleStats: {
    type: Boolean,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const SteamUserGames = mongoose.model("steam_user_game", steamUserGameSchema);

module.exports = SteamUserGames;
