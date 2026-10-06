var express = require("express");
var app = express();
var https = require("https");
var fs = require("fs");
var socket = require("socket.io");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const conf = require("./config");

app.use(bodyParser.json());
app.use(express.raw({ type: "*/*" }));
app.use(bodyParser.urlencoded({ extended: true }));

var server;
if (conf.env && conf.env !== "local") {
  const optionPaths = conf.optionFiles[conf.env];
  const key = fs.readFileSync(optionPaths.key);
  const cert = fs.readFileSync(optionPaths.cert);
  const ca = fs.readFileSync(optionPaths.ca);

  server = https.createServer({ key, cert, ca }, app);
} else if (conf.env && conf.env === "local") {
  server = https.createServer(app);
}

var io = socket(server, {
  pingTimeout: 60000,
  pingInterval: 25000
});
var serviceAccount;

if (conf.env === "development")
  serviceAccount = require("/home/dev-TestStream/public_html/myapp/TestStream-b5b23-firebase-adminsdk-cdbg1-e3e5791ad6.json");
else if (conf.env === "staging")
  serviceAccount = require("/home/TestStream_staging/public_html/myapp/devTestStream-3dccb-firebase-adminsdk-poskd-f572219bea.json");
else if (conf.env === "production")
  serviceAccount = require("/home/TestStream-production/public_html/myapp/devTestStream-3dccb-firebase-adminsdk-poskd-f572219bea.json");
else
  serviceAccount = require("./devTestStream-3dccb-firebase-adminsdk-poskd-f572219bea.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
    io.emit("chat message", msg);
  });
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.get("/auth/callback", function (req, res) {
  console.log("request.query", req.query);
  res.send("hello world");
});

app.post("/auth/callback", function (request, response) {
  console.log("req121", request.body);
  response.send("hello world");
});

server.listen(8003, function () {
  console.log("Https Server is listening on port 8003");
});
