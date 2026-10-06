require("dotenv").config();
const express = require("express");
const axios = require("axios");
const qrcode = require("qrcode");
const AWS = require("aws-sdk");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const kms = new AWS.KMS({ region: "us-west-1" });
const router = express.Router();
const userModel = require("../models/userModel");
const streamModel = require("../models/streamModel");
const productModel = require("../models/productModel");
const checkinModel = require("../models/userCheckinModel");
const hyperIddetails = require("../models/usertranactionsModel");
const { paymentModel } = require("../models/paymentModel");
const request = require("request");
var https = require("https");
const config = require("../config");
const secretName = config.secretNames[config.env];
// Create Express app
const http = require("http");
const socket = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socket(server);

const { Types } = require("mongoose");
const { checkRequiredFields } = require("../commonFunctions/validate");
const { sendSignupVerification } = require("../commonFunctions/mailgun");
const {
  success,
  error,
  requiredParams,
  conflict,
  invalidEmail,
  internalError,
  notFound
} = require("../commonFunctions/responses");
const {
  generateRandomSixDigitNumber,
  generateRandomString,
  createJwtToken,
  verifyJwtToken
} = require("../commonFunctions/microFunctions");
const { Web3 } = require("web3");
const providerUrl = "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
const mongoose = require("mongoose");
const passport = require("../config/passport-config");
const {
  authentication,
  authentication_email_exists
} = require("../commonFunctions/functions");
const NodeCache = require("node-cache");
const cache = new NodeCache();
const {
  callAPI,
  airdrop2_campaign,
  getSecretValue
} = require("../commonFunctions/apihelper");
const web3 = new Web3(providerUrl);
const web3BSC = new Web3("https://data-seed-prebsc-1-s1.bnbchain.org:8545"); // BNB provider
const web3ETH = new Web3("https://sepolia.infura.io/v3/6d85dd35424047948abfc350acfc36c2"); // ETH provider

const saltRounds = 10;

const APP_URL = process.env.APP_URL || "";
const TestStream_APP_RESETURL = process.env.TestStream_APP_RESETURL || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const AWS_KEYID = process.env.AWS_KEYID || "";
let onlineUsers = [];

const contractABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../lib/artifacts/contractABI.json"), "utf8")
);
const contractBytecode = fs.readFileSync(
  path.join(__dirname, "../lib/artifacts/contractBytecode.txt"),
  "utf8"
);

function isValidEmail(email) {
  const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailPattern.test(email);
}

router.post("/signup", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    console.log("user module signup", req.body);

    let isRequired = checkRequiredFields(["email", "userName", "password"], req.body);

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let fullname = req.body.name;
      let userEmail = req.body.email;
      let userName = req.body.userName.toLowerCase();
      let password = req.body.password;
      let pushToken = req.body.push_token;
      let deviceType = req.body.device_type;
      let steamId = req.body.steamId;
      let displayName = req.body.displayName;
      const isValid = isValidEmail(userEmail);

      if (isValid) {
        let isEmailExist = await userModel
          .findOne({ email: userEmail, emailVerification: true })
          .exec();
        console.log({ isEmailExist });
        let isUsernameExist = await userModel
          .findOne({ userName: userName, emailVerification: true })
          .exec();
        console.log(isUsernameExist);

        if (isEmailExist) {
          console.log("conflict email");
          let response = conflict("email");
          return res.json(response);
        } else if (isUsernameExist) {
          console.log("conflict userName");
          let response = conflict("userName");
          return res.json(response);
        } else {
          console.log("create new user,send otp on email and store it in user object");
          let signup_otp = generateRandomSixDigitNumber();
          console.log({ signup_otp });
          sendEmailNotification(userEmail, userName, signup_otp, "signup");
          if (isEmailExist == null) {
            console.log("email is not exist,create new user");

            bcrypt.hash(password, saltRounds, async function (err, hash) {
              console.log("password validation status", { err, hash });

              if (err) {
                throw new Error("internal server error");
              } else {
                let newUser = new userModel({
                  name: fullname,
                  userName: userName,
                  email: userEmail,
                  password: hash,
                  signupOtp: signup_otp,
                  role: "user",
                  push_token: pushToken,
                  device_type: deviceType,
                  steam: {
                    steamId,
                    displayName
                  }
                });

                let result = await newUser.save();
                console.log({ result });
                let { _id } = result;

                let signupDetails = new hyperIddetails({
                  userId: _id,
                  signupDetails: {
                    name: fullname,
                    userName: userName,
                    email: userEmail,
                    password: hash,
                    signupOtp: signup_otp,
                    role: "user",
                    push_token: pushToken,
                    device_type: deviceType
                  }
                });

                try {
                  let addsignupdetails = await signupDetails.save();
                  console.log("addsignupdetails", addsignupdetails);
                } catch (error) {
                  console.error("Error saving signup details:", error);
                }

                console.log("created,response", {
                  _id,
                  fullname,
                  userName,
                  userEmail
                });
                let response = success("new user created", {
                  _id,
                  fullname,
                  userName,
                  userEmail,
                  role: "user"
                });
                return res.json(response);
              }
            });
          } else {
            console.log("email found,updating other details.");

            bcrypt.hash(password, saltRounds, async function (err, hash) {
              console.log("passkey validation", { err, hash });

              let { _id } = isEmailExist;
              let updateData = {
                name: fullname,
                userName: userName,
                password: hash,
                signupOtp: signup_otp
              };

              let isUpdated = await userModel
                .findOneAndUpdate({ _id: _id }, updateData, { new: true })
                .exec();
              console.log({ isUpdated });
              let response = success("new user created", {
                _id,
                fullname,
                userName,
                userEmail
              });
              return res.json(response);
            });
          }
        }
      } else {
        console.log("invalid part called");
        let response = invalidEmail();
        return res.json(response);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.get("/token_transfer1", async (req, res) => {
  console.log("/token_transfer1");

  let checkFields = ["userId", "network", "to", "amount"];
  let isRequired = checkRequiredFields(checkFields, req.query);
  console.log({ isRequired });

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const { userId, network, to, amount } = req.query;
      const user = await userModel.findOne({ _id: userId }).exec();
      if (user) {
        const wallet = user.walletDetails.find(
          (w) => w.networkName.toLowerCase() === network.toLowerCase()
        );
        if (!wallet) {
          return res.json(
            notFound("Wallet for the specified network not found", "wallet_not_found")
          );
        }

        const privateKey = wallet.walletPrivateKey;
        const decrypt_privateKey = await decryptPrivateKey(privateKey);
        console.log("decrypt_key", decrypt_privateKey);

        if (!to || !amount) {
          let result = notFound(
            "Recipient address and amount are required",
            "missing_parameters"
          );
          return res.json(result);
        }

        let web3;
        if (network.toLowerCase() === "bnb") {
          web3 = web3BSC;
        } else if (network.toLowerCase() === "eth") {
          web3 = web3ETH;
        } else {
          return res.json(notFound("Unsupported network", "unsupported_network"));
        }

        web3.eth
          .getGasPrice()
          .then((gasPrice) => {
            const gasLimit = "21000";
            const transactionObject = {
              from: web3.eth.accounts.privateKeyToAccount(decrypt_privateKey).address,
              to: to,
              value: web3.utils.toWei(amount, "ether"),
              gas: gasLimit,
              gasPrice: gasPrice
            };

            web3.eth.accounts
              .signTransaction(transactionObject, decrypt_privateKey)
              .then((signedTransaction) => {
                return web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
              })
              .then((receipt) => {
                console.log(
                  "Transaction successful. Transaction hash:",
                  receipt.transactionHash
                );
                let result = success("Transaction successful", {
                  TransactionHash: receipt.transactionHash
                });
                return res.json(result);
              })
              .catch((err) => {
                console.error("Error sending transaction:", err);
                let result = notFound("Insufficient funds", err);
                return res.json(result);
              });
          })
          .catch((err) => {
            console.error("Error getting gas price:", err);
            let result = notFound("Error getting gas price", err);
            return res.json(result);
          });
      } else {
        let result = notFound("User not found", "user_not_found");
        return res.json(result);
      }
    } catch (err) {
      console.error("Internal server error:", err);
      let response = internalError();
      return res.json(response);
    }
  }
});

