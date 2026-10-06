const axios = require("axios");
const _ = require("lodash");
const userModel = require("../models/userModel");
const steamUserGameModel = require("../models/steamUserGameModel");
const steamUserGameAssetModel = require("../models/steamUserGameAssetModel");

const getSteamOwnedGames = async (steamId, params = {}) => {
  return await axios.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/', {
    params: {
      key: process.env.STEAM_API_KEY,
      steamid: steamId,
      include_appinfo: true,
      format: 'json',
      ...params
    },
  });
}

const getSteamProfile = async (steamId, params = {}) => {
  return await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', {
    params: {
      key: process.env.STEAM_API_KEY,
      steamids: steamId,
      ...params,
    },
  });
}

const getSteamAssets = async (params = {}) => {
  return await axios.get('http://api.steampowered.com/ISteamEconomy/GetAssetClassInfo/v0001', {
    params: {
      key: process.env.STEAM_API_KEY,
      format: 'json',
      ...params,
    },
  });
}

const getOwnedGameAndSaveToDb = async (userId, steamId, params = {}, ignoreSave = false) => {
  const response = await getSteamOwnedGames(steamId);
  const gamesData = _.get(response, "data.response.games", []);
  const gameDict = Object.fromEntries(gamesData.map(el => [el?.appid, el]));
  const allGameIds = Object.keys(gameDict);
  if (!ignoreSave) {
    const existedGames = await steamUserGameModel.find({
      userId,
    }).exec();
    const existedGameIds = existedGames.map((el, index) => {
      const gameData = gameDict?.[el.appId];
      if (!gameData) {
        el.deleted = true;
        el.save();
        return el.appId
      }
      console.log(`Updating steam user game id ${el._id}: ... [${index + 1}/${existedGames.length}]`);
      el.name = gameData?.name || el.name;
      el.playtimeForever = gameData?.playtime_forever || el.playtimeForever;
      el.imgIconUrl = gameData?.img_icon_url || el.imgIconUrl;
      el.hasCommunityVisibleStats = gameData?.has_community_visible_stats || el.hasCommunityVisibleStats;
      el.playtimeWindowsForever = gameData?.playtime_windows_forever || el.playtimeWindowsForever;
      el.playtimeMacForever = gameData?.playtime_mac_forever || el.playtimeMacForever;
      el.playtimeLinuxForever = gameData?.playtime_linux_forever || el.playtimeLinuxForever;
      el.playtimeDexForever = gameData?.playtime_deck_forever || el.playtimeDexForever;
      el.rTimeLastPlayed = gameData?.rtime_last_played || el.rTimeLastPlayed;
      el.playtimeDisconnected = gameData?.playtime_disconnected || el.playtimeDisconnected;
      el.save()
      return el.appId
    });
    const newGameIds = allGameIds.filter(el => existedGameIds.indexOf(el) < 0);
    newGameIds.forEach((el, index) => {
      console.log(`Creating new steam user game: ... [${index + 1}/${newGameIds.length}]`)
      const gameData = gameDict[el];
      const obj = new steamUserGameModel({
        userId,
        appId: el,
        name: gameData?.name,
        playtimeForever: gameData?.playtime_forever,
        imgIconUrl: gameData?.img_icon_url,
        hasCommunityVisibleStats: gameData?.has_community_visible_stats,
        playtimeWindowsForever: gameData?.playtime_windows_forever,
        playtimeMacForever: gameData?.playtime_mac_forever,
        playtimeLinuxForever: gameData?.playtime_linux_forever,
        playtimeDexForever: gameData?.playtime_deck_forever,
        rTimeLastPlayed: gameData?.rtime_last_played,
        playtimeDisconnected: gameData?.playtime_disconnected,
      });
      obj.save();
    })
  }
  return {
    response,
    gameDict,
    allGameIds,
  }
}

