var admin = require("firebase-admin");

var serviceAccount = require("./TestStream-mobile-app-firebase-adminsdk-myubu-795cb579ce.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
module.exports = admin;