router.post("/checkDuplicate", async (req, res) => {
  try {
    let isRequired = checkRequiredFields(["searchField", "searchValue"], req.body);

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let field = req.body.searchField;
      let value = req.body.searchValue;
      console.log({ field, value });

      let query = {};
      query[field] = value;
      console.log("query", query);

      let isFieldExist = await userModel.findOne(query).exec();

      if (isFieldExist) {
        let response = conflict(field);
        return res.json(response);
      } else {
        let response = success(`${field} available`);
        return res.json(response);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/check_emailexists", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication_email_exists(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let isRequired = checkRequiredFields(["email"], req.body);
    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let email = req.body.email;
      let isEmailExist = await userModel
        .findOne({ email: email, emailVerification: true, isDeleted: false })
        .exec();
      if (isEmailExist) {
        let response = success(`Email exists.`);
        return res.json(response);
      } else {
        let response = success(`Email doesn't exist.`);
        return res.json(response);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/verifyOtp", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    console.log("user module otp", req.body);
    let isRequired = checkRequiredFields(["userId", "otp"], req.body);
    console.log({ isRequired });
    let isResignin = req.body?.resignin;

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let userId = req.body.userId;
      let otp = req.body.otp;
      console.log(userId, otp);

      let checkFields = { _id: userId, signupOtp: otp };
      let isUserVerified;

      if (isResignin) {
        isUserVerified = await userModel
          .findOne({ _id: userId, emailVerification: true })
          .exec();
        console.log("isUserVerified", isUserVerified);
        checkFields = { _id: userId, reSigninOtp: otp };

        console.log({ isUserVerified });
        if (isUserVerified == null) {
          console.log("user not verified");
          let result = error("email not registered", "not_found");
          return res.json(result);
        }
      }

      const resigninToken = createJwtToken({ userId });

      let updateStatus = await userModel
        .findOneAndUpdate(checkFields, { emailVerification: true }, { new: true })
        .exec();
      console.log(updateStatus);

      if (updateStatus == null) {
        let response = error("otp validation failed", "invalid_otp");
        return res.json(response);
      } else if (updateStatus["emailVerification"] == true) {
        let result;
        if (isResignin) {
          result = { _resigninToken: resigninToken };
        }
        let response = success("otp verified successfully", result);

        isUserVerified = await userModel
          .findOne({ _id: userId, emailVerification: true })
          .exec();
        console.log("isUserVerified", isUserVerified);

        const params = {
          action: "set_user_campaign_action",
          user_id: userId,
          campaign_action_id: "T_CREATE_ACCOUNT",
          campaign_id: "BINANCE_L3_2024"
        };
        callAPI(params);
        const param = {
          action: "create_new_user",
          user_id: userId,
          email: isUserVerified.email
        };
        const apiCall = callAPI(param);
        console.log("tracking_api2", apiCall);

        return res.json(response);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/delete", async (req, res) => {
  try {
    console.log("user module otp", req.body);
    let isRequired = checkRequiredFields(["userId"], req.body);
    console.log({ isRequired });
    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let userId = req.body.userId;
      let checkFields = { _id: userId };
      let userInfo = await userModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        let updateStatus = await userModel
          .findOneAndUpdate(checkFields, { isDeleted: true })
          .exec();
        let results = success("User deleted successfully.", {
          userId: updateStatus._id
        });
        return res.json(results);
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

router.post("/forgetPassword", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let isRequired = checkRequiredFields(["email"], req.body);

    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let email = req.body.email;
      let isUserVerified = await userModel
        .findOne({ email: email, emailVerification: true })
        .exec();
      let userId = isUserVerified._id;
      let userName = isUserVerified.userName;
      let weAppUrl = APP_URL + "resetpassword/" + btoa(userId) + "/" + btoa(Date.now);
      sendEmailNotification(email, userName, weAppUrl, "forgot_password");
      if (isUserVerified) {
        let results = success("Reset url send to your email.", {
          userId: userId
        });
        return res.json(results);
      } else {
        let result = error("email id not found", "email_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.error(err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/resetPassword", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("user module send otp", req.body);
  try {
    let isRequired = checkRequiredFields(["userId", "password"], req.body);

    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let userId = req.body.userId;
      let password = req.body.password;
      let userInfo = await userModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        bcrypt.hash(password, saltRounds, async function (err, hash) {
          console.log("passkey validation", { err, hash });
          let isUpdated = await userModel
            .findOneAndUpdate(
              { _id: userId, email: userInfo.email },
              { password: hash },
              { new: true }
            )
            .exec();
          let results = success("Password updated successfully.", {
            userId: isUpdated._id
          });
          return res.json(results);
        });
      } else {
        let result = error("userID id not found", "user_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.error({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.get("/userslist", async (req, res) => {
  let checkFields = [];
  let isRequired = checkRequiredFields(checkFields, req.query);
  if (isRequired) {
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const searchvalue = req.query.searchvalue || "";

      const searchQuery = {
        isDeleted: false,
        ...(searchvalue && {
          $or: [
            { email: { $regex: searchvalue, $options: "i" } },
            { userName: { $regex: searchvalue, $options: "i" } },
            { walletAddress: { $regex: searchvalue, $options: "i" } }
          ]
        })
      };

      const totalCount = await userModel.countDocuments(searchQuery);
      const allUserData = await userModel
        .find(searchQuery)
        .skip((page - 1) * limit)
        .limit(limit);

      const result = success("User list retrieval success", {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        user_details: allUserData
      });

      return res.json(result);
    } catch (error) {
      console.error(error);
      let response = internalError();
      return res.json(response);
    }
  }
});

router.post("/sendOtp", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let isRequired = checkRequiredFields(["email"], req.body);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let email = req.body.email;
      let userId = req.body.id;
      let userName = req.body.userName;
      let isResignin = req.body?.resignin;
      console.log({ email, userId, isResignin });

      let otp = generateRandomSixDigitNumber();
      if (!isResignin) {
        sendEmailNotification(email, userName, otp, "signup");
      }

      let updateField = { signupOtp: otp };
      let checkField = { _id: userId };

      if (isResignin) {
        console.log("resign in part called");

        updateField = { reSigninOtp: otp };
        checkField = { email: email };

        let isUserVerified = await userModel
          .findOne({ email: email, emailVerification: true })
          .exec();
        console.log({ isUserVerified });
        if (isUserVerified == null) {
          console.log("user not verified");
          let result = error("email not registered", "not_found");
          return res.json(result);
        } else {
          console.log("user already exist, generate link");
          const urlData = { email, userId: isUserVerified._id };
          const resigninToken = createJwtToken(urlData);
          const resetLink = TestStream_APP_RESETURL + resigninToken;
          console.log("reset link", resetLink);
          sendEmailNotification(email, userName, resetLink, "reset");
        }
      }

      let isUpdated = await userModel
        .findOneAndUpdate(checkField, updateField, { new: true })
        .exec();
      console.log({ isUpdated });
      const msg = isResignin ? "mail" : "otp";
      let response = success(`verification ${msg} sent to the user successfully`, {
        userId: isUpdated._id
      });
      return res.json(response);
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/changeMail", async (req, res) => {
  console.log("user module change mail", req.body);

  try {
    let isRequired = checkRequiredFields(["userId", "email"], req.body);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let userId = req.body.userId;
      let email = req.body.email;

      const isValid = isValidEmail(email);
      console.log({ isValid });

      if (isValid) {
        let isEmailExist = await userModel
          .findOne({ email: email, emailVerification: true })
          .exec();
        console.log({ isEmailExist });

        if (!isEmailExist) {
          let isUpdated = await userModel
            .findOneAndUpdate({ _id: userId }, { email: email }, { new: true })
            .exec();
          if (!isUpdated) {
            console.log("failed");
            let response = error("email not updated");
            return res.json(response);
          } else {
            console.log("mail id updated,send otp mail");
            let otp = generateRandomSixDigitNumber();
            sendSignupVerification(email, otp);
            await userModel
              .findOneAndUpdate({ _id: userId }, { signupOtp: otp }, { new: true })
              .exec();
            let response = success("verification mail sent to the new mail successfully");
            return res.json(response);
          }
        } else {
          console.log("conflict email");
          let response = conflict("email");
          return res.json(response);
        }
      } else {
        let response = invalidEmail();
        return res.json(response);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/login", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("user module login", req.body);

  try {
    const {
      email,
      password,
      steamId,
      displayName,
      profileurl,
      avatar,
      push_token,
      device_type
    } = req.body;

    // Check required fields
    const missingFields = checkRequiredFields(["email", "password"], req.body);
    if (missingFields) {
      console.log("send required fields response");
      return res.json(requiredParams(missingFields));
    }

    // Validate email
    if (!isValidEmail(email)) {
      return res.json(error("invalid email", "invalid_email"));
    }

    // Check if email exists and is verified
    const user = await userModel.findOne({ email, emailVerification: true }).exec();
    if (!user) {
      return res.json(error("email not registered", "not_found"));
    }

    // Check if the email is already linked to a different Steam account
    if (steamId) {
      if (user.steam.steamId && user.steam.steamId !== steamId) {
        return res.json(
          error(
            "This email is already connected to another Steam account",
            "steam_account_mismatch"
          )
        );
      }
    }

    // Check if the provided Steam ID is already linked to another email
    if (steamId) {
      const steamUser = await userModel.findOne({ "steam.steamId": steamId }).exec();
      if (steamUser && steamUser.email !== email) {
        return res.json(
          error(
            "This Steam account is already connected to another email",
            "steam_email_mismatch"
          )
        );
      }
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.json(error("incorrect pass, try again", "incorrect_key"));
    }

    // Prepare data for updates
    let updateData = {};
    if (user.push_token !== push_token) updateData.push_token = push_token;
    if (user.device_type !== device_type) updateData.device_type = device_type;

    // Update steam data if provided and not yet set
    if (steamId && (!user.steam.steamId || user.steam.steamId === steamId)) {
      updateData.steam = {
        steamId,
        displayName,
        profileUrl: profileurl,
        avatar
      };
    }

    // Update user if necessary
    if (Object.keys(updateData).length > 0) {
      await userModel.updateOne({ _id: user._id }, { $set: updateData }).exec();
    }

    let userData = {
      userId: user._id,
      email: user.email,
      fullname: user.name,
      userName: user.userName,
      role: user.role,
      walletAddress: user.walletAddress
    };

    // Build response data
    if (steamId) {
      userData.steam = {
        steamId,
        displayName,
        profileUrl: profileurl,
        avatar
      };
    }

    return res.json(success("sign in process success", userData));
  } catch (err) {
    console.log({ err });
    return res.json(internalError());
  }
});

router.post("/auth", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let isRequired = checkRequiredFields(
      ["email", "name", "provider", "providerId"],
      req.body
    );
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let { name, email, provider, providerId } = req.body;
      console.log({ name, email, provider, providerId });

      if (provider == "google") {
        let isUserExist = await userModel
          .findOne(
            { email: email, emailVerification: true },
            "_id name email emailVerification"
          )
          .exec();

        if (!isUserExist) {
          console.log("create", { email, name });

          let randomString = generateRandomString(5);

          let newUser = new userModel({
            email: email,
            name: name,
            userName: `${name}_${randomString}`,
            emailVerification: true
          });

          let providerInfo = {
            providerType: provider,
            providerId: providerId
          };

          newUser.socialProviders.push(providerInfo);

          let result = await newUser.save();
          console.log("user saved or not", result);
          let userId = result?._id;
          let userEmail = result?.email;

          if (userId && email) {
            let response = success("user authentication success", {
              userId,
              userEmail
            });
            return res.json(response);
          } else {
            throw new Error("not updated");
          }
        } else {
          console.log("user found");
          let userId = isUserExist?._id;
          let userEmail = isUserExist?.email;
          let verificationStatus = isUserExist?.emailVerification;
          console.log("type verification status", typeof verificationStatus);

          if (email && userId) {
            console.log("already verified");
            let response = success("user authentication success", {
              userId,
              userEmail
            });
            return res.json(response);
          } else {
            throw new Error("null");
          }
        }
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/auth/social", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    console.log("api reached in auth/fb");
    let isRequired = checkRequiredFields(["providerId"], req.body);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let providerId = req.body.providerId;
      let name = req.body.name || "user";
      let email = req.body.email;
      let provider = req.body.provider;
      let pictureUrl = req.body.pictureUrl || "";
      let gender = req.body.gender || "";
      let birthday = req.body.birthday || "";

      console.log({
        providerId,
        name,
        email,
        provider,
        pictureUrl,
        gender,
        birthday
      });

      if (email != "") {
        let isEmailExist = await userModel
          .findOne({ email: email, emailVerification: true })
          .exec();

        console.log("email status", isEmailExist);

        if (isEmailExist) {
          console.log("email alerady exist");

          let userId = isEmailExist?._id;
          let userEmail = isEmailExist?.email;

          const checkProviderExist = (element) => element.providerType == provider;

          let updateStatus = false;

          if (Array.isArray(isEmailExist.socialProviders)) {
            let isProviderExist = isEmailExist.socialProviders.some(checkProviderExist);
            console.log("isProviderExist :", isProviderExist);

            if (!isProviderExist) {
              console.log("add to social providers");
              updateStatus = true;
            } else {
              console.log("provider exist");
            }
          } else {
            console.log("not providers exist,add this provider");
            updateStatus = true;
          }

          if (updateStatus) {
            console.log("update status is true : add provider");

            let providerInfo = {
              providerType: provider,
              providerId: providerId,
              pictureUrl: pictureUrl,
              gender: gender
            };

            isEmailExist.socialProviders.push(providerInfo);
            let result = await isEmailExist.save();
            console.log("update status result", result);
          }

          let response = success("user authentication success", {
            userId,
            userEmail,
            walletAddress: isEmailExist.walletAddress,
            walletQRCode: isEmailExist.walletQRCode,
            isEmailExist
          });
          return res.json(response);
        } else {
          console.log("email not exist , create new user");

          let randomString = generateRandomString(5);
          let prefix = generateRandomString(3);

          let userName = name != "" ? name.split(" ").join("_") : prefix;

          let newUser = new userModel({
            email: email,
            name: name,
            userName: `${userName}_${randomString}`,
            emailVerification: true,
            signupType: provider
          });

          let providerInfo = {
            providerType: provider,
            providerId: providerId,
            pictureUrl: pictureUrl,
            gender: gender
          };

          newUser.socialProviders.push(providerInfo);

          let result = await newUser.save();
          await createWalletForUser(result._id);
          const updatedUser = await userModel.findById(result._id).exec();
          console.log("user saved or not", result);

          let userId = result?._id;
          // let userEmail = result?.email;

          if (userId && email) {
            await createWalletForUser(userId);
            let response = success("user authentication success and wallet created", {
              userId: updatedUser._id,
              userEmail: updatedUser.email,
              walletAddress: updatedUser.walletAddress,
              walletQRCode: updatedUser.walletQRCode,
              result: updatedUser
            });
            return res.json(response);
          } else {
            throw new Error("not updated");
          }
        }
      } else {
        console.log("Email not provided !, check provider id in facebook ");

        const checkDocuments = await userModel.findOne({
          socialProviders: {
            $elemMatch: {
              providerType: provider,
              providerId: providerId
            }
          },
          emailVerification: true
        });

        console.log("doc available or not", checkDocuments);

        if (checkDocuments) {
          console.log("Matching document:", checkDocuments);
          let response = success("user authentication success", checkDocuments);
          return res.json(response);
        } else {
          console.log("No matching document found,create new user");

          let randomString = generateRandomString(5);

          let userName = name.split(" ").join("_");

          let newUser = new userModel({
            name: name,
            userName: `${userName}_${randomString}`,
            emailVerification: true,
            signupType: provider
          });

          let providerInfo = {
            providerType: provider,
            providerId: providerId,
            pictureUrl: pictureUrl,
            gender: gender
          };

          newUser.socialProviders.push(providerInfo);

          let result = await newUser.save();
          await createWalletForUser(result._id);

          const updatedUser = await userModel.findById(result._id).exec();
          console.log("user saved or not", result);
          console.log("check update", updatedUser);

          let userId = result?._id;

          if (userId) {
            let response = success("user authentication success and wallet created", {
              userId: updatedUser._id,
              walletAddress: updatedUser.walletAddress,
              walletQRCode: updatedUser.walletQRCode,
              result: updatedUser
            });
            return res.json(response);
          } else {
            throw new Error("not updated");
          }
        }
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/zealy_email_check", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication_email_exists(server);
  console.log("checking");
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let isRequired = checkRequiredFields(["email", "option"], req.body);
    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let email = req.body.email;
      let option = req.body.option;
      let isEmailExist = await userModel
        .findOne({ email: email, emailVerification: true, isDeleted: false })
        .exec();
      if (isEmailExist) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59
        let resdata = {};
        if (option == 1) {
          let live_stream = false;
          let stream_datils = await streamModel
            .aggregate([
              {
                $match: {
                  $or: [
                    { streamType: "gamestream" },
                    { streamType: "mobilelivestream" },
                    { streamType: "mobilegamestream" },
                    { streamType: "livestream" }
                  ],
                  stream_source: "zegocloud",
                  userId: isEmailExist._id,
                  createdAt: {
                    $gte: startOfDay,
                    $lte: endOfDay
                  }
                }
              },
              {
                $lookup: {
                  from: "stream_comments",
                  localField: "_id",
                  foreignField: "streamId",
                  as: "StreamComments"
                }
              }
            ])
            .exec();
          stream_datils.forEach(function (datas) {
            if (
              typeof datas?.stream_duration !== "undefined" &&
              parseInt(datas?.stream_duration) >= 5
            ) {
              console.log("userCheckindddds", datas?.stream_duration);
              live_stream = true; // Update live_stream flag to true if there is data
            }
          });
          resdata = { go_live: live_stream };
        } else if (option == 2) {
          let stream_datils = await streamModel
            .aggregate([
              {
                $match: {
                  $or: [
                    { streamType: "gamestream" },
                    { streamType: "mobilelivestream" },
                    { streamType: "mobilegamestream" },
                    { streamType: "livestream" }
                  ],
                  streamStatus: "Active",
                  userId: isEmailExist._id,
                  createdAt: {
                    $gte: startOfDay, // Greater than or equal to start of today
                    $lte: endOfDay // Less than or equal to end of today
                  }
                }
              },
              {
                $lookup: {
                  from: "stream_comments", // Name of the other collection
                  localField: "_id", // Field from streamModel to join on
                  foreignField: "streamId", // Field from the other collection to match
                  as: "StreamComments" // Output array field for joined data
                }
              }
            ])
            .exec();
          let reals = false;
          if (stream_datils?.length > 0) {
            reals = true; // Update live_stream flag to true if there is data
            resdata = { create_reel: reals };
          } else {
            reals = false; // Ensure false when no stream details
            resdata = { create_reel: reals };
          }
        } else if (option == 3) {
          let stream_datils = await streamModel
            .aggregate([
              {
                $match: {
                  $or: [
                    { streamType: "gamestream" },
                    { streamType: "mobilelivestream" },
                    { streamType: "mobilegamestream" },
                    { streamType: "livestream" }
                  ],
                  stream_source: "zegocloud",
                  createdAt: {
                    $gte: startOfDay, // Greater than or equal to start of today
                    $lte: endOfDay // Less than or equal to end of today
                  }
                }
              },
              {
                $addFields: {
                  _idString: { $toString: "$_id" } // Convert ObjectId to string
                }
              },
              {
                $lookup: {
                  from: "stream_comments", // Name of the comments collection
                  localField: "_idString", // Field from streamModel to join on
                  foreignField: "streamId", // Field from stream_comments to match
                  as: "StreamComments" // Output array field for joined data
                }
              },
              {
                $unwind: "$StreamComments" // Unwind the array to treat each comment individually
              },
              {
                // $match: {
                //   "StreamComments.userId": isEmailExist._id  // Check userId in the stream_comments collection
                // }
                $match: {
                  "StreamComments.userId": isEmailExist._id // Check userId in the stream_comments collection
                  // "StreamComments.createdAt": {
                  //   $gte: startOfDay, // Match comments created after start of the day
                  //   $lte: endOfDay,   // and before the end of the day
                  // },
                }
              },

              {
                $group: {
                  _id: "$_id", // Group by the original stream ID
                  streamType: { $first: "$streamType" }, // Preserve other fields
                  createdAt: { $first: "$createdAt" },
                  StreamComments: { $push: "$StreamComments" } // Regroup the matched comments
                }
              }
            ])
            .exec();
          console.log("stream_datils3", stream_datils);
          if (stream_datils && stream_datils?.length > 0) {
            resdata = { interact_with_livestream: true };
          } else {
            resdata = { interact_with_livestream: false };
          }
          console.log("data_check", stream_datils);
        } else if (option == 4) {
          console.log("option 4");

          let stream_datils = await streamModel
            .aggregate([
              {
                $match: {
                  $or: [
                    { streamType: "gamestream" },
                    { streamType: "mobilelivestream" },
                    { streamType: "mobilegamestream" },
                    { streamType: "livestream" }
                  ],
                  isLive: false
                  // createdAt: {
                  //   $gte: startOfDay,  // Greater than or equal to start of today
                  //   $lte: endOfDay,    // Less than or equal to end of today
                  // },
                }
              },
              {
                $addFields: {
                  _idString: { $toString: "$_id" } // Convert ObjectId to string
                }
              },
              {
                $lookup: {
                  from: "stream_comments", // Name of the comments collection
                  localField: "_idString", // Field from streamModel to join on
                  foreignField: "streamId", // Field from stream_comments to match
                  as: "StreamComments" // Output array field for joined data
                }
              },
              {
                $unwind: "$StreamComments" // Unwind the array to treat each comment individually
              },
              {
                $match: {
                  "StreamComments.userId": isEmailExist._id, // Check userId in the stream_comments collection
                  "StreamComments.createdAt": {
                    $gte: startOfDay, // Match comments created after start of the day
                    $lte: endOfDay // and before the end of the day
                  }
                }
              },
              {
                $group: {
                  _id: "$_id", // Group by the original stream ID
                  streamType: { $first: "$streamType" }, // Preserve other fields
                  createdAt: { $first: "$createdAt" },
                  StreamComments: { $push: "$StreamComments" } // Regroup the matched comments
                }
              }
            ])
            .exec();
          console.log("stream_datils4", stream_datils);
          if (stream_datils && stream_datils?.length > 0) {
            resdata = { interact_with_reels: true };
          } else {
            resdata = { interact_with_reels: false };
          }
        } else if (option == 5) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(startOfDay.getDate() - 7);
          let productDetails = await productModel
            .findOne({
              productOwner: isEmailExist._id,
              createdAt: {
                $gte: sevenDaysAgo, // Greater than or equal to 7 days ago
                $lte: new Date() // Less than or equal to now (current time)
              }
            })
            .exec();
          let assets_count = false;
          if (productDetails) {
            assets_count = true;
          }
          resdata = { mint_asset: assets_count };
        } else if (option == 6) {
          let userCheckin = await checkinModel
            .findOne({
              userId: isEmailExist._id,
              createdAt: {
                $gte: startOfDay, // Greater than or equal to start of today
                $lte: endOfDay // Less than or equal to end of today
              }
            })
            .exec();

          let user_checkin_count = false;
          if (userCheckin) {
            user_checkin_count = true;
          }
          resdata = { daily_check_in: user_checkin_count };
        } else if (option == 7) {
          let profile_picture = false;
          if (isEmailExist?.profileImgUrl != "" && isEmailExist?.profileImgUrl != null) {
            profile_picture = true;
          }
          resdata = { profile_picture: profile_picture };
        }
        let response = success("Zealy Details", resdata);
        return res.json(response);
      } else {
        let resdata = {};
        if (option == 1) {
          resdata = { go_live: false };
        } else if (option == 2) {
          resdata = { create_reel: false };
        } else if (option == 3) {
          resdata = { interact_with_livestream: false };
        } else if (option == 4) {
          resdata = { interact_with_reels: false };
        } else if (option == 5) {
          resdata = { mint_asset: false };
        } else if (option == 6) {
          resdata = { daily_check_in: false };
        } else if (option == 7) {
          resdata = { profile_picture: false };
        }
        let response = success("Zealy Details", resdata);
        return res.json(response);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

async function createWalletForUser(userId) {
  const existingUser = await userModel.findById(userId);

  if (existingUser && existingUser.walletAddress && existingUser.walletPrivateKey) {
    console.log("Wallet already exists for the user");
    return; // Exit if the user already has a wallet
  } else {
    const newWallet = web3.eth.accounts.create();
    const newWalletAddress = newWallet.address;
    const newWalletPrivateKey = newWallet.privateKey;
    console.log("newWalletAddress", newWalletAddress);
    console.log("newWalletkey", newWalletPrivateKey);

    const params = {
      KeyId: process.env.AWS_KEYID,
      Plaintext: newWalletPrivateKey
    };

    try {
      const encryptedData = await kms.encrypt(params).promise();
      const encryptedPrivateKey = encryptedData.CiphertextBlob.toString("base64");
      console.log("encryptedPrivateKey", encryptedPrivateKey);

      const qrCodeData = await qrcode.toDataURL(newWalletAddress);
      console.log("QR Code Data", qrCodeData);

      const updatedUserData = {
        walletAddress: newWalletAddress,
        walletPrivateKey: encryptedPrivateKey,
        walletQRCode: qrCodeData
      };

      await userModel.findByIdAndUpdate(userId, updatedUserData, { new: true });
      console.log("New wallet address:", newWalletAddress);
      console.log("QR Code:", qrCodeData);
    } catch (error) {
      console.error("Error updating wallet address:", error);
      throw new Error("Error updating wallet address");
    }
  }
}

const API_KEY = "H79KJ3XU8499AR2EUB6X126355RQFUAHBJ";
const API_URL_PRICE =
  "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd";

async function getNftTransactions(walletAddress) {
  const API_URL_NFT = `https://api-testnet.bscscan.com/api?module=account&action=tokennfttx&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
  try {
    const response = await axios.get(API_URL_NFT);
    if (response.data.status === "1") {
      const transactions = response.data.result;
      console.log("NFT Transactions:", transactions);
      return transactions;
    } else {
      console.log(
        "No NFT transactions found or there was an error:",
        response.data.message
      );
      return [];
    }
  } catch (error) {
    console.error("Error fetching NFT transactions:", error);
    return [];
  }
}

async function getWalletBalance(walletAddress) {
  const API_URL_BALANCE = `https://api-testnet.bscscan.com/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${API_KEY}`;
  try {
    const response = await axios.get(API_URL_BALANCE);
    if (response.data.status === "1") {
      const balanceWei = response.data.result;
      const balanceBNB = balanceWei / Math.pow(10, 18);
      console.log("Wallet Balance:", balanceBNB);
      return balanceBNB;
    } else {
      console.log("Error fetching wallet balance:", response.data.message);
      return "0";
    }
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return "0";
  }
}

async function getBnbPrice() {
  try {
    const response = await axios.get(API_URL_PRICE);
    return response.data.binancecoin.usd;
  } catch (error) {
    console.error("Error fetching BNB price:", error);
    return 0;
  }
}

// async function getWalletTransactions(walletAddress) {
//   const API_URL_TX = `https://api-testnet.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
//   try {
//     const response = await axios.get(API_URL_TX);
//     if (response.data.status === "1") {
//       const bnbPrice = await getBnbPrice();
//       const transactions = response.data.result.map(tx => {
//         const valueBNB = tx.value / Math.pow(10, 18);
//         const valueUSD = (valueBNB * bnbPrice).toFixed(2);
//         return {
//           ...tx,
//           valueBNB: valueBNB.toFixed(4),
//           valueUSD: valueUSD,
//           summary: `Send ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`
//         };
//       });
//       console.log('Wallet Transactions:', transactions);
//       return transactions;
//     } else {
//       console.log('No wallet transactions found or there was an error:', response.data.message);
//       return [];
//     }
//   } catch (error) {
//     console.error('Error fetching wallet transactions:', error);
//     return [];
//   }
// }

// async function getWalletTransactions(walletAddress) {
//     const API_URL_TX = `https://api-testnet.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
//     try {
//       const response = await axios.get(API_URL_TX);
//       if (response.data.status === "1") {
//         const bnbPrice = await getBnbPrice();
//         const transactions = response.data.result.map(tx => {
//           const valueBNB = tx.value / Math.pow(10, 18);
//           const valueUSD = (valueBNB * bnbPrice).toFixed(2);
//           let summary;

//           if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
//             summary = `Send ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`;
//           } else if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
//             summary = `Received ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`;
//           } else {
//             summary = `Transaction ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`;
//           }

//           return {
//             ...tx,
//             valueBNB: valueBNB.toFixed(4),
//             valueUSD: valueUSD,
//             summary: summary
//           };
//         });
//         console.log('Wallet Transactions:', transactions);
//         return transactions;
//       } else {
//         console.log('No wallet transactions found or there was an error:', response.data.message);
//         return [];
//       }
//     } catch (error) {
//       console.error('Error fetching wallet transactions:', error);
//       return [];
//     }
//   }

// async function getWalletTransactions(walletAddress) {
//     const API_URL_TX = `https://api-testnet.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
//     try {
//       const response = await axios.get(API_URL_TX);
//       if (response.data.status === "1") {
//         const bnbPrice = await getBnbPrice();
//         const transactions = response.data.result.map(tx => {
//           const valueBNB = tx.value / Math.pow(10, 18);
//           const valueUSD = (valueBNB * bnbPrice).toFixed(2);
//           let summary;

//           if (tx.methodId === "0xd204c45e") {
//             summary = `Safe Mint - Confirmed $${valueUSD} USD`;
//           } else if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
//             summary = `Send ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`;
//           } else if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
//             summary = `Received ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`;
//           } else {
//             summary = `Transaction ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`;
//           }

//           return {
//             ...tx,
//             valueBNB: valueBNB.toFixed(4),
//             valueUSD: valueUSD,
//             summary: summary
//           };
//         });
//         console.log('Wallet Transactions:', transactions);
//         return transactions;
//       } else {
//         console.log('No wallet transactions found or there was an error:', response.data.message);
//         return [];
//       }
//     } catch (error) {
//       console.error('Error fetching wallet transactions:', error);
//       return [];
//     }
//   }

async function getWalletTransactions(walletAddress) {
  const API_URL_TX = `https://api-testnet.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
  try {
    const response = await axios.get(API_URL_TX);
    if (response.data.status === "1") {
      const bnbPrice = await getBnbPrice();
      const transactions = response.data.result.map((tx) => {
        const valueBNB = tx.value / Math.pow(10, 18);
        const valueUSD = (valueBNB * bnbPrice).toFixed(2);
        let summary;

        if (tx.methodId === "0xd204c45e") {
          summary = `Safe Mint - Confirmed $${valueUSD} USD`;
        } else if (
          tx.methodId === "0x42842e0e" ||
          (tx.contractAddress && tx.tokenID !== undefined)
        ) {
          summary = `Safe Transfer - Confirmed ${tx.tokenName} (${tx.tokenSymbol})`;
        } else if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
          summary = `Send ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`;
        } else if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
          summary = `Received ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`;
        } else {
          summary = `Transaction ${valueBNB.toFixed(4)} BNB - Confirmed $${valueUSD} USD`;
        }

        return {
          ...tx,
          valueBNB: valueBNB.toFixed(4),
          valueUSD: valueUSD,
          summary: summary
        };
      });
      console.log("Wallet Transactions:", transactions);
      return transactions;
    } else {
      console.log(
        "No wallet transactions found or there was an error:",
        response.data.message
      );
      return [];
    }
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return [];
  }
}

router.post("/callnftTransactions", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  let checkFields = ["userId"];

  let isRequired = checkRequiredFields(checkFields, req.body);
  console.log("Params", req.body);

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const { userId } = req.body;
      console.log({ userId });
      let user = await userModel.findOne({ _id: userId }).exec();
      if (user && user.walletDetails && user.walletDetails.length > 0) {
        const walletAddress = user.walletDetails[1].walletAddress;
        const nftTransactions = await getNftTransactions(walletAddress);
        const walletBalance = await getWalletBalance(walletAddress);
        const walletTransactions = await getWalletTransactions(walletAddress);

        res.json({
          nftTransactions,
          walletBalance,
          walletTransactions
        });
      } else {
        res.status(404).send("User or wallet address not found");
      }
    } catch (error) {
      res.status(500).send(error.message);
    }
  }
});

router.post("/checkin", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  let checkFields = ["userId"];

  let isRequired = checkRequiredFields(checkFields, req.body);
  console.log("Params", req.body);

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const { userId } = req.body;
      console.log({ userId });
      let user = await userModel.findOne({ _id: userId }).exec();
      if (user) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59
        let checkins = await checkinModel
          .findOne({
            userId: userId,
            createdAt: {
              $gte: startOfDay, // Greater than or equal to start of today
              $lte: endOfDay // Less than or equal to end of today
            }
          })
          .exec();
        if (!checkins) {
          let checkindata = new checkinModel({
            userId: userId
          });
          let checkinresult = await checkindata.save();
          const result = success(
            "Thanks for checking-in, visit our Zealy page to claim your rewards.",
            {
              checkins: checkinresult
            }
          );
          return res.json(result);
        } else {
          const result = success(
            "Thanks for checking-in, visit our Zealy page to claim your rewards."
          );
          return res.json(result);
        }
      } else {
        res.status(404).send("UserId not found");
      }
    } catch (error) {
      res.status(500).send(error.message);
    }
  }
});

router.post("/changePassword", async (req, res) => {
  console.log("reached change password api");
  try {
    let isRequired = checkRequiredFields(["passkey", "resigninkey"], req.body);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const passkey = req.body.passkey;
      const jwtToken = req.body.resigninkey;

      let isValid = verifyJwtToken(jwtToken);

      if (isValid != false) {
        console.log("jwt token verfied,change password");

        let userId = isValid?.userId;
        let email = isValid?.email;

        if (userId && email) {
          bcrypt.hash(passkey, saltRounds, async function (err, hash) {
            if (err) {
              console.log({ err });
              let response = internalError();
              return res.json(response);
            }

            const isUpdated = await userModel
              .findOneAndUpdate(
                { _id: userId, email: email },
                { password: hash },
                { new: true }
              )
              .exec();
            console.log("isUpdated", isUpdated);
            let result = success("user details updated", {
              userId: isUpdated._id
            });
            return res.json(result);
          });
        } else {
          console.log("not a vaid userid,email");
          let result = error("invalid token provided", "invalid_token");
          return res.json(result);
        }
      } else if (isValid == false) {
        console.log("not a vaid jwt token");
        let result = notFound("invalid token provided", "invalid_token");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

const contract = new web3.eth.Contract(contractABI);

function getSourceCode() {
  console.log("getSourceCode");
  return new Promise((resolve, reject) => {
    const sourceCodePath = path.join(__dirname, ".", "sourcecode.txt");
    console.log("sourceCodePath", sourceCodePath);
    fs.readFile(sourceCodePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function verifyContractOnBscScan(
  contractAddress,
  contractABI,
  contractBytecode,
  sourceCode,
  constructorArguments
) {
  const verifyURL = `https://api.etherscan.io/api`;

  const params = {
    apikey: BSCSCAN_API_KEY,
    module: "contract",
    action: "verifysourcecode",
    contractaddress: contractAddress,
    sourceCode: sourceCode,
    codeformat: "solidity-single-file",
    contractname: "TestStream", // Update to your contract name
    compilerversion: "v0.8.20+commit.a1b79de6", // Update to your contract's compiler version
    optimizationUsed: 1, // Set to 1 if you used optimization, 0 otherwise
    runs: 200, // The optimization runs parameter, if optimization was used
    constructorArguments: constructorArguments
  };

  try {
    const response = await axios.post(verifyURL, null, { params });
    console.log("BscScan response:", response.data);

    if (response.data.status === "1") {
      console.log("Contract verification submitted successfully:", response.data.result);
      return {
        status: "success",
        message: "Contract verification submitted successfully."
      };
    } else {
      console.error("Error verifying contract:", response.data.result);
      return {
        status: "error",
        message: "Error verifying contract: " + response.data.result
      };
    }
  } catch (error) {
    console.error("Error verifying contract:", error);
    return {
      status: "error",
      message: "Error verifying contract: " + error.message
    };
  }
}

async function deployContract(account, decrypt_key) {
  try {
    console.log("deployContract");
    const gasPrice = await web3.eth.getGasPrice();
    const gas = await contract.deploy({ data: contractBytecode }).estimateGas();
    const nonce = await web3.eth.getTransactionCount(account);

    const privateKey = decrypt_key;
    console.log("deploy_function", privateKey);

    const txObject = {
      nonce: nonce,
      from: account,
      gas: gas,
      gasPrice: gasPrice,
      data: contractBytecode
    };

    const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);
    const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log("Contract deployed at address:", result.contractAddress);
    return { status: "success", contractAddress: result.contractAddress };
  } catch (error) {
    console.error("Error deploying contract:", error);
    let errorMessage;

    if (error.reason && error.reason.includes("insufficient funds for gas")) {
      errorMessage = "Insufficient funds for gas";
    } else {
      errorMessage = "Error deploying contract: " + error.message;
    }

    return { status: "error", statusCode: 400, message: errorMessage };
  }
}

async function decryptPrivateKey(encryptedPrivateKeyBase64) {
  const params = {
    CiphertextBlob: Buffer.from(encryptedPrivateKeyBase64, "base64")
  };

  try {
    const data = await kms.decrypt(params).promise();
    const decryptedPrivateKey = data.Plaintext.toString("utf-8");
    console.log("Decrypted Private Key:", decryptedPrivateKey);
    return decryptedPrivateKey;
  } catch (error) {
    console.error("Error decrypting the private key:", error);
    throw error;
  }
}

router.post("/updateUserCategory", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    console.log("/updateUserCategory");

    let checkFields = [
      "userId",
      "userCategory",
      "storeName",
      "linkInstagram",
      "linkX",
      "account"
    ];

    let isRequired = checkRequiredFields(checkFields, req.body);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let userCategory = req.body.userCategory;
      let storeName = req.body.storeName;
      let userId = req.body.userId;
      let linkInstagram = req.body.linkInstagram;
      let linkX = req.body.linkX;
      let linkYoutube = req.body.linkYoutube;
      let otherLink = req.body.otherLink;
      let account = req.body.account;
      let findQuery = { _id: userId };

      const user = await userModel.findOne(findQuery).exec();
      if (!user) {
        let response = internalError();
        return res.json(response);
      }

      const contractAddress = user.contractAddress;
      if (contractAddress) {
        console.log("Contract already exists:", contractAddress);
        let result = notFound("Contract already exists", {
          userId: user._id,
          contractAddress: contractAddress
        });
        return res.json(result);
      } else {
        const encrypt_key = user.walletPrivateKey;
        console.log("encrypt_key", encrypt_key);
        const decrypt_key = await decryptPrivateKey(encrypt_key);
        console.log("decrypt_key", decrypt_key);

        const deployResult = await deployContract(account, decrypt_key);

        if (deployResult.status === "success") {
          const newContractAddress = deployResult.contractAddress;

          let updateFields = {
            role: userCategory,
            storeName: storeName,
            linkInstagram: linkInstagram,
            linkX: linkX,
            linkYoutube: linkYoutube,
            otherLink: otherLink,
            contractAddress: newContractAddress
          };

          const updateUserDetails = await userModel
            .findOneAndUpdate(findQuery, updateFields, { new: true })
            .exec();

          if (updateUserDetails) {
            const contractSourceCode = await getSourceCode();
            const constructorArguments = ""; // Make sure these arguments match your constructor
            const verifyResult = await verifyContractOnBscScan(
              newContractAddress,
              contractABI,
              contractBytecode,
              contractSourceCode,
              constructorArguments
            );

            if (verifyResult.status === "success") {
              let result = success(
                "User details updated and contract deployed and verified",
                {
                  userId: updateUserDetails._id,
                  contractAddress: newContractAddress
                }
              );
              return res.json(result);
            } else {
              let result = success(
                "User details updated and contract deployed but verification failed",
                {
                  userId: updateUserDetails._id,
                  contractAddress: newContractAddress,
                  verificationError: verifyResult.message
                }
              );
              return res.json(result);
            }
          } else {
            let response = internalError();
            return res.json(response);
          }
        } else {
          return res.json(deployResult);
        }
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/followers", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("followers");

  let checkFields = ["userId", "followerId"];
  let isRequired = checkRequiredFields(checkFields, req.body);
  console.log({ isRequired });

  if (isRequired.length > 0) {
    console.log("Missing required fields:", isRequired);
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    const userId = req.body.userId;
    const followerId = req.body.followerId;

    try {
      const user = await userModel.findOne({ _id: userId }).exec();
      if (!user) {
        console.log("User not found:", userId);
        let response = internalError();
        return res.json(response);
      }

      if (!user.followers.includes(followerId)) {
        user.followers.push(followerId);
        user.followersCount = user.followers.length;
        await user.save();
        console.log("Follower added to user:", userId);

        const follower = await userModel.findOne({ _id: followerId }).exec();
        if (follower && !follower.following.includes(userId)) {
          follower.following.push(userId);
          follower.followingCount = follower.following.length;
          await follower.save();
          console.log("User added to following list of:", followerId);
        }
      }

      let result = success("Follower added successfully", { _id: user._id });
      console.log(result);
      return res.json(result);
    } catch (error) {
      console.log({ error });
      let response = internalError();
      return res.json(response);
    }
  }
});

router.post("/unfollow", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("followers");

  let checkFields = ["userId", "followerId"];
  let isRequired = checkRequiredFields(checkFields, req.body);
  console.log({ isRequired });

  if (isRequired.length > 0) {
    console.log("Missing required fields:", isRequired);
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    const userId = req.body.userId;
    const followerId = req.body.followerId;

    try {
      const user = await userModel.findOne({ _id: userId }).exec();
      const follower = await userModel.findOne({ _id: followerId }).exec();
      if (!user) {
        console.log("User not found:", userId);
        let response = internalError();
        return res.json(response);
      }
      if (!follower) {
        console.log("Follwer not found:", userId);
        let response = internalError();
        return res.json(response);
      }
      const docWithItem = await userModel.findOne({
        _id: userId, // Filter
        followers: followerId // Check if item exists in the array
      });
      if (docWithItem) {
        await userModel.updateOne(
          { _id: userId }, // Filter
          {
            $pull: { followers: followerId },
            $set: { followersCount: user.followers.length - 1 }
          } // Remove item from array
        );
      }
      const docWithItem1 = await userModel.findOne({
        _id: followerId, // Filter
        following: userId // Check if item exists in the array
      });
      if (docWithItem1) {
        await userModel.updateOne(
          { _id: followerId }, // Filter
          {
            $pull: { following: userId },
            $set: { followingCount: follower.following.length - 1 }
          } // Remove item from array
        );
      }
      let result = success("User unfollowed successfully", { _id: user._id });
      console.log(result);
      return res.json(result);
    } catch (error) {
      console.log({ error });
      let response = internalError();
      return res.json(response);
    }
  }
});

router.post("/purchases", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  //involved collections : userModel -> PaymentModel -> ProductModel
  //aggregationflow : userModel._id -> {userId: userModel._id} -> {_id:PaymentModel.productId}

  let checkFields = ["userId"];

  let isRequired = checkRequiredFields(checkFields, req.body);
  console.log({ isRequired });

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const { userId } = req.body;
      console.log({ userId });
      const userIdObj = new Types.ObjectId(userId);
      console.log({ userIdObj });
      let searchKey = req.query.searchKey || "";
      // Check if searchKey is provided, and add regex search for productName
      let searchFilter = {}; // Define an empty search filter object
      let orFilterArray = []; // To store the OR conditions for filters
      let gameFilterIncludeKey = req.query.gameFilterIncludeKey || ""; //pubg , fortnite, ragnarok
      let gameFilterExcludeKey = req.query.gameFilterExcludeKey || "";
      // Check if searchKey is provided, and add regex search for productName
      if (searchKey && searchKey !== "") {
        searchFilter.productName = { $regex: new RegExp(searchKey, "i") }; // Case-insensitive search
      }

      // Handling gameFilterIncludeKey
      if (gameFilterIncludeKey) {
        gameFilterIncludeKey = gameFilterIncludeKey.split(",");

        let keywordFilter = {
          productKeywords: { $in: gameFilterIncludeKey }
        };

        let variantFilter = {
          variation: { $in: gameFilterIncludeKey }
        };

        orFilterArray.push(keywordFilter, variantFilter); // Add to OR conditions
      }

      // Handling gameFilterExcludeKey
      if (gameFilterExcludeKey) {
        gameFilterExcludeKey = gameFilterExcludeKey.split(",");

        let keywordExcludeFilter = {
          productKeywords: { $nin: gameFilterExcludeKey }
        };

        let variantExcludeFilter = {
          variation: { $nin: gameFilterExcludeKey }
        };

        orFilterArray.push(keywordExcludeFilter, variantExcludeFilter); // Add to OR conditions
      }

      // If there are OR filters, combine them with the existing searchFilter
      if (orFilterArray.length > 0) {
        let orFilter = { $or: orFilterArray };
        searchFilter = { ...searchFilter, ...orFilter };
      }
      let userInfo = await userModel.findOne({ _id: userIdObj }).exec();
      console.log("userInfo", userInfo);
      if (!userInfo) {
        return res.json(notFound("User not found"));
      }
      const contractAddress = userInfo.contractAddress;
      console.log({ contractAddress });

      const purchasedProducts = await paymentModel
        .find({ userId, status: "Paid" })
        .populate({
          path: "paymentInfo.sku",
          model: "Product",
          match: searchFilter,
          // select: "productName availableStock productImages"
          select: "-__v"
        })
        .sort({ createdAt: -1 })
        .exec();

      const paymentInfoObjects = purchasedProducts.map((item) => item.paymentInfo);

      console.log(
        "paymentInfoObjects",
        paymentInfoObjects,
        "****************************"
      );

      // let modifiedPurchasedProducts = paymentInfoObjects.flat();

      let modifiedPurchasedProducts = paymentInfoObjects
        .flat()
        .filter((item) => item && item.sku);
      // const aggregationResult = await userModel.aggregate([
      //     {
      //       $match: {
      //         _id: userIdObj
      //       }
      //     },
      //     {
      //       $lookup: {
      //         from: 'payments',
      //         localField: '_id',
      //         foreignField: 'userId',
      //         as: 'totalPayments'
      //       }
      //     },
      //     { $unwind: '$totalPayments' },
      //     {
      //       $match: {
      //         $and: [
      //           { 'totalPayments.productId': { $exists: true, $ne: [] } },
      //           { 'totalPayments.status': 'Paid' }
      //         ]
      //       }
      //     },
      //     { $unwind: '$totalPayments.productId' },
      //     {
      //       $lookup: {
      //         from: 'products',
      //         localField: 'totalPayments.productId',
      //         foreignField: '_id',
      //         as: 'purchasedProducts'
      //       }
      //     },
      //     { $unwind: '$purchasedProducts' },
      //     {
      //       $group: {
      //         _id: '$_id',
      //         allPurchasedProducts: {
      //           $addToSet: '$purchasedProducts'
      //         }
      //       }
      //     }
      //   ], { maxTimeMS: 60000, allowDiskUse: true });

      // console.log(JSON.stringify(aggregationResult),typeof aggregationResult[0].allPurchasedProducts);

      if (modifiedPurchasedProducts.length > 0) {
        let result = success("purchased products retrieval success", {
          products: modifiedPurchasedProducts,
          contractAddress
        });
        return res.json(result);
      } else {
        let result = notFound("no products found");
        return res.json(result);
      }
    } catch (err) {
      console.log("error", err);
      let response = internalError();
      return res.json(response);
    }
  }
});

router.get("/transactionhistory", async (req, res) => {
  let checkFields = ["userId"];

  let isRequired = checkRequiredFields(checkFields, req.query);
  console.log({ isRequired });

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const { userId } = req.query;
      console.log({ userId });
      const userId_tofetch = req.query.userId;

      const transactionHistory = await paymentModel
        .aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId_tofetch) } },
          { $unwind: "$productId" },
          {
            $lookup: {
              from: "products",
              localField: "productId",
              foreignField: "_id",
              as: "productdetails"
            }
          },
          { $unwind: "$productdetails" },
          {
            $group: {
              _id: "$_id",
              userId: { $first: "$userId" },
              amount: { $first: "$amount" },
              currency: { $first: "$currency" },
              status: { $first: "$status" },
              transactionId: { $first: "$transactionId" },
              paymentMethod: { $first: "$paymentMethod" },
              createdAt: { $first: "$createdAt" },
              paymentInfo: { $first: "$paymentInfo" },
              productDetails: {
                $push: {
                  productId: "$productId",
                  productOwner: "$productdetails.productOwner",
                  productStatus: "$productdetails.productStatus",
                  productName: "$productdetails.productName",
                  productCategory: "$productdetails.productCategory",
                  productKeywords: "$productdetails.productKeywords",
                  productImages: "$productdetails.productImages",
                  productVideos: "$productdetails.productVideos",
                  price: "$productdetails.price",
                  availableStock: "$productdetails.availableStock",
                  minimumOrder: "$productdetails.minimumOrder",
                  xsollo_item_id: "$productdetails.xsollo_item_id",
                  description: "$productdetails.description",
                  variation: "$productdetails.variation",
                  isDeleted: "$productdetails.isDeleted",
                  createdAt: "$productdetails.createdAt",
                  updatedAt: "$productdetails.updatedAt"
                }
              }
            }
          },
          {
            $sort: { createdAt: -1 }
          }
        ])
        .exec();
      console.log("transactionHistory console", transactionHistory);
      if (transactionHistory) {
        const result = success("transaction history fetched succesfully", {
          transactionHistory: transactionHistory
        });
        return res.json(result);
      } else {
        const result = notFound(
          "transaction for this userId not found",
          "no transaction occurred"
        );
        return res.json(result);
      }
    } catch (err) {
      console.log("error", err);
      let response = internalError();
      return res.json(response);
    }
  }
});

