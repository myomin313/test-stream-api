const express = require("express");
const router = express.Router();
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  error,
  requiredParams,
  internalError,
  notFound
} = require("../commonFunctions/responses");
const {
  authentication,
  authentication_email_exists
} = require("../commonFunctions/functions");
const axios = require("axios");
const UserModel = require("../models/userModel");
const streamcommentModel = require("../models/strModel");
const streamModel = require("../models/smModel");
const gamestreamModel = require("../models/gameStreamModel");
const gameStreamMixingModel = require("../models/gsmModel");
const gameStreamMixingStopModel = require("../models/gsmxpModel");
const streamImage = require("../models/striModel");
const gamesModel = require("../models/gmsModel");
var https = require("https");
const { generateToken04 } = require("../config/zegoSvrAss");
const config = require("../config");
const secretName = config.secretNames[config.env];
const { callAPI, getSecretValue } = require("../commonFunctions/apihelper");

const fs = require("fs");
const ffmpegPath = "/usr/local/bin/ffmpeg";
const ffmpeg = require("fluent-ffmpeg");
// const axios = require("axios");
ffmpeg.setFfmpegPath(ffmpegPath);
const crypto = require("crypto");
const request = require("request");

const mongoose = require("mongoose");
const AWS = require("aws-sdk");
const path = require("path");
const s3 = new AWS.S3({
  signatureVersion: "v4",
  accessKeyId: "",
  secretAccessKey: ""
});

const serverSecret = process.env.ZEGO_CLOUD_SERVERSECRET;

router.post("/create", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/create", req.body);
  const secretValue = await getSecretValue(secretName);
  try {
    let requiredFields = ["userId", "title", "description"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, title, description } = req.body;
      console.log("userId", userId);
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        var video,
          postProfile,
          likes,
          isLike,
          isLive,
          isHit,
          streamId,
          roomId,
          streamType = "";
        video = req.body.video;
        postProfile = req.body.postProfile;
        likes = req.body.likes;
        isLike = req.body.isLike;
        isLive = req.body.isLive;
        isHit = req.body.isHit;
        streamId = req.body.streamId;
        roomId = req.body.roomId;
        streamType = req.body.streamType;

        let stream = new streamModel({
          userId: userId,
          title: title,
          description: description,
          video: video,
          postProfile: postProfile,
          likes: likes,
          isLike: isLike,
          isLive: isLive,
          isHit: isHit,
          streamId: streamId,
          roomId: roomId,
          streamType: streamType
        });
        let fcm_token = [];
        let fcm_tokens = [];
        let UserDetails = await UserModel.find(
          { isDeleted: false, push_token: { $ne: null } },
          "push_token"
        )
          .sort({ createdAt: -1 })
          .exec();
        Object.keys(UserDetails).forEach(function (key) {
          console.log("Key:", key, "Value:", UserDetails[key]["push_token"]);
          console.log(
            "UserDetails[key]['push_token'].length",
            UserDetails[key]["push_token"].length
          );
          if (UserDetails[key]["push_token"].trim().replace(/\s+/g, "").length == 0) {
            fcm_tokens.push(UserDetails[key]["push_token"]);
          } else if (
            UserDetails[key]["push_token"].length != 0 &&
            UserDetails[key]["push_token"] != "" &&
            UserDetails[key]["push_token"] != null
          ) {
            fcm_token.push(UserDetails[key]["push_token"]);
          }
        });
        let streamresult = await stream.save();
        let streamData = await streamresult.toObject();
        console.log("newpostData", streamData);
        streamData.fcm_token = fcm_token;
        streamData = JSON.stringify(streamData);
        console.log("streamData", streamData);

        streamresult.fcm_token = fcm_token;
        const postData = streamData;
        const options = {
          hostname: secretValue.SOCKET_DOMAIN,
          port: secretValue.SOCKET_PORT,
          path: "/createStream",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        };
        // Make the HTTPS POST request
        const reqs = https.request(options, (res) => {
          let data = "";

          // Accumulate the response data
          res.on("data", (chunk) => {
            data += chunk;
          });

          // Process the response data when it ends
          res.on("end", () => {
            console.log(data);
          });
        });

        // Handle errors
        reqs.on("error", (error) => {
          console.error("Error making HTTPS request:", error);
        });

        // Write the request body
        reqs.write(postData);

        // End the request
        reqs.end();
        const result = success("Stream created successfully.", streamresult);
        return res.json(result);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/web/create", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/web/create", req.body);
  try {
    let requiredFields = [
      "userId",
      "roomId",
      "screenShareRoomId",
      "streamId",
      "title",
      "description"
    ];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const {
        userId,
        roomId,
        screenShareRoomId,
        streamId,
        title,
        description,
        streamStatus,
        game_Id,
        stream_source
      } = req.body;
      // console.log("userId", userId, "streamId", streamId, "roomId", roomId);
      // console.log("req.body", game_Id);
      let userInfo = UserModel.findOne({ _id: userId }).exec();

      if (userInfo) {
        var video,
          postProfile,
          likes,
          isLike,
          isLive,
          isHit,
          streamType = "";
        video = req.body.video;
        postProfile = req.body.postProfile;
        likes = req.body.likes;
        isLike = req.body.isLike;
        isLive = req.body.isLive;
        if (typeof req.body.isHit !== "undefined" && req.body.isHit !== null) {
          isHit = req.body.isHit === "true"; // Convert the string to a boolean value
        } else {
          isHit = false; // Set a default value if req.body.isHit is undefined or null
        }
        streamType = req.body.streamType;
        const stream_token = generateStreamToken(userId, roomId);
        const screenShareUserId = userId + "+1"; // Concatenating "+1" with userId
        const screenShare_token = generateStreamToken(
          screenShareUserId,
          screenShareRoomId
        );
        var thumbnail_urls;
        // eslint-disable-next-line no-constant-binary-expression
        if (typeof stream_source != "undefined" && stream_source == "local") {
          const secretValue = await getSecretValue(secretName);
          const bucket = secretValue.S3_BUCKET;
          console.log({ bucket });
          const videoUrl = req.body.videoUrl;
          const bucketName = bucket;
          let checkdata = getBucketNameFromS3Url(video);
          console.log({ checkdata });
          const fileName = video.split("/").pop();
          const s3VideoKey = fileName;
          const fileCheck = video?.split("/").pop();
          // const localVideoPath = "/tmp/input-video.mp4";
          // const localThumbnailPath = "/tmp/thumbnail.jpg";
          // const localCompressedPath = "/tmp/compressed-video.mp4";
          const tempDir = secretValue?.TMP_PATH;
          const localVideoPath = `${tempDir}/input-video.mp4`;
          const localThumbnailPath = `${tempDir}/thumbnail.jpg`;
          const localCompressedPath = `${tempDir}/compressed-video.mp4`;
          var keypath;
          if (config.env === "development") {
            keypath = "reels_dev/" + s3VideoKey;
          } else if (config.env === "staging") {
            keypath = "reel_stag/" + s3VideoKey;
          } else if (config.env === "production") {
            keypath = "reels_production/" + s3VideoKey;
          }

          await downloadFromS3(s3VideoKey, localVideoPath, checkdata);
          await processVideo(
            localVideoPath,
            localCompressedPath,
            localThumbnailPath,
            checkdata
          );
          let thumbnail_url = await uploadToS3(localThumbnailPath, keypath, checkdata);
          thumbnail_urls = thumbnail_url?.Location;
          console.log({ thumbnail_urls });
        }
        let stream = new streamModel({
          userId: userId,
          title: title,
          description: description,
          video: video,
          postProfile: postProfile,
          likes: likes,
          isLike: isLike,
          isLive: isLive,
          isHit: isHit,
          streamId: streamId,
          roomId: roomId,
          screenShareRoomId: screenShareRoomId,
          streamType: streamType,
          streamToken: stream_token,
          screenShareUserId: screenShareUserId,
          screenShareToken: screenShare_token,
          streamStatus: streamStatus,
          game_id: game_Id,
          thumbnail_url: thumbnail_urls
        });
        let streamresult = await stream.save();
        // console.log(streamresult, "streamresult");

        // const stream_token = generateStreamToken(userId, roomId);
        // const screenShareUserId = userId + "+1"; // Concatenating "+1" with userId
        // const screenShare_token = generateStreamToken(screenShareUserId, screenShareRoomId);
        // console.log("stream_token", stream_token);
        // console.log("screenShare_token", screenShare_token);

        const result = success("web Stream created successfully.", {
          stream: streamresult,
          tokens: {
            stream_token: stream_token,
            screenShare_token: screenShare_token,
            screenShareUserId: screenShareUserId
          }
        });

        return res.json(result);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/generatetoken", async (req, res) => {
  console.log("Received request:", req.body);
  try {
    // Extract appID and serverSecret from request body
    const {
      appID,
      serverSecret,
      userId,
      effectiveTimeInSeconds = 3600,
      payload = ""
    } = req.body;

    // Check if appID and serverSecret are provided
    if (!appID || !serverSecret) {
      return res.status(400).send("appID and serverSecret are required");
    }

    // Generate the token using the provided details
    const token = generateToken04(
      appID,
      userId,
      serverSecret,
      effectiveTimeInSeconds,
      payload
    );

    console.log("Generated token:", token);

    // Send the generated token in the response
    res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).send("Internal server error");
  }
});

