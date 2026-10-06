const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const SteamStrategy = require("passport-steam").Strategy;
const User = require("../models/userModel");
const bcrypt = require("bcrypt");

let returnURL;
let realm;

if (process.env.ENVIRONMENT === "local" || process.env.ENVIRONMENT === "development") {
  (returnURL = "https://dev-TestStream.ephrontech.com/user/auth/steam/return"),
    (realm = "https://dev-TestStream.ephrontech.com/");
} else if (process.env.ENVIRONMENT === "staging") {
  (returnURL = "https://stagingapi.TestStream.xyz/user/auth/steam/return"),
    (realm = "https://stagingapi.TestStream.xyz/");
} else {
  returnURL = "https://api.TestStream.xyz/user/auth/steam/return";
  realm = "https://api.TestStream.xyz/";
}

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async function (email, password, done) {
      try {
        const user = await User.findOne({ email: email });
        if (!user) {
          return done(null, false, { message: "Incorrect email." });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.use(
  new SteamStrategy(
    {
      returnURL,
      realm,
      apiKey: process.env.STEAM_API_KEY
    },
    (identifier, profile, done) => {
      process.nextTick(() => {
        profile.identifier = identifier;
        return done(null, profile);
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