router.get("/profileView", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const secretValue = await getSecretValue(secretName);
  let checkFields = ["userId"];

  let isRequired = checkRequiredFields(checkFields, req.query);
  console.log("Params", req.query);

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const { userId } = req.query;
      console.log({ userId });
      // let isUserVerified = await userModel.findOne({ _id: userId }).exec();
      const UserDetails = await userModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(userId) } }, // Match the user by ID
        {
          $lookup: {
            from: "TestStream_users", // Lookup in the users collection
            localField: "followers", // Followers IDs
            foreignField: "_id", // Matching with the _id field in the users collection
            as: "followerDetails", // The array with the details of the followers
            pipeline: [
              {
                $project: {
                  _id: 1, // Include follower's ID
                  userName: 1, // Include follower's userName
                  email: 1, // Include follower's email
                  profileImgUrl: 1, // Add other fields you need
                  name: 1
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: "TestStream_users", // Lookup in the users collection
            localField: "following", // Followers IDs
            foreignField: "_id", // Matching with the _id field in the users collection
            as: "followeingDetails", // The array with the details of the followers
            pipeline: [
              {
                $project: {
                  _id: 1, // Include follower's ID
                  userName: 1, // Include follower's userName
                  email: 1, // Include follower's email
                  profileImgUrl: 1, // Add other fields you need
                  name: 1
                }
              }
            ]
          }
        }
      ]);
      console.log({ UserDetails });

      if (UserDetails) {
        const result = success("profile details fetched succesfully", {
          profileDetails: UserDetails[0]
        });
        // added for online user status

        // console.log(onlineUsers);
        let postData = JSON.stringify({ userId });

        console.log("online User", postData);

        console.log("id--", postData);
        const options = {
          hostname: secretValue.SOCKET_DOMAIN,
          port: secretValue.SOCKET_PORT,
          path: "/onlineUser",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        };
        console.log("data,", options);
        // Make the HTTPS POST request
        const reqs = https.request(options, (res) => {
          let data = "";
          console.log("response wait");
          // Accumulate the response data
          res.on("data", (chunk) => {
            data += chunk;
          });
          console.log("response wait 2");
          // Process the response data when it ends
          res.on("end", () => {
            console.log(data);
          });
          console.log("response wait 3");
        });

        // Handle errors
        reqs.on("error", (error) => {
          console.error("Error making HTTPS request:", error);
        });

        // Write the request body
        reqs.write(postData);

        // End the request
        reqs.end();
        //end added for online user status

        return res.json(result);
      } else {
        const result = notFound(
          "there is no profile for this userId not found",
          "no transaction occurred"
        );
        return res.json(result);
      }
    } catch (err) {
      console.log("error", err);
      let response = internalError();
      return res.json(response);
    }
  }
});

