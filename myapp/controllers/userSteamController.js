require("dotenv").config();
const express = require("express");
const router = express.Router();
const userModel = require("../models/userModel");
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  error,
  requiredParams,
  internalError,
  success,
} = require("../commonFunctions/responses");
const {getSteamProfile, getOwnedGameAndSaveToDb, getAllUserSteamAssets} = require("../commonFunctions/steam");
const _ = require("lodash");
const {getSteamUserAssetsTask} = require("../commonFunctions/steam");

router.get('/profile', async (req, res) => {
  console.log('reached user steam profile')
  try{

    let isRequired = checkRequiredFields(['userId'],req.query);
    console.log({isRequired});

    if(isRequired){

      console.log('send required fields response');
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);

    }else{
      const userId = req.query.userId;
      if(userId){
        const steamUser = await userModel.findOne({_id:userId}).exec();
        if (steamUser && steamUser?.steam?.steamId) {
          const response = await getSteamProfile(steamUser.steam.steamId);
          const playerData = _.get(response, "data.response.players.0");
          steamUser.steam.displayName =  _.get(playerData, "personaname") || steamUser.steam.displayName;
          steamUser.steam.realName =  _.get(playerData, "personaname") || steamUser.steam.realName;
          steamUser.steam.profileUrl =  _.get(playerData, "profileurl") || steamUser.steam.profileurl;
          steamUser.steam.avatar =  _.get(playerData, "avatar") || steamUser.steam.avatar;
          steamUser.steam.profileState =  _.get(playerData, "profileState") || steamUser.steam.profileState;
          steamUser.steam.communityVisibilityState =  _.get(playerData, "communityvisibilitystate") || steamUser.steam.communityVisibilityState;
          await steamUser.save()
          const result = success('User steam profile', playerData)
          return res.json(result);
        } else {
          console.log('not a vaid steam user');
          let result = error('invalid steam user','invalid_steam_user');
          return res.json(result);
        }
      }else{
        console.log('not a vaid userid');
        let result = error('invalid user','invalid_user');
        return res.json(result);
      }
    }

  }catch(err){
    console.log({err});
    let response = internalError();
    return res.json(response);
  }
})

router.get('/owned-games', async (req, res) => {
  console.log('reached user steam owned games')
  try{

    let isRequired = checkRequiredFields(['userId'],req.query);
    console.log({isRequired});

    if(isRequired){

      console.log('send required fields response');
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);

    }else{
      const userId = req.query.userId;
      if(userId){
        const steamUser = await userModel.findOne({_id:userId}).exec();
        if (steamUser && steamUser?.steam?.steamId) {
          const {response} = await getOwnedGameAndSaveToDb(userId, steamUser.steam.steamId)
          const result = success('User steam owned games', _.get(response.data, 'response', {}))
          return res.json(result);
        } else {
          console.log('not a vaid steam user');
          let result = error('invalid steam user','invalid_steam_user');
          return res.json(result);
        }
      }else{
        console.log('not a vaid userid');
        let result = error('invalid user','invalid_user');
        return res.json(result);
      }
    }

  }catch(err){
    console.log({err});
    let response = internalError();
    return res.json(response);
  }
})

router.get('/assets', async (req, res) => {
  console.log('reached user steam assets')
  try{

    let isRequired = checkRequiredFields(['userId'],req.query);
    console.log({isRequired});

    if(isRequired){
      console.log('send required fields response');
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    }else {
      const userId = req.query.userId;
      if (userId) {
        const steamUser = await userModel.findOne({_id:userId}).exec();
        if (steamUser && steamUser?.steam?.steamId) {
          const allSteamUserGameAssets = await getAllUserSteamAssets(steamUser._id);
          const result = success('User steam game assets', {
            assets: allSteamUserGameAssets.map(el => el.toJSON()),
          })
          return res.json(result);
        } else {
          console.log('not a vaid steam user');
          let result = error('invalid steam user','invalid_steam_user');
          return res.json(result);
        }
      } else{
      console.log('not a vaid userid');
      let result = error('invalid user','invalid_user');
      return res.json(result);
    }
    }
  }catch(err){
    console.log({err});
    let response = internalError();
    return res.json(response);
  }
});

router.post('/request-fetch-assets', async (req, res) => {
  try {
    await getSteamUserAssetsTask();
    return res.json(success('Request sent'));
  }catch (e) {
    console.log('request-fetch-assets failed :', e)
    return res.json({success: false});
  }
})
module.exports = router;
