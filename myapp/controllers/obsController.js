const express = require("express");
const router = express.Router();
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  error,
  requiredParams,
  internalError
} = require("../commonFunctions/responses");
const { fileExport_game, ImageDetails } = require("../commonFunctions/fileupload");
var imageThumbnail = require("image-thumbnail");
const UserModel = require("../models/userModel");
const gamesModel = require("../models/gmsModel");
const path = require("path");
const AWS = require("aws-sdk");

const config = require("../config");
const { callAPI, getSecretValue } = require("../commonFunctions/apihelper");
const bucketName = "TestStream-staging-bucket";
const s3fileurl = "https://s3.us-east-2.amazonaws.com/";
const secretName = config.secretNames[config.env];
const OBSWebSocket = require('obs-websocket-js').OBSWebSocket;
const obs = new OBSWebSocket();
const OBS_PASSWORD = "stream123"; // Replace with your OBS WebSocket password
const RTMP_URL = "rtmp://54.176.222.131:1935/live"; // Your RTMP server URL
const STREAM_KEY = "Stream123"; // Your stream key

// Connect to OBS WebSocket
const connectToOBS = async () => {
  try {
    if (!obs.connected) {
      await obs.connect("ws://54.176.222.131:4455", OBS_PASSWORD);
      console.log("Connected to OBS");
    }
  } catch (error) {
    console.error("Failed to connect to OBS:", error);
  }
};

const setStreamKey = async () => {
  try {
    await obs.call("SetInputSettings", {
      inputName: "RTMP Service",
      inputSettings: {
        server: RTMP_URL, // Use the hardcoded RTMP URL
        key: STREAM_KEY, // Use the hardcoded stream key
      },
    });
    console.log("RTMP URL and stream key set successfully");
  } catch (error) {
    console.error("Failed to set RTMP URL and stream key:", error);
  }
};

// API to start streaming
router.post("/start-stream", async (req, res) => {
  try {
    await connectToOBS();
    await setStreamKey(); // Ensure the RTMP URL and stream key are set before starting
    await obs.call("StartStream");
    res.status(200).send("Stream started");
  } catch (error) {
    console.error("Failed to start stream:", error);
    res.status(500).send("Failed to start stream");
  }
});

// API to stop streaming
router.post("/stop-stream", async (req, res) => {
  try {
    await connectToOBS();
    await obs.call("StopStream");
    res.status(200).send("Stream stopped");
  } catch (error) {
    console.error("Failed to stop stream:", error);
    res.status(500).send("Failed to stop stream");
  }
});

// router.post("/create", async (req, res) => {
//   try {
//     let requiredFields = ["game_name"];

//     let isRequired = checkRequiredFields(requiredFields, req.body);

//     if (isRequired) {
//       let response = requiredParams(isRequired);
//       return res.json(response);
//     } else {
//       // return res.json({status:'success'});
//       const { game_name, description } = req.body;
//       if (!req.files || req.files.length === 0) {
//         let result = error("No files uploaded.", "no_files");
//         return res.json(result);
//       } else {
//         let file = req.files.file;
//         let response = await fileExport_game(file);
//         console.log({ response });
//         if (response.status == "success") {
//           var url = response.result.Location;
//           const filename = url.split("/").pop();
//           const extension = path.extname(filename);
//           if (
//             extension.toLowerCase().trim() === ".jpeg" ||
//             extension.toLowerCase().trim() === ".jpg" ||
//             extension.toLowerCase().trim() === ".png"
//           ) {
//             var imgsize = await ImageDetails(url);
//             let percentageratio;
//             if (imgsize.width < 5000 && imgsize.width > 4000) {
//               percentageratio = { percentage: 35 };
//             } else if (imgsize.width < 4000 && imgsize.width > 3000) {
//               percentageratio = { percentage: 36 };
//             } else if (imgsize.width < 3000 && imgsize.width > 2000) {
//               percentageratio = { percentage: 38 };
//             } else if (imgsize.width < 2000 && imgsize.width > 1000) {
//               percentageratio = { percentage: 40 };
//             } else if (imgsize.width < 1000 && imgsize.width > 999) {
//               percentageratio = { percentage: 45 };
//             } else if (imgsize.width < 999 && imgsize.width > 500) {
//               percentageratio = { percentage: 50 };
//             } else if (imgsize.width < 500 && imgsize.width > 300) {
//               percentageratio = { percentage: 55 };
//             } else if (imgsize.width < 300 && imgsize.width > 200) {
//               percentageratio = { percentage: 100 };
//             } else if (imgsize.width < 200 && imgsize.width > 100) {
//               percentageratio = { percentage: 100 };
//             } else {
//               percentageratio = { percentage: 100 };
//             }
//             var thumbnail_file_path = "game_thumbnail/" + response.result.key;
//             imageThumbnail({ uri: url }, percentageratio)
//               .then((thumbnailBuffer) => {
//                 var plaindbstfile = thumbnailBuffer;
//                 const poparams = {
//                   Bucket: bucketName,
//                   Key: thumbnail_file_path,
//                   ACL: "public-read",
//                   Body: plaindbstfile
//                 };
//                 s3.putObject(poparams, function (poerr, podata) {
//                   if (poerr) {
//                     // logger.log(poerr);
//                     // error.max_size(server);
//                     return;
//                   } else {
//                     console.log("putObject Buffer", podata);
//                   }
//                 });
//               })
//               .catch((err) => {
//                 console.error("Error creating thumbnail:", err);
//               });
//             const secretValue = await getSecretValue(secretName);
//             var thumbnailurl = secretValue.S3_BUCKET_URL + thumbnail_file_path;
//             let gamesModelval = new gamesModel({
//               game_name: game_name,
//               description: description,
//               file_url: url,
//               thumbnail_url: thumbnailurl
//             });
//             let streamresult = await gamesModelval.save();
//             let results = success("game details added", streamresult);
//             return res.json(results);
//           }
//         }
//       }
//     }
//   } catch (err) {
//     console.log("try catch error", err);
//     let response = internalError();
//     return res.json(response);
//   }
// });