router.get("/profilePublicView", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  let checkFields = ["userName"];
  let isRequired = checkRequiredFields(checkFields, req.query);
  console.log("Params", req.query);
  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const { userName } = req.query;
      console.log({ userName });
      const UserDetails = await userModel.aggregate([
        { $match: { userName: userName } }, // Match the user by ID
        {
          $lookup: {
            from: "TestStream_users", // Lookup in the users collection
            localField: "followers", // Followers IDs
            foreignField: "_id", // Matching with the _id field in the users collection
            as: "followerDetails", // The array with the details of the followers
            pipeline: [
              {
                $project: {
                  _id: 1, // Include follower's ID
                  userName: 1, // Include follower's userName
                  email: 1, // Include follower's email
                  profileImgUrl: 1, // Add other fields you need
                  name: 1
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: "TestStream_users", // Lookup in the users collection
            localField: "following", // Followers IDs
            foreignField: "_id", // Matching with the _id field in the users collection
            as: "followeingDetails", // The array with the details of the followers
            pipeline: [
              {
                $project: {
                  _id: 1, // Include follower's ID
                  userName: 1, // Include follower's userName
                  email: 1, // Include follower's email
                  profileImgUrl: 1, // Add other fields you need
                  name: 1
                }
              }
            ]
          }
        }
      ]);

      // let profileDetails = await userModel
      //     .findOne({ userName: userName })
      //     .populate('followers', 'userName email profileImgUrl')
      //     .exec();
      if (UserDetails) {
        const result = success("profile details fetched succesfully", {
          profileDetails: UserDetails[0]
        });
        return res.json(result);
      } else {
        const result = notFound(
          "there is no profile for this userId not found",
          "no transaction occurred"
        );
        return res.json(result);
      }
    } catch (err) {
      console.log("error", err);
      let response = internalError();
      return res.json(response);
    }
  }
});

