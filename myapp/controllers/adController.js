const express = require("express");
const axios = require("axios");
const bcrypt = require("bcrypt");
const router = express.Router();
const adminModel = require("../models/adminModel");
const ProductModel = require("../models/productModel");
const mongoose = require("mongoose");
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  error,
  requiredParams,
  conflict,
  invalidEmail,
  internalError,
  notFound
} = require("../commonFunctions/responses");
const { admin_profile } = require("../commonFunctions/fileupload");
const saltRounds = 10;

function isValidEmail(email) {
  const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailPattern.test(email);
}

router.post("/create", async (req, res) => {
  try {
    console.log("admin module signup", req.body);

    let isRequired = checkRequiredFields(["email", "name"], req.body);

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let name = req.body.name;
      let userEmail = req.body.email;
      console.log("payload has required params");

      const isValid = isValidEmail(userEmail);
      console.log({ isValid });

      if (isValid) {
        console.log("email is valid");
        let activeUser = await adminModel
          .findOne({ email: userEmail, status: true })
          .exec();
        console.log({ activeUser });

        if (activeUser) {
          console.log("conflict email");
          let response = conflict("email");
          return res.json(response);
        } else {
          let deletedUser = await adminModel
            .findOne({ email: userEmail, status: false })
            .exec();
          console.log({ deletedUser });

          if (deletedUser) {
            console.log("email found in deleted status, creating new user");
          }
          let newUser = new adminModel({
            name: name,
            email: userEmail
          });

          let result = await newUser.save();
          await sendEmailNotification(userEmail, name, result._id, "admin_signup");
          return res.json(success("User created successfully", result));
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

router.post("/delete", async (req, res) => {
  try {
    let requiredFields = ["userId"];
    let isRequired = checkRequiredFields(requiredFields, req.body);
    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const { userId } = req.body;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.json(notFound("Invalid userId"));
      }

      console.log("userId", userId);
      const updateResult = await adminModel.findOneAndUpdate(
        { _id: userId, status: true },
        { $set: { status: false } },
        { new: true }
      );

      console.log("updateResult", updateResult);

      if (updateResult) {
        let response = success("User successfully deleted");
        return res.json(response);
      } else {
        let response = notFound("User not found or already deleted");
        return res.json(response);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/update", async (req, res) => {
  try {
    let requiredFields = ["userId"];
    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const { userId, userName, password, name } = req.body;
      console.log("check", req.body);
      let userInfo = await adminModel.findOne({ _id: userId }).exec();

      if (userInfo) {
        let update = {};
        let validate_params = 0;

        if (userName !== undefined) {
          const existingUser = await adminModel.findOne({ userName: userName });
          if (existingUser && existingUser._id.toString() !== userId) {
            let result = error("Username already taken", "username_taken");
            return res.json(result);
          }
          update.userName = userName;
          validate_params = 1;
        }

        if (name !== undefined) {
          update.name = name;
          validate_params = 1;
        }

        if (password !== undefined) {
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          update.password = hashedPassword;
          validate_params = 1;
        }

        if (req.files && req.files.profileImage) {
          const profileImageUpload = await admin_profile(req.files.profileImage);

          if (profileImageUpload.status === "success") {
            update.profileImage = profileImageUpload.result.Location;
            validate_params = 1;
          } else {
            let result = error("Profile image upload failed", "image_upload_failed");
            return res.json(result);
          }
        }

        if (!userInfo.emailVerification) {
          update.emailVerification = true;
          update.email_verified_at = new Date();
          validate_params = 1;
        }
        update.updatedAt = new Date();

        if (validate_params === 1) {
          const filter = { _id: userId };
          let result = await adminModel.findOneAndUpdate(filter, update, { new: true });
          let results = success("Profile details updated", { userId: result._id });
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
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.get("/list", async (req, res) => {
  let checkFields = ["userId"];
  let isRequired = checkRequiredFields(checkFields, req.query);

  if (isRequired) {
    let response = requiredParams(isRequired);
    console.log(response);
    return res.json(response);
  }

  try {
    const { userId, page = 1, limit = 10, searchvalue = "" } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const userExists = await adminModel.findById(userId);

    if (userExists) {
      const searchQuery = {
        ...(searchvalue && {
          $or: [
            { email: { $regex: searchvalue, $options: "i" } },
            { userName: { $regex: searchvalue, $options: "i" } },
            { name: { $regex: searchvalue, $options: "i" } }
          ]
        })
      };

      const totalCount = await adminModel.countDocuments(searchQuery);
      const allUserData = await adminModel
        .find(searchQuery)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      const result = success("Admin_User list retrieval success", {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        AdminUser_details: allUserData
      });

      return res.json(result);
    } else {
      const result = notFound("User not found", "AdminUsers_empty");
      return res.json(result);
    }
  } catch (error) {
    console.error(error);
    let response = internalError();
    return res.json(response);
  }
});

router.get("/profileView", async (req, res) => {
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
      let isUserVerified = await adminModel.findOne({ _id: userId }).exec();
      if (isUserVerified) {
        const result = success("profile details fetched succesfully", {
          profileDetails: isUserVerified
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

router.post("/login", async (req, res) => {
  console.log("admin module login", req.body);

  try {
    let isRequired = checkRequiredFields(["email", "password"], req.body);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    }

    const { email, password } = req.body;

    const isValid = isValidEmail(email);
    console.log("email validation", { isValid });

    if (!isValid) {
      let result = error("Invalid email format", "invalid_email");
      return res.json(result);
    }

    let user = await adminModel
      .findOne({ email: email, emailVerification: true, status: true })
      .exec();
    if (!user) {
      let result = error("Email not registered or not verified", "not_found");
      return res.json(result);
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      let result = error("Incorrect password, try again", "incorrect_key");
      return res.json(result);
    }
    let userData = {
      userId: user._id,
      email: user.email,
      fullname: user.name,
      userName: user.userName,
      profileImage: user.profileImage
    };

    console.log("Login successful:", userData);
    let response = success("Sign-in process successful", userData);
    return res.json(response);
  } catch (err) {
    console.log("Error during login process:", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/productcreate", async (req, res) => {
  console.log("received from product/create", req.body);

  try {
    let requiredFields = ["userId", "productName"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const {
        userId,
        productName,
        productCategory = "",
        productKeywords = "",
        productImages = [],
        productThumnail = [],
        productVideos,
        price = "",
        currencyType = "",
        availableStock = "",
        minimumOrder = "",
        description = "",
        variation = "",
        modelUrl = "",
        assetImages = []
      } = req.body;
      let productStatus = req.body.productStatus || "";
      console.log({ productStatus });

      let productInfo = {
        productName,
        productCategory,
        productKeywords,
        productImages,
        productThumnail,
        productVideos,
        price,
        currencyType,
        availableStock,
        minimumOrder,
        description,
        variation,
        productOwner: userId,
        modelUrl,
        assetImages
      };

      console.log(productInfo);

      if (productStatus !== "") {
        productInfo["productStatus"] = productStatus;
      }

      const newProduct = new ProductModel(productInfo);

      const savedProduct = await newProduct.save();
      let result = success("product creation success", {
        productId: savedProduct._id
      });

      return res.json(result);
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/forgetPassword", async (req, res) => {
  console.log("admin module", req.body);
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
      let isUserVerified = await adminModel
        .findOne({ email: email, emailVerification: true })
        .exec();
      let userId = isUserVerified._id;
      let userName = isUserVerified.name;
      let weAppUrl =
        "https://admstaging.TestStream.xyz/password/" + btoa(userId) + "/" + btoa(Date.now);
      sendEmailNotification(email, userName, weAppUrl, "forgot_password");
      if (isUserVerified) {
        let results = success("Reset url send to your email.", { userId: userId });
        return res.json(results);
      } else {
        let result = error("email id not found", "email_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/resetPassword", async (req, res) => {
  console.log("admin module send otp", req.body);
  try {
    let isRequired = checkRequiredFields(["userId", "password"], req.body);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let userId = req.body.userId;
      let password = req.body.password;
      let userInfo = await adminModel.findOne({ _id: userId }).exec();
      console.log("userInfo", userInfo);
      if (userInfo) {
        bcrypt.hash(password, saltRounds, async function (err, hash) {
          console.log("passkey validation", { err, hash });
          let isUpdated = await adminModel
            .findOneAndUpdate(
              { _id: userId, email: userInfo.email },
              { password: hash },
              { new: true }
            )
            .exec();
          console.log({ isUpdated });
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
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});
async function sendEmailNotification(userEmail, name, userId, type) {
  const verifyURL = `https://rg55d2kcv7.execute-api.us-east-1.amazonaws.com/SES_Email`;

  const params = {
    email: userEmail,
    type: type,
    data1: name,
    data2: userId
  };

  try {
    const response = await axios.post(verifyURL, params);
    console.log("Apires", response);
  } catch (error) {
    console.error("Error sending email notification:", error);
    return {
      status: "error",
      message: "Error sending email notification: " + error.message
    };
  }
}

module.exports = router;
