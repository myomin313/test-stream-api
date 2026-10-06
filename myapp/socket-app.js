require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const socket = require("socket.io");
const admin = require("firebase-admin");
const apn = require("node-apn");
const https = require("https");
const http = require("http");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const config = require("./config");
const sendPushNotification = require("./commonFunctions/sendPushNotification");
const chatModel = require("./models/chatModel");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.raw({ type: "*/*" }));
app.use(cors(), function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,PATCH,OPTIONS,HEAD");
  res.header(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers,Access-Control-Allow-Methods,Access-Control-Allow-Origin,Origin,X-Auth,X-Requested-With,Content-Type,Accept,content-type,application/json,x-auth,Access-Control-Request-Method,Access-Control-Request-Headers"
  );
  next();
});
var server;

if (config.env && config.env !== "local") {
  const optionFilePaths = config.optionFiles[config.env];
  const key = fs.readFileSync(optionFilePaths.key);
  const cert = fs.readFileSync(optionFilePaths.cert);
  const ca = fs.readFileSync(optionFilePaths.ca);
  const options = {
    key: key,
    cert: cert,
    ca: ca
  };

  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}

const io = socket(server, {
  pingTimeout: 60000,
  pingInterval: 25000
});

var serviceAccount;

if (config.env === "development")
  serviceAccount = require("/home/dev-TestStream/public_html/myapp/TestStream-b5b23-firebase-adminsdk-cdbg1-e3e5791ad6.json");
else if (config.env === "staging")
  serviceAccount = require("/home/TestStream_staging/public_html/myapp/devTestStream-3dccb-firebase-adminsdk-poskd-f572219bea.json");
else if (config.env === "production")
  serviceAccount = require("/home/TestStream-production/public_html/myapp/devTestStream-3dccb-firebase-adminsdk-poskd-f572219bea.json");
else
  serviceAccount = require("./devTestStream-3dccb-firebase-adminsdk-poskd-f572219bea.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  admin.app();
}

const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB successfully!");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

const apnProvider = new apn.Provider({
  token: {
    key: config.apnKeyPaths[config.env],
    bundleId: "com.qblobe.TestStream",
    teamId: "PQ22A7KQ86",
    keyId: "T46KDVML32"
  }
});

async function sendNotification(message, tokens) {
  const androidPayload = {
    notification: {
      title: message.title,
      body: message.body
    },
    data: message.data || {},
    tokens: tokens
  };

  const iosPayload = new apn.Notification({
    alert: message.title,
    payload: message.data || {},
    topic: "YOUR_TOPIC" // Optional topic for iOS notifications
  });

  try {
    await admin.messaging().sendMulticast(androidPayload);
    await apnProvider.send(iosPayload, tokens);
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
}

let usersOnline = [];

io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  socket.on("new-user-add", (newUserId) => {
    const userIndex = usersOnline.findIndex((user) => user.userId === newUserId);
    if (userIndex !== -1) {
      usersOnline[userIndex].socketIds.push(socket.id);
    } else {
      usersOnline.push({ userId: newUserId, socketIds: [socket.id] });
    }
    io.emit("get-users", usersOnline);
  });

  socket.on("disconnect", () => {
    usersOnline.forEach((user, index) => {
      user.socketIds = user.socketIds.filter((id) => id !== socket.id);
      if (user.socketIds.length === 0) {
        usersOnline.splice(index, 1);
      }
    });
    io.emit("get-users", usersOnline);
  });

  socket.on("offline", () => {
    usersOnline.forEach((user, index) => {
      user.socketIds = user.socketIds.filter((id) => id !== socket.id);
      if (user.socketIds.length === 0) {
        usersOnline.splice(index, 1);
      }
    });
    io.emit("get-users", usersOnline);
  });
});

app.post("/stream_processing_response", function (request) {
  let datas = request.body;
  io.emit("stream_processing_response", { type: "stream", stream_datils: datas });
});

app.post("/streaming_palyback_response", function (request) {
  let datas = request.body;
  io.emit("streaming_palyback_response", { type: "stream", stream_datils: datas });
});

app.post("/createComments", function (request) {
  io.emit("createComments", { type: "chat", chat_datils: request.body });
});

// unread count
// Socket connection
io.on("connection", (socket) => {
  console.log("unread User connected:", socket.id);

  // Listen for "get_unread_count" from client
  socket.on("get-unread-count", async (userId) => {
    console.log("unread count userId", userId);

    // const recId = new mongoose.Types.ObjectId(userId);
    const unreadCount = await chatModel.countDocuments({
      isRead: false,
      receiverId: userId
    });
    console.log("getunread count", unreadCount);
    socket.emit("socket-unread-count", unreadCount);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.post("/createStream", function (request) {
  const message = {
    title: "Create Stream",
    body: "New stream created.",
    data: {
      Tiltle: request.body.title,
      key2: "value2"
    }
  };
  sendNotification(message, request.body.fcm_token);
  io.emit("createStream", { type: "stream", stream_details: request.body });
  // response.send("hello world");
});

app.post("/stream_start", function (request) {
  console.log("stream_started called");
  io.emit("stream_started", { type: "stream", stream_details: request.body });
  console.log("stream_started emited");
  // request?.body?.fcm_token?.forEach(async (tokens) => {
  //   const token = tokens;
  //   const title = request.body.title;
  //   const body = request.body.description;
  //   const data = { key1: "value1", key2: "value2" };

  //   try {
  //     await sendPushNotification(token, title, body, data);
  //     console.log("Notification sent successfully");
  //   } catch (error) {
  //     console.error(error);
  //   }
  // });
});

app.post("/mintingresponse", function (request) {
  console.log("testing for mintingresponse");
  io.emit("mintingresponse", { type: "mint", stream_details: request.body });
});

app.post("/createChatMessages", function (request, response) {
  console.log("testing for chat");

  // Ensure the data doesn't contain circular references or too large objects
  const newMessage = request.body;

  // Emit the new chat message only if necessary (add condition if needed)
  io.emit("newChatMessage", { type: "chatmessage", newChatMessage: newMessage });

  response.status(200).send(newMessage);
});
app.post("/createunreadCount", function (request, response) {
  // io.emit("unread-count", { type: "unread-count", unreadCount: request.body });

  io.emit("unread-count", request.body);
  response.status(200).send(request.body);
});

io.on("connection", (socket) => {
  socket.on("updateStreamOrder", ({ roomId, orderedStreams }) => {
    // Broadcast the new order to all clients in the room
    io.to(roomId).emit("streamOrderUpdated", { orderedStreams });
  });
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("sendMessage", async (data) => {
    const { senderId, receiverId, text } = data;

    const sendId = new mongoose.Types.ObjectId(senderId);
    const receieveId = new mongoose.Types.ObjectId(receiverId);

    const chat = new chatModel({
      senderId: sendId,
      receiverId: receieveId,
      text: text,
      status: "unread",
      messageType: "text",
      createdAt: Date.now()
    });
    await chat.save();

    console.log("hello chat", chat);
    socket.emit("receiveMessage", chat);
    socket.to(receiverId).emit("receiveMessage", chat);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(config.socketPort, () => {
  console.log(`Https Server is listening on port`);
});