router.post("/add_privatekey", async (req, res) => {
  const checkFields = ["privateKey", "userId", "networkName"];

  const isRequired = checkRequiredFields(checkFields, req.body);
  if (isRequired) {
    const response = requiredParams(isRequired);
    return res.json(response);
  } else {
    const { privateKey, userId, networkName } = req.body;
    console.log("req.body", req.body);

    try {
      // Derive wallet address from the provided privateKey
      const wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
      const walletAddress = wallet.address;
      console.log("walletAddress", walletAddress);

      // Encrypt the privateKey using AWS KMS
      const params = {
        KeyId: AWS_KEYID,
        Plaintext: privateKey
      };

      const encryptedData = await kms.encrypt(params).promise();
      const encryptedPrivateKey = encryptedData.CiphertextBlob.toString("base64");

      // Generate a QR code for the wallet address
      const qrCodeData = await qrcode.toDataURL(walletAddress);

      // Find the user and update the wallet details array
      const user = await userModel.findById(userId);
      if (!user) {
        const result = notFound("User not found");
        return res.json(result);
      }

      user.walletDetails.push({
        walletAddress: walletAddress,
        walletPrivateKey: encryptedPrivateKey,
        walletQRCode: qrCodeData,
        networkName: networkName
      });

      await user.save();

      const result = success("Wallet address stored and private key encrypted", {
        walletAddress: walletAddress,
        walletQRCode: qrCodeData,
        networkName: networkName
      });
      return res.json(result);
    } catch (error) {
      console.error("Error processing private key:", error);
      const result = internalError("Error processing private key", error);
      return res.json(result);
    }
  }
});
router.post("/UpdatePassword", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("UpdatePassword");
  let checkFields = ["userId", "currentPassword", "newPassword"];

  let isRequired = checkRequiredFields(checkFields, req.body);
  console.log({ isRequired });

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    const { userId, currentPassword, newPassword } = req.body;

    try {
      const user = await userModel.findOne({ _id: userId }).exec();
      if (!user) {
        console.log("User not found:", userId);
        let response = notFound("User not found");
        return res.json(response);
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        let result = error("Current password is incorrect");
        return res.json(result);
      }

      const saltRounds = 10;
      const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

      user.password = newHashedPassword;
      await user.save();

      let result = success("Password updated successfully");
      return res.json(result);
    } catch (error) {
      console.error("Error updating password:", error);
      let response = internalError();
      return res.json(response);
    }
  }
});