router.post("/tournament/update", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let requiredFields = ["streamingId",
      "userId",
      "title",
      "description",
      "stream_visibilty",
      "schedule_date",
      "tournement_thubnail",
      "streamStatus"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const { userId, title, description, streamingId, stream_visibilty, schedule_date, tournement_thubnail, streamStatus } = req.body;
      let streamInfo = await streamModel.findOne({ _id: streamingId }).exec();
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      console.log("test", req.body);
      if (streamInfo) {
        if (userInfo) {
          const filter = { _id: streamingId };
          var streamType = "tournament";
          var thumbnail_urls = (tournement_thubnail != "" ? tournement_thubnail : "");
          const update = {
            userId: userId,
            title: title,
            description: description,
            streamStatus: streamStatus,
            stream_visibilty: stream_visibilty,
            schedule_date: schedule_date,
            tournement_thubnail: thumbnail_urls,
            streamType: streamType
          };
          let result = await streamModel.findOneAndUpdate(filter, update);
          let results = success("stream details updated", { streamingId: result._id });
          return res.json(results);
        } else {
          let result = error("user not found", "user_not_found");
          return res.json(result);
        }
      } else {
        let result = error("streaming id not found", "streming_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/tournament/delete", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let requiredFields = ["streamingId",
      "userId"
    ];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const { userId, title, description, streamingId, stream_visibilty, schedule_date, tournement_thubnail, streamStatus } = req.body;
      let streamInfo = await streamModel.findOne({ _id: streamingId }).exec();
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      console.log("test", req.body);
      if (streamInfo) {
        if (userInfo) {
          const filter = { _id: streamingId };
          var streamType = "tournament";
          var thumbnail_urls = (tournement_thubnail != "" ? tournement_thubnail : "");
          const update = {
            isDeleted: true
          };
          let result = await streamModel.findOneAndUpdate(filter, update);
          let results = success("stream details deleted successfully", { streamingId: result._id });
          return res.json(results);
        } else {
          let result = error("user not found", "user_not_found");
          return res.json(result);
        }
      } else {
        let result = error("streaming id not found", "streming_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});


router.get("/tournament/list", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }

  console.log("Listing Streams", req.query);

  try {
    let isRequired = checkRequiredFields(["userId"], req.query);
    let streamDetails;
    const queryCondition = { streamType: "tournament" };
    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const userId = req.query.userId;

      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      console.log({ userInfo });

      if (userInfo) {
        if (req.query.page && req.query.limit) {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const skip = (page - 1) * limit;

          streamDetails = await streamModel
            .find(queryCondition)
            .sort({ createdAt: -1 }) // Sort by isLive first, then by createdAt
            .skip(skip)
            .limit(limit)
            .populate({ path: "userId", select: "userName" })
            .exec();
          console.log("StreamDetailsStreamDetails", streamDetails);
          let streamsWithCommentCount = await Promise.all(
            streamDetails.map((stream) => {
              return {
                ...stream.toObject(), // Convert Mongoose document to plain JS object
                viewersCount: stream.stream_viewers.length, // Add a new field with the count of the comments array
                userName:
                  stream?.userId != null && stream?.userId?.userName != ""
                    ? stream?.userId?.userName
                    : "",
                userId:
                  stream?.userId != null && stream.userId?._id != ""
                    ? stream.userId?._id
                    : ""
              };
            })
          );
          console.log("streamsWithCommentCount", streamsWithCommentCount);
          let StreamDetailscount = await streamModel
            .countDocuments(queryCondition)
            .sort({ createdAt: -1 }) // Sort by isLive first, then by createdAt
            .exec();
          streamsWithCommentCount.stream_count = await StreamDetailscount;
          if (streamsWithCommentCount.length > 0) {
            const result = success("Stream list retrieval success", {
              stream_details: streamsWithCommentCount
            });
            return res.json(result);
          } else {
            const result = success("Stream list retrieval success", {
              stream_details: streamsWithCommentCount
            });
            return res.json(result);
            // const result = notFound("There is no stremaing available", "stream_empty");
            // return res.json(result);
          }
        } else {
          streamDetails = await streamModel
            .find(queryCondition)
            .sort({ createdAt: -1 }) // Sort by isLive first, then by createdAt
            .populate({ path: "userId", select: "userName" })
            .exec();
          console.log("StreamDetailsStreamDetails", streamDetails);
        }

        let streamsWithCommentCount = await Promise.all(
          streamDetails.map((stream) => {
            console.log("stream.userId.userName", stream?.userId);
            return {
              ...stream.toObject(), // Convert Mongoose document to plain JS object
              viewersCount: stream.stream_viewers.length, // Add a new field with the count of the comments array
              userName:
                stream?.userId != null && stream?.userId?.userName != ""
                  ? stream?.userId?.userName
                  : "",
              userId:
                stream?.userId != null && stream.userId?._id != ""
                  ? stream.userId?._id
                  : ""
            };
          })
        );

        let StreamDetailscount = await streamModel
          .countDocuments({ streamType: "Active", isDeleted: false })
          .sort({ createdAt: -1 }) // Sort by isLive first, then by createdAt
          .exec();
        streamsWithCommentCount.stream_count = await StreamDetailscount;
        console.log("streamsWithCommentCount12", streamsWithCommentCount);
        if (streamsWithCommentCount.length > 0) {
          const result = success("Stream list retrieval success", {
            stream_details: streamsWithCommentCount
          });
          return res.json(result);
        } else {
          const result = notFound("There is no stremaing available", "stream_empty");
          return res.json(result);
        }
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

function generateStreamToken(userId, roomId) {
  const streamuserId = userId;
  let appID = 1288100244;
  const effectiveTimeInSeconds = 3600;
  const payloadObject = {
    room_id: roomId,
    privilege: {
      1: 1, // loginRoom: 1 pass , 0 not pass
      2: 1 // publishStream: 1 pass , 0 not pass
    },
    stream_id_list: null
  };
  const payload = JSON.stringify(payloadObject);

  // Assuming generateToken04 is defined elsewhere
  const token = generateToken04(
    appID,
    streamuserId,
    serverSecret,
    effectiveTimeInSeconds,
    payload
  );

  return token;
}

function GenerateSignature(appId, signatureNonce, serverSecret, timeStamp) {
  const hash = crypto.createHash("md5");
  var str = appId + signatureNonce + serverSecret + timeStamp;
  hash.update(str);
  return hash.digest("hex");
}

router.post("/stream/tokencreate", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  let requiredFields = ["userId", "roomId"];
  let isRequired = checkRequiredFields(requiredFields, req.body);

  if (isRequired) {
    console.log("param missing, send required fields response");
    let response = requiredParams(isRequired);
    return res.json(response);
  } else {
    const user = req.body.userId;
    let check_userId = await UserModel.findOne({ _id: user }).exec();

    if (check_userId) {
      const user1 = req.body.userId + 1;

      const roomId = req.body.roomId;
      const token = generateStreamToken(user1, roomId);

      const result = success("token created successfully.", {
        token: token,
        userId: user1
      });
      return res.json(result);
    } else {
      let result = error("user not found", "user_not_found");
      return res.json(result);
    }
  }
});

router.post("/stream/playback", async (req, res) => {
  const secretValue = await getSecretValue(secretName);
  console.log("stream/playback", req.body);
  try {
    let requiredFields = ["stream_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const { stream_id } = req.body;
      if (stream_id?.length > 23) {
        const delimiter = "-";
        let stream_details = stream_id.split(delimiter);
        let streamInfo = await streamModel.findOne({ _id: stream_details[0] }).exec();
        if (streamInfo) {
          // var stream_url = "";

          // stream_url = req.body.replay_url;
          // let filter = { _id: stream_details[0] };

          // const update = {
          //   stream_url: stream_url,
          //   stream_count:
          //     typeof stream_details[1] != "undefined" && stream_details[1]?.length != ""
          //       ? "3"
          //       : "1"
          // };

          // let result = await streamModel.findOneAndUpdate(filter, update);
          // let results = success("stream details updated", { streamingId: result._id });
          var stream_url = "";
          let result;
          let results;
          if (streamInfo?.stream_url == "") {
            stream_url = req.body.replay_url;
            let filter = { _id: stream_details[0] };

            const update = {
              stream_url: stream_url,
              video: stream_url,
              stream_count:
                typeof stream_details[1] != "undefined" && stream_details[1]?.length != ""
                  ? "3"
                  : "1"
            };

            result = await streamModel.findOneAndUpdate(filter, update);
            results = success("stream details updated", { streamingId: result._id });
          } else if (
            typeof stream_details[1] != "undefined" &&
            stream_details[1]?.length != ""
          ) {
            stream_url = req.body.replay_url;
            let filter = { _id: stream_details[0] };

            const update = {
              stream_url: stream_url,
              video: stream_url,
              stream_count:
                typeof stream_details[1] != "undefined" && stream_details[1]?.length != ""
                  ? "3"
                  : "1"
            };

            result = await streamModel.findOneAndUpdate(filter, update);
            results = success("stream details updated", { streamingId: result._id });
          }
          let fcm_token = [];
          let fcm_tokens = [];
          let UserDetails = await UserModel.find(
            { isDeleted: false, push_token: { $ne: null } },
            "push_token"
          )
            .sort({ createdAt: -1 })
            .exec();
          Object.keys(UserDetails).forEach(function (key) {
            if (UserDetails[key]["push_token"].trim().replace(/\s+/g, "").length == 0) {
              fcm_tokens.push(UserDetails[key]["push_token"]);
            } else if (
              UserDetails[key]["push_token"].length != 0 &&
              UserDetails[key]["push_token"] != "" &&
              UserDetails[key]["push_token"] != null
            ) {
              fcm_token.push(UserDetails[key]["push_token"]);
            }
          });
          let streamLatestInfo = await streamModel
            .findOne({ _id: stream_details[0] })
            .exec();
          let streamData = await streamLatestInfo.toObject();
          streamData.fcm_token = fcm_token;

          streamData = JSON.stringify(streamData);
          const postData = streamData;
          const options = {
            hostname: secretValue.SOCKET_DOMAIN,
            port: secretValue.SOCKET_PORT,
            path: "/streaming_palyback_response", // Replace with the endpoint you want to trigger
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            }
          };
          // Make the HTTPS POST request
          const reqs = https.request(options, (res) => {
            let data = "";

            // Accumulate the response data
            res.on("data", (chunk) => {
              data += chunk;
            });

            // Process the response data when it ends
            res.on("end", () => {
              console.log(data);
            });
          });

          // Handle errors
          reqs.on("error", (error) => {
            console.error("Error making HTTPS request:", error);
          });

          // Write the request body
          reqs.write(postData);

          // End the request
          reqs.end();
          return res.json(results);
        } else {
          let result = error("streaming id not found", "streming_id_not_found");
          return res.json(result);
        }
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/gamestream/start", async (req, res) => {
  console.log("/gamestream/start", req.body);
  try {
    let requiredFields = ["stream_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const {
        stream_sid,
        channel_id,
        title,
        stream_alias,
        publish_id,
        publish_name,
        rtmp_url,
        hls_url,
        hdl_url,
        pic_url,
        create_time,
        timestamp,
        nonce,
        signature,
        extra_info,
        appid,
        event,
        stream_id,
        stream_seq,
        room_id,
        recreate,
        user_id,
        user_name
      } = req.body;
      let gamrestream = new gamestreamModel({
        stream_sid: stream_sid,
        channel_id: channel_id,
        title: title,
        stream_alias: stream_alias,
        publish_id: publish_id,
        publish_name: publish_name,
        rtmp_url: rtmp_url,
        hls_url: hls_url,
        hdl_url: hdl_url,
        pic_url: pic_url,
        create_time: create_time,
        timestamp: timestamp,
        nonce: nonce,
        signature: signature,
        extra_info: extra_info,
        appid: appid,
        event: event,
        stream_id: stream_id,
        stream_seq: stream_seq,
        room_id: room_id,
        recreate: recreate,
        user_id: user_id,
        user_name: user_name
      });
      await gamrestream.save();
      return res.json(1);
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/tournament/recording_status", async (req, res) => {
  console.log("/tournament/recording_status", req.body);
  try {
    let requiredFields = ["room_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      // const {
      //   stream_sid,
      //   channel_id,
      //   title,
      //   stream_alias,
      //   publish_id,
      //   publish_name,
      //   rtmp_url,
      //   hls_url,
      //   hdl_url,
      //   pic_url,
      //   create_time,
      //   timestamp,
      //   nonce,
      //   signature,
      //   extra_info,
      //   appid,
      //   event,
      //   stream_id,
      //   stream_seq,
      //   room_id,
      //   recreate,
      //   user_id,
      //   user_name
      // } = req.body;
      // let gamrestream = new gamestreamModel({
      //   stream_sid: stream_sid,
      //   channel_id: channel_id,
      //   title: title,
      //   stream_alias: stream_alias,
      //   publish_id: publish_id,
      //   publish_name: publish_name,
      //   rtmp_url: rtmp_url,
      //   hls_url: hls_url,
      //   hdl_url: hdl_url,
      //   pic_url: pic_url,
      //   create_time: create_time,
      //   timestamp: timestamp,
      //   nonce: nonce,
      //   signature: signature,
      //   extra_info: extra_info,
      //   appid: appid,
      //   event: event,
      //   stream_id: stream_id,
      //   stream_seq: stream_seq,
      //   room_id: room_id,
      //   recreate: recreate,
      //   user_id: user_id,
      //   user_name: user_name
      // });
      // await gamrestream.save();
      return res.json(1);
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/gamestream/stop", async (req, res) => {
  console.log("/gamestream/stop", req.body);
  try {
    let requiredFields = ["stream_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const {
        stream_sid,
        type,
        channel_id,
        stream_alias,
        timestamp,
        nonce,
        signature,
        appid,
        event,
        stream_id,
        stream_seq,
        room_id,
        user_id,
        user_name
      } = req.body;
      let streamInfo = await gamestreamModel.findOne({ stream_sid: stream_sid }).exec();
      if (streamInfo) {
        const filter = { stream_sid: stream_sid };
        const update = {
          type: type,
          channel_id: channel_id,
          stream_alias: stream_alias,
          timestamp: timestamp,
          nonce: nonce,
          signature: signature,
          appid: appid,
          event: event,
          stream_id: stream_id,
          stream_seq: stream_seq,
          room_id: room_id,
          user_id: user_id,
          user_name: user_name
        };
        await gamestreamModel.findOneAndUpdate(filter, update);

        return res.json(1);
      } else {
        let result = error("streaming sid not found", "stream_sid_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});
router.post("/gamestream_mixing/start", async (req, res) => {
  console.log("/gamestream_mixing/start", req.body);
  try {
    // return res.json({status:'success'});
    const {
      appid,
      event,
      seq,
      task_id,
      channel_id,
      publish_id,
      mix_url,
      mix_stream_alias,
      rtmp_urls,
      hls_urls,
      hdl_urls,
      stream_alias,
      timestamp,
      nonce,
      signature
    } = req.body;
    let gamrestream = new gameStreamMixingModel({
      appid: appid,
      event: event,
      seq: seq,
      task_id: task_id,
      channel_id: channel_id,
      publish_id: publish_id,
      mix_url: mix_url,
      mix_stream_alias: mix_stream_alias,
      rtmp_urls: rtmp_urls,
      hls_urls: hls_urls,
      hdl_urls: hdl_urls,
      stream_alias: stream_alias,
      timestamp: timestamp,
      nonce: nonce,
      signature: signature
    });
    await gamrestream.save();
    return res.json(1);
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});
router.post("/gamestream_mixing/stop", async (req, res) => {
  console.log("/gamestream_mixing/stop", req.body);
  try {
    let requiredFields = ["stream_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const {
        stream_sid,
        type,
        channel_id,
        stream_alias,
        timestamp,
        nonce,
        signature,
        appid,
        event,
        stream_id,
        stream_seq,
        room_id,
        user_id,
        user_name
      } = req.body;
      let streamInfo = await gamestreamModel.findOne({ stream_sid: stream_sid }).exec();
      if (streamInfo) {
        const filter = { stream_sid: stream_sid };
        const update = {
          type: type,
          channel_id: channel_id,
          stream_alias: stream_alias,
          timestamp: timestamp,
          nonce: nonce,
          signature: signature,
          appid: appid,
          event: event,
          stream_id: stream_id,
          stream_seq: stream_seq,
          room_id: room_id,
          user_id: user_id,
          user_name: user_name
        };
        await gamestreamModel.findOneAndUpdate(filter, update);
        return res.json(1);
      } else {
        let result = error("streaming sid not found", "stream_sid_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/gamestream_mixing/test", async (req, res) => {
  console.log("/gamestream_mixing/stop", req.body);
  try {
    let abcd = [
      "Valorant",
      "Overwatch",
      "Apex Legend",
      "PUBG",
      "Arena of Valor",
      "Counter-Strike:Global Offensive (CS:GO)",
      "GTA 5",
      "Minecraft",
      "Destiny 2",
      "Breaking Bad",
      "RESIDENT EVIL",
      "Resident Evil 2",
      "Warhammer 40K",
      "Grand Theft Auto IV",
      "Halo 3",
      "XDefiant",
      "Call of Duty",
      "League of Legends",
      "Palworld",
      "Roblox",
      "Battlebit",
      "Honkai",
      "War Thunder",
      "RUST",
      "MLBB",
      "Diablo"
    ];
    abcd.map((stream) => {
      console.log("SSSS", stream);
      let gamesModelval = new gamesModel({
        game_name: stream
      });
      let streamresult = gamesModelval.save();
      console.log({ streamresult });
    });

    // console.log({ sid });
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/stream/gamestream_mixing", async (req, res) => {
  console.log("/stream/gamestream_mixing", "/stream/gamestream_mixing");
  let appId = 1288100244;
  try {
    let requiredFields = ["f_stream_id", "s_stream_id", "user_id", "task_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);
    const { user_id, f_stream_id, s_stream_id, task_id } = req.body;
    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      var signatureNonce = crypto.randomBytes(8).toString("hex");
      var timeStamp = Math.round(Date.now() / 1000);
      var sig = GenerateSignature(appId, signatureNonce, serverSecret, timeStamp);
      let gamrestream = new gameStreamMixingStopModel({
        appid: appId,
        stream_id: f_stream_id,
        signature_nonce: signatureNonce,
        signature: sig,
        task_id: task_id,
        UserId: user_id
      });
      await gamrestream.save();
      var url = `https://rtc-api.zego.im/?Action=StartMix&AppId=${appId}&SignatureNonce=${signatureNonce}&Timestamp=${timeStamp}&Signature=${sig}&SignatureVersion=2.0&IsTest=false`;
      var body = {
        TaskId: task_id,
        Sequence: 123,
        UserId: user_id,
        MixInput: [
          {
            StreamId: f_stream_id,
            RectInfo: {
              Top: 70,
              Bottom: 160,
              Left: 100,
              Right: 260
            }
          },
          {
            StreamId: s_stream_id,
            RectInfo: {
              Top: 200,
              Bottom: 290,
              Left: 100,
              Right: 260
            }
          }
        ],
        MixOutput: [
          {
            StreamId: f_stream_id + "-stream3",
            Width: 360,
            Height: 360,
            VideoBitrate: 1200000,
            Fps: 15,
            SoundChannel: 2
          }
        ]
      };

      request(
        {
          url: url,
          method: "POST",
          json: true,
          headers: {
            "content-type": "application/json"
          },
          body: body
        },
        function (error, response, body) {
          if (!error && response.statusCode === 200) {
            return res.json(body);
          }
        }
      );
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/stream/gamestream_mixing_stop", async (req, res) => {
  const secretValue = await getSecretValue(secretName);
  console.log("/stream/gamestream_mixing_stop", "/stream/gamestream_mixing_stop");
  let appId = 1288100244;
  try {
    let requiredFields = ["stream_id", "timestamp"];

    let isRequired = checkRequiredFields(requiredFields, req.body);
    const { stream_id } = req.body;
    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let streamInfo = await gameStreamMixingStopModel
        .findOne({ stream_id: stream_id })
        .exec();
      console.log({ streamInfo });
      const postData = JSON.stringify(streamInfo);
      const options = {
        hostname: secretValue.SOCKET_DOMAIN,
        port: secretValue.SOCKET_PORT,
        path: "/stream_processing_response", // Replace with the endpoint you want to trigger
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      };
      // Make the HTTPS POST request
      const reqs = https.request(options, (res) => {
        let data = "";

        // Accumulate the response data
        res.on("data", (chunk) => {
          data += chunk;
        });

        // Process the response data when it ends
        res.on("end", () => {
          console.log(data);
        });
      });

      // Handle errors
      reqs.on("error", (error) => {
        console.error("Error making HTTPS request:", error);
      });

      // Write the request body
      reqs.write(postData);

      // End the request
      reqs.end();

      var signatureNonce = crypto.randomBytes(8).toString("hex");
      var timeStamp = Math.round(Date.now() / 1000);
      var sig = GenerateSignature(appId, signatureNonce, serverSecret, timeStamp);
      var url = `https://rtc-api.zego.im/?Action=StopMix&AppId=${appId}&SignatureNonce=${signatureNonce}&Timestamp=${timeStamp}&Signature=${sig}&SignatureVersion=2.0&IsTest=false`;
      var body = {
        TaskId: streamInfo.task_id,
        Sequence: 123,
        UserId: streamInfo.UserId
      };
      console.log("url", url);
      console.log("signatureNoncebody", body);
      // return false;
      request(
        {
          url: url,
          method: "POST",
          json: true,
          headers: {
            "content-type": "application/json"
          },
          body: body
        },
        function (error, response, body) {
          console.log("error res ms", error);
          console.log("response error ms", response.statusCode);
          console.log("success ms", body);
          console.log("response ms", response);
          // console.log("response", response);
          if (!error && response.statusCode === 200) {
            console.log("success", body.Data);
            console.log("response", response);
            return res.json(body);
          }
        }
      );
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/stream/details", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let requiredFields = ["streamingId", "userId"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, streamingId } = req.body;
      console.log("userId", userId);
      let streamInfo = await streamModel.findOne({ _id: streamingId }).exec();
      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      if (userInfo) {
        if (streamInfo) {
          let results = success("stream details", { stream_details: streamInfo });
          return res.json(results);
        } else {
          let result = error("streaming id not found", "streming_id_not_found");
          return res.json(result);
        }
      } else {
        let result = error("user id not found", "user_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/game_details", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let requiredFields = ["userId"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId } = req.body;
      console.log("userId", userId);
      let gameifo = await gamesModel.find({ game_status: "1" }).exec();
      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      if (userInfo) {
        if (gameifo) {
          let results = success("game details", { game_details: gameifo });
          return res.json(results);
        } else {
          let result = error("game details not found", "streming_details_not_found");
          return res.json(result);
        }
      } else {
        let result = error("user id not found", "user_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/stream/image_details", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let requiredFields = ["userId"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId } = req.body;
      console.log("userId", userId);
      let streamImgInfo = await streamImage.find({ userId: userId, status: "1" }).exec();
      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      if (userInfo) {
        let results = success("stream image details", {
          stream_image_details: streamImgInfo
        });
        return res.json(results);
      } else {
        let result = error("user id not found", "user_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/screen_shareToken", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  let requiredFields = ["userId", "roomId"];
  let isRequired = checkRequiredFields(requiredFields, req.body);

  if (isRequired) {
    console.log("param missing, send required fields response");
    let response = requiredParams(isRequired);
    return res.json(response);
  } else {
    const user = req.body.userId;
    let check_userId = await UserModel.findOne({ _id: user }).exec();

    if (check_userId) {
      const user1 = req.body.userId + 2;

      const roomId = req.body.roomId;
      const token = generateStreamToken(user1, roomId);

      const result = success("token created successfully.", {
        token: token,
        userId: user1
      });
      console.log("____________________________", result);
      return res.json(result);
    } else {
      let result = error("user not found", "user_not_found");
      return res.json(result);
    }
  }
});

router.post("/stream_like", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/like", req.body);
  try {
    let requiredFields = ["userId", "commentId"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, commentId } = req.body;
      console.log("userId", userId);
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        let commentinfo = await streamcommentModel.findOne({ _id: commentId }).exec();
        const docWithItem = await streamcommentModel.findOne({
          _id: commentId, // Filter
          comment_like: userId // Check if item exists in the array
        });
        if (docWithItem) {
          await streamcommentModel.updateOne(
            { _id: commentId }, // Filter
            { $pull: { comment_like: userId } } // Remove item from array
          );
        } else {
          const filter = { _id: commentId };
          const update = { $push: { comment_like: userId } };
          await streamcommentModel.updateOne(filter, update);
        }
        console.log("commentinfo", commentinfo);
        console.log("docWithItem", docWithItem);
        const result = success("Stream comments updated.", commentinfo);

        return res.json(result);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/like_stream", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/like", req.body);
  try {
    let requiredFields = ["userId", "streamID"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, streamID } = req.body;
      console.log("userId", userId);
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        let streamInfo = await streamModel.findOne({ _id: streamID }).exec();
        const docWithItem = await streamModel.findOne({
          _id: streamID, // Filter
          stream_like: userId // Check if item exists in the array
        });
        if (docWithItem) {
          await streamModel.updateOne(
            { _id: streamID }, // Filter
            { $pull: { stream_like: userId } } // Remove item from array
          );
          const result = success("Stream Unlike updated.", streamInfo);
          return res.json(result);
        } else {
          const filter = { _id: streamID };
          const update = { $push: { stream_like: userId } };
          await streamModel.updateOne(filter, update);
          const result = success("Stream like updated.", streamInfo);
          return res.json(result);
        }
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/stream_viewers", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/stream_viewers", req.body);
  try {
    let requiredFields = ["userId", "streamID"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, streamID } = req.body;
      console.log("userId", userId);
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        let streamInfo = await streamModel.findOne({ _id: streamID }).exec();
        const docWithItem = await streamModel.findOne({
          _id: streamID, // Filter
          stream_viewers: userId // Check if item exists in the array
        });
        if (docWithItem) {
          // await streamModel.updateOne(
          //   { _id: streamID }, // Filter
          //   { $pull: { stream_viewers: userId } } // Remove item from array
          // );
        } else {
          const filter = { _id: streamID };
          const update = { $push: { stream_viewers: userId } };
          await streamModel.updateOne(filter, update);
        }
        console.log("commentinfo", streamInfo);
        console.log("docWithItem", docWithItem);
        const result = success("Stream comments updated.", streamInfo);

        return res.json(result);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/stream_comment_image_fav_add", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/stream_comment_image_fav_add", req.body);
  try {
    let requiredFields = ["userId", "image_id"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, image_id } = req.body;
      console.log("userId", userId);
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        let commentimageinfo = await streamImage.findOne({ _id: image_id }).exec();
        const docWithItem = await streamImage.findOne({
          _id: image_id, // Filter
          imaage_favourite: userId // Check if item exists in the array
        });
        if (docWithItem) {
          // await streamImage.updateOne(
          //   { _id: image_id }, // Filter
          //   { $pull: { imaage_favourite: userId } } // Remove item from array
          // );
        } else {
          const filter = { _id: image_id };
          const update = { $push: { imaage_favourite: userId } };
          await streamImage.updateOne(filter, update);
        }

        const result = success("Image added to favourite.", commentimageinfo);

        return res.json(result);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/stream_comment_image_fav_remove", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/stream_comment_image_fav_add", req.body);
  try {
    let requiredFields = ["userId", "image_id"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, image_id } = req.body;
      console.log("userId", userId);
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        let commentimageinfo = await streamImage.findOne({ _id: image_id }).exec();
        const docWithItem = await streamImage.findOne({
          _id: image_id, // Filter
          imaage_favourite: userId // Check if item exists in the array
        });
        if (docWithItem) {
          await streamImage.updateOne(
            { _id: image_id }, // Filter
            { $pull: { imaage_favourite: userId } } // Remove item from array
          );
        } else {
          // const filter = { _id: image_id };
          // const update = { $push: { imaage_favourite: userId } };
          // await streamImage.updateOne(filter, update);
        }

        const result = success("Image removed from favourite.", commentimageinfo);

        return res.json(result);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/stream_comment_image_fav", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/stream_comment_image_fav", req.body);
  try {
    let requiredFields = ["userId"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId } = req.body;
      console.log("userId", userId);
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        const docWithItem = await streamImage.find({
          imaage_favourite: userId // Check if item exists in the array
        });
        const result = success("Favourite images details.", docWithItem);
        return res.json(result);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/image_details_remove", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/stream_comment_image_fav_add", req.body);
  try {
    let requiredFields = ["userId", "image_id"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, image_id } = req.body;
      console.log("userId", userId);
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        let commentimageinfo = await streamImage
          .findOne({ _id: image_id, userId: userId })
          .exec();

        if (commentimageinfo) {
          await streamImage.updateOne(
            { _id: image_id }, // Filter
            { $set: { status: "0" } } // Remove item from array
          );
          const result = success("Image removed from gallery.", commentimageinfo);
          return res.json(result);
        } else {
          const result = error("Image details not found.");
          return res.json(result);
          // const filter = { _id: image_id };
          // const update = { $push: { imaage_favourite: userId } };
          // await streamImage.updateOne(filter, update);
        }
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/update", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const secretValue = await getSecretValue(secretName);
  // console.log("received from stream/update", req.body);
  // var server = { request: req, res: res };
  // let authenticate = await authentication(
  //   server
  // );
  // if (authenticate.status_code == 0) {
  //   let result = error(authenticate.message, error);
  //   return res.json(result);
  // }
  try {
    let requiredFields = ["streamingId", "userId"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const { userId, title, description, streamingId } = req.body;
      let streamInfo = await streamModel.findOne({ _id: streamingId }).exec();
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      console.log("test", req.body);

      if (streamInfo) {
        if (userInfo) {
          var video,
            postProfile,
            likes,
            isLike,
            isLive,
            isHit,
            streamId,
            roomId,
            streamStatus,
            stream_duration,
            stream_source,
            thumbnail_url,
            stream_update = "";
          // if (req?.body?.video && req?.body?.video != "") {
          //   const APIURL = secretValue?.API_URL + "files/thumbnail";
          //   const params = {
          //     videoUrl: req.body.video
          //   };
          //   const response = await axios.post(APIURL, params);
          //   if (response?.result?.thumbnailUrl && response?.result?.thumbnailUrl != "") {
          //     thumbnail_url = response?.result?.thumbnailUrl;
          //   }
          // }
          video = req.body.video;
          postProfile = req.body.postProfile;
          likes = req.body.likes;
          isLike = req.body.isLike;
          isLive = req.body.isLive;
          isHit = req.body.isHit;
          isLive = req.body.isLive;
          streamId = req.body.streamId;
          roomId = req.body.roomId;
          streamStatus = req.body.streamStatus;
          stream_duration = req.body.stream_duration;
          stream_update = req.body.stream_update;

          if (req.body.stream_source) stream_source = req.body.stream_source;
          else stream_source = "zegocloud";

          // console.log("test123");
          const filter = { _id: streamingId };
          const update = {
            userId: userId,
            title: title,
            description: description,
            video: video,
            postProfile: postProfile,
            likes: likes,
            isLike: isLike,
            isLive: isLive,
            isHit: isHit,
            streamId: streamId,
            roomId: roomId,
            streamStatus: streamStatus,
            stream_duration: stream_duration,
            stream_source: stream_source,
            thumbnail_url: thumbnail_url
          };
          // console.log({ update });
          let result = await streamModel.findOneAndUpdate(filter, update);
          let fcm_token = [];
          let fcm_tokens = [];
          let UserDetails = await UserModel.find(
            { isDeleted: false, push_token: { $ne: null } },
            "push_token"
          )
            .sort({ createdAt: -1 })
            .exec();
          Object.keys(UserDetails).forEach(function (key) {
            // console.log("Key:", key, "Value:", UserDetails[key]["push_token"]);
            // console.log(
            //   "UserDetails[key]['push_token'].length",
            //   UserDetails[key]["push_token"].length
            // );
            if (UserDetails[key]["push_token"].trim().replace(/\s+/g, "").length == 0) {
              fcm_tokens.push(UserDetails[key]["push_token"]);
            } else if (
              UserDetails[key]["push_token"].length != 0 &&
              UserDetails[key]["push_token"] != "" &&
              UserDetails[key]["push_token"] != null
            ) {
              fcm_token.push(UserDetails[key]["push_token"]);
            }
          });
          if (stream_update == "start") {
            console.log("Start called");
            let data = {
              userId: userId,
              title: title,
              description: description,
              stream_id: streamingId,
              user_name: userInfo.userName,
              name: userInfo.name,
              email: userInfo.email,
              profile: userInfo.profileImgUrl,
              fcm_token: fcm_token
            };
            let data_values = JSON.stringify(data);
            // console.log({ data_values });
            const postData = data_values;
            const options = {
              hostname: secretValue.SOCKET_DOMAIN,
              port: secretValue.SOCKET_PORT,
              path: "/stream_start", // Replace with the endpoint you want to trigger
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              }
            };
            // Make the HTTPS POST request
            const reqs = https.request(options, (res) => {
              let data = "";

              // Accumulate the response data
              res.on("data", (chunk) => {
                data += chunk;
              });

              // Process the response data when it ends
              res.on("end", () => {
                console.log(data);
              });
            });
            reqs.on("error", (error) => {
              console.error("Error making HTTPS request:", error);
            });

            // Write the request body
            reqs.write(postData);

            // End the request
            reqs.end();
          }
          let results = success("stream details updated", { streamingId: result._id });
          return res.json(results);
        } else {
          let result = error("user not found", "user_not_found");
          return res.json(result);
        }
      } else {
        let result = error("streaming id not found", "streming_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.get("/list", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  // var server = { request: req, res: res };
  // let authenticate = await authentication(
  //   server
  // );
  // if (authenticate.status_code == 0) {
  //   let result = error(authenticate.message, error);
  //   return res.json(result);
  // }
  console.log("Listing Streams", req.query);

  try {
    let isRequired = checkRequiredFields(["userId"], req.query);
    let streamDetails;
    console.log({ isRequired });
    const { isLive } = req.query;
    const queryCondition = { streamStatus: "Active" };
    if (isLive !== undefined) {
      queryCondition.isLive = isLive === "true"; // Convert string to boolean
    }
    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const userId = req.query.userId;

      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      console.log({ userInfo });

      if (userInfo) {
        if (req.query.page && req.query.limit) {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const skip = (page - 1) * limit;

          streamDetails = await streamModel
            .find(queryCondition)
            .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
            .skip(skip)
            .limit(limit)
            .populate({ path: "userId", select: "userName" })
            .populate({ path: "game_id", select: "game_name" })
            .exec();
          console.log("StreamDetailsStreamDetails", streamDetails);
          let streamsWithCommentCount = await Promise.all(
            streamDetails.map((stream) => {
              return {
                ...stream.toObject(), // Convert Mongoose document to plain JS object
                viewersCount: stream.stream_viewers.length, // Add a new field with the count of the comments array
                userName:
                  stream?.userId != null && stream?.userId?.userName != ""
                    ? stream?.userId?.userName
                    : "",
                userId:
                  stream?.userId != null && stream.userId?._id != ""
                    ? stream.userId?._id
                    : "",
                game_name:
                  stream?.game_id != null && stream?.game_id?.game_name != ""
                    ? stream?.game_id?.game_name
                    : ""
              };
            })
          );
          console.log("streamsWithCommentCount", streamsWithCommentCount);
          let StreamDetailscount = await streamModel
            .countDocuments(queryCondition)
            .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
            .exec();
          streamsWithCommentCount.stream_count = await StreamDetailscount;
          if (streamsWithCommentCount.length > 0) {
            const result = success("Stream list retrieval success", {
              stream_details: streamsWithCommentCount
            });
            return res.json(result);
          } else {
            const result = success("Stream list retrieval success", {
              stream_details: streamsWithCommentCount
            });
            return res.json(result);
            // const result = notFound("There is no stremaing available", "stream_empty");
            // return res.json(result);
          }
        } else {
          streamDetails = await streamModel
            .find(queryCondition)
            .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
            .populate({ path: "userId", select: "userName" })
            .populate({ path: "game_id", select: "game_name" })
            .exec();
          console.log("StreamDetailsStreamDetails", streamDetails);
        }
        let streamsWithCommentCount = await Promise.all(
          streamDetails.map((stream) => {
            console.log("stream.userId.userName", stream?.userId);
            return {
              ...stream.toObject(), // Convert Mongoose document to plain JS object
              viewersCount: stream.stream_viewers.length, // Add a new field with the count of the comments array
              userName:
                stream?.userId != null && stream?.userId?.userName != ""
                  ? stream?.userId?.userName
                  : "",
              userId:
                stream?.userId != null && stream.userId?._id != ""
                  ? stream.userId?._id
                  : "",
              game_name:
                stream?.game_id != null && stream?.game_id?.game_name != ""
                  ? stream?.game_id?.game_name
                  : ""
            };
          })
        );

        let StreamDetailscount = await streamModel
          .countDocuments({ streamStatus: "Active" })
          .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
          .exec();
        streamsWithCommentCount.stream_count = await StreamDetailscount;
        console.log("streamsWithCommentCount12", streamsWithCommentCount);
        if (streamsWithCommentCount.length > 0) {
          const result = success("Stream list retrieval success", {
            stream_details: streamsWithCommentCount
          });
          return res.json(result);
        } else {
          const result = notFound("There is no stremaing available", "stream_empty");
          return res.json(result);
        }
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.get("/streamer_list", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  // var server = { request: req, res: res };
  // let authenticate = await authentication(
  //   server
  // );
  // if (authenticate.status_code == 0) {
  //   let result = error(authenticate.message, error);
  //   return res.json(result);
  // }
  console.log("Listing Streams", req.query);

  try {
    let isRequired = checkRequiredFields(["userId"], req.query);
    let streamDetails;
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const userId = req.query.userId;

      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      console.log({ userInfo });

      if (userInfo) {
        if (req.query.page && req.query.limit) {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const skip = (page - 1) * limit;

          streamDetails = await streamModel
            .find({ streamStatus: "Active", isLive: true })
            .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
            .skip(skip)
            .limit(limit)
            .populate({ path: "userId", select: "userName" })
            .populate({ path: "game_id", select: "game_name" })
            .exec();
          console.log("StreamDetailsStreamDetails", streamDetails);
          let streamsWithCommentCount = await Promise.all(
            streamDetails.map((stream) => {
              return {
                ...stream.toObject(), // Convert Mongoose document to plain JS object
                viewersCount: stream.stream_viewers.length, // Add a new field with the count of the comments array
                userName:
                  stream?.userId != null && stream?.userId?.userName != ""
                    ? stream?.userId?.userName
                    : "",
                userId:
                  stream?.userId != null && stream.userId?._id != ""
                    ? stream.userId?._id
                    : "",
                game_name:
                  stream?.game_id != null && stream?.game_id?.game_name != ""
                    ? stream?.game_id?.game_name
                    : ""
              };
            })
          );
          console.log("streamsWithCommentCount", streamsWithCommentCount);
          let StreamDetailscount = await streamModel
            .countDocuments({ streamStatus: "Active" })
            .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
            .exec();
          streamsWithCommentCount.stream_count = await StreamDetailscount;
          if (streamsWithCommentCount.length > 0) {
            const result = success("Stream list retrieval success", {
              stream_details: streamsWithCommentCount
            });
            return res.json(result);
          } else {
            const result = notFound("There is no stremaing available", "stream_empty");
            return res.json(result);
          }
        } else {
          streamDetails = await streamModel
            .find({ streamStatus: "Active", isLive: true })
            .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
            .populate({ path: "userId", select: "userName" })
            .populate({ path: "game_id", select: "game_name" })
            .exec();
          console.log("StreamDetailsStreamDetails", streamDetails);
        }
        let streamsWithCommentCount = await Promise.all(
          streamDetails.map((stream) => {
            console.log("stream.userId.userName", stream?.userId);
            return {
              ...stream.toObject(), // Convert Mongoose document to plain JS object
              viewersCount: stream.stream_viewers.length, // Add a new field with the count of the comments array
              userName:
                stream?.userId != null && stream?.userId?.userName != ""
                  ? stream?.userId?.userName
                  : "",
              userId:
                stream?.userId != null && stream.userId?._id != ""
                  ? stream.userId?._id
                  : "",
              game_name:
                stream?.game_id != null && stream?.game_id?.game_name != ""
                  ? stream?.game_id?.game_name
                  : ""
            };
          })
        );

        let StreamDetailscount = await streamModel
          .countDocuments({ streamStatus: "Active" })
          .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
          .exec();
        streamsWithCommentCount.stream_count = await StreamDetailscount;
        console.log("streamsWithCommentCount12", streamsWithCommentCount);
        if (streamsWithCommentCount.length > 0) {
          const result = success("Stream list retrieval success", {
            stream_details: streamsWithCommentCount
          });
          return res.json(result);
        } else {
          const result = notFound("There is no stremaing available", "stream_empty");
          return res.json(result);
        }
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.get("/owner_list", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  // var server = { request: req, res: res };
  // let authenticate = await authentication(
  //   server
  // );
  // if (authenticate.status_code == 0) {
  //   let result = error(authenticate.message, error);
  //   return res.json(result);
  // }
  console.log("Listing Streams", req.query);

  try {
    let isRequired = checkRequiredFields(["userId"], req.query);
    let streamDetails;
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const userId = req.query.userId;

      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      console.log({ userInfo });

      if (userInfo) {
        if (req.query.page && req.query.limit) {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const skip = (page - 1) * limit;

          streamDetails = await streamModel
            .find({ streamStatus: "Active", userId: userId })
            .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
            .skip(skip)
            .limit(limit)
            .populate({ path: "userId", select: "userName" })
            .exec();
          console.log("StreamDetailsStreamDetails", streamDetails);
          let streamsWithCommentCount = await Promise.all(
            streamDetails.map((stream) => {
              return {
                ...stream.toObject(), // Convert Mongoose document to plain JS object
                viewersCount: stream.stream_viewers.length, // Add a new field with the count of the comments array
                userName: stream?.userId?.userName != "" ? stream?.userId?.userName : "",
                userId: stream.userId?._id != "" ? stream.userId?._id : ""
              };
            })
          );
          console.log("streamsWithCommentCount", streamsWithCommentCount);
          let StreamDetailscount = await streamModel
            .countDocuments({ streamStatus: "Active" })
            .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
            .exec();
          streamsWithCommentCount.stream_count = await StreamDetailscount;
          if (streamsWithCommentCount.length > 0) {
            const result = success("Stream list retrieval success", {
              stream_details: streamsWithCommentCount
            });
            return res.json(result);
          } else {
            const result = notFound("There is no stremaing available", "stream_empty");
            return res.json(result);
          }
        } else {
          streamDetails = await streamModel
            .find({ streamStatus: "Active", userId: userId })
            .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
            .populate({ path: "userId", select: "userName" })
            .exec();
          console.log("StreamDetailsStreamDetails", streamDetails);
        }
        let streamsWithCommentCount = await Promise.all(
          streamDetails.map((stream) => {
            console.log("stream.userId.userName", stream?.userId);
            return {
              ...stream.toObject(), // Convert Mongoose document to plain JS object
              viewersCount: stream.stream_viewers.length, // Add a new field with the count of the comments array
              userName: stream?.userId?.userName != "" ? stream?.userId?.userName : "",
              userId: stream.userId?._id != "" ? stream.userId?._id : ""
            };
          })
        );
        console.log("streamsWithCommentCount", streamsWithCommentCount);
        let StreamDetailscount = await streamModel
          .countDocuments({ streamStatus: "Active" })
          .sort({ isLive: -1, createdAt: -1 }) // Sort by isLive first, then by createdAt
          .exec();
        streamsWithCommentCount.stream_count = await StreamDetailscount;
        if (streamsWithCommentCount.length > 0) {
          const result = success("Stream list retrieval success", {
            stream_details: streamsWithCommentCount
          });
          return res.json(result);
        } else {
          const result = notFound("There is no stremaing available", "stream_empty");
          return res.json(result);
        }
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/create/comment", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const secretValue = await getSecretValue(secretName);
  // var server = { request: req, res: res };
  // let authenticate = await authentication(
  //   server
  // );
  // if (authenticate.status_code == 0) {
  //   let result = error(authenticate.message, error);
  //   return res.json(result);
  // }
  // console.log("testing123", io);
  console.log("received from stream/create/comment", req.body);

  try {
    let requiredFields = ["userId", "streamId"];
    let isRequired = checkRequiredFields(requiredFields, req.body); // to check required fields are provide.

    if (isRequired) {
      // if the require fields missing condition runs

      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const { userId, streamId } = req.body; // The required fields are obtained from req.body
      let comment_type = req.body?.image_id != "" ? req.body?.comment_type : "";
      let image_id = req.body?.image_id != "" ? req.body?.image_id : "";
      let text = req.body?.text != "" ? req.body?.text : "";
      let check_streamId = await streamModel.findOne({ _id: streamId }).exec();
      let check_userId = await UserModel.findOne({ _id: userId }).exec();
      if (check_streamId) {
        if (check_userId) {
          let stream_comment = new streamcommentModel({
            userId: userId,
            text: text,
            streamId: streamId,
            comment_type: comment_type,
            image_id: image_id
          });

          let result = await stream_comment.save(); // it is to store the details in database
          console.log("result12", check_userId.userName);
          const query = {
            streamId: streamId
          };
          const totalCount = await streamcommentModel.countDocuments(query);
          console.log("totalCount", totalCount);

          let postData = result.toObject();
          console.log("newpostData", postData); // Log the plain JavaScript object
          postData.userName = check_userId.userName;
          postData.userProfile = check_userId.profileImgUrl;
          postData.totalChatcount = totalCount;
          postData = JSON.stringify(postData); // Convert postData to JSON string
          console.log("postData", postData);

          const options = {
            hostname: secretValue.SOCKET_DOMAIN,
            port: secretValue.SOCKET_PORT,
            path: "/createComments",
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            }
          };
          // Make the HTTPS POST request
          const req = https.request(options, (res) => {
            let data = "";

            // Accumulate the response data
            res.on("data", (chunk) => {
              data += chunk;
            });

            // Process the response data when it ends
            res.on("end", () => {
              console.log(data);
            });
          });

          // Handle errors
          req.on("error", (error) => {
            console.error("Error making HTTPS request:", error);
          });

          // Write the request body
          req.write(postData);

          // End the request
          req.end();
          console.log("result", result);
          const response = success("comment created succesfully", result);
          return res.json(response);
        } else {
          let result = error("user not found", "user_not_found");
          return res.json(result);
        }
      } else {
        let result = error("streamId not found", streamId);
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.get("/retrivecomments", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  // var server = { request: req, res: res };
  // let authenticate = await authentication(
  //   server
  // );
  // if (authenticate.status_code == 0) {
  //   let result = error(authenticate.message, error);
  //   return res.json(result);
  // }
  console.log("fetching comments based on streamId:", req.query);

  let isRequired = checkRequiredFields(["streamId", "userId"], req.query); // Check if streamId is provided

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    const streamId = req.query.streamId;
    const userId = req.query.userId;

    try {
      const check_streamId = await streamModel.findOne({ _id: streamId }).exec();
      let check_userId = await UserModel.findOne({ _id: userId }, "role").exec();
      if (!check_streamId) {
        const result = notFound("streamId not found:", streamId);
        return res.json(result);
      }

      if (check_userId) {
        const commentsWithUserDetails = await streamcommentModel
          .aggregate([
            { $match: { streamId: new mongoose.Types.ObjectId(streamId) } }, // Match comments for the given streamId
            {
              $lookup: {
                from: "TestStream_users", // Collection name to lookup
                localField: "userId",
                foreignField: "_id",
                as: "user" // Embedded user details
              }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }, // Unwind to flatten the array
            {
              $addFields: {
                userName: "$user.userName",
                userProfile: "$user.profileImgUrl"
              }
            },
            {
              $lookup: {
                from: "stream_comments_images", // Collection to lookup if comment_type is 'image'
                localField: "image_id",
                foreignField: "_id",
                as: "imageDetails"
              }
            },
            { $unwind: { path: "$imageDetails", preserveNullAndEmptyArrays: true } }, // Unwind to flatten image details
            {
              $addFields: {
                image_info: {
                  $cond: {
                    if: { $eq: ["$comment_type", "image"] },
                    then: "$imageDetails",
                    else: null
                  }
                }
              }
            },
            {
              $project: {
                _id: 1,
                streamId: 1,
                text: 1,
                userId: 1,
                createdAt: 1,
                userName: 1,
                comment_like: 1,
                comment_type: 1,
                image_id: 1,
                image_info: 1,
                userProfile: 1 // Assuming profileImgUrl is the user age field
              }
            }
          ])
          .exec();

        if (commentsWithUserDetails.length > 0) {
          const result = success("Comments with user details:", {
            commentsWithUserDetails,
            totalChatcount: commentsWithUserDetails.length
          });
          return res.json(result);
        } else {
          const result = notFound("No comments initiated for stream id:", streamId);
          return res.json(result);
        }
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    } catch (err) {
      console.error("Error while fetching comments:", err);
      let response = internalError();
      return res.json(response);
    }
  }
});

router.get("/apihelpercheck", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const params = {
    action: "get_user_profile",
    user_id: 11110,
    // campaign_action_id: 'T_CREATE_ACCOUNT',
    campaign_id: "BINANCE_L3_2024"
  };
  const apiCallSuccess = await callAPI(params);

  if (apiCallSuccess) {
    console.log("API call and email sending successful");
    return res.json(apiCallSuccess);
  } else {
    console.error("API call failed, but email was sent");
    res.status(401).send("API call failed, but email was sent");
  }
});

const downloadFromS3 = async (key, downloadPath, bucketName) => {
  const secretValue = await getSecretValue(secretName);
  const bucket = secretValue.S3_BUCKET;
  const keys = decodeURIComponent(key);
  console.log({ keys });
  const params = { Bucket: bucket, Key: keys };
  console.log({ params });
  const file = fs.createWriteStream(downloadPath);
  return new Promise((resolve, reject) => {
    s3.getObject(params)
      .createReadStream()
      .pipe(file)
      .on("finish", () => resolve(downloadPath))
      .on("error", (err) => reject(err));
  });
};

const processVideo = async (inputPath, outputPath, thumbnailPath, bucketName) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      // Video compression (set bitrate and quality)
      .videoBitrate("800k")
      .size("1280x720") // Resize video to 720p
      .output(outputPath)

      // Thumbnail generation at 5 seconds
      .on("end", () => resolve({ outputPath, thumbnailPath }))
      .on("error", (err) => reject(err))
      .screenshots({
        timestamps: ["5"],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: "400x400"
      });
  });
};

const uploadToS3 = async (filePath, key, bucketName) => {
  const secretValue = await getSecretValue(secretName);
  const bucket = secretValue.S3_BUCKET;
  const params = {
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(filePath),
    ACL: "public-read"
  };
  return s3.upload(params).promise();
};

function getBucketNameFromS3Url(url) {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname === "s3.amazonaws.com") {
      // Format 1
      return url.split("/")[3];
    } else if (urlObj.hostname.includes("s3.amazonaws.com")) {
      // Format 2
      return urlObj.hostname.split(".s3.amazonaws.com")[0];
    } else if (
      urlObj.hostname.includes(".s3.") &&
      urlObj.hostname.endsWith(".amazonaws.com")
    ) {
      // Format 3
      return urlObj.hostname.split(".s3.")[0];
    } else if (
      urlObj.hostname.startsWith("s3.") &&
      urlObj.hostname.endsWith(".amazonaws.com")
    ) {
      // Format 4
      return url.split("/")[3];
    }

    return null;
  } catch (error) {
    console.error("Error parsing S3 URL:", error);
    return null;
  }
}

router.post("/tournament/create", async (req, res) => {
  const server = { request: req, res: res };
  const authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    const result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from tournament/create", req.body);
  try {
    const requiredFields = [
      "userId",
      "title",
      "description",
      "stream_visibilty",
      "schedule_date",
      "tournament_thumbnail"
    ];

    const isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      const response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const {
        userId,
        title,
        description,
        streamStatus,
        stream_visibilty,
        schedule_date,
        tournament_thumbnail
      } = req.body;

      const userInfo = UserModel.findOne({ _id: userId }).exec();

      if (userInfo) {
        const streamType = "tournament";

        const thumbnail_urls = tournament_thumbnail != "" ? tournament_thumbnail : "";
        const stream = new streamModel({
          userId: userId,
          title: title,
          description: description,
          streamStatus: streamStatus,
          stream_visibilty: stream_visibilty,
          schedule_date: schedule_date,
          tournament_thumbnail: thumbnail_urls,
          streamType: streamType
        });
        const streamresult = await stream.save();
        const result = success("web Stream created successfully.", {
          stream: streamresult
        });
        return res.json(result);
      } else {
        const result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    const response = internalError();
    return res.json(response);
  }
});

router.post("/tournament/update", async (req, res) => {
  const server = { request: req, res: res };
  const authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    const result = error(authenticate.message, error);
    return res.json(result);
  }

  try {
    const requiredFields = [
      "userId",
      "streamingId",
      "title",
      "description",
      "stream_visibilty",
      "schedule_date",
      "tournament_thumbnail"
    ];
    const isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      const response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const {
        userId,
        streamingId,
        title,
        description,
        streamStatus,
        stream_visibilty,
        schedule_date,
        tournament_thumbnail
      } = req.body;

      const userInfo = UserModel.findOne({ _id: userId }).exec();

      if (userInfo) {
        const thumbnail_urls = tournament_thumbnail != "" ? tournament_thumbnail : "";
        const filter = { _id: streamingId };
        const update = {
          userId: userId,
          title: title,
          description: description,
          streamStatus: streamStatus,
          stream_visibilty: stream_visibilty,
          schedule_date: schedule_date,
          tournament_thumbnail: thumbnail_urls
        };

        const result = await streamModel.findOneAndUpdate(filter, update);
        const response = success("stream details updated", { streamingId: result._id });
        return res.json(response);
      } else {
        const result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    const response = internalError();
    return res.json(response);
  }
});

router.post("/tournament/delete", async (req, res) => {
  const server = { request: req, res: res };
  const authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    const result = error(authenticate.message, error);
    return res.json(result);
  }

  try {
    const requiredFields = ["userId", "streamingId"];
    const isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      const response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const { userId, streamingId } = req.body;
      const userInfo = UserModel.findOne({ _id: userId }).exec();
      const streamInfo = streamModel.findOne({ _id: streamingId }).exec();

      if (!userInfo) {
        return res.json(error("User not found"));
      }

      if (!streamInfo) {
        return res.json(error("Stream not found"));
      }
      await streamModel.deleteOne({ _id: streamingId });

      return res.json(success("Tournament deleted successfully"));
    }
  } catch (err) {
    console.log("try catch error", err);
    const response = internalError();
    return res.json(response);
  }
});


// router.post("/tournament/list", async (req, res) => {
//   const server = { request: req, res: res };
//   const authenticate = await authentication(server);

//   if (authenticate.status_code == 0) {
//     const result = error(authenticate.message, error);
//     return res.json(result);
//   }

//   try {
//     const requiredFields = ["userId"];
//     const isRequired = checkRequiredFields(requiredFields, req.body);

//     if (isRequired) {
//       console.log("param missing, send required fields response");
//       return res.json(requiredParams(isRequired));
//     }

//     const { userId } = req.body;

//     const userInfo = await UserModel.findOne({ _id: userId }).exec();
//     if (!userInfo) {
//       return res.json(error("User not found"));
//     }
//     const tournamentList = await streamModel.find({ userId }).exec();

//     return res.json(success("Tournament list retrieved successfully", { tournaments: tournamentList }));
//   } catch (err) {
//     console.log("try catch error", err);
//     return res.json(internalError());
//   }
// });


module.exports = router;
