require("dotenv").config();

const express = require("express");
const socket = require("socket.io");
const helmet = require("helmet");
const cors = require("cors");
const cookies = require("cookie-parser");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const sharedConnection = require("./config/db_config");
const passport = require("./config/passport-config");
const conf = require("./config");
const userController = require("./controllers/userController");
const productController = require("./controllers/productController");
const fileController = require("./controllers/fileOperations");
const transactionController = require("./controllers/transactionsController");
const cartController = require("./controllers/cartController");
const rewardsController = require("./controllers/rewardsController");
const streamController = require("./controllers/streamController");
const campaignController = require("./controllers/campaignController");
const commissionController = require("./controllers/commissionController");
const dmarketDota2Controller = require("./controllers/dmarketDota2Controller");
const dmarketCsController = require("./controllers/dmarketCsController");
const dmarketRustController = require("./controllers/dmarketRustController");
const dmarketTf2Controller = require("./controllers/dmarketTf2Controller");
const gameController = require("./controllers/gameController");
const zealyCampaignController = require("./controllers/zealyCampaignController");
const adminController = require("./controllers/adminController");
const chatController = require("./controllers/chatController");
const paymentController = require("./controllers/paymentController");
const fileControllers = require("./controllers/fileController");
// const obsControllers = require("./controllers/obsController");
const userSteamControllers = require("./controllers/userSteamController");
const restreamApiController = require("./controllers/RestreamapiController");

// const cron = require("node-cron");
//const {getSteamUserAssetsTask} = require("./commonFunctions/steam");

const app = express();

const checkMongoConnection = (req, res, next) => {
  console.log("check db connection, called.", sharedConnection.readyState, req.body);
  if (sharedConnection.readyState === 1) {
    next();
  } else {
    return res.json({ status: "db not connected, Try again later !" });
  }
};
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
app.use(cookies());
app.use(helmet());
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload());

var server;

if (conf.env && conf.env !== "local") server = require("https").Server(app);
else if (conf.env && conf.env === "local") server = require("http").Server(app);
var io = socket(server, {
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(checkMongoConnection);
app.use(
  session({
    secret: "12345678907",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3000000 }
  })
);
app.use(passport.initialize());
app.use(passport.session());

sharedConnection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");

  app.get("/deeplink", async (req, res) => {
    console.log("reached deeplink api", req.query);
    let deeplinkData = req.query.token;
    console.log({ deeplinkData });
    deeplinkData =
      deeplinkData == undefined || deeplinkData == "" ? "invalidToken" : deeplinkData;
    console.log("line 50", { deeplinkData });
    let deeplink = "TestStream://application/ResetPassword/" + deeplinkData;
    console.log({ deeplink });
    res.redirect(deeplink);
    return true;
  });

  app.get("/paymentRedirection", async () => {
    io.sockets.on("connection", function (socket) {
      socket.on("echo", function (data) {
        io.sockets.emit("message", data);
      });
    });
    return true;
  });

  app.use("/user", userController);
  app.use("/product", productController);
  app.use("/file", fileController);
  app.use("/transaction", transactionController);
  app.use("/cart", cartController);
  app.use("/stream", streamController);
  app.use("/user_campaign", campaignController);
  app.use("/commission", commissionController);
  app.use("/game", gameController);
  app.use("/rewards", rewardsController);
  app.use("/dmarket_dota2", dmarketDota2Controller);
  app.use("/dmarket_cs", dmarketCsController);
  app.use("/dmarket_rust", dmarketRustController);
  app.use("/dmarket_tf2", dmarketTf2Controller);
  app.use("/zealy-campaign", zealyCampaignController);
  app.use("/admin", adminController);
  app.use("/chat", chatController);
  app.use("/payment", paymentController);
  app.use("/files", fileControllers);
  // app.use("/obs", obsControllers);

  app.use("/user-steam", userSteamControllers);
  app.use("/restreamapi", restreamApiController);

  app.get("/", async (req, res) => {
    console.log("TestStream api project!");
    return res.send("TestStream api project debug purpose!");
  });
});

// cron.schedule('0 0 * * *', getSteamUserAssetsTask)

module.exports = app;