router.post("/profile/update", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from stream/update", req.body);
  let validate_params = 1;
  let update = {};
  try {
    let requiredFields = ["userId"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const {
        userId,
        name,
        userName,
        email,
        profileImgUrl,
        coverImgUrl,
        gamingTags,
        bio,
        links,
        tags,
        linkInstagram,
        linkX,
        linkYoutube,
        country,
        preferredCurrency
      } = req.body;
      console.log("userId", userId);
      let userInfo = await userModel.findOne({ _id: userId }).exec();
      if (userInfo) {
        if (name !== undefined) {
          update.name = name;
          validate_params = 0;
        }
        if (userName !== undefined) {
          update.userName = userName;
          validate_params = 0;
        }
        if (email !== undefined) {
          update.email = email;
          validate_params = 0;
        }
        if (profileImgUrl !== undefined) {
          update.profileImgUrl = profileImgUrl;
          validate_params = 0;
        }

        if (coverImgUrl !== undefined) {
          update.coverImgUrl = coverImgUrl;
          validate_params = 0;
        }
        if (gamingTags !== undefined) {
          update.gamingTags = gamingTags;
          validate_params = 0;
        }
        if (bio !== undefined) {
          update.bio = bio;
          validate_params = 0;
        }
        if (country !== undefined) {
          update.country = country;
          validate_params = 0;
        }

        if (linkInstagram !== undefined) {
          update.linkInstagram = linkInstagram;
          validate_params = 0;
        }
        if (linkX !== undefined) {
          update.linkX = linkX;
          validate_params = 0;
        }
        if (linkYoutube !== undefined) {
          update.linkYoutube = linkYoutube;
          validate_params = 0;
        }
        if (links !== undefined) {
          update.links = links;
          validate_params = 0;
        }
        if (tags !== undefined) {
          update.tags = tags;
          validate_params = 0;
        }
        if (preferredCurrency !== undefined) {
          update.preferredCurrency = preferredCurrency;
          validate_params = 0;
        }
        if (validate_params === 0) {
          const filter = { _id: userId };
          let result = await userModel.findOneAndUpdate(filter, update);
          let results = success("profile details updated", {
            userId: result._id
          });
          return res.json(results);
        } else {
          let result = error(
            "There are no parameters that need updating.",
            "no_parameters_updated"
          );
          return res.json(result);
        }
      } else {
        let result = error("User not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/profile/completion", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("profile completion");

  try {
    let requiredFields = ["userId"];
    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let userId = req.body.userId;
      console.log("userId", userId);

      let user = await userModel.findOne({ _id: userId }).exec();
      console.log("user", user);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let completionFields = [
        "profileImgUrl",
        "bio",
        "gamingTags",
        "linkInstagram",
        "linkX",
        "linkYoutube",
        "tags",
        "links"
      ];

      let completedFieldsCount = completionFields.reduce((count, field) => {
        if (Array.isArray(user[field]) && user[field].length > 0) {
          return count + 1;
        } else if (user[field] && !Array.isArray(user[field])) {
          return count + 1;
        }
        return count;
      }, 0);
      console.log("completedFieldsCount", completedFieldsCount);

      let totalFieldsCount = completionFields.length;
      console.log("totalFieldsCount", totalFieldsCount);
      let completionPercentage = (completedFieldsCount / totalFieldsCount) * 100;
      console.log("completionPercentage", completionPercentage);

      return res.json({
        completionPercentage: completionPercentage.toFixed(2)
      });
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.get("/username_check", async (req, res) => {
  console.log("username_check", req.query);
  try {
    const isRequired = checkRequiredFields(["userId", "userName"], req.query);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      const response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const { userName } = req.query;

      const user = await userModel.findOne({ userName: userName });
      if (user) {
        let results = error("Username already taken");
        return res.json(results);
      }

      let results = success("Username available");
      return res.json(results);
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.get("/create_wallet", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  let checkFields = ["userId"];

  let isRequired = checkRequiredFields(checkFields, req.query);
  console.log({ isRequired });

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    const userId = req.query.userId;

    const existingUser = await userModel.findById(userId);

    if (existingUser && existingUser.walletAddress && existingUser.walletPrivateKey) {
      // User already has wallet details, no need to generate new ones
      const result = notFound("Wallet already exists for the user", {
        walletAddress: existingUser.walletAddress
      });
      return res.json(result);
    } else {
      const newWallet = web3.eth.accounts.create();
      const newWalletAddress = newWallet.address;
      const newWalletPrivateKey = newWallet.privateKey;
      console.log("newWalletAddress", newWalletAddress);
      console.log("newWalletkey", newWalletPrivateKey);

      const params = {
        KeyId: AWS_KEYID,
        Plaintext: newWalletPrivateKey
      };
      try {
        const encryptedData = await kms.encrypt(params).promise();
        const encryptedPrivateKey = encryptedData.CiphertextBlob.toString("base64");
        const qrCodeData = await qrcode.toDataURL(newWalletAddress);
        const updatedUserData = {
          walletAddress: newWalletAddress,
          walletPrivateKey: encryptedPrivateKey,
          walletQRCode: qrCodeData
        };
        const updatedUser = await userModel.findByIdAndUpdate(userId, updatedUserData, {
          new: true
        });
        if (updatedUser) {
          const result = success("New wallet address created and stored", {
            walletaddress: newWalletAddress,
            walletQRCode: qrCodeData
          });

          const params1 = {
            token: process.env.CAMPAIGN_TOKEN_ID,
            data: [
              {
                taskId: 1,
                timestamp: Math.floor(Date.now() / 1000),
                address: newWalletAddress
              }
            ]
          };
          console.log("params1", params1);
          const apiCallSuccess1 = airdrop2_campaign(params1);
          console.log("apiCallSuccess1", apiCallSuccess1);

          return res.json(result);
        } else {
          const result = notFound("User not found");
          return res.json(result);
        }
      } catch (error) {
        console.error("Error updating wallet address:", error);
        const result = notFound("Error updating wallet address", error);
        return res.json(result);
      }
    }
  }
});

router.get("/wallet_balance", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  let checkFields = ["userId"];

  let isRequired = checkRequiredFields(checkFields, req.query);
  console.log({ isRequired });

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    const userId = req.query.userId;
    try {
      const user = await userModel.findOne({ _id: userId }, "walletAddress").exec();
      if (user && user.walletAddress) {
        const walletAddress = user.walletAddress;
        web3.eth
          .getBalance(walletAddress)
          .then((balance) => {
            // Convert balance to string to handle potential object
            balance = balance.toString();

            console.log("Balance:", balance, "wei");
            const balanceInEther = web3.utils.fromWei(balance, "ether");
            console.log("Balance in Ether:", balanceInEther, "BNB");
            const result = success("The available balance in wallet is", {
              wallet_balance: balanceInEther
            });
            return res.json(result);
          })
          .catch((error) => {
            console.error("Error fetching balance:", error);
            const result = notFound("Error fetching balance", error);
            return res.json(result);
          });
      } else {
        const result = notFound("User not found or wallet address is not created");
        return res.json(result);
      }
    } catch (error) {
      console.error("Error finding user:", error);
      const result = internalError("Error finding user");
      return res.json(result);
    }
  }
});

router.get("/verify_wallet", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  let checkFields = ["userId"];

  let isRequired = checkRequiredFields(checkFields, req.query);
  console.log({ isRequired });

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    const userId = req.query.userId;

    try {
      const user = await userModel.findOne({ _id: userId }).exec();

      if (user && user.walletAddress) {
        const walletaddress = "True";
        const result = success("Wallet address is available", walletaddress);
        return res.json(result);
      } else {
        const walletaddress = "False";
        const result = success("Wallet address is not available", walletaddress);
        return res.json(result);
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
      const result = notFound("Error checking wallet", error);
      return res.json(result);
    }
  }
});

router.get("/dashboard", async (req, res) => {
  let checkFields = ["userId"];

  let isRequired = checkRequiredFields(checkFields, req.query);
  console.log({ isRequired });

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const userId = req.query.userId;
      const user = await userModel.findOne({ _id: userId }).exec();
      if (user) {
        const totalUsersData = await userModel
          .aggregate([
            {
              $facet: {
                totalUsers: [{ $count: "count" }],
                androidUsers: [
                  { $match: { device_type: "android" } },
                  { $count: "count" }
                ],
                iosUsers: [{ $match: { device_type: "ios" } }, { $count: "count" }],
                webUsers: [{ $match: { device_type: "web" } }, { $count: "count" }]
              }
            }
          ])
          .exec();

        if (totalUsersData.length > 0) {
          const totalUsers = totalUsersData[0].totalUsers[0]?.count || 0;
          const androidUsers = totalUsersData[0].androidUsers[0]?.count || 0;
          const iosUsers = totalUsersData[0].iosUsers[0]?.count || 0;
          const webUsers = totalUsersData[0].webUsers[0]?.count || 0;
          const response = { totalUsers, androidUsers, iosUsers, webUsers };
          const result = success("Total users fetched succesfully", {
            response
          });
          return res.json(result);
        }
      } else {
        const result = notFound("userId not found");
        return res.json(result);
      }
    } catch (error) {
      console.error("Error in fetching users:", error);
      const result = internalError("Error in fetching users");
      return res.json(result);
    }
  }
});

router.get("/dollar_conversion", async (req, res) => {
  const amount = 1;
  try {
    // Fetch BNB price data from CoinGecko API
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"
    );
    const bnbPrice = response.data.binancecoin.usd;

    // Convert USD to BNB
    const bnbAmount = amount / bnbPrice;
    const fixedbnbamount = bnbAmount.toFixed(4);

    console.log(`$${amount} is equal to ${bnbAmount.toFixed(4)} BNB`);

    const result = success(`$${amount} is equal to ${bnbAmount.toFixed(4)} BNB`, {
      $1: fixedbnbamount
    });
    return res.json(result);
  } catch (error) {
    console.error("Error fetching BNB price:", error);
    let result = notFound("Error fetching BNB price:", error);
    return res.json(result);
  }
});

router.get("/token_transfer", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("/token_transfer");

  let checkFields = ["userId"];
  let isRequired = checkRequiredFields(checkFields, req.query);
  console.log({ isRequired });

  if (isRequired) {
    console.log("send required fields response");
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  } else {
    try {
      const userId = req.query.userId;
      const user = await userModel.findOne({ _id: userId }, "walletPrivateKey").exec();
      if (user) {
        const privateKey = user.walletPrivateKey;
        const to = req.query.to;
        const amount = req.query.amount;
        const gasLimit = "21000";

        const decrypt_privateKey = await decryptPrivateKey(privateKey);
        console.log("decrypt_key", decrypt_privateKey);

        if (!to || !amount) {
          let result = notFound(
            "Recipient address and amount are required",
            "missing_parameters"
          );
          return res.json(result);
        }

        web3.eth
          .getGasPrice()
          .then((gasPrice) => {
            const transactionObject = {
              from: web3.eth.accounts.privateKeyToAccount(decrypt_privateKey).address,
              to: to,
              value: web3.utils.toWei(amount, "ether"),
              gas: gasLimit,
              gasPrice: gasPrice
            };

            web3.eth.accounts
              .signTransaction(transactionObject, decrypt_privateKey)
              .then((signedTransaction) => {
                return web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
              })
              .then((receipt) => {
                console.log(
                  "Transaction successful. Transaction hash:",
                  receipt.transactionHash
                );
                let result = success("Transaction successful", {
                  TransactionHash: receipt.transactionHash
                });
                return res.json(result);
              })
              .catch((error) => {
                console.error("Error sending transaction:", error);
                let result = notFound("insufficient funds", error);
                return res.json(result);
              });
            //     .catch (error => {
            //     console.error('Error sending transaction:', error);

            //     if (error.reason && error.reason.includes('insufficient funds')) {
            //         let result = ('Insufficient funds for gas and value', { "message": "insufficient_funds" });
            //         return res.json(result);
            //     } else {
            //         let result = error('Error sending transaction', "transaction_error");
            //         return res.json(result);
            //     }
            // });
          })
          .catch((error) => {
            console.error("Error getting gas price:", error);
            let result = notFound("Error getting gas price", error);
            return res.json(result);
          });
      } else {
        let result = notFound("user not found", "user_not_found");
        return res.json(result);
      }
    } catch (error) {
      console.error("Internal server error:", error);
      let response = internalError();
      return res.json(response);
    }
  }
});