const getSteamAssetsOfGame = async (steamId, appId, gameId, userId) => {
  console.log(`getSteamAssetsOfGame userId:${userId} appId:${appId}`);
  let gameSchemaItems = {}
  try{
    const gameSchemaItemsResponse = await axios.get(`https://steamcommunity.com/inventory/${steamId}/${appId}/2`);
    gameSchemaItems = _.get(gameSchemaItemsResponse.data, "assets", []);
  } catch (e) {
    console.log(`getSteamAssetsOfGame userId:${userId} appId:${appId} has error when call inventory: `, e.message);
    return
  }
  const assetDataDict = {};
  const gameClassIds = [...(new Set(gameSchemaItems.map(el => {
    assetDataDict[el.classid] = {
      assetId: el.assetid,
      amount: el.amount,
    };
    return el?.classid;
  })))];
  if (gameClassIds.length === 0) {
    console.log(`getSteamAssetsOfGame userId:${userId} appId:${appId} -> there no assets`);
    return
  }
  try {
    const gameAssetsResponse = await getSteamAssets({
      class_count: gameClassIds.length,
      appid: appId,
      ...Object.fromEntries(gameClassIds.map((el, id) => ([`classid${id}`, el]))),
    })
    const gameAssets = _.get(gameAssetsResponse.data, "result", {});
    if (gameAssets.success) {
      delete gameAssets.success;
    }
    const existedGameAssets = await steamUserGameAssetModel.find({
      userId,
      gameId,
    }).exec();
    const existedGameAssetIds = [];
    let index = 0;
    for (let el of existedGameAssets) {
      const gameAssetData = gameAssets?.[el.classId];
      const gameAssetExtData = assetDataDict?.[el.classId];
      if (!gameAssetData){
        el.amount = 0;
        await el.save();
        existedGameAssetIds.push(el.classId);
        continue;
      }
      console.log(`Updating steam user game asset id ${el._id}: ... [${index + 1}/${existedGameAssets.length}]`);
      el.name = gameAssetData?.name || el.name;
      el.iconUrl = gameAssetData?.icon_url || el.iconUrl;
      el.iconUrlLarge = gameAssetData?.icon_url_large || el.iconUrlLarge;
      el.iconDragUrl = gameAssetData?.icon_drag_url || el.iconDragUrl;
      el.marketHashName = gameAssetData?.market_hash_name || el.marketHashName;
      el.marketName = gameAssetData?.market_hash || el.marketName;
      el.nameColor = gameAssetData?.name_color || el.nameColor;
      el.backgroundColor = gameAssetData?.background_color || el.backgroundColor;
      el.type = gameAssetData?.type || el.type;
      el.tradable = gameAssetData?.tradable || el.tradable;
      el.marketable = gameAssetData?.marketable || el.marketable;
      el.commodity = gameAssetData?.commodity || el.commodity;
      el.marketTradableRestriction = gameAssetData?.playtime_disconnected || el.marketTradableRestriction;
      el.marketMarketableRestriction = gameAssetData?.playtime_disconnected || el.marketMarketableRestriction;
      el.fraudwarnings = gameAssetData?.fraudwarnings || el.fraudwarnings;
      el.descriptions = gameAssetData?.descriptions || el.descriptions;
      el.ownerDescriptions = gameAssetData?.owner_descriptions || el.ownerDescriptions;
      el.tags = gameAssetData?.tags || el.tags;
      el.assetId = gameAssetExtData?.assetId || el.assetId;
      el.amount = gameAssetExtData?.amount || el.amount;
      el.save()
      existedGameAssetIds.push(el.classId)
    }
    const newGameAssets = Object.values(gameAssets).filter(el => existedGameAssetIds.indexOf(el.classid) < 0);
    let newGameAssetIndex = 0;

    for (let newGameAsset of newGameAssets) {
      console.log(`Creating new steam user game: ... [${newGameAssetIndex + 1}/${newGameAssets.length}]`)
      const gameAssetData = gameAssets?.[newGameAsset.classid];
      const gameAssetExtData = assetDataDict?.[newGameAsset.classid];
      if (!gameAssetExtData || !gameAssetData) {
        continue;
      }
      const obj = new steamUserGameAssetModel({
        userId,
        appId,
        gameId,
        name: gameAssetData?.name,
        iconUrl : gameAssetData?.icon_url,
        iconUrlLarge : gameAssetData?.icon_url_large,
        iconDragUrl : gameAssetData?.icon_drag_url,
        marketHashName : gameAssetData?.market_hash_name,
        marketName : gameAssetData?.market_hash,
        nameColor : gameAssetData?.name_color,
        backgroundColor : gameAssetData?.background_color,
        type : gameAssetData?.type,
        tradable : gameAssetData?.tradable,
        marketable : gameAssetData?.marketable,
        commodity : gameAssetData?.commodity,
        marketTradableRestriction : gameAssetData?.playtime_disconnected,
        marketMarketableRestriction : gameAssetData?.playtime_disconnected,
        fraudwarnings : gameAssetData?.fraudwarnings,
        descriptions : gameAssetData?.descriptions,
        ownerDescriptions : gameAssetData?.owner_descriptions,
        tags : gameAssetData?.tags,
        classId : gameAssetData?.classid,
        assetId : gameAssetExtData?.assetId,
        amount : gameAssetExtData?.amount,
      });
      newGameAssetIndex += 1;
      await obj.save();
    }
  }catch (e) {
    console.log(`getSteamAssetsOfGame userId:${userId} appId:${appId} has error: `, e.message);
  }
}

const fetchAllUserSteamAssets = async (steamId, userId) => {
  const allGame = await steamUserGameModel.find({
    userId,
  }).exec();
  const executedAppIds = [];

  for (let game of allGame) {
    await getSteamAssetsOfGame(steamId, game.appId, game._id, userId);
    executedAppIds.push(game.appId);
  }
  const whitelistAppIds = [570];
  for (let whitelistAppId of whitelistAppIds) {
    if (executedAppIds.indexOf(whitelistAppId) > 0){
      continue;
    }
    await getSteamAssetsOfGame(steamId, whitelistAppId, "whitelist", userId);
  }
}

const getAllUserSteamAssets = async (userId) => {
  return await steamUserGameAssetModel.find({
    userId,
    amount: {$gt: 0},
  }).exec();
}

const getSteamUserAssetsTask = async () => {
  const allSteamUsers = await userModel.find({
    "steam.steamId": {
      $exists: true
    },
    "$expr": {
      "$ne": [
        {
          "$strLenCP": "$steam.steamId"
        },
        0
      ]
    }
  }).exec();
  for (let steamUser of allSteamUsers) {
    if (!steamUser?.steam?.steamId) continue
    await fetchAllUserSteamAssets(steamUser.steam.steamId, steamUser._user);
  }
}

module.exports = {
  getSteamProfile,
  getSteamOwnedGames,
  getOwnedGameAndSaveToDb,
  getSteamUserAssetsTask,
  getAllUserSteamAssets,
}