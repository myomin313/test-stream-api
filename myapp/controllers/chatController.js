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
const chatModel = require("../models/chatModel");
const chatFileModel = require("../models/chatFileModel");
const UserModel = require("../models/userModel");
const { chatFileExport } = require("../commonFunctions/chatFile");
const mongoose = require("mongoose");
const config = require("../config");
const secretName = config.secretNames[config.env];
const { callAPI, getSecretValue } = require("../commonFunctions/apihelper");
const {
  authentication,
  authentication_email_exists
} = require("../commonFunctions/functions");
const http = require("http");
const socket = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socket(server);
var https = require("https");

router.post("/create", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const secretValue = await getSecretValue(secretName);
  try {
    let requiredFields = ["senderId", "receiverId"];
    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("Param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const { senderId, receiverId } = req.body;
      let text = req.body?.text ? req.body.text : "";
      let status = "sent";

      let check_senderId = await UserModel.findOne({ _id: senderId }).exec();
      let check_receiverId = await UserModel.findOne({ _id: receiverId }).exec();

      if (!check_senderId || !check_receiverId) {
        return res.status(404).json({ error: "User not found" });
      }

      let chat = new chatModel({
        senderId: senderId,
        receiverId: receiverId,
        text: text,
        status: status,
        messageType: "text",
        createdAt: Date.now() // Ensure you call Date.now()
      });

      let saveresult = await chat.save();

      await chatModel.updateMany(
        {
          senderId: receiverId,
          receiverId: senderId,
          isRead: false
        },
        {
          $set: { isRead: true }
        }
      );

      console.log("server result", saveresult);
      console.log("server response", saveresult);
      const postData = JSON.stringify(saveresult); // Convert postData to JSON string
      console.log("postData", postData);

      const options = {
        hostname: secretValue.SOCKET_DOMAIN,
        port: secretValue.SOCKET_PORT,
        path: "/createChatMessages",
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

      // io.emit("newChatMessage", text);

      const unreadCount = await chatModel.countDocuments({
        receiverId: receiverId,
        isRead: false
      });

      const senderunreadCount = await chatModel.countDocuments({
        receiverId: receiverId,
        senderId: senderId,
        isRead: false
      });

      //start for un read count
      const unreadData = {
        receiverId: receiverId,
        unreadCount: unreadCount,
        senderunreadCount: senderunreadCount,
        senderId: senderId,
        text: text,
        messageType: "text"
      };
      console.log("unread count", unreadData);
      const unreadCountData = JSON.stringify(unreadData);

      const unreadOptions = {
        hostname: secretValue.SOCKET_DOMAIN,
        port: secretValue.SOCKET_PORT,
        path: "/createunreadCount",
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      };
      // Make the HTTPS POST request
      const unreadreqs = https.request(unreadOptions, (res) => {
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
      unreadreqs.on("error", (error) => {
        console.error("Error making HTTPS request:", error);
      });

      // Write the request body
      unreadreqs.write(unreadCountData);

      // End the request
      unreadreqs.end();

      const result = success("chat added", saveresult);
      return res.json(result);
    }
  } catch (err) {
    console.error("try catch error", err); // Log full error
    let response = internalError();
    return res.status(500).json(response); // Use appropriate status code
  }
});

router.get("/unread-count", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("req.query data", req.query);
  try {
    let isRequired = checkRequiredFields(["userId"], req.query);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const userId = req.query.userId;
      let checkuserId = await UserModel.findOne({ _id: userId }).exec();

      if (checkuserId) {
        const unreadCount = await chatModel.countDocuments({
          receiverId: userId,
          isRead: false
        });

        console.log("route unreadcount", unreadCount);
        const result = success("unread chat count", {
          unreadCount: unreadCount
        });

        return res.json(result);
      }
    }
  } catch (err) {
    console.log({ err });
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
  try {
    let isRequired = checkRequiredFields(["userId"], req.query);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const userId = req.query.userId;

      let checkuserId = await UserModel.findOne({ _id: userId }).exec();

      const userIdObject = new mongoose.Types.ObjectId(userId);
      console.log("uuuu", userIdObject);
      if (checkuserId) {
        const checkuser = await chatModel.aggregate([
          {
            $match: {
              $or: [{ senderId: userIdObject }, { receiverId: userIdObject }]
            }
          },
          {
            $sort: { createdAt: -1 } // Sort messages by createdAt descending before grouping
          },
          {
            $group: {
              _id: {
                conversationId: {
                  $cond: {
                    if: { $eq: ["$senderId", userIdObject] },
                    then: { senderId: "$senderId", receiverId: "$receiverId" },
                    else: { senderId: "$receiverId", receiverId: "$senderId" }
                  }
                }
              },
              latestMessage: { $first: "$$ROOT" } // Most recent message for each conversation
            }
          },
          {
            $lookup: {
              from: "TestStream_users",
              localField: "_id.conversationId.receiverId",
              foreignField: "_id",
              as: "otherUserProfile"
            }
          },
          {
            $unwind: "$otherUserProfile"
          },
          {
            $project: {
              latestMessage: 1,
              "otherUserProfile.userName": 1,
              "otherUserProfile.profileImgUrl": 1,
              "otherUserProfile._id": 1
            }
          },
          {
            $sort: { "latestMessage.createdAt": -1 } // Sort conversations by latest message's createdAt
          }
        ]);

        const finalResult = [];

        const unreadCountsMap = {};

        for (const conversation of checkuser) {
          const senderID = conversation.otherUserProfile._id;

          try {
            const unreadCount = await chatModel.countDocuments({
              receiverId: userId,
              senderId: senderID,
              isRead: false
            });
            if (!unreadCountsMap[userId]) {
              unreadCountsMap[userId] = 0;
            }
            unreadCountsMap[userId] = unreadCount;
            finalResult.push({
              ...conversation,
              unreadCount: unreadCountsMap[userId]
            });
          } catch (error) {
            console.error("Error getting unread count:", error);

            finalResult.push({
              ...conversation,
              unreadCount: 0
            });
          }
        }
        const result = success("chat user list  retrieval success", {
          chatusers: finalResult
        });
        return res.json(result);
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

router.get("/search", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let isRequired = checkRequiredFields(["userId"], req.query);
    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const userId = req.query.userId;
      const searchQuery = req.query.search;

      let checkuserId = await UserModel.findOne({ _id: userId }).exec();

      console.log(userId);
      //
      const userIdObject = new mongoose.Types.ObjectId(userId);
      console.log("uuuu", userIdObject);
      if (checkuserId) {
        const checkuser = await chatModel.aggregate([
          {
            $match: {
              // Ensure that either the senderId or the receiverId is the logged-in user
              $or: [
                { senderId: userIdObject }, // Match if logged-in user is the sender
                { receiverId: userIdObject } // Match if logged-in user is the receiver
              ], // Add search filters if searchQuery exists
              ...(searchQuery && {
                $or: [
                  { "otherUserProfile.userName": { $regex: searchQuery, $options: "i" } }, // Search in otherUserProfile.userName
                  { text: { $regex: searchQuery, $options: "i" } } // Search in message field
                ]
              })
            }
          },
          {
            $sort: { createdAt: -1 } // Sort by timestamp, descending (most recent first)
          },
          {
            $group: {
              _id: {
                // Group by the pair of users (logged-in user + the other user)
                conversationId: {
                  $cond: {
                    if: { $eq: ["$senderId", userIdObject] },
                    then: { senderId: "$senderId", receiverId: "$receiverId" },
                    else: { senderId: "$receiverId", receiverId: "$senderId" }
                  }
                }
              },
              latestMessage: { $first: "$$ROOT" } // Take the first (most recent) message in each group
            }
          },
          {
            $lookup: {
              from: "TestStream_users", // Join with the users collection
              localField: "_id.conversationId.receiverId", // Field in the chat collection
              foreignField: "_id", // Matching field in the users collection
              as: "otherUserProfile" // Result alias for user profile
            }
          },
          {
            $unwind: "$otherUserProfile" // Flatten the otherUserProfile array to get single object
          },

          {
            $unwind: {
              path: "$unreadMessages",
              preserveNullAndEmptyArrays: true // If no unread messages, keep the field as null
            }
          },
          {
            $project: {
              latestMessage: 1,
              "otherUserProfile.userName": 1,
              "otherUserProfile.profileImgUrl": 1,
              "otherUserProfile._id": 1 // Default to 0 if no unread messages
            }
          }
        ]);

        console.log("chat users", checkuser);

        const finalResult = [];

        const unreadCountsMap = {};

        for (const conversation of checkuser) {
          const senderID = conversation.otherUserProfile._id;

          try {
            const unreadCount = await chatModel.countDocuments({
              receiverId: userId,
              senderId: senderID,
              isRead: false
            });
            console.log("unreadCount", unreadCount);
            if (!unreadCountsMap[userId]) {
              unreadCountsMap[userId] = 0;
            }
            unreadCountsMap[userId] = unreadCount;
            finalResult.push({
              ...conversation,
              unreadCount: unreadCountsMap[userId]
            });
          } catch (error) {
            console.error("Error getting unread count:", error);

            finalResult.push({
              ...conversation,
              unreadCount: 0
            });
          }
        }
        const result = success("chat user list  retrieval success", {
          chatusers: finalResult
        });
        return res.json(result);
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

router.get("/update/read", async (req, res) => {
  try {
    let isRequired = checkRequiredFields(["chatUserId", "userId"], req.query);
    console.log("no required error");
    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const chatUserId = req.query.chatUserId;
      const userId = req.query.userId;

      let check_chatUserId = await UserModel.findOne({ _id: chatUserId }, "role").exec();
      let check_userId = await UserModel.findOne({ _id: userId }, "role").exec();
      if (!check_chatUserId) {
        const result = notFound("chat user not found:", chatUserId);
        return res.json(result);
      }
      console.log("chatUserId", chatUserId);
      console.log("userId", userId);
      const updateResult = await chatModel.updateMany(
        {
          senderId: chatUserId,
          receiverId: userId,
          isRead: false
        },
        {
          $set: { isRead: true }
        }
      );
      return res.json({ success: true, msg: "successfully update as read" });
    }
  } catch (error) {
    console.error("Error updating message as read:", error);
    throw error;
  }
});

router.get("/messages", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const secretValue = await getSecretValue(secretName);

  try {
    let isRequired = checkRequiredFields(["chatUserId", "userId"], req.query);

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const chatUserId = req.query.chatUserId;
      const userId = req.query.userId;

      let check_chatUserId = await UserModel.findOne({ _id: chatUserId }, "role").exec();
      let check_userId = await UserModel.findOne({ _id: userId }, "role").exec();

      if (!check_chatUserId) {
        const result = notFound("chat user not found:", chatUserId);
        return res.json(result);
      }
      if (check_userId) {
        const chatUserIdObject = new mongoose.Types.ObjectId(chatUserId);
        const userIdObject = new mongoose.Types.ObjectId(userId);

        const unreadMessages = await chatModel.find({
          senderId: chatUserIdObject,
          receiverId: userIdObject,
          isRead: false
        });

        console.log("unread message", unreadMessages);
        const updateResult = await chatModel.updateMany(
          {
            senderId: chatUserId,
            receiverId: userId,
            isRead: false
          },
          {
            $set: { isRead: true }
          }
        );

        console.log("update result", updateResult);

        const messages = await chatModel.aggregate([
          {
            $match: {
              // Match where the logged-in user is either the sender or receiver
              $or: [
                { senderId: userIdObject, receiverId: chatUserIdObject }, // Logged-in user sent message to clicked user
                { senderId: chatUserIdObject, receiverId: userIdObject }
              ]
            }
          },
          {
            $addFields: {
              otherUserId: chatUserIdObject
            }
          },
          {
            $lookup: {
              from: "TestStream_users",
              localField: "otherUserId",
              foreignField: "_id",
              as: "otherUserProfile"
            }
          },
          { $unwind: { path: "$otherUserProfile", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "chat_files", // Collection to lookup if comment_type is 'image'
              localField: "imageId",
              foreignField: "_id",
              as: "fileDetails"
            }
          },
          { $unwind: { path: "$fileDetails", preserveNullAndEmptyArrays: true } },
          {
            $addFields: {
              file_info: {
                $cond: {
                  if: { $eq: ["$messageType", "image"] }, // neeed to check in tomorrow
                  then: "$fileDetails",
                  else: null
                }
              }
            }
          },
          {
            $project: {
              receiverId: 1,
              senderId: 1,
              "otherUserProfile.userName": 1,
              "otherUserProfile.profileImgUrl": 1,
              "otherUserProfile._id": 1,
              messageType: 1,
              // file_info: 1,
              text: 1,
              status: 1,
              imageId: 1,
              "fileDetails._id": 1,
              "fileDetails.url": 1,
              "fileDetails.key": 1,
              "fileDetails.status": 1,
              "fileDetails.senderId": 1,
              "fileDetails.receiverId": 1,
              "fileDetails.size": 1,
              "fileDetails.fileType": 1,
              createdAt: 1
            }
          }
        ]);

        const unreadCount = await chatModel.countDocuments({
          receiverId: userId,
          isRead: false
        });

        const senderunreadCount = await chatModel.countDocuments({
          receiverId: userId,
          senderId: chatUserId,
          isRead: false
        });

        //start for un read count
        // console.log("unread count", unreadCount);

        const unreadData = {
          receiverId: userId,
          unreadCount: unreadCount,
          senderunreadCount: senderunreadCount,
          senderId: chatUserId
        };
        console.log("unread count", unreadData);
        const unreadCountData = JSON.stringify(unreadData);

        //const unreadCountData = JSON.stringify({ unreadCount });

        const unreadOptions = {
          hostname: secretValue.SOCKET_DOMAIN,
          port: secretValue.SOCKET_PORT,
          path: "/createunreadCount",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        };
        // Make the HTTPS POST request
        const unreadreqs = https.request(unreadOptions, (res) => {
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
        unreadreqs.on("error", (error) => {
          console.error("Error making HTTPS request:", error);
        });

        // Write the request body
        unreadreqs.write(unreadCountData);

        // End the request
        unreadreqs.end();

        const result = success("chat message detail for each user:", {
          chatMessageDetails: messages
        });
        console.log("message", result);
        return res.json(result);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (error) {
    console.error("Error retrieving messages:", error);
    throw error;
  }
});

router.post("/files", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const secretValue = await getSecretValue(secretName);
  try {
    if (req.files) {
      console.log("request file", req.files.document);
      let file = req.files.document;
      console.log("file data", file);
      let response = await chatFileExport(file);

      console.log("file upload response type", response.fileType);
      let messageType;
      if (
        response.fileType === "png" ||
        response.fileType === "jpeg" ||
        response.fileType === "jpg"
      ) {
        messageType = "image";
      } else if (response.fileType === "mp4") {
        messageType = "video";
      } else {
        messageType = "file";
      }

      const senderId = new mongoose.Types.ObjectId(req?.body?.senderId);
      const receiverId = new mongoose.Types.ObjectId(req?.body?.receiverId);
      console.log("sender Id", senderId);
      if (response.status == "success") {
        let { Location, key } = response.result;
        let chatFile = new chatFileModel({
          url: Location,
          key: key,
          senderId: senderId,
          receiverId: receiverId,
          status: req.body.status,
          size: req?.body?.size,
          fileType: response.fileType,
          createdAt: Date.now()
        });

        let serverresult = await chatFile.save();

        await chatModel.updateMany(
          {
            senderId: receiverId,
            receiverId: senderId,
            isRead: false
          },
          {
            $set: { isRead: true }
          }
        );

        console.log("serverresul", serverresult);

        let chat = new chatModel({
          senderId: senderId,
          receiverId: receiverId,
          status: req.body.status,
          messageType: messageType,
          imageId: serverresult._id,
          createdAt: Date.now() // Ensure you call Date.now()
        });
        let result = { Location, key };
        let chatresult = await chat.save();

        const mergedResult = {
          senderId: serverresult.senderId, // If you prefer to keep the value from serverresult
          receiverId: serverresult.receiverId,
          url: serverresult.url,
          key: serverresult.key,
          status: chatresult.status, // If you want to prioritize chatesult status
          messageType: chatresult.messageType,
          imageId: chatresult.imageId,
          createdAt: serverresult.createdAt,
          size: serverresult.size,
          fileType: serverresult.fileType, // You can also decide which `createdAt` to keep
          _id: serverresult._id,
          __v: serverresult.__v
        };

        console.log("merged array data", mergedResult);

        const postData = JSON.stringify(mergedResult); // Convert postData to JSON string
        console.log("postData", postData);

        const options = {
          hostname: secretValue.SOCKET_DOMAIN,
          port: secretValue.SOCKET_PORT,
          path: "/createChatMessages",
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
        const sender = req?.body?.senderId;
        const receiver = req?.body?.receiverId;
        const unreadCount = await chatModel.countDocuments({
          receiverId: receiver,
          isRead: false
        });

        const senderunreadCount = await chatModel.countDocuments({
          receiverId: receiver,
          senderId: sender,
          isRead: false
        });

        //start for un read count
        const unreadData = {
          receiverId: receiver,
          unreadCount: unreadCount,
          senderunreadCount: senderunreadCount,
          senderId: sender,
          text: messageType,
          messageType: messageType
        };
        console.log("unread count", unreadData);
        const unreadCountData = JSON.stringify(unreadData);

        const unreadOptions = {
          hostname: secretValue.SOCKET_DOMAIN,
          port: secretValue.SOCKET_PORT,
          path: "/createunreadCount",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        };
        // Make the HTTPS POST request
        const unreadreqs = https.request(unreadOptions, (res) => {
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
        unreadreqs.on("error", (error) => {
          console.error("Error making HTTPS request:", error);
        });

        // Write the request body
        unreadreqs.write(unreadCountData);

        // End the request
        unreadreqs.end();

        // io.emit("newChatMessage", key);
        let finalRes = success("file upload success", result);
        return res.json(finalRes);
      } else {
        let result = error("file upload failed", "file_upload_error");
        return res.json(result);
      }
    } else {
      console.log("file not available");
      let response = requiredParams(["document"]);
      return res.json(response);
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

module.exports = router;