async function getCurrentPrice(cryptoId) {
  const cacheKey = `currentPrice_${cryptoId}`;
  const cachedPrice = cache.get(cacheKey);

  if (cachedPrice) {
    return cachedPrice;
  }

  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd`
    );
    const price = response.data[cryptoId].usd;
    cache.set(cacheKey, price);
    return price;
  } catch (error) {
    console.error(`Error fetching ${cryptoId} price:`, error);
    throw error;
  }
}

async function getEquivalentValue(amount, fromCryptoId, toCryptoId) {
  try {
    const fromPrice = await getCurrentPrice(fromCryptoId);
    const toPrice = await getCurrentPrice(toCryptoId);

    const equivalentValue = (amount * fromPrice) / toPrice;
    return equivalentValue;
  } catch (error) {
    console.error(
      `Error calculating equivalent value from ${fromCryptoId} to ${toCryptoId}:`,
      error
    );
    throw error;
  }
}

// Route to get equivalent value of 0.3 BNB in ETH
router.get("/bnb-to-eth", async (req, res) => {
  try {
    const amount = 0.3;
    const fromCryptoId = "binancecoin";
    const toCryptoId = "ethereum";

    const equivalentValue = await getEquivalentValue(amount, fromCryptoId, toCryptoId);

    res.json({
      success: true,
      data: {
        amount: amount,
        cryptoId: fromCryptoId.toUpperCase(),
        equivalentValue: equivalentValue,
        targetCrypto: toCryptoId.toUpperCase()
      }
    });
  } catch (error) {
    console.error("Failed to calculate equivalent value:", error);
    res.status(500).json({ error: "Failed to calculate equivalent value" });
  }
});

async function sendEmailNotification(email, param1, param2, type) {
  const verifyURL = `https://rg55d2kcv7.execute-api.us-east-1.amazonaws.com/SES_Email`;

  const params = {
    email: email,
    type: type,
    data1: param1,
    data2: param2
  };

  try {
    const response = await axios.post(verifyURL, params);
    console.log("Apires", response);
  } catch (error) {
    console.error("Error verifying contract:", error);
    return {
      status: "error",
      message: "Error verifying contract: " + error.message
    };
  }
}