// router.post("/update", async (req, res) => {
//   try {
//     let requiredFields = ["game_name", "game_id"];

//     let isRequired = checkRequiredFields(requiredFields, req.body);

//     if (isRequired) {
//       console.log("param missing, send required fields response");
//       let response = requiredParams(isRequired);
//       return res.json(response);
//     } else {
//       // return res.json({status:'success'});
//       const { game_name, description, game_id } = req.body;
//       let gameInfo = await gamesModel.findOne({ _id: game_id }).exec();
//       if (gameInfo) {
//         const filter = { _id: game_id };
//         if (!req.files || req.files.length === 0) {
//           let gamesModelval = {
//             game_name: game_name,
//             description: description
//           };
//           let streamresult = await gamesModel.findOneAndUpdate(filter, gamesModelval);
//           let results = success("game details updated", streamresult);
//           return res.json(results);
//         } else {
//           let file = req.files.file;
//           let response = await fileExport_game(file);
//           if (response.status == "success") {
//             var url = response.result.Location;
//             const filename = url.split("/").pop();
//             const extension = path.extname(filename);
//             if (
//               extension.toLowerCase().trim() === ".jpeg" ||
//               extension.toLowerCase().trim() === ".jpg" ||
//               extension.toLowerCase().trim() === ".png"
//             ) {
//               var imgsize = await ImageDetails(url);
//               let percentageratio;
//               if (imgsize.width < 5000 && imgsize.width > 4000) {
//                 percentageratio = { percentage: 35 };
//               } else if (imgsize.width < 4000 && imgsize.width > 3000) {
//                 percentageratio = { percentage: 36 };
//               } else if (imgsize.width < 3000 && imgsize.width > 2000) {
//                 percentageratio = { percentage: 38 };
//               } else if (imgsize.width < 2000 && imgsize.width > 1000) {
//                 percentageratio = { percentage: 40 };
//               } else if (imgsize.width < 1000 && imgsize.width > 999) {
//                 percentageratio = { percentage: 45 };
//               } else if (imgsize.width < 999 && imgsize.width > 500) {
//                 percentageratio = { percentage: 50 };
//               } else if (imgsize.width < 500 && imgsize.width > 300) {
//                 percentageratio = { percentage: 55 };
//               } else if (imgsize.width < 300 && imgsize.width > 200) {
//                 percentageratio = { percentage: 100 };
//               } else if (imgsize.width < 200 && imgsize.width > 100) {
//                 percentageratio = { percentage: 100 };
//               } else {
//                 percentageratio = { percentage: 100 };
//               }
//               var thumbnail_file_path = "game_thumbnail/" + response.result.key;
//               console.log("percentageratio", percentageratio);
//               imageThumbnail({ uri: url }, percentageratio)
//                 .then((thumbnailBuffer) => {
//                   var plaindbstfile = thumbnailBuffer;
//                   const poparams = {
//                     Bucket: bucketName,
//                     Key: thumbnail_file_path,
//                     ACL: "public-read",
//                     Body: plaindbstfile
//                   };
//                   s3.putObject(poparams, function (poerr, podata) {
//                     if (poerr) {
//                       // logger.log(poerr);
//                       // error.max_size(server);
//                       return;
//                     } else {
//                       console.log("putObject Buffer", podata);
//                     }
//                   });
//                 })
//                 .catch((err) => {
//                   console.error("Error creating thumbnail:", err);
//                 });
//               var thumbnailurl = s3fileurl + bucketName + "/" + thumbnail_file_path;
//               let gamesModelval = {
//                 game_name: game_name,
//                 description: description,
//                 file_url: url,
//                 thumbnail_url: thumbnailurl
//               };
//               let streamresult = await gamesModel.findOneAndUpdate(filter, gamesModelval);
//               let results = success("game details updated", streamresult);
//               return res.json(results);
//             }
//           }
//         }
//       } else {
//         let result = error("game id not found", "game_id_not_found");
//         return res.json(result);
//       }
//     }
//   } catch (err) {
//     console.log("try catch error", err);
//     let response = internalError();
//     return res.json(response);
//   }
// });

