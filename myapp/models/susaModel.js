const mongoose = require("mongoose");

const steamUserGameAssetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  gameId: {
    type: String,
    required: true
  },

  appId: {
    type: String,
    required: true
  },
  assetId: {
    type: String,
    required: true
  },
  classId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    default: 0,
  },
  iconUrl: { type:  String, default:  '' },
  iconUrlLarge: { type:  String, default:  '' },
  iconDragUrl: { type:  String, default:  '' },
  name: { type:  String, default:  '' },
  marketHashName: { type:  String, default:  '' },
  marketName: { type:  String, default:  '' },
  nameColor: { type:  String, default:  '' },
  backgroundColor: { type:  String, default:  '' },
  type: { type:  String, default:  '' },
  tradable: { type:  String, default:  '' },
  marketable: { type:  String, default:  '' },
  commodity: { type:  String, default:  '' },
  marketTradableRestriction: { type:  String, default:  '' },
  marketMarketableRestriction: { type:  String, default:  '' },
  fraudwarnings: { type:  String, default:  '' },
  descriptions: {type: Object},
  ownerDescriptions: { type:  String, default:  '' },
  tags: {type: Object},
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const SteamUserGameAssets = mongoose.model("steam_user_game_asset", steamUserGameAssetSchema);

/**
 * toJSON implementation
 */
steamUserGameAssetSchema.options.toJSON = {
  transform: function(doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret._v;
    return ret;
  }
};


module.exports = SteamUserGameAssets;