router.get(
  "/auth/steam",
  passport.authenticate("steam", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/");
  }
);

router.get(
  "/auth/steam/return",
  passport.authenticate("steam", { failureRedirect: "/login" }),
  async (req, res) => {
    const redirectUrl = process.env.APP_URL;

    // Function to handle successful authentication and redirect
    const handleSuccessRedirect = (message, data) => {
      const response = success(message, data);
      const encodedResponse = encodeURIComponent(JSON.stringify(response));
      res.redirect(`${redirectUrl}?data=${encodedResponse}`);
      // res.redirect(
      //   `${process.env.FRONTEND_LOCAL_URL}/?data=${encodedResponse}`
      // );
    };

    // Function to handle errors and redirect to login
    const handleErrorRedirect = (error) => {
      console.error("Error during Steam authentication:", error);
      res.redirect(`${redirectUrl}login`);
      // res.redirect(`${process.env.FRONTEND_LOCAL_URL}/login`);
    };

    try {
      if (!req.user) {
        return res.redirect(`${redirectUrl}login`);
        // return res.redirect(`${process.env.FRONTEND_LOCAL_URL}/login`);
      }

      const {
        steamid,
        personaname,
        profileurl,
        avatar,
        profilestate,
        communityvisibilitystate
      } = req.user._json;

      // Check if the user exists in the database
      const user = await userModel.findOne({ "steam.steamId": steamid });

      if (user) {
        // Update the user with the latest Steam information
        user.steam = {
          steamId: steamid,
          displayName: personaname,
          profileUrl: profileurl,
          avatar,
          profileState: profilestate,
          communityVisibilityState: communityvisibilitystate
        };
        await user.save();

        // Redirect to home page after updating user data
        handleSuccessRedirect("Steam authentication success", {
          userId: user._id,
          userEmail: user.email,
          steamData: user.steam,
          result: user
        });
      } else {
        // Redirect to login if the user doesn't exist
        handleSuccessRedirect("Steam authentication success", {
          steamData: req.user._json
        });
      }
    } catch (error) {
      handleErrorRedirect(error);
    }
  }
);

module.exports = router;