// router.post("/delete", async (req, res) => {
//   try {
//     let requiredFields = ["game_id"];

//     let isRequired = checkRequiredFields(requiredFields, req.body);

//     if (isRequired) {
//       console.log("param missing, send required fields response");
//       let response = requiredParams(isRequired);
//       return res.json(response);
//     } else {
//       // return res.json({status:'success'});
//       const { game_id } = req.body;
//       let gameInfo = await gamesModel.findOne({ _id: game_id }).exec();
//       if (gameInfo) {
//         const filter = { _id: game_id };
//         if (!req.files || req.files.length === 0) {
//           let gamesModelval = {
//             game_status: "0"
//           };
//           await gamesModel.findOneAndUpdate(filter, gamesModelval);
//           let results = success("game details deleted", "");
//           return res.json(results);
//         }
//       } else {
//         let result = error("game id not found", "game_id_not_found");
//         return res.json(result);
//       }
//     }
//   } catch (err) {
//     console.log("try catch error", err);
//     let response = internalError();
//     return res.json(response);
//   }
// });

// router.post("/game_details", async (req, res) => {
//   try {
//     let requiredFields = ["userId"];

//     let isRequired = checkRequiredFields(requiredFields, req.body);

//     if (isRequired) {
//       console.log("param missing, send required fields response");
//       let response = requiredParams(isRequired);
//       return res.json(response);
//     } else {
//       // return res.json({status:'success'});
//       const { userId } = req.body;
//       console.log("userId", userId);
//       let gameifo = await gamesModel.find({ game_status: "1" }).exec();
//       let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
//       if (userInfo) {
//         if (gameifo) {
//           let results = success("game details", { game_details: gameifo });
//           return res.json(results);
//         } else {
//           let result = error("game details not found", "streming_details_not_found");
//           return res.json(result);
//         }
//       } else {
//         let result = error("user id not found", "user_id_not_found");
//         return res.json(result);
//       }
//     }
//   } catch (err) {
//     console.log("try catch error", err);
//     let response = internalError();
//     return res.json(response);
//   }
// });

// router.post("/individual_game_details", async (req, res) => {
//   try {
//     let requiredFields = ["userId", "game_id"];

//     let isRequired = checkRequiredFields(requiredFields, req.body);

//     if (isRequired) {
//       console.log("param missing, send required fields response");
//       let response = requiredParams(isRequired);
//       return res.json(response);
//     } else {
//       // return res.json({status:'success'});
//       const { userId, game_id } = req.body;
//       console.log("userId", userId);
//       let gameInfo = await gamesModel.findOne({ _id: game_id }).exec();
//       let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
//       if (userInfo) {
//         if (gameInfo) {
//           let results = success("game details", { game_details: gameInfo });
//           return res.json(results);
//         } else {
//           let result = error("game details not found", "streming_details_not_found");
//           return res.json(result);
//         }
//       } else {
//         let result = error("user id not found", "user_id_not_found");
//         return res.json(result);
//       }
//     }
//   } catch (err) {
//     console.log("try catch error", err);
//     let response = internalError();
//     return res.json(response);
//   }
// });
module.exports = router;
