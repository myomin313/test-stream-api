require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  const MONGO_URL = process.env.MONGO_URL;

  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    mongoose.connection.once("open", function () {
      mongoose.connection.on("disconnected", function () {
        console.log("MongoDB event disconnected - " + new Date());
      });
      mongoose.connection.on("reconnected", function () {
        console.log("MongoDB event reconnected - " + new Date());
      });
      mongoose.connection.on("error", function (err) {
        console.log("MongoDB event error: " + err + " - " + new Date());
      });
    });
  } catch (err) {
    console.error(err);
  }
})();

const sharedConnection = mongoose.connection;
module.exports = sharedConnection;
