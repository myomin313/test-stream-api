const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  game_name: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    default: ""
  },
  file_url: {
    type: String,
    default: ""
  },
  thumbnail_url: {
    type: String,
    default: ""
  },
  game_status: {
    type: String,
    default: "1"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const games_schema = mongoose.model("games", gameSchema);

module.exports = games_schema;
